/**
 * GlobalEventsWriterBlock
 *
 * Server-side policy block that forwards a reference to an already anchored VC/VP/VS
 * into one or more global Hedera topics. It does not create or modify documents
 * and does not persist anything; it simply extracts the canonical address
 * (messageId) from the incoming IPolicyDocument and publishes a compact JSON
 * notification.
 */

import { ActionCallback, EventBlock } from '../helpers/decorators/index.js';
import { BlockActionError } from '../errors/index.js';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { PolicyInputEventType, PolicyOutputEventType } from '../interfaces/index.js';
import { AnyBlockType, IPolicyDocument, IPolicyEventState } from '../policy-engine.interface.js';
import { PolicyUser } from '../policy-user.js';
import { PolicyUtils } from '../helpers/utils.js';
import { ChildrenType, ControlType, PropertyType } from '../interfaces/block-about.js';
import { LocationType, TopicType } from '@guardian/interfaces';
import { MessageServer, TopicConfig, TopicHelper } from '@guardian/common';
import { TopicId } from '@hashgraph/sdk';

type GlobalDocumentType = 'vc' | 'json' | 'csv' | 'text' | 'any';

/**
 * Notification sent to global topics.
 *
 * schemaContextIri: base context IRI (schema "package" / base context)
 * schemaIri: full schema IRI (context#type)
 */
interface GlobalEvent {
    documentType: GlobalDocumentType;
    documentTopicId: string;        // Hedera topic where the VC is stored
    documentMessageId: string;      // Specific VC message in this topic
    schemaContextIri: string;       // Base context IRI (package/base context)
    schemaIri: string;              // Full schema IRI (context#type)
    timestamp: string;              // ISO timestamp of publish moment
}

