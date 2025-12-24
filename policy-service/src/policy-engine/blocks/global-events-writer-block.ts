/**
 * GlobalEventsWriterBlock
 *
 * Server-side policy block that forwards a reference to an already anchored VC/VP/VS
 * into one or more global Hedera topics. It does not create or modify documents.
 * Instead, it stores per-user stream configurations in the database (like the
 * GlobalEventsReader block) and publishes references to VC documents when the
 * block is active or hidden. The last document processed is cached per-user so
 * that newly activated streams immediately receive the most recent message.
 */

import { ActionCallback, EventBlock } from '../helpers/decorators/index.js';
import { BlockActionError } from '../errors/index.js';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import {IPolicyEvent, PolicyInputEventType, PolicyOutputEventType} from '../interfaces/index.js';
import { AnyBlockType, IPolicyDocument, IPolicyEventState } from '../policy-engine.interface.js';
import { PolicyUser } from '../policy-user.js';
import { PolicyUtils } from '../helpers/utils.js';
import { ChildrenType, ControlType, PropertyType } from '../interfaces/block-about.js';

import { LocationType, TopicType } from '@guardian/interfaces';
import {GlobalEventsWriterStream, Message, MessageServer, TopicConfig, TopicHelper} from '@guardian/common';
import { TopicId } from '@hashgraph/sdk';

// Supported document types for filtering/publish metadata
export type GlobalDocumentType = 'vc' | 'json' | 'csv' | 'text' | 'any';

/**
 * Payload sent to global topics. Consumers can use documentType,
 * schemaContextIri and schemaIri for filtering/routing.
 */
interface GlobalEvent {
    documentType: GlobalDocumentType;
    documentTopicId: string;
    documentMessageId: string;
    schemaContextIri: string;
    schemaIri: string;
    timestamp: string;
}

/**
 * Streams in structure used when calling setData via UI.
 */
type SetDataStreamPayload = {
    topicId?: string;
    documentType?: GlobalDocumentType;
    active?: boolean
};

/**
 * Structure used when calling setData via UI.
 */
interface SetDataPayload {
    streams: Array<SetDataStreamPayload>;
    operation: string;
}

/**
 * Cached state per-user. Keeps last processed document and the last published messageId
 */
interface WriterCacheState {
    docs?: IPolicyDocument[];
}

@EventBlock({
    blockType: 'globalEventsWriterBlock',
    commonBlock: false,
    actionType: LocationType.REMOTE,
    about: {
        label: 'Global Events Writer',
        title: 'Publish VC reference to a global Hedera topics',
        post: true,
        get: true,
        children: ChildrenType.None,
        control: ControlType.UI,
        input: [
            PolicyInputEventType.RunEvent,
        ],
        output: [
            PolicyOutputEventType.RunEvent,
            PolicyOutputEventType.RefreshEvent,
            PolicyOutputEventType.ErrorEvent,
            PolicyOutputEventType.ReleaseEvent,
        ],
        defaultEvent: true,
        properties: [
            {
                name: 'topicIds',
                label: 'Global topics',
                title: 'One or more Hedera topics where notifications are published',
                type: PropertyType.Array,
                items: {
                    label: 'Topic',
                    value: '@topicId',
                    properties: [
                        {
                            name: 'topicId',
                            label: 'Topic id',
                            title: 'Hedera topic id',
                            type: PropertyType.Input,
                        },
                        {
                            name: 'documentType',
                            label: 'Document type',
                            title: 'Type written to the global topic for reader-side filtering',
                            type: PropertyType.Select,
                            items: [
                                { label: 'VC', value: 'vc' },
                                { label: 'JSON', value: 'json' },
                                { label: 'CSV', value: 'csv' },
                                { label: 'Text', value: 'text' },
                                { label: 'Any', value: 'any' },
                            ],
                            default: 'vc',
                        },
                    ],
                },
            },
        ],
    },
})
export class GlobalEventsWriterBlock {
    /**
     * Extract the canonical address (messageId) from the document.
     */
    private extractCanonicalAddress(doc: IPolicyDocument): string {
        if (doc?.messageId) {
            return String(doc.messageId);
        }
        return '';
    }

