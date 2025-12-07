import {CronJob} from 'cron';
import {EventBlock} from '../helpers/decorators/index.js';
import {PolicyInputEventType, PolicyOutputEventType} from '../interfaces/index.js';
import {
    AnyBlockType,
    IPolicyDocument,
    IPolicyEventState,
    IPolicyGetData,
    IPolicyValidatorBlock
} from '../policy-engine.interface.js';
import {BlockActionError} from '../errors/index.js';
import {PolicyComponentsUtils} from '../policy-components-utils.js';
import {PolicyUser} from '../policy-user.js';
import {PolicyUtils} from '../helpers/utils.js';
import {ChildrenType, ControlType, PropertyType} from '../interfaces/block-about.js';
import {LocationType, Schema} from '@guardian/interfaces';
import {ExternalDocuments, ExternalEvent, ExternalEventType} from '../interfaces/external-event.js';
import {GlobalEventsStream, MessageServer, MessageType, VcHelper, VCMessage} from '@guardian/common';
import {AccountId, Client, PrivateKey, Timestamp, TopicId, TopicMessageQuery} from '@hashgraph/sdk';

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
    documentTopicId: string;
    policyId: string;
    sourceBlockTag: string;
    documentSourceTag?: string;
    routingHint?: string;
    vcId?: string;
    hash?: string;
    // topicId?: string;
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
            PolicyInputEventType.RunEvent,
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
        setTimeout(() => {
            this.run(null).catch((error) => {
                try {
                    const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);
                    ref.error(
                        `globalTopicReader: initial run failed: ${PolicyUtils.getErrorMessage(error)}`
                    );
                } catch (e) {
                    console.error('globalTopicReader: initial run failed', error);
                }
            });
        }, 30_000);

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

        const options: any = ref.options || {};

        const topicIds: string[] = Array.isArray(options.topicIds)
            ? options.topicIds
            : [];

        console.log('topicIds', topicIds)

        const streams = await ref.databaseServer.getGlobalEventsStreams(ref.policyId, ref.uuid);
        console.log('streams', streams)

        const existingTopicIds = new Set<string>();

        for (const stream of streams) {
            if (stream.globalTopicId) {
                existingTopicIds.add(stream.globalTopicId);
            }
        }

        for (const rawTopicId of topicIds) {
            const topicId = (rawTopicId || '').trim();

            if (!topicId) {
                continue;
            }

            if (existingTopicIds.has(topicId)) {
                continue;
            }

            console.log('ref.policyOwner', ref.policyOwner)

            const newStream = await ref.databaseServer.createGlobalEventsStream({
                policyId: ref.policyId,
                blockId: ref.uuid,
                globalTopicId: topicId,
                ownerDid: ref.policyOwner,
                routingHint: null,
                lastMessage: '',
                lastUpdate: '',
                active: true,
                status: GlobalNotificationStatus.Free
            });

            streams.push(newStream);
            existingTopicIds.add(topicId);
        }

        const activeStreams = streams.filter((s) => s.active);

        console.log('activeStreams', activeStreams);

        if (!activeStreams.length) {
            return;
        }

        for (const stream of activeStreams) {
            if (stream.status === GlobalNotificationStatus.Free) {
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
            await this.receiveNotificationsForStream(stream, policyUser, userId);
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

    private async tryLoadHederaCredentials(
        ref: AnyBlockType,
        stream: GlobalEventsStream,
        policyUser: PolicyUser,
        userId: string | null
    ): Promise<any | null> {
        try {
            const userCred = await PolicyUtils.getUserCredentials(
                ref,
                stream.ownerDid || policyUser.did,
                userId
            );

            const hederaCred = await userCred.loadHederaCredentials(ref, userId);

            return hederaCred;
        } catch (error) {
            const message = PolicyUtils.getErrorMessage(error);

            console.error('globalTopicReader: credentials error', {
                error,
                message,
                ownerDid: stream.ownerDid,
                policyId: ref.policyId
            });

            if (message === 'Initialization') {
                console.warn('globalTopicReader: skip stream processing due to Initialization error', {
                    policyId: ref.policyId,
                    blockId: ref.uuid
                });

                return null;
            }

            throw error;
        }
    }

    private async receiveNotificationsForStream(
        stream: GlobalEventsStream,
        policyUser: PolicyUser,
        userId: string | null
    ): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);

        let hederaCred: any;
        try {
            hederaCred = await this.tryLoadHederaCredentials(
                ref,
                stream,
                policyUser,
                userId
            );

            if (!hederaCred) {
                return;
            }
        } catch (error) {
            console.error('globalTopicReader: credentials error', error);
            throw error;
        }

        let messages: GlobalTopicMessage[];
        try {
            messages = await this.getGlobalTopicMessages(
                stream.globalTopicId,
                stream.lastMessage,
                hederaCred.hederaAccountId,
                hederaCred.hederaAccountKey
            );
            console.log('globalTopicReader: messages from topic', messages);
        } catch (error) {
            console.error('globalTopicReader: getGlobalTopicMessages error', error);
            throw error;
        }

        for (const msg of messages) {
            if (stream.lastMessage && stream.lastMessage === msg.id) {
                continue;
            }

            const payload = this.parseNotification(msg.message);
            if (!payload || !payload.documentTopicId || !payload.documentMessageId) {
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

    private resolveValidAnchorFromPayload(
        payload: GlobalVsNotification
    ): { topicId: string; messageId: string; queryStartTime: string | undefined } | null {
        const topicId: string = payload.documentTopicId as string;
        const timeStamp: string = payload.documentMessageId as string;

        if (!topicId || !timeStamp) {
            console.warn('globalTopicReader: missing topicId or timeStamp in payload', {
                payload,
                topicId,
                timeStamp
            });
            return null;
        }

        // Validate topicId format via SDK
        try {
            TopicId.fromString(topicId);
        } catch (error) {
            console.error('globalTopicReader: invalid topicId format', {
                payload,
                topicId,
                errorMessage: PolicyUtils.getErrorMessage(error)
            });
            return null;
        }

        const topicParts = topicId.split('.');
        const topicNumStr = topicParts[2] || '';
        const topicNum = Number(topicNumStr);

        if (!Number.isFinite(topicNum) || topicNum <= 0 || topicNum > 1_000_000_000_000) {
            console.warn('globalTopicReader: topicId looks like corrupted timestamp-derived value', {
                payload,
                topicId,
                topicNum
            });
            return null;
        }

        if (typeof timeStamp !== 'string' || !timeStamp.includes('.')) {
            console.error('globalTopicReader: invalid timeStamp format (no dot)', {
                payload,
                timeStamp
            });
            return null;
        }

        const [secondsStr, nanosStr] = timeStamp.split('.');

        if (
            !secondsStr ||
            !nanosStr ||
            !/^\d+$/.test(secondsStr) ||
            !/^\d+$/.test(nanosStr)
        ) {
            console.error('globalTopicReader: invalid timeStamp parts (non-digit)', {
                payload,
                timeStamp
            });
            return null;
        }

        if (nanosStr.length !== 9) {
            console.warn('globalTopicReader: unexpected nanos length in timeStamp', {
                payload,
                timeStamp,
                nanosLength: nanosStr.length
            });
            return null;
        }

        const seconds = Number(secondsStr);

        if (!Number.isFinite(seconds) || seconds < 1_600_000_000) {
            console.warn('globalTopicReader: timeStamp seconds look too small (probably corrupted)', {
                payload,
                timeStamp,
                seconds
            });
            return null;
        }

        const queryStartSeconds = seconds > 0 ? seconds - 1 : 0;
        const queryStartTime = `${queryStartSeconds}.000000000`;

        return {
            topicId,
            messageId: timeStamp,
            queryStartTime
        };
    }

    private async processNotification(
        ref: AnyBlockType,
        user: PolicyUser,
        payload: GlobalVsNotification,
        hederaCred: any
    ): Promise<void> {
        console.log('globalTopicReader.processNotification: payload', payload);

        const anchor = this.resolveValidAnchorFromPayload(payload);
        if (!anchor) {
            // Already logged inside resolveValidAnchorFromPayload
            return;
        }

        let vcMessages: VCMessage[];
        try {
            vcMessages = await MessageServer.getTopicMessages({
                topicId: anchor.topicId,
                userId: payload.owner,
                timeStamp: anchor.queryStartTime
            });
        } catch (error) {
            console.error('globalTopicReader: getTopicMessages failed', {
                payload,
                topicId: anchor.topicId,
                timeStamp: anchor.queryStartTime,
                errorMessage: PolicyUtils.getErrorMessage(error),
                status: (error as any)?.response?.status,
                data: (error as any)?.response?.data,
                url: (error as any)?.config?.url
            });
            return;
        }

        if (!vcMessages || !vcMessages.length) {
            console.warn('globalTopicReader: no VC messages for payload', {
                payload,
                topicId: anchor.topicId,
                timeStamp: anchor.queryStartTime
            });
            return;
        }

        const vcMessage = vcMessages.find((item) => {
            const anyItem: any = item;

            if (typeof anyItem.hash === 'string' && typeof payload.hash === 'string') {
                if (anyItem.hash === payload.hash) {
                    return true;
                }
            }

            if (typeof anyItem.getId === 'function') {
                const id = anyItem.getId();
                if (typeof id === 'string' && id === payload.documentMessageId) {
                    return true;
                }
            }

            return false;
        });

        if (!vcMessage) {
            console.warn('globalTopicReader: VC message not found by hash or id for payload', {
                payload,
                available: vcMessages.map((item: any) => ({
                    id: typeof item.getId === 'function' ? item.getId() : item.id,
                    hash: item.hash
                }))
            });
            return;
        }

        const message = vcMessage;

        try {
            await MessageServer.loadDocument(message, hederaCred.hederaAccountKey);
        } catch (error) {
            console.error('globalTopicReader: loadDocument failed', {
                payload,
                messageId: message.getId?.(),
                errorMessage: PolicyUtils.getErrorMessage(error),
                status: (error as any)?.response?.status,
                data: (error as any)?.response?.data,
                url: (error as any)?.config?.url
            });
            return;
        }

        if (message.type !== MessageType.VCDocument) {
            console.warn('globalTopicReader: message is not VCDocument', {
                payload,
                type: message.type
            });
            return;
        }

        const document = message.getDocument();
        if (!document) {
            console.warn('globalTopicReader: empty document', {
                payload,
                messageId: message.getId?.()
            });
            return;
        }

        const schema = await this.getSchema();
        if (schema && !this.verifyContext(document, schema)) {
            console.warn('globalTopicReader: context mismatch', {
                payload,
                schemaIri: schema.iri
            });
            return;
        }

        const vcHelper = new VcHelper();

        let verifySchema;
        try {
            verifySchema = await vcHelper.verifySchema(document);
        } catch (error) {
            console.error('globalTopicReader: verifySchema failed', {
                payload,
                errorMessage: PolicyUtils.getErrorMessage(error),
                status: (error as any)?.response?.status,
                data: (error as any)?.response?.data,
                url: (error as any)?.config?.url
            });
            return;
        }

        if (!verifySchema.ok) {
            console.warn('globalTopicReader: verifySchema not ok', {
                payload,
                details: verifySchema
            });
            return;
        }

        let verify;
        try {
            verify = await vcHelper.verifyVC(document);
        } catch (error) {
            console.error('globalTopicReader: verifyVC failed', {
                payload,
                errorMessage: PolicyUtils.getErrorMessage(error),
                status: (error as any)?.response?.status,
                data: (error as any)?.response?.data,
                url: (error as any)?.config?.url
            });
            return;
        }

        if (!verify) {
            console.warn('globalTopicReader: verifyVC returned false', { payload });
            return;
        }

        let relationships;
        try {
            relationships = await this.getRelationships(ref, user);
        } catch (error) {
            console.error('globalTopicReader: getRelationships failed', {
                payload,
                errorMessage: PolicyUtils.getErrorMessage(error)
            });
            return;
        }

        let relayerAccount;
        try {
            relayerAccount = await PolicyUtils.getRefRelayerAccount(
                ref,
                user.did,
                null,
                relationships,
                user.userId
            );
        } catch (error) {
            console.error('globalTopicReader: getRefRelayerAccount failed', {
                payload,
                errorMessage: PolicyUtils.getErrorMessage(error),
                status: (error as any)?.response?.status,
                data: (error as any)?.response?.data,
                url: (error as any)?.config?.url
            });
            return;
        }

        const policyDocument: IPolicyDocument = PolicyUtils.createPolicyDocument(ref, user, document);
        policyDocument.schema = ref.options.schema;
        policyDocument.relayerAccount = relayerAccount;

        console.log(
            'GlobalEventsReaderBlock.processNotification policyDocument',
            {
                payload,
                policyId: policyDocument.policyId,
                schema: policyDocument.schema,
                topicId: policyDocument.topicId,
                messageId: policyDocument.messageId,
                hash: policyDocument.hash,
                owner: policyDocument.owner,
            }
        );

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

        return new Promise<GlobalTopicMessage[]>((resolve) => {
            const subscription = query.subscribe(
                client,
                (error) => {
                    console.error('globalTopicReader: subscribe error', error);
                    subscription.unsubscribe();
                    client.close();
                    resolve(result);
                },
                (message) => {
                    try {
                        const text = Buffer
                            .from(message.contents)
                            .toString('utf8');

                        const consensusDate = message.consensusTimestamp.toDate();
                        const ms = consensusDate.getTime();

                        result.push({
                            id: ms.toString(),
                            sequenceNumber: Number(message.sequenceNumber.toString()),
                            consensusTimestamp: consensusDate.toISOString(),
                            message: text
                        });
                    } catch (error) {
                        console.error('globalTopicReader: message handler error', error);
                    }
                }
            );

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
                    ownerDid: user.did,
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