interface SubmitValue {
    topicIds?: Array<{ topicId?: string }>;
    documentType?: GlobalDocumentType;
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
                default: 'any',
            },
            {
                name: 'topicIds',
                label: 'Global topic ids',
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
                    ],
                },
            },
        ],
    },
})
export class GlobalEventsWriterBlock {
    @ActionCallback({
        type: PolicyInputEventType.RunEvent,
        output: [
            PolicyOutputEventType.RefreshEvent,
            PolicyOutputEventType.ReleaseEvent,
            PolicyOutputEventType.ErrorEvent,
        ],
    })
    public async runAction(event: IPolicyEventState): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);
        const user: PolicyUser = (event as any)?.user;

        if (!user) {
            throw new BlockActionError('User is required', ref.blockType, ref.uuid);
        }

        const state: IPolicyEventState = (event)?.data || (event as any);
        const doc: IPolicyDocument = state?.data as IPolicyDocument;

        if (!doc) {
            throw new BlockActionError('Document is required', ref.blockType, ref.uuid);
        }

        if (!doc.topicId) {
            throw new BlockActionError('Document topicId is missing', ref.blockType, ref.uuid);
        }

        const documentMessageId: string = this.extractCanonicalAddress(doc);
        if (!documentMessageId) {
            throw new BlockActionError(
                'Canonical document address (messageId) is missing',
                ref.blockType,
                ref.uuid
            );
        }

        const stateKey = this.getStateKey(ref, user);

        let cacheState: any = {};

        try {
            const cached = await ref.getCache<any>(stateKey, user);

            if (cached && typeof cached === 'object') {
                cacheState = cached;
            }
        } catch (err) {
            // no state
        }

        cacheState.doc = doc;

        await ref.setShortCache(stateKey, cacheState, user);

        const outState: IPolicyEventState = { data: doc } as any;

        ref.triggerEvents(PolicyOutputEventType.RefreshEvent, user, outState);
        ref.triggerEvents(PolicyOutputEventType.ReleaseEvent, user, outState);
        ref.backup();
    }

    /**
     * Prefer Hedera messageId as canonical address.
     */
    private extractCanonicalAddress(doc: IPolicyDocument): string {
        if (doc.messageId) {
            return doc.messageId;
        }
        return '';
    }

    /**
     * Extract (schemaContextIri, schemaIri) primarily from the VC itself.
     *
     * Why: doc.schema in DB is often an internal schema ID (#uuid&version), not an IRI.
     * VC @context may already contain context#type or at least the base context.
     */
    private extractSchemaIris(
        ref: AnyBlockType,
        doc: IPolicyDocument
    ): { schemaContextIri: string; schemaIri: string } {
        try {
            let vc: any = (doc as any).document;

            if (typeof vc === 'string') {
                vc = JSON.parse(vc);
            }

            const ctx = vc?.['@context'];
            const ctxList: string[] = Array.isArray(ctx)
                ? ctx.filter((v: any) => typeof v === 'string')
                : [];

            const fullIri = ctxList.find((c) => c.includes('#'));
            if (fullIri) {
                return {
                    schemaContextIri: fullIri.split('#')[0] || '',
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
            }) || '';

            const cs = PolicyUtils.getCredentialSubjectByDocument?.(vc);

            const csTypeRaw =
                (Array.isArray(cs?.type) ? cs.type[0] : cs?.type) ||
                cs?.['@type'] ||
                (doc as any).type;

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

            const schema = typeof doc.schema === 'string' ? doc.schema : '';
            if ((schema.startsWith('http') || schema.startsWith('ipfs://')) && schema.includes('#')) {
                return {
                    schemaContextIri: schema.split('#')[0] || '',
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
     * Publish JSON payload to the configured global topic using user credentials.
     */
    private async publish(
        ref: AnyBlockType,
        user: PolicyUser,
        globalTopicId: string,
        payload: GlobalEvent
    ): Promise<void> {
        try {
            const userCredentials = await PolicyUtils.getUserCredentials(
                ref,
                user.did,
                user.userId
            );

            const hederaAccount = await userCredentials.loadRelayerAccount(
                ref,
                user.hederaAccountId,
                user.userId
            );

            const topic = new TopicConfig({ topicId: globalTopicId }, null, null);

            const messageServer = new MessageServer({
                operatorId: hederaAccount.hederaAccountId, // process.env.HEDERA_OPERATOR_ID
                operatorKey: hederaAccount.hederaAccountKey, // process.env.HEDERA_OPERATOR_KEY
                encryptKey: hederaAccount.hederaAccountKey,
                signOptions: hederaAccount.signOptions,
                dryRun: ref.dryRun
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
                    }
                };
            })();

            await (messageServer as any).sendMessage(rawMessage, {
                sendToIPFS: false,
                memo: 'GlobalEvent',
                userId: user.userId,
                interception: null
            });
        } catch (err) {
            ref.error(`Publish to global topic failed: ${PolicyUtils.getErrorMessage(err)}`);
            throw new BlockActionError('Publish to global topic failed', ref.blockType, ref.uuid);
        }
    }

    /**
     * Create a new dynamic global topic using user's relayer credentials.
     * Returns created topicId.
     */
    private async createTopic(ref: AnyBlockType, user: PolicyUser): Promise<string> {
        try {
            const userCredentials = await PolicyUtils.getUserCredentials(
                ref,
                user.did,
                user.userId
            );

            const relayer = await userCredentials.loadRelayerAccount(
                ref,
                user.hederaAccountId,
                user.userId
            );

            const topicHelper = new TopicHelper(
                relayer.hederaAccountId,
                relayer.hederaAccountKey,
                relayer.signOptions,
                ref.dryRun
            );

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
            ref.error(`Create topic failed: ${PolicyUtils.getErrorMessage(err)}`);
            throw new BlockActionError('Create topic failed', ref.blockType, ref.uuid);
        }
    }

    public async setData(user: PolicyUser, data: { value: SubmitValue, operation: string }): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);

        if (!data || !['Submit', 'Update', 'CreateTopic'].includes(data.operation)) {
            throw new BlockActionError('Invalid operation', ref.blockType, ref.uuid);
        }

        const value: SubmitValue = data.value ?? {};

        // Save form state on every change (for refresh) - now in ONE state object
        const stateKey = this.getStateKey(ref, user);

        let cacheState: any = {};

        try {
            const cached = await ref.getCache<any>(stateKey, user);

            if (cached && typeof cached === 'object') {
                cacheState = cached;
            }
        } catch (err) {
            // no state
        }

        cacheState.value = value;

        await ref.setShortCache(stateKey, cacheState, user);

        if (data.operation === 'CreateTopic') {
            const createdTopicId = await this.createTopic(ref, user);

            const currentValue: SubmitValue = (cacheState.value && typeof cacheState.value === 'object')
                ? cacheState.value
                : {};

            const currentTopicIds = Array.isArray(currentValue.topicIds)
                ? currentValue.topicIds
                : [];

            currentValue.topicIds = [
                ...currentTopicIds,
                { topicId: createdTopicId },
            ];

            cacheState.value = currentValue;

            await ref.setShortCache(stateKey, cacheState, user);

            ref.triggerEvents(PolicyOutputEventType.RefreshEvent, user, {} as any);
            ref.backup();

            return {
                topicId: createdTopicId,
            };
        }


        if (data.operation === 'Update') {
            ref.backup();
            return {};
        }

        const doc: IPolicyDocument | undefined = cacheState.doc;

        if (!doc) {
            throw new BlockActionError('No pending document to publish', ref.blockType, ref.uuid);
        }

        const rawTopicIds = Array.isArray(value.topicIds) ? value.topicIds : [];
        const topicIds = rawTopicIds
            .map((t) => (t?.topicId || '').trim())
            .filter((t) => t.length > 0);

        if (topicIds.length === 0) {
            throw new BlockActionError('At least one topic is required', ref.blockType, ref.uuid);
        }

        const documentType: GlobalDocumentType = value.documentType || 'any';

        const documentMessageId: string = this.extractCanonicalAddress(doc);
        const { schemaContextIri, schemaIri } = this.extractSchemaIris(ref, doc);

        const payload: GlobalEvent = {
            documentType,
            documentTopicId: doc.topicId,
            documentMessageId,
            schemaContextIri,
            schemaIri,
            timestamp: new Date().toISOString(),
        };

        for (const topicId of topicIds) {
            try {
                TopicId.fromString(topicId);
            } catch (err) {
                throw new BlockActionError('Invalid topic id format', ref.blockType, ref.uuid);
            }

            await this.publish(ref, user, topicId, payload);
        }

        // Clear saved state after successful publish (doc + value)
        await ref.setShortCache(stateKey, null as any, user);

        const outState: IPolicyEventState = { data: doc } as any;

        ref.triggerEvents(PolicyOutputEventType.RunEvent, user, outState);
        ref.triggerEvents(PolicyOutputEventType.RefreshEvent, user, outState);
        ref.backup();

        return {};
    }

    public async getData(user: PolicyUser): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);

        const topicIds = Array.isArray(ref.options?.topicIds)
            ? ref.options.topicIds
            : [];

        const defaultTopics = topicIds.map((t: any) => {
            return { topicId: t?.topicId || '' };
        });

        const stateKey = this.getStateKey(ref, user);

        let value: SubmitValue | null = null;

        try {
            const cached = await ref.getCache<any>(stateKey, user);

            if (cached && typeof cached === 'object' && cached.value && typeof cached.value === 'object') {
                value = cached.value as SubmitValue;
            }
        } catch (err) {
            // no state
        }

        return {
            topicIds: value?.topicIds ?? defaultTopics,
            documentType: value?.documentType ?? (ref.options?.documentType ?? 'any')
        };
    }

    private getStateKey(ref: AnyBlockType, user: PolicyUser): string {
        return `globalEventsWriterBlock:state:${ref.policyId}:${ref.uuid}:${user.userId}`;
    }
}