    /**
     * Creates default stream rows in the DB for this user if none exist.
     * New rows inherit the defaultActive and documentType from the block options.
     */
    private async ensureDefaultStreams(ref: AnyBlockType, user: PolicyUser): Promise<void> {
        const existing = await ref.databaseServer.getGlobalEventsWriterStreamsByUser(
            ref.policyId,
            ref.uuid,
            user.userId,
        );

        const existingTopicIds = new Set<string>();
        for (const stream of existing) {
            if (stream?.globalTopicId) {
                existingTopicIds.add(String(stream.globalTopicId).trim());
            }
        }

        const optionTopicIds = Array.isArray(ref.options?.topicIds) ? ref.options.topicIds : [];

        for (const topic of optionTopicIds) {
            const topicId = topic.topicId?.trim();
            if (!topicId) {
                continue;
            }

            try {
                this.validateTopicId(topicId, ref);
            } catch (_e) {
                continue;
            }

            if (existingTopicIds.has(topicId)) {
                continue;
            }

            const topicDocumentType: GlobalDocumentType = topic.documentType;

            await ref.databaseServer.createGlobalEventsWriterStream({
                policyId: ref.policyId,
                blockId: ref.uuid,
                userId: user.userId,
                userDid: user.did,
                globalTopicId: topicId,
                active: false,
                documentType: topicDocumentType,
            });
        }
    }

    /**
     * Throws if the topicId is not a valid Hedera topic format.
     * Accepts strings like '0.0.123'.
     */
    private validateTopicId(topicId: string, ref: AnyBlockType): void {
        try {
            TopicId.fromString(topicId);
        } catch (_e) {
            throw new BlockActionError('Invalid topic id format', ref.blockType, ref.uuid);
        }
    }

    /**
     * Builds a unique cache key for storing the last document per-user.
     */
    private getCacheKey(ref: AnyBlockType, user: PolicyUser): string {
        return `globalEventsWriterBlock:last:${ref.policyId}:${ref.uuid}:${user.userId}`;
    }

    /**
     * Retrieves the cached state for the given user.
     */
    private async getCacheState(ref: AnyBlockType, user: PolicyUser, cacheKey: string): Promise<WriterCacheState> {
        let cacheState: WriterCacheState = {};
        try {
            const cached = await ref.getCache<WriterCacheState>(cacheKey, user);
            if (cached && typeof cached === 'object') {
                cacheState = cached;
            }
        } catch (_e) {
            //
        }
        return cacheState;
    }

    /**
     * Extracts schema IRIs from the VC document for metadata.
     */
    private extractSchemaIris(
        ref: AnyBlockType,
        doc: IPolicyDocument
    ): { schemaContextIri: string; schemaIri: string } {
        try {
            let vc = doc.document;
            if (typeof vc === 'string') {
                vc = JSON.parse(vc);
            }

            const ctxList: string[] = vc?.['@context'] ?? [];
            const fullIri = ctxList.find((c) => c.includes('#'));
            if (fullIri) {
                return {
                    schemaContextIri: fullIri.split('#')[0],
                    schemaIri: fullIri,
                };
            }
            const baseContext = ctxList.find((c) => {
                if (!c.startsWith('http') && !c.startsWith('ipfs://')) {
                    return false;
                }
                if (c.includes('www.w3.org/2018/credentials')) {
                    return false;
                }
                if (c.includes('w3id.org/security')) {
                    return false;
                }
                return true;
            });
            const cs = PolicyUtils.getCredentialSubjectByDocument?.(vc);
            const csTypeRaw = (Array.isArray(cs?.type) ? cs.type[0] : cs?.type) || cs?.['@type'] || doc.type;
            const csType = csTypeRaw ? String(csTypeRaw) : '';
            if (baseContext && csType) {
                return {
                    schemaContextIri: baseContext,
                    schemaIri: `${baseContext}#${csType}`,
                };
            }
            if (baseContext) {
                return {
                    schemaContextIri: baseContext,
                    schemaIri: '',
                };
            }
            const schema = doc.schema;
            if ((schema.startsWith('http') || schema.startsWith('ipfs://')) && schema.includes('#')) {
                return {
                    schemaContextIri: schema.split('#')[0],
                    schemaIri: schema,
                };
            }
            return { schemaContextIri: '', schemaIri: '' };
        } catch (err) {
            ref.warn?.(`Unable to extract schema IRIs: ${PolicyUtils.getErrorMessage(err)}`);
            return { schemaContextIri: '', schemaIri: '' };
        }
    }

