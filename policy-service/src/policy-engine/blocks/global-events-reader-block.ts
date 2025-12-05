import { CronJob } from 'cron';
import { ActionCallback, EventBlock } from '../helpers/decorators/index.js';
import { PolicyInputEventType, PolicyOutputEventType } from '../interfaces/index.js';
import { AnyBlockType, IPolicyAddonBlock, IPolicyDocument, IPolicyEventState, IPolicyGetData, IPolicyValidatorBlock } from '../policy-engine.interface.js';
import { BlockActionError } from '../errors/index.js';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { IHederaCredentials, PolicyUser } from '../policy-user.js';
import { PolicyUtils } from '../helpers/utils.js';
import { ChildrenType, ControlType, PropertyType } from '../interfaces/block-about.js';
import { LocationType, Schema, SchemaField, TopicType } from '@guardian/interfaces';
import {
    ExternalDocuments,
    ExternalEvent,
    ExternalEventType
} from '../interfaces/external-event.js';
import {
    MessageServer,
    MessageType,
    VCMessage,
    VcHelper,
    GlobalEventsStream
} from '@guardian/common';
import { TopicId } from '@hashgraph/sdk';
import {
    Client,
    PrivateKey,
    TopicMessageQuery,
    Timestamp,
    AccountId
} from '@hashgraph/sdk';

enum GlobalNotificationStatus {
    Free = 'FREE',
    Processing = 'PROCESSING',
    Error = 'ERROR'
}

interface GlobalTopicMessage {
    id: string;
    sequenceNumber: number;
    consensusTimestamp: string;
    message: string;
}

interface GlobalVsNotification {
    documentMessageId: string;
    policyId: string;
    sourceBlockTag: string;
    documentSourceTag?: string;
    routingHint?: string;
    vcId?: string;
    hash?: string;
    topicId?: string;
    relationships?: string[];
    owner?: string;
    timestamp: string;
}

@EventBlock({
    blockType: 'globalTopicReaderBlock',
    commonBlock: false,
    actionType: LocationType.REMOTE,
    about: {
        label: 'Global Notifications',
        title: `Add 'Global Notifications' Block`,
        post: true,
        get: true,
        children: ChildrenType.Special,
        control: ControlType.Server,
        input: [
            PolicyInputEventType.TimerEvent
        ],
        output: [
            PolicyOutputEventType.RunEvent,
            PolicyOutputEventType.RefreshEvent,
            PolicyOutputEventType.ErrorEvent,
            PolicyOutputEventType.ReleaseEvent
        ],
        defaultEvent: true,
        properties: [
            {
                name: 'topics',
                label: 'Global topics',
                title: 'Global topics (list or JSON array)',
                type: PropertyType.Input
            },
            {
                name: 'schema',
                label: 'Schema',
                title: 'Expected schema',
                type: PropertyType.Schemas
            }
        ]
    },
    variables: [
        { path: 'options.schema', alias: 'schema', type: 'Schema' }
    ]
})
export class GlobalEventsReaderBlock {
    private schema: Schema | null;
    private job: CronJob;

    protected async afterInit(): Promise<void> {
        const cronMask = process.env.GLOBAL_NOTIFICATIONS_SCHEDULER || '0 */5 * * * *';
        console.log('afterInit-reader')
        this.job = new CronJob(cronMask, () => {
            this.run(null).then();
        }, null, false, 'UTC');
        this.job.start();
    }

    protected destroy(): void {
        if (this.job) {
            this.job.stop();
        }
    }

    protected getValidators(): IPolicyValidatorBlock[] {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        const validators: IPolicyValidatorBlock[] = [];
        for (const child of ref.children) {
            if (child.blockClassName === 'ValidatorBlock') {
                validators.push(child as IPolicyValidatorBlock);
            }
        }
        return validators;
    }