    /**
     * Publishes a JSON payload to a global topic using the user's relayer credentials.
     */
    private async publish(
        ref: AnyBlockType,
        user: PolicyUser,
        globalTopicId: string,
        payload: GlobalEvent
    ): Promise<void> {
        try {
            const userCredentials = await PolicyUtils.getUserCredentials(ref, user.did, user.userId);
            const hederaAccount = await userCredentials.loadRelayerAccount(ref, user.hederaAccountId, user.userId);
            const topic = new TopicConfig({ topicId: globalTopicId }, null, null);
            const messageServer = new MessageServer({
                operatorId: hederaAccount.hederaAccountId,
                operatorKey: hederaAccount.hederaAccountKey,
                encryptKey: hederaAccount.hederaAccountKey,
                signOptions: hederaAccount.signOptions,
                dryRun: ref.dryRun,
            }).setTopicObject(topic);
            const rawMessage = (() => {
                let currentMemo: string | null = null;
                let currentId: string | null = null;
                let currentTopicId: string | null = null;
                let currentLang: string | null = null;
                return {
                    toMessage(): string {
                        return JSON.stringify(payload);
                    },
                    setLang(lang: string): void {
                        currentLang = lang;
                    },
                    setMemo(memo: string): void {
                        currentMemo = memo;
                    },
                    getMemo(): string | null {
                        return currentMemo;
                    },
                    setId(id: string): void {
                        currentId = id;
                    },
                    getId(): string | null {
                        return currentId;
                    },
                    setTopicId(topicValue: string | TopicId): void {
                        if (topicValue) {
                            currentTopicId = topicValue.toString();
                        } else {
                            currentTopicId = null;
                        }
                    },
                    getTopicId(): string | null {
                        return currentTopicId;
                    },
                };
            })();
            console.log('sendMessage1')
            await messageServer.sendMessage(rawMessage as Message, {
                sendToIPFS: false,
                memo: 'GlobalEvent',
                userId: user.userId,
                interception: null,
            });
            console.log('sendMessage2')
        } catch (err) {
            ref.error(`Publish to global topic failed: ${PolicyUtils.getErrorMessage(err)}`);
            throw new BlockActionError('Publish to global topic failed', ref.blockType, ref.uuid);
        }
    }

    /**
     * Publishes all active streams.
     */
    private async publishActiveStreams(
        ref: AnyBlockType,
        user: PolicyUser,
        streams: GlobalEventsWriterStream[],
        doc: IPolicyDocument,
        messageId: string,
    ): Promise<void> {
        const activeStreams = streams.filter((s) => s.active)
        if (activeStreams.length === 0) {
            return;
        }

        const { schemaContextIri, schemaIri } = this.extractSchemaIris(ref, doc);

        for (const topic of activeStreams) {
            const payload: GlobalEvent = {
                documentType: topic.documentType,
                documentTopicId: doc.topicId,
                documentMessageId: messageId,
                schemaContextIri,
                schemaIri,
                timestamp: new Date().toISOString(),
            };

            await this.publish(ref, user, topic.globalTopicId, payload);
        }
    }

    /**
     * Creates a new Hedera topic and returns its topicId.
     */
    private async createTopic(ref: AnyBlockType, user: PolicyUser): Promise<string> {
        try {
            const userCredentials = await PolicyUtils.getUserCredentials(ref, user.did, user.userId);
            const relayer = await userCredentials.loadRelayerAccount(ref, user.hederaAccountId, user.userId);
            const topicHelper = new TopicHelper(relayer.hederaAccountId, relayer.hederaAccountKey, relayer.signOptions, ref.dryRun);
            const memo = `global-events:${ref.policyId}:${ref.uuid}`;
            const created = await topicHelper.create(
                {
                    type: TopicType.DynamicTopic,
                    owner: user.did,
                    name: `Global events ${ref.policyId}`,
                    description: `Global events writer ${ref.uuid}`,
                    policyId: ref.policyId,
                    policyUUID: null,
                    memo,
                    memoObj: {
                        policyId: ref.policyId,
                        blockId: ref.uuid,
                    },
                },
                user.userId,
                {
                    admin: true,
                    submit: true,
                }
            );
            if (!created?.topicId) {
                throw new Error('TopicHelper.create returned empty topicId');
            }
            return created.topicId;
        } catch (err) {
            ref.error(`Create topic failed: ${(PolicyUtils as any).getErrorMessage(err)}`);
            throw new BlockActionError('Create topic failed', ref.blockType, ref.uuid);
        }
    }

    @ActionCallback({
        type: PolicyInputEventType.RunEvent,
        output: [
            PolicyOutputEventType.RunEvent,
            PolicyOutputEventType.RefreshEvent,
            PolicyOutputEventType.ReleaseEvent,
            PolicyOutputEventType.ErrorEvent,
        ],
    })
    public async runAction(event: IPolicyEvent<IPolicyEventState>): Promise<void> {
        console.log('runAction');

        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);
        const user: PolicyUser = event?.user;