    protected async validateDocuments(user: PolicyUser, state: any): Promise<string> {
        const validators = this.getValidators();
        for (const validator of validators) {
            const error = await validator.run({
                type: null,
                inputType: null,
                outputType: null,
                policyId: null,
                source: null,
                sourceId: null,
                target: null,
                targetId: null,
                user,
                data: state
            });
            if (error) {
                return error;
            }
        }
        return null;
    }

    private updateStatus(ref: AnyBlockType, stream: GlobalEventsStream, user: PolicyUser): void {
        ref.updateBlock({ status: stream.status }, user, ref.tag, user.userId);
    }

    private async getSchema(): Promise<Schema> {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);
        if (!ref.options.schema) {
            return null;
        }
        if (!this.schema) {
            const schema = await PolicyUtils.loadSchemaByID(ref, ref.options.schema);
            this.schema = schema ? new Schema(schema) : null;
            if (!this.schema) {
                throw new BlockActionError('Waiting for schema', ref.blockType, ref.uuid);
            }
        }
        return this.schema;
    }

    public async run(userId: string | null): Promise<void> {
        console.log('run-reader')
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);
        const streams = await ref.databaseServer.getActiveGlobalEventsStreams(ref.policyId, ref.uuid);
        if (!streams || !streams.length) {
            return;
        }
        for (const stream of streams) {
            if (stream.status === GlobalNotificationStatus.Free && stream.active) {
                await this.runByStream(stream, userId);
            }
        }
    }

    private async runByStream(stream: GlobalEventsStream, userId: string | null): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);
        stream.status = GlobalNotificationStatus.Processing;
        await ref.databaseServer.updateGlobalEventsStream(stream);

        const policyUser = await PolicyComponentsUtils.GetPolicyUserByDID(stream.ownerDid || null, null, ref, userId);
        this.updateStatus(ref, stream, policyUser);
        try {
            await this.receiveNotificationsForStream(stream, policyUser);
            stream.status = GlobalNotificationStatus.Free;
            stream.lastUpdate = new Date().toISOString();
            await ref.databaseServer.updateGlobalEventsStream(stream);
        } catch (error) {
            stream.status = GlobalNotificationStatus.Error;
            await ref.databaseServer.updateGlobalEventsStream(stream);
            ref.error(`globalNotificationsBlock: ${PolicyUtils.getErrorMessage(error)}`);
        }
        this.updateStatus(ref, stream, policyUser);
    }

    private async receiveNotificationsForStream(stream: GlobalEventsStream, policyUser: PolicyUser): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);
        const userCred = await PolicyUtils.getUserCredentials(ref, stream.ownerDid || policyUser.did, policyUser.userId);
        const hederaCred = await userCred.loadHederaCredentials(ref, policyUser.userId);

        const messages = await this.getGlobalTopicMessages(
            stream.globalTopicId,
            stream.lastMessage,
            hederaCred.hederaAccountId,
            hederaCred.hederaAccountKey
        );

        for (const msg of messages) {
            if (stream.lastMessage && stream.lastMessage === msg.id) {
                continue;
            }
            const payload = this.parseNotification(msg.message);
            if (!payload || !payload.topicId || !payload.documentMessageId) {
                continue;
            }
            try {
                await this.processNotification(ref, policyUser, payload, hederaCred);
                stream.lastMessage = msg.id;
                await ref.databaseServer.updateGlobalEventsStream(stream);
            } catch (error) {
                ref.error(`globalNotificationsBlock.process: ${PolicyUtils.getErrorMessage(error)}`);
            }
        }
    }

    private parseNotification(message: string): GlobalVsNotification | null {
        try {
            const payload = JSON.parse(message) as GlobalVsNotification;
            return payload;
        } catch (error) {
            return null;
        }
    }

    private async processNotification(
        ref: AnyBlockType,
        user: PolicyUser,
        payload: GlobalVsNotification,
        hederaCred: any
    ): Promise<void> {
        const vcMessages: VCMessage[] = await MessageServer.getTopicMessages({
            topicId: payload.topicId,
            userId: user.userId,
            timeStamp: payload.documentMessageId
        });
        if (!vcMessages || !vcMessages.length) {
            return;
        }
        const message = vcMessages[0];
        await MessageServer.loadDocument(message, hederaCred.hederaAccountKey);
        if (message.type !== MessageType.VCDocument) {
            return;
        }

        const document = message.getDocument();
        if (!document) {
            return;
        }

        const schema = await this.getSchema();
        if (schema && !this.verifyContext(document, schema)) {
            return;
        }

        const vcHelper = new VcHelper();
        const verifySchema = await vcHelper.verifySchema(document);
        if (!verifySchema.ok) {
            return;
        }
        const verify = await vcHelper.verifyVC(document);
        if (!verify) {
            return;
        }

        const relationships = await this.getRelationships(ref, user);
        const relayerAccount = await PolicyUtils.getRefRelayerAccount(
            ref,
            user.did,
            null,
            relationships,
            user.userId
        );
        const policyDocument: IPolicyDocument = PolicyUtils.createPolicyDocument(ref, user, document);
        policyDocument.schema = ref.options.schema;
        policyDocument.relayerAccount = relayerAccount;
        if (relationships) {
            PolicyUtils.setDocumentRef(policyDocument, relationships);
        }
        if (policyDocument.relationships) {
            policyDocument.relationships.push(message.getId());
        } else {
            policyDocument.relationships = [message.getId()];
        }

        const state: IPolicyEventState = { data: policyDocument };
        const error = await this.validateDocuments(user, state);
        if (error) {
            throw new BlockActionError(error, ref.blockType, ref.uuid);
        }

        ref.triggerEvents(PolicyOutputEventType.RunEvent, user, state);
        ref.triggerEvents(PolicyOutputEventType.ReleaseEvent, user, null);
        ref.triggerEvents(PolicyOutputEventType.RefreshEvent, user, state);
        PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.Run, ref, user, {
            documents: ExternalDocuments(policyDocument)
        }));
        ref.backup();
    }

    private verifyContext(document: any, schema: Schema): boolean {
        try {
            const context = document['@context'];
            if (!Array.isArray(context)) {
                return false;
            }
            return context.indexOf(schema.iri) !== -1;
        } catch (error) {
            return false;
        }
    }

    private async getRelationships(ref: AnyBlockType, user: PolicyUser): Promise<any> {
        try {
            for (const child of ref.children) {
                if (child.blockClassName === 'SourceAddon') {
                    const childData = await (child as any).getFromSource(user, null);
                    if (childData && childData.length) {
                        return childData[0];
                    }
                }
            }
            return null;
        } catch (error) {
            ref.error(PolicyUtils.getErrorMessage(error));
            return null;
        }
    }

    private async getGlobalTopicMessages(
        topicId: string,
        startFrom: string | null,
        hederaAccountId: string,
        hederaPrivateKey: string
    ): Promise<GlobalTopicMessage[]> {
        if (!topicId) {
            return [];
        }

        /**
         * Validate topic id format early to fail-fast on invalid values.
         */
        TopicId.fromString(topicId);

        /**
         * Choose Hedera network.
         * If there is an explicit environment variable for the network, use it.
         * Otherwise, fall back to testnet by default.
         */
        const networkEnv = process.env.HEDERA_NETWORK || process.env.HEDERA_NET || 'testnet';

        let client: Client;

        if (networkEnv.toLowerCase() === 'mainnet') {
            client = Client.forMainnet();
        } else if (networkEnv.toLowerCase() === 'previewnet') {
            client = Client.forPreviewnet();
        } else {
            client = Client.forTestnet();
        }

        client.setOperator(
            AccountId.fromString(hederaAccountId),
            PrivateKey.fromString(hederaPrivateKey)
        );

        /**
         * We store lastMessage as "milliseconds since epoch" in a string.
         * For the initial read, start from 0 (epoch start).
         */
        const startDate = startFrom
            ? new Date(Number(startFrom))
            : new Date(0);

        const startTimestamp = Timestamp.fromDate(startDate);
        const topic = TopicId.fromString(topicId);

        const query = new TopicMessageQuery()
            .setTopicId(topic)
            .setStartTime(startTimestamp);

        const result: GlobalTopicMessage[] = [];

        return new Promise<GlobalTopicMessage[]>((resolve, reject) => {
            const subscription = query.subscribe(
                client,
                (message) => {
                    try {
                        const text = Buffer
                            .from(message.contents)
                            .toString('utf8');

                        const consensusDate = message.consensusTimestamp.toDate();
                        const ms = consensusDate.getTime();

                        result.push({
                            id: ms.toString(),                                  // value to be stored in lastMessage
                            sequenceNumber: Number(message.sequenceNumber.toString()),
                            consensusTimestamp: consensusDate.toISOString(),    // for debugging / UI
                            message: text
                        });
                    } catch (error) {
                        subscription.unsubscribe();
                        client.close();
                        reject(error);
                    }
                },
                (error) => {
                    subscription.unsubscribe();
                    client.close();
                    reject(error);
                }
            );

            /**
             * Simple timeout guard to avoid keeping the subscription open indefinitely.
             * Can be replaced with a more robust mechanism (limit, explicit close, etc.) if needed.
             */
            setTimeout(() => {
                subscription.unsubscribe();
                client.close();
                resolve(result);
            }, 3000);
        });
    }

    public async setData(user: PolicyUser, payload: any): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);

        if (!payload || !Array.isArray(payload.streams)) {
            throw new BlockActionError('Invalid payload', ref.blockType, ref.uuid);
        }

        const streamsPayload: {
            globalTopicId: string;
            routingHint?: string;
            active?: boolean;
        }[] = payload.streams;

        const existing = await ref.databaseServer.getGlobalEventsStreams(
            ref.policyId,
            ref.uuid
        );

        const byTopic = new Map<string, GlobalEventsStream>();
        for (const s of existing) {
            if (s.globalTopicId) {
                byTopic.set(s.globalTopicId, s);
            }
        }

        const seen = new Set<string>();

        for (const item of streamsPayload) {
            const topicId = (item.globalTopicId || '').trim();
            if (!topicId) {
                continue;
            }

            seen.add(topicId);

            let stream = byTopic.get(topicId);
            if (!stream) {
                stream = await ref.databaseServer.createGlobalEventsStream({
                    policyId: ref.policyId,
                    blockId: ref.uuid,
                    globalTopicId: topicId,
                    ownerDid: null,
                    routingHint: item.routingHint || null,
                    lastMessage: '',
                    lastUpdate: '',
                    active: typeof item.active === 'boolean' ? item.active : true,
                    status: GlobalNotificationStatus.Free
                });
            } else {
                stream.routingHint = item.routingHint || stream.routingHint || null;

                if (typeof item.active === 'boolean') {
                    stream.active = item.active;
                }

                await ref.databaseServer.updateGlobalEventsStream(stream);
            }
        }

        for (const stream of existing) {
            if (!stream.globalTopicId) {
                continue;
            }
            if (!seen.has(stream.globalTopicId) && stream.active) {
                stream.active = false;
                await ref.databaseServer.updateGlobalEventsStream(stream);
            }
        }

        return await this.getData(user);
    }

    public async getData(user: PolicyUser): Promise<IPolicyGetData> {
        const ref = PolicyComponentsUtils.GetBlockRef(this);
        const streams = await ref.databaseServer.getGlobalEventsStreams(
            ref.policyId,
            ref.uuid
        );

        const list = (streams || []).map((s: GlobalEventsStream) => {
            return {
                globalTopicId: s.globalTopicId,
                routingHint: s.routingHint,
                lastMessage: s.lastMessage,
                lastUpdate: s.lastUpdate,
                status: s.status,
                active: s.active
            };
        });

        return {
            id: ref.uuid,
            blockType: ref.blockType,
            actionType: ref.actionType,
            readonly: (
                ref.actionType === LocationType.REMOTE &&
                user.location === LocationType.REMOTE
            ),
            streams: list
        } as any;
    }
}