        if (!user) {
            throw new BlockActionError('User is required', ref.blockType, ref.uuid);
        }

        const state: IPolicyEventState = event?.data;
        const payload = state?.data ?? [];

        const docs: IPolicyDocument[] = Array.isArray(payload) ? payload : [payload];

        console.log('docs', docs)

        if (docs.length === 0) {
            ref.triggerEvents(PolicyOutputEventType.RunEvent, user, null);
            ref.triggerEvents(PolicyOutputEventType.RefreshEvent, user, null);
            ref.triggerEvents(PolicyOutputEventType.ReleaseEvent, user, null);
            ref.backup();
            return;
        }

        await this.ensureDefaultStreams(ref, user);

        const streams = await ref.databaseServer.getGlobalEventsWriterStreamsByUser(
            ref.policyId,
            ref.uuid,
            user.userId
        );
        const defaultActive = ref.defaultActive;

        const cacheKey = this.getCacheKey(ref, user);
        const cacheState = await this.getCacheState(ref, user, cacheKey);

        console.log('defaultActive', defaultActive);
        cacheState.docs = docs;

        for (const doc of docs) {
            if (!doc) {
                continue;
            }

            console.log('doc', doc.document);

            const documentMessageId: string = this.extractCanonicalAddress(doc);
            if (!documentMessageId) {
                throw new BlockActionError(
                    'Canonical document address (messageId) is missing',
                    ref.blockType,
                    ref.uuid
                );
            }

            if (!doc.topicId) {
                continue;
            }

            if (!defaultActive) {
                if (streams.length > 0) {
                    const { schemaContextIri, schemaIri } = this.extractSchemaIris(ref, doc);

                    for (const stream of streams) {
                        const eventPayload: GlobalEvent = {
                            documentType: stream.documentType,
                            documentTopicId: doc.topicId,
                            documentMessageId,
                            schemaContextIri,
                            schemaIri,
                            timestamp: new Date().toISOString(),
                        };

                        await this.publish(ref, user, stream.globalTopicId, eventPayload);

                        stream.lastPublishMessageId = documentMessageId;
                        await ref.databaseServer.updateGlobalEventsWriterStream(stream);
                    }
                }
            } else {
                await this.publishActiveStreams(ref, user, streams, doc, documentMessageId);
            }
        }

        await ref.setShortCache(cacheKey, cacheState, user);

        const outState: IPolicyEventState = { data: payload };

        if (!defaultActive) {
            ref.triggerEvents(PolicyOutputEventType.RunEvent, user, outState);
            ref.triggerEvents(PolicyOutputEventType.RefreshEvent, user, outState);
            ref.triggerEvents(PolicyOutputEventType.ReleaseEvent, user, outState);
            ref.backup();
        }
    }

    /**
     * Returns the UI configuration for this block.
     */
    public async getData(user: PolicyUser): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);
        const config = ref.options || {}
        if (!user) {
            throw new BlockActionError('User is required', ref.blockType, ref.uuid);
        }

        console.log('getData', 'writer')

        // Ensure default streams exist. This creates DB rows
        // from the block configuration if none exist for this user.
        await this.ensureDefaultStreams(ref, user);

        const streams = await ref.databaseServer.getGlobalEventsWriterStreamsByUser(ref.policyId, ref.uuid, user.userId);
        const defaultTopicIds: string[] = [];
        const optionTopicIds = ref.options.topicIds ?? [];

        for (const item of optionTopicIds) {
            defaultTopicIds.push(item.topicId);
        }

        return {
            id: ref.uuid,
            blockType: ref.blockType,
            actionType: ref.actionType,
            readonly: (
                ref.actionType === LocationType.REMOTE &&
                user.location === LocationType.REMOTE
            ),
            config: {
                eventTopics: config.eventTopics || [],
            },
            streams,
            defaultTopicIds
        };
    }

    /**
     * Handle UI operations from the configurator.
     */
    public async setData(user: PolicyUser, data: SetDataPayload): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);
        const operation = data?.operation;
        const streams = data?.streams ?? [];

        console.log('setData', 'writer')

        if (!user) {
            throw new BlockActionError('User is required', ref.blockType, ref.uuid);
        }
        if (!operation) {
            throw new BlockActionError('Operation is required', ref.blockType, ref.uuid);
        }

        const topics = streams.filter(stream => stream.topicId);

        // Ensure default streams exist. This creates DB rows
        // from the block configuration if none exist for this user.
        await this.ensureDefaultStreams(ref, user);

        // Create a new topic and DB row
        if (operation === 'CreateTopic') {
            const createdTopicId = await this.createTopic(ref, user);

            await ref.databaseServer.createGlobalEventsWriterStream({
                policyId: ref.policyId,
                blockId: ref.uuid,
                userId: user.userId,
                userDid: user.did,
                globalTopicId: createdTopicId,
                active: false,
                documentType: 'any',
            });

            ref.triggerEvents(PolicyOutputEventType.RefreshEvent, user, {});
            ref.backup();

            return {}
        }

        // Add existing topics as new DB rows
        if (operation === 'AddTopic') {
            for (const topic of topics) {
                try {
                    this.validateTopicId(topic.topicId, ref);
                } catch (_e) {
                    continue;
                }

                const existing = await ref.databaseServer.getGlobalEventsWriterStreamByUserTopic(
                    ref.policyId,
                    ref.uuid,
                    user.userId,
                    topic.topicId
                );

                if (existing) {
                    continue;
                }

                await ref.databaseServer.createGlobalEventsWriterStream({
                    policyId: ref.policyId,
                    blockId: ref.uuid,
                    userId: user.userId,
                    userDid: user.did,
                    globalTopicId: topic.topicId,
                    active: false,
                    documentType: 'any',
                });
            }

            ref.triggerEvents(PolicyOutputEventType.RefreshEvent, user, {});
            ref.backup();

            return {}
        }

        // Delete topics from DB rows
        if (operation === 'Delete') {
            const optionTopicIds = ref.options.topicIds ?? [];
            const defaultTopicIds = new Set<string>();

            for (const item of optionTopicIds) {
                defaultTopicIds.add(item.topicId);
            }


            for (const topic of topics) {
                if (defaultTopicIds.has(topic.topicId)) {
                    continue;
                }

                const existing = await ref.databaseServer.getGlobalEventsWriterStreamByUserTopic(
                    ref.policyId,
                    ref.uuid,
                    user.userId,
                    topic.topicId
                );

                if (existing) {
                    await ref.databaseServer.deleteGlobalEventsWriterStream(existing);
                }
            }
            ref.triggerEvents(PolicyOutputEventType.RefreshEvent, user, {});
            ref.backup();

            return {}
        }

        // Update active flags and document type
        if (operation === 'Update') {
            const setStreamsDbMap = new Map<string, GlobalEventsWriterStream>();

            for (const stream of streams) {
                this.validateTopicId(stream.topicId, ref);
            }

            const streamsDb = await ref.databaseServer.getGlobalEventsWriterStreamsByUser(
                ref.policyId,
                ref.uuid,
                user.userId
            );

            for (const streamDb of streamsDb) {
                setStreamsDbMap.set(streamDb.globalTopicId, streamDb);
            }

            const cacheKey = this.getCacheKey(ref, user);
            const cacheState = await this.getCacheState(ref, user, cacheKey);

            const docs = cacheState.docs || [];

            for (const streamSetData of streams) {
                const globalTopicId = streamSetData.topicId;

                if (!setStreamsDbMap.has(globalTopicId)) {
                    continue;
                }

                const streamDb = setStreamsDbMap.get(globalTopicId)!;

                const active = streamSetData.active;
                const documentType = streamSetData.documentType;

                if (typeof active === 'boolean') {
                    streamDb.active = active;

                    if (active && !streamDb.lastPublishMessageId) {
                        for (const doc of docs) {
                            if (!doc?.topicId) {
                                continue;
                            }

                            const documentMessageId: string = this.extractCanonicalAddress(doc);
                            if (!documentMessageId) {
                                continue;
                            }

                            const { schemaContextIri, schemaIri } = this.extractSchemaIris(ref, doc);

                            const payload: GlobalEvent = {
                                documentType: documentType,
                                documentTopicId: doc.topicId,
                                documentMessageId: documentMessageId,
                                schemaContextIri: schemaContextIri,
                                schemaIri: schemaIri,
                                timestamp: new Date().toISOString(),
                            };

                            await this.publish(ref, user, streamDb.globalTopicId, payload);

                            // Save last published message id for this stream
                            streamDb.lastPublishMessageId = documentMessageId;
                        }
                    }
                }

                if (documentType) {
                    streamDb.documentType = documentType;
                }

                await ref.databaseServer.updateGlobalEventsWriterStream(streamDb);
            }

            ref.triggerEvents(PolicyOutputEventType.RefreshEvent, user, {});
            ref.backup();

            return {};
        }

        throw new BlockActionError('Invalid operation', ref.blockType, ref.uuid);
    }
}
