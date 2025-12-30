import { CronJob } from 'cron';
import { ActionCallback, EventBlock } from '../helpers/decorators/index.js';
import { BlockActionError } from '../errors/index.js';
import { CacheState, IPolicyEvent, PolicyInputEventType, PolicyOutputEventType } from '../interfaces/index.js';
import { AnyBlockType, IPolicyDocument, IPolicyEventState, IPolicyGetData, IPolicyValidatorBlock } from '../policy-engine.interface.js';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { PolicyUser } from '../policy-user.js';
import { PolicyUtils } from '../helpers/utils.js';
import { ChildrenType, ControlType, PropertyType } from '../interfaces/block-about.js';
import { GLOBAL_DOCUMENT_TYPE_DEFAULT, GLOBAL_DOCUMENT_TYPE_ITEMS, GlobalDocumentType, GlobalEvent, GlobalEventsReaderStreamRow, GlobalEventsStreamStatus,
    LocationType, Schema, SchemaField, SchemaHelper, SetDataPayloadReader, TopicType,  WorkerTaskType
} from '@guardian/interfaces';
import { ExternalEvent, ExternalEventType } from '../interfaces/external-event.js';
import { GlobalEventsReaderStream, IPFS, MessageAction, MessageServer, SchemaMessage, SchemaPackageMessage, TopicHelper, UrlType, Workers} from '@guardian/common';
import {TopicId} from '@hashgraph/sdk';

/**
 * Message fetched from Hedera topic via worker-service.
 */
export interface GlobalTopicMessage {
    sequenceNumber: number;
    consensusTimestamp: string;
    message: string;
    runningHash?: string;
}

interface GlobalEventReaderBranchConfig {
    branchEvent: string;
    documentType: GlobalDocumentType;
    schema?: string;
}

interface GlobalEventReaderConfig {
    eventTopics: { topicId: string, active: boolean }[] | [];
    documentType: GlobalDocumentType;
    branches: GlobalEventReaderBranchConfig[] | [];
    showNextButton: boolean;
}

type GlobalReaderEventState = IPolicyEventState & {
    user: PolicyUser;
    event: GlobalEvent;
};

type FilterCheckResult = { action: 'ok' } | { action: 'error'; reason: string };

type SchemaBatchItem = {
    id: string;
    cid: string;
    sub: string | null;
    name?: string;
};

type SchemaFieldRef = {
    field: SchemaField;
    documentPath: string;
};

type SchemaFieldIndex = {
    byName: Map<string, SchemaFieldRef>;
    byTitle: Map<string, SchemaFieldRef>;
    byDescription: Map<string, SchemaFieldRef>;
};

type WorkerTopicMessageRaw = {
    id: string;
    message: string;
    sequence_number: number | string;
    running_hash?: string;
};

@EventBlock({
    blockType: 'globalEventsReaderBlock',
    commonBlock: false,
    actionType: LocationType.REMOTE,
    about: {
        label: 'Global Events Reader',
        title: `Add 'Global Events Reader' Block`,
        post: true,
        get: true,
        children: ChildrenType.Special,
        control: ControlType.UI,
        input: [
            PolicyInputEventType.RunEvent,
            PolicyInputEventType.TimerEvent
        ],
        output: [
            PolicyOutputEventType.RunEvent,
            PolicyOutputEventType.RefreshEvent,
            PolicyOutputEventType.ReleaseEvent,
            PolicyOutputEventType.ErrorEvent
        ],
        defaultEvent: true,
        properties: [
            {
                name: 'showNextButton',
                label: 'Show Next button',
                title: 'Show button to move to next block with cached payload',
                type: PropertyType.Checkbox,
                default: false,
            },
            {
                name: 'eventTopics',
                label: 'Event topics',
                title: 'Hedera topic ids to listen',
                type: PropertyType.Array,
                items: {
                    label: 'Event topic',
                    value: '@topicId',
                    properties: [
                        {
                            name: 'topicId',
                            label: 'Topic ID',
                            title: 'Hedera topic id (0.0.x)',
                            type: PropertyType.Input
                        }
                    ]
                }
            },
            {
                name: 'active',
                label: 'Active by default',
                title: 'Add this topic stream as active for new users',
                type: PropertyType.Checkbox,
                default: true,
            },
            {
                name: 'branches',
                label: 'Branches',
                title: 'Branch outputs',
                type: PropertyType.Array,
                items: {
                    label: 'Branch',
                    value: '@branchEvent',
                    properties: [
                        {
                            name: 'branchEvent',
                            label: 'Branch event',
                            title: 'Output event name',
                            type: PropertyType.Input
                        },
                        {
                            name: 'documentType',
                            label: 'Document type',
                            title: 'Expected message type for this branch (reader-side filtering)',
                            type: PropertyType.Select,
                            items: GLOBAL_DOCUMENT_TYPE_ITEMS,
                            default: GLOBAL_DOCUMENT_TYPE_DEFAULT,
                        },
                        {
                            name: 'schema',
                            label: 'Schema',
                            title: 'Local policy schema (validate VC before routing)',
                            type: PropertyType.Schemas,
                        }
                    ]
                }
            }
        ]
    }
})
class GlobalEventsReaderBlock {
    private readonly schemasCache: Map<string, Schema | null> = new Map();
    private job: CronJob | null = null;

    private validateTopicId(topicId: string, ref: AnyBlockType): void {
        try {
            TopicId.fromString(topicId);
        } catch (_e) {
            throw new BlockActionError('Invalid topic id format', ref.blockType, ref.uuid);
        }
    }

    // Creates default stream rows in DB for this user if missing.
    private async ensureDefaultStreams(ref: AnyBlockType, user: PolicyUser): Promise<void> {
        const existingStreams = await ref.databaseServer.getGlobalEventsStreamsByUser(
            ref.policyId,
            ref.uuid,
            user.userId
        );

        const existingTopicIds = new Set<string>();

        for (const stream of existingStreams ) {
            const streamTopicId = stream.globalTopicId;
            if (streamTopicId) {
                existingTopicIds.add(streamTopicId);
            }
        }

        const config = ref.options;
        const optionTopicIds = config.eventTopics ?? [];

        const defaultBranchDocumentTypeByBranch: Record<string, GlobalDocumentType> = {};

        for (const branch of config.branches) {
            const branchEvent = branch.branchEvent;
            if (!branchEvent) {
                continue;
            }

            defaultBranchDocumentTypeByBranch[branchEvent] = branch.documentType
        }

        for (const optionTopic of optionTopicIds) {
            const optionTopicId = optionTopic.topicId;
            if (!optionTopicId) {
                continue;
            }

            try {
                this.validateTopicId(optionTopicId, ref);
            } catch (_e) {
                continue;
            }

            if (existingTopicIds.has(optionTopicId)) {
                continue;
            }

            const defaultActive: boolean = optionTopic.active;

            await ref.databaseServer.createGlobalEventsStream({
                policyId: ref.policyId,
                blockId: ref.uuid,
                userId: user.userId,
                userDid: user.did,
                globalTopicId: optionTopicId,
                active: defaultActive,
                lastMessageCursor: '',
                status: GlobalEventsStreamStatus.Free,
                filterFieldsByBranch: {},
                branchDocumentTypeByBranch: defaultBranchDocumentTypeByBranch,
            } as GlobalEventsReaderStream);
        }
    }

    /**
     * Same pattern as ExternalTopicBlock:
     * cron tick calls run(null) and processes DB-bound active streams.
     */
    protected async afterInit(): Promise<void> {
        const cronMask = process.env.GLOBAL_EVENT_TOPIC_SCHEDULER || '*/5 * * * *';

        this.job = new CronJob(cronMask, () => {
            this.run().then();
        }, null, false, 'UTC');
        this.job.start();
    }

    protected destroy(): void {
        if (this.job) {
            this.job.stop();
            this.job = null;
        }
    }

    private async fetchEvents(topicId: string, fromCursor: string, userId: string): Promise<GlobalTopicMessage[]> {
        const workers = new Workers();

        const result = await workers.addRetryableTask(
            {
                type: WorkerTaskType.GET_TOPIC_MESSAGES,
                data: {
                    topic: topicId,
                    timeStamp: fromCursor || undefined,
                    payload: {
                        userId
                    }
                }
            },
            {
                priority: 10,
                userId
            }
        ) as WorkerTopicMessageRaw[];

        if (!Array.isArray(result)) {
            return [];
        }

        const messages: GlobalTopicMessage[] = [];

        for (const raw of result) {
            const consensusTimestamp = raw.id.trim();
            if (!consensusTimestamp) {
                continue;
            }

            const messageText = raw.message;
            if (!messageText) {
                continue;
            }

            messages.push({
                sequenceNumber: Number(raw.sequence_number),
                consensusTimestamp,
                message: messageText,
                runningHash: raw.running_hash
            });
        }

        return messages;
    }

    private parseEvent(raw: string): GlobalEvent | null {
        try {
            const parsed = JSON.parse(raw);

            if (!parsed || typeof parsed !== 'object') {
                return null;
            }

            if (!parsed.documentTopicId || !parsed.documentMessageId) {
                return null;
            }

            return parsed as GlobalEvent;
        } catch (_e) {
            return null;
        }
    }

    private getSchemaFields(document: any): SchemaField[] | null {
        try {
            if (typeof document === 'string') {
                document = JSON.parse(document);
            }

            const schemaCache = new Map<string, any>();
            return SchemaHelper.parseFields(document, null, schemaCache, null, false);
        } catch (error) {
            return null;
        }
    }

    private compareFields(f1: SchemaField, f2: SchemaField): boolean {
        if (
            f1.name !== f2.name ||
            f1.title !== f2.title ||
            f1.description !== f2.description ||
            f1.required !== f2.required ||
            f1.isArray !== f2.isArray ||
            f1.isRef !== f2.isRef
        ) {
            return false;
        }

        if (f1.isRef) {
            return true;
        }

        return (
            f1.type === f2.type &&
            f1.format === f2.format &&
            f1.pattern === f2.pattern &&
            f1.unit === f2.unit &&
            f1.unitSystem === f2.unitSystem &&
            f1.customType === f2.customType
        );
    }

    private ifExtendFields(extension: SchemaField[] | null, base: SchemaField[] | null): boolean {
        try {
            if (!extension || !base) {
                return false;
            }

            const map = new Map<string, SchemaField>();
            for (const f of extension) {
                map.set(f.name, f);
            }

            for (const baseField of base) {
                const extensionField = map.get(baseField.name);
                if (!extensionField) {
                    return false;
                }
                if (!this.compareFields(baseField, extensionField)) {
                    return false;
                }
                if (baseField.isRef) {
                    if (!this.ifExtendFields(extensionField.fields, baseField.fields)) {
                        return false;
                    }
                }
            }

            return true;
        } catch (error) {
            return false;
        }
    }

    private isSchemaCompatible(currentSchemaDoc: any, localSchemaDoc: any): boolean {
        const base = this.getSchemaFields(localSchemaDoc);
        const extension = this.getSchemaFields(currentSchemaDoc);
        return this.ifExtendFields(extension, base);
    }

    private async resolvePayloadObject(payload: string, userId: string): Promise<any> {
        let payloadObject: any = payload;

        try {
            payloadObject = JSON.parse(payload);

            const rawCidOrUri = String(payloadObject?.cid || payloadObject?.uri || '').trim();
            const cid = rawCidOrUri.replace(/^ipfs:\/\//, '').trim();

            if (!cid) {
                return payloadObject;
            }

            let file = await IPFS.getFile(cid, 'str', { userId });

            if (file && file.type === 'Buffer' && Array.isArray(file.data)) {
                file = Buffer.from(file.data).toString('utf-8');
            }

            return JSON.parse(String(file));
        } catch (_e) {
            return payloadObject;
        }
    }

    private async routeEvent(
        ref: AnyBlockType,
        user: PolicyUser,
        event: GlobalEvent,
        branches: GlobalEventReaderBranchConfig[],
        filterFieldsByBranch: Record<string, Record<string, string>>,
        branchDocumentTypeByBranch: Record<string, GlobalDocumentType>
    ): Promise<void> {
        const payload = await this.loadPayload(ref, event, user.userId);

        const payloadObject = await this.resolvePayloadObject(payload, user.userId);

        const policyDocument: IPolicyDocument = {
            document: payloadObject,
            owner: user.did,
            relayerAccount: user.hederaAccountId,
            topicId: event.documentTopicId,
            messageId: event.documentMessageId,
        };

        const baseState: GlobalReaderEventState = {
            data: policyDocument,
            user,
            event
        };

        let currentSchemaItem: SchemaBatchItem | null = null;
        let currentSchema: any | null = null;

        if (event.documentType === GLOBAL_DOCUMENT_TYPE_DEFAULT) {
            const schemaBatch = await this.loadSchemaBatch(ref, event.documentTopicId, user.userId);

            const schemaRef = event.schemaIri;

            currentSchemaItem = schemaBatch.find((s) => s?.id === schemaRef);

            if (currentSchemaItem) {
                currentSchema = await this.loadSchemaDocumentFromBatchItem(currentSchemaItem, user.userId);
            }
        }

        for (const branch of branches) {
            const branchEvent = branch.branchEvent.trim();
            if (!branchEvent) {
                continue;
            }

            const isTypeDocumentByBranch = branchEvent in branchDocumentTypeByBranch;

            let isVcDocument: boolean

            if(isTypeDocumentByBranch) {
                isVcDocument = branchDocumentTypeByBranch[branchEvent] === GLOBAL_DOCUMENT_TYPE_DEFAULT;
            } else {
                isVcDocument = branch.documentType === GLOBAL_DOCUMENT_TYPE_DEFAULT;
            }

            const expectedType = isTypeDocumentByBranch ? branchDocumentTypeByBranch[branchEvent] : GLOBAL_DOCUMENT_TYPE_DEFAULT

            const incomingType = event.documentType || GLOBAL_DOCUMENT_TYPE_DEFAULT

            if (expectedType !== 'any' && expectedType !== incomingType) {
                ref.warn(
                    `GlobalEventsReader: branch skipped by type (topic=${event.documentTopicId}, branch=${branchEvent}): expected="${expectedType}", actual="${incomingType}"`
                );
                continue;
            }

            if (isVcDocument) {
                const validationError = await this.validateDocuments(user, baseState);
                if (validationError) {
                    throw new BlockActionError(validationError, ref.blockType, ref.uuid);
                }

                const branchFilters = filterFieldsByBranch[branchEvent] ?? {};

                const localSchema = await this.getSchemaById(branch.schema);

                /**
                 * If there are no filters, skip schema requirement.
                 * If filters exist but schema is not loaded -> treat as skip.
                 */
                const hasFilters = Object.keys(branchFilters).length > 0;

                if (branch.schema) {
                    if (!currentSchema) {
                        ref.warn(
                            `GlobalEventsReader: schema validation failed (topic=${event.documentTopicId}, branch=${branchEvent}): incoming VC schema is not resolved (schemaIri=${String(event.schemaIri ?? '').trim() || '-'})`
                        );
                        continue;
                    }

                    if (!localSchema) {
                        ref.warn(
                            `GlobalEventsReader: schema validation failed (topic=${event.documentTopicId}, branch=${branchEvent}): local schema is not resolved (schemaId=${String(branch.schema ?? '').trim() || '-'})`
                        );
                        continue;
                    }

                    const ok = this.isSchemaCompatible(currentSchema, localSchema.document);
                    if (!ok) {
                        ref.warn(
                            `GlobalEventsReader: schema validation failed (topic=${event.documentTopicId}, branch=${branchEvent}): incompatible schemas (incomingSchemaIri=${String(event.schemaIri ?? '').trim() || '-'}, localSchemaId=${String(branch.schema ?? '').trim() || '-'})`
                        );
                        continue;
                    }
                }

                const localSchemaDoc = localSchema?.document || null;

                if (hasFilters) {
                    const check = this.validateStreamFilters(payloadObject, branchFilters, localSchemaDoc);

                    if (check.action !== 'ok') {
                        ref.warn(`GlobalEventsReader: ${check.reason}; topic=${event.documentTopicId}; branch=${branchEvent}`);
                        continue;
                    }
                }
            }

            const stateForBranch: IPolicyEventState = {
                ...baseState,
                data: policyDocument,
            } as any;

            await ref.triggerEventSync(branchEvent, user, stateForBranch);

            PolicyComponentsUtils.ExternalEventFn(
                new ExternalEvent(ExternalEventType.Run, ref, user, {
                    eventName: branchEvent,
                    event
                })
            );
        }

        ref.triggerEvents(PolicyOutputEventType.RefreshEvent, user, baseState);
        ref.triggerEvents(PolicyOutputEventType.ReleaseEvent, user, null);
    }

    private async loadPayload(
        ref: AnyBlockType,
        event: GlobalEvent,
        userId: string
    ): Promise<string> {
        const topicId = event.documentTopicId;
        if (!topicId) {
            throw new BlockActionError(
                'globalEventsReader: documentTopicId is empty',
                ref.blockType,
                ref.uuid
            );
        }

        const messageId = event.documentMessageId;
        if (!messageId) {
            throw new BlockActionError(
                'globalEventsReader: documentMessageId is empty',
                ref.blockType,
                ref.uuid
            );
        }

        try {
            const workers = new Workers();

            const msg = await workers.addRetryableTask(
                {
                    type: WorkerTaskType.GET_TOPIC_MESSAGE,
                    data: {
                        topic: topicId,
                        timeStamp: messageId,
                        payload: {
                            userId
                        }
                    }
                },
                {
                    priority: 10,
                    userId
                }
            );

            const payload = msg?.message;
            if (typeof payload === 'string') {
                return payload;
            }

            return JSON.stringify(payload ?? '');
        } catch (error) {
            throw new BlockActionError(
                `globalEventsReader: failed to load payload: ${PolicyUtils.getErrorMessage(error)}`,
                ref.blockType,
                ref.uuid
            );
        }
    }

    private async loadSchemaDocumentFromBatchItem(
        item: SchemaBatchItem,
        userId: string
    ): Promise<any | null> {
        try {
            const row = await IPFS.getFile(item.cid, 'str', { userId });

            const doc = typeof row === 'string'
                ? JSON.parse(row)
                : row;

            if (!item.sub) {
                return doc ?? null;
            }

            // 1) direct key (current behavior)
            const direct = doc?.[item.sub];
            if (direct) {
                return direct;
            }

            // 2) doc.schemas as array
            const schemasArray = doc?.schemas;
            if (Array.isArray(schemasArray)) {
                const found = schemasArray.find((s: any) => {
                    const id = String(s?.id ?? '').trim();
                    if (!id) {
                        return false;
                    }
                    return id === item.sub;
                });

                if (found) {
                    return found;
                }
            }

            // 3) doc.schemas as map/object
            if (schemasArray && typeof schemasArray === 'object') {
                const fromMap = (schemasArray as any)[item.sub];
                if (fromMap) {
                    return fromMap;
                }
            }

            return null;
        } catch (_e) {
            return null;
        }
    }

    private async loadSchemaBatch(
        ref: AnyBlockType,
        documentTopicId: string,
        userId: string
    ): Promise<SchemaBatchItem[]> {
        const topicTree = await this.searchPolicyTopicByDocumentTopic(ref, documentTopicId, userId);
        const policyTopicId = topicTree.policyTopicId;

        if (!policyTopicId) {
            return [];
        }

        const messages = await MessageServer.getTopicMessages({
            topicId: policyTopicId,
            userId
        });

        const schemaMessages = (messages || []).filter(
            (m: any): m is SchemaMessage | SchemaPackageMessage => {
                return m?.action === MessageAction.PublishSchema || m?.action === MessageAction.PublishSchemas;
            }
        );

        return await this.parseSchemaMessages(schemaMessages, ref, userId);
    }

    private async searchPolicyTopicByDocumentTopic(
        ref: AnyBlockType,
        topicId: string,
        userId: string
    ): Promise<{ policyTopicId: string | null }> {
        let currentTopicId: string = topicId;
        let guard: number = 0;

        while (currentTopicId) {
            guard++;
            if (guard > 20) {
                throw new BlockActionError(
                    'Max attempts of 20 was reached for request: Get topic info',
                    ref.blockType,
                    ref.uuid
                );
            }

            const topicMessage = await MessageServer.getTopic(currentTopicId, userId);
            if (!topicMessage) {
                return { policyTopicId: null };
            }

            if (topicMessage.messageType === TopicType.PolicyTopic) {
                return { policyTopicId: topicMessage.topicId?.toString() || null };
            }

            currentTopicId = String(topicMessage.parentId || '').trim();
        }

        return { policyTopicId: null };
    }

    private async parseSchemaMessages(
        messages: (SchemaMessage | SchemaPackageMessage)[],
        ref: AnyBlockType,
        userId: string
    ): Promise<SchemaBatchItem[]> {
        const list: SchemaBatchItem[] = [];

        for (const message of messages) {
            if (message.action === MessageAction.PublishSchema) {
                list.push({
                    id: message.getContextUrl(UrlType.url),
                    name: message.name,
                    cid: message.getDocumentUrl(UrlType.cid),
                    sub: null
                });

                continue;
            }

            if (message.action === MessageAction.PublishSchemas) {
                const schemas = await this.parsePackage(message as SchemaPackageMessage, ref, userId);

                for (const schema of schemas) {
                    list.push(schema);
                }
            }
        }

        return list;
    }

    private async parsePackage(
        message: SchemaPackageMessage,
        ref: AnyBlockType,
        userId: string
    ): Promise<SchemaBatchItem[]> {
        try {
            const list: SchemaBatchItem[] = [];

            const contextUrl = message.getContextUrl(UrlType.url);
            const metaCID = message.getMetadataUrl(UrlType.cid);
            const documentCID = message.getDocumentUrl(UrlType.cid);

            const metaData = await IPFS.getFile(metaCID, 'str', { userId });
            const meta = JSON.parse(metaData);
            const schemas = meta.schemas;

            if (Array.isArray(schemas)) {
                for (const schema of schemas) {
                    list.push({
                        id: contextUrl + schema.id,
                        name: schema.name,
                        cid: documentCID,
                        sub: schema.id
                    });
                }
            }

            return list;
        } catch (error) {
            ref.error(`parsePackage: ${PolicyUtils.getErrorMessage(error)}`);
            return [];
        }
    }

    /**
     * =========================
     * Validators & schemas
     * =========================
     */

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

    protected async validateDocuments(user: PolicyUser, state: any): Promise<string | null> {
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

    private async getSchemaById(schemaId: string | null | undefined): Promise<Schema | null> {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);

        if (!schemaId) {
            return null;
        }

        if (this.schemasCache.has(schemaId)) {
            return this.schemasCache.get(schemaId) || null;
        }

        const rawSchema = await PolicyUtils.loadSchemaByID(ref, schemaId);
        const schema = rawSchema ? new Schema(rawSchema) : null;

        this.schemasCache.set(schemaId, schema);

        return schema;
    }

    private async updateCursor(ref: AnyBlockType, stream: GlobalEventsReaderStream, cursor: string): Promise<void> {
        stream.lastMessageCursor = cursor;
        await ref.databaseServer.updateGlobalEventsStream(stream);
    }

    private extractConfiguredTopicIds(config: GlobalEventReaderConfig): string[] {
        const result: string[] = [];

        for (const item of config.eventTopics || []) {
            const topicId = (item?.topicId || '').trim();

            if (!topicId) {
                continue;
            }

            result.push(topicId);
        }

        return result;
    }

    /**
     * =========================
     * Polling / routing logic
     * =========================
     */

    private async pollStream(
        ref: AnyBlockType,
        user: PolicyUser,
        stream: GlobalEventsReaderStream
    ): Promise<void> {
        const config = (ref.options || {}) as GlobalEventReaderConfig;
        const branches = config.branches ?? [];

        if (!stream.globalTopicId) {
            return;
        }

        if (!branches.length) {
            return;
        }

        const messages = await this.fetchEvents(
            stream.globalTopicId,
            stream.lastMessageCursor,
            user.userId
        );

        for (const message of messages) {
            const cursor = message.consensusTimestamp?.trim();
            if (!cursor) {
                continue;
            }

            if (stream.lastMessageCursor && stream.lastMessageCursor === cursor) {
                continue;
            }

            const event = this.parseEvent(message.message);

            if (!event) {
                await this.updateCursor(ref, stream, cursor);
                continue;
            }

            try {
                await this.routeEvent(
                    ref,
                    user,
                    event,
                    branches,
                    stream.filterFieldsByBranch,
                    stream.branchDocumentTypeByBranch
                );

                await this.updateCursor(ref, stream, cursor);
            } catch (error) {
                const msg = PolicyUtils.getErrorMessage(error);

                ref.error(`GlobalEventsReader: routeEvent failed (cursor=${cursor}): ${msg}`);
                await this.updateCursor(ref, stream, cursor);
            }
        }
    }

    private async runByStream(
        ref: AnyBlockType,
        stream: GlobalEventsReaderStream,
    ): Promise<void> {

        // stream.status = GlobalEventsStreamStatus.Processing;
        // await ref.databaseServer.updateGlobalEventsStream(stream);

        try {
            const user = await PolicyComponentsUtils.GetPolicyUserByDID(stream.userDid, null, ref, stream.userId);

            await this.pollStream(ref, user, stream);

            // stream.status = GlobalEventsStreamStatus.Free;
            // await ref.databaseServer.updateGlobalEventsStream(stream);
        } catch (error) {
            // stream.status = GlobalEventsStreamStatus.Free;
            // await ref.databaseServer.updateGlobalEventsStream(stream);

            ref.error(`GlobalEventsReader: runByStream failed: ${PolicyUtils.getErrorMessage(error)}`);
        }
    }

    /**
     * Cron entry point: poll all active DB streams for this block.
     * userId is optional: kept for symmetry with ExternalTopicBlock.
     */
    public async run(): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);

        const streams = await ref.databaseServer.getActiveGlobalEventsStreams(ref.policyId, ref.uuid);

        for (const stream of streams) {
            if (stream.status !== GlobalEventsStreamStatus.Free) {
                continue;
            }

            await this.runByStream(ref, stream);
        }
    }

    /**
     * Builds a unique cache key for storing the last document per-user.
     */
    private getCacheKey(ref: AnyBlockType, user: PolicyUser): string {
        return `globalEventsReaderBlock:last:${ref.policyId}:${ref.uuid}:${user.userId}`;
    }

    /**
     * Retrieves the cached state for the given user.
     */
    private async getCacheState(ref: AnyBlockType, user: PolicyUser, cacheKey: string): Promise<CacheState> {
        let cacheState: CacheState = {};
        try {
            const cached = await ref.getCache<CacheState>(cacheKey, user);
            if (cached && typeof cached === 'object') {
                cacheState = cached;
            }
        } catch (_e) {
            //
        }
        return cacheState;
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
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);
        const user: PolicyUser = event?.user;

        if (!user) {
            throw new BlockActionError('User is required', ref.blockType, ref.uuid);
        }

        // Ensure default streams exist.
        await this.ensureDefaultStreams(ref, user);

        const state: IPolicyEventState = event.data;
        const payload = state.data ?? [];

        const docs: IPolicyDocument[] = Array.isArray(payload) ? payload : [payload];

        if (!docs.length || ref.dryRun) {
            ref.triggerEvents(PolicyOutputEventType.RunEvent, user, state);
            ref.triggerEvents(PolicyOutputEventType.RefreshEvent, user, state);
            ref.triggerEvents(PolicyOutputEventType.ReleaseEvent, user, state);
            ref.backup();
            return;
        }

        const cacheKey = this.getCacheKey(ref, user);
        const cacheState = await this.getCacheState(ref, user, cacheKey);

        cacheState.docs = docs;

        await ref.setShortCache(cacheKey, cacheState, user);

        const outState: IPolicyEventState = { data: payload };

        // Hidden block behavior
        if (!ref.defaultActive) {
            ref.triggerEvents(PolicyOutputEventType.RunEvent, user, outState);
            ref.triggerEvents(PolicyOutputEventType.RefreshEvent, user, outState);
            ref.triggerEvents(PolicyOutputEventType.ReleaseEvent, user, null);

            ref.backup();
            return;
        }

        return;
    }

    /**
     * =========================
     * UI: getData / setData
     * =========================
     */

    public async getData(user: PolicyUser): Promise<IPolicyGetData> {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);
        const config =ref.options;

        if (ref.dryRun) {
            return {
                id: ref.uuid,
                blockType: ref.blockType,
                actionType: ref.actionType,
                readonly: true,
                config: {
                    eventTopics: config.eventTopics || [],
                },
                streams: [],
                defaultTopicIds: [],
                showNextButton: false,
                documentTypeOptions: GLOBAL_DOCUMENT_TYPE_ITEMS,
                userId: user.userId,
                userDid: user.did,
            };
        }

        await this.ensureDefaultStreams(ref, user);

        const configuredTopicIds = this.extractConfiguredTopicIds(config);
        const configuredTopicIdSet = new Set<string>(configuredTopicIds);

        const dbStreams = await ref.databaseServer.getGlobalEventsStreamsByUser(
            ref.policyId,
            ref.uuid,
            user.userId
        );

        const rows: GlobalEventsReaderStreamRow[] = [];

        for (const stream of dbStreams || []) {
            const topicId = String(stream?.globalTopicId || '').trim();

            try {
                this.validateTopicId(topicId, ref);
            } catch (_e) {
                continue;
            }

            rows.push({
                globalTopicId: topicId,
                active: Boolean(stream.active),
                status: stream.status,
                lastMessageCursor: stream.lastMessageCursor,
                isDefault: configuredTopicIdSet.has(topicId),
                filterFieldsByBranch: stream.filterFieldsByBranch,
                branchDocumentTypeByBranch: stream.branchDocumentTypeByBranch,
            } as GlobalEventsReaderStreamRow);
        }

        const branches = config.branches ?? [];
        const branchesWithSchemaName = [];

        for (const branch of branches) {
            let schemaName: string | undefined;

            if (branch.schema) {
                const localSchema = await this.getSchemaById(branch.schema);

                schemaName = localSchema?.name;

                if (!schemaName) {
                    schemaName = branch.schema;
                }
            }

            branchesWithSchemaName.push({
                ...branch,
                schemaName,
            });
        }

        return {
            id: ref.uuid,
            blockType: ref.blockType,
            actionType: ref.actionType,
            readonly: (ref.actionType === LocationType.REMOTE && user.location === LocationType.REMOTE) || !!ref.dryRun,
            config: {
                eventTopics: config.eventTopics || [],
                documentType: config.documentType,
                branches: config.branches || []
            },
            streams: rows,
            defaultTopicIds: configuredTopicIds,
            showNextButton: config.showNextButton,
            documentTypeOptions: GLOBAL_DOCUMENT_TYPE_ITEMS,
            branchesWithSchemaName,
            userId: user.userId,
            userDid: user.did,
        };
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
                    description: `Global events reader ${ref.uuid}`,
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
                    submit: false,
                }
            );

            if (!created?.topicId) {
                throw new Error('TopicHelper.create returned empty topicId');
            }

            return created.topicId;
        } catch (error) {
            ref.error(`Create topic failed: ${PolicyUtils.getErrorMessage(error)}`);
            throw new BlockActionError('Create topic failed', ref.blockType, ref.uuid);
        }
    }

    public async setData(
        user: PolicyUser,
        data: { value: SetDataPayloadReader; operation: string }
    ): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);

        if (ref.dryRun) {
            throw new BlockActionError('Block is disabled in dry run mode', ref.blockType, ref.uuid);
        }

        const operation = data?.operation;

        if (operation !== 'Update' && operation !== 'CreateTopic' && operation !== 'AddTopic' && operation !== 'Delete' && operation !== 'Next') {
            throw new BlockActionError('Invalid operation', ref.blockType, ref.uuid);
        }

        const config = ref.options || {};
        const configuredTopicIdSet = new Set<string>(this.extractConfiguredTopicIds(config));

        const value: SetDataPayloadReader | { streams: [] } = data.value ?? { streams: [] };
        const streams = value.streams;

        const defaultBranchDocumentTypeByBranch: Record<string, GlobalDocumentType> = {};

        for (const branch of config.branches || []) {
            const branchEvent = branch.branchEvent;
            if (!branchEvent) {
                continue;
            }

            defaultBranchDocumentTypeByBranch[branchEvent] = GLOBAL_DOCUMENT_TYPE_DEFAULT;
        }

        // Handle "Next" (go to next block with cached payload)
        if (operation === 'Next') {
            const cacheKey = this.getCacheKey(ref, user);
            const cacheState = await this.getCacheState(ref, user, cacheKey);

            const payload = cacheState.docs.length > 1 ? cacheState.docs : cacheState.docs[0];

            if (!payload) {
                throw new BlockActionError('No cached payload to next', ref.blockType, ref.uuid);
            }

            const outState: IPolicyEventState = { data: payload };

            ref.triggerEvents(PolicyOutputEventType.RunEvent, user, outState);
            ref.triggerEvents(PolicyOutputEventType.RefreshEvent, user, outState);
            ref.triggerEvents(PolicyOutputEventType.ReleaseEvent, user, outState);
            ref.backup();

            return {};
        }

        // ==========================================================
        // Create topic - create Hedera topic + create DB stream row
        // ==========================================================
        if (operation === 'CreateTopic') {
            const topicId = await this.createTopic(ref, user);

            this.validateTopicId(topicId, ref);

            await ref.databaseServer.createGlobalEventsStream({
                policyId: ref.policyId,
                blockId: ref.uuid,
                userId: user.userId,
                userDid: user.did,
                globalTopicId: topicId,
                active: false,
                lastMessageCursor: '',
                status: GlobalEventsStreamStatus.Free,
                filterFieldsByBranch: {},
                branchDocumentTypeByBranch: defaultBranchDocumentTypeByBranch,
            } as GlobalEventsReaderStream);

            ref.triggerEvents(PolicyOutputEventType.RefreshEvent, user, {});
            ref.backup();

            return { topicId };
        }

        for (const item of streams) {
            const topicId = item.globalTopicId;

            try {
                this.validateTopicId(topicId, ref);
            } catch (_e) {
                continue;
            }

            const existing = await ref.databaseServer.getGlobalEventsStreamByUserTopic(
                ref.policyId,
                ref.uuid,
                user.userId,
                topicId
            );

            // ==========================================================
            // DELETE
            // ==========================================================
            if (operation === 'Delete') {
                if (configuredTopicIdSet.has(topicId)) {
                    continue;
                }

                if (existing) {
                    await ref.databaseServer.deleteGlobalEventsStream(existing);
                }
                continue;
            }

            if (typeof item.active !== 'boolean') {
                throw new BlockActionError(
                    `Invalid stream payload: "active" is boolean required (topicId=${topicId})`,
                    ref.blockType,
                    ref.uuid
                );
            }

            const active = item.active;
            const filterFieldsByBranch: Record<string, Record<string, string>> = item.filterFieldsByBranch;

            const isDefaultTopic = configuredTopicIdSet.has(topicId);

            // ==========================================================
            // Add topic
            // ==========================================================
            if (operation === 'AddTopic') {
                if (existing) {
                    throw new BlockActionError(
                        `Cannot create: stream already exists in DB (topicId=${topicId})`,
                        ref.blockType,
                        ref.uuid
                    );
                }

                if (isDefaultTopic) {
                    throw new BlockActionError(
                        `Cannot create: topicId is a default topic (topicId=${topicId}). Use Update to override.`,
                        ref.blockType,
                        ref.uuid
                    );
                }

                await ref.databaseServer.createGlobalEventsStream({
                    policyId: ref.policyId,
                    blockId: ref.uuid,
                    userId: user.userId,
                    userDid: user.did,
                    globalTopicId: topicId,
                    active,
                    lastMessageCursor: '',
                    status: GlobalEventsStreamStatus.Free,
                    filterFieldsByBranch,
                    branchDocumentTypeByBranch: defaultBranchDocumentTypeByBranch
                } as GlobalEventsReaderStream);

                continue;
            }

            // ==========================================================
            // UPDATE
            // ==========================================================
            if (operation === 'Update') {
                // 1) If exists in DB -> update (default or non-default)
                if (existing) {
                    existing.active = active;
                    existing.filterFieldsByBranch = filterFieldsByBranch;
                    existing.branchDocumentTypeByBranch = item.branchDocumentTypeByBranch;

                    await ref.databaseServer.updateGlobalEventsStream(existing);
                    continue;
                }

                // 2) Not in DB + default topic -> create override row
                if (isDefaultTopic) {
                    await ref.databaseServer.createGlobalEventsStream({
                        policyId: ref.policyId,
                        blockId: ref.uuid,
                        userId: user.userId,
                        userDid: user.did,
                        globalTopicId: topicId,
                        active,
                        lastMessageCursor: '',
                        status: GlobalEventsStreamStatus.Free,
                        filterFieldsByBranch,
                        branchDocumentTypeByBranch: item.branchDocumentTypeByBranch
                    });
                    continue;
                }

                // 3) Not in DB + non-default topic -> error
                throw new BlockActionError(
                    `Cannot update: stream does not exist (topicId=${topicId})`,
                    ref.blockType,
                    ref.uuid
                );
            }
        }

        ref.triggerEvents(PolicyOutputEventType.RefreshEvent, user, {} as any);
        ref.backup();

        return {};
    }

    private validateStreamFilters(
        document: string,
        branchFilters: Record<string, string>,
        currentSchemaDoc: any,
    ): FilterCheckResult {
        const filters = this.normalizeBranchFilters(branchFilters);
        const filterKeys = Object.keys(filters);

        if (filterKeys.length === 0) {
            return { action: 'ok' };
        }

        if (!currentSchemaDoc) {
            return { action: 'error', reason: 'Schema not resolved for filters' };
        }

        const vcDocument = this.tryParseJson(document);
        if (!vcDocument) {
            return { action: 'error', reason: 'Invalid VC JSON for filters' };
        }

        const schemaIndex = this.buildSchemaFieldIndex(currentSchemaDoc);
        if (!schemaIndex) {
            return { action: 'error', reason: 'Cannot parse schema fields' };
        }

        for (const filterLabel of filterKeys) {
            const expectedValue = filters[filterLabel];

            const schemaFieldRef = this.resolveSchemaFieldByLabel(schemaIndex, filterLabel);
            if (!schemaFieldRef) {
                return { action: 'error', reason: `Unknown filter label="${filterLabel}" (not found in schema)` };
            }

            const documentPath = String(schemaFieldRef.documentPath ?? '').trim();
            if (!documentPath) {
                return { action: 'error', reason: `Cannot resolve document path for "${filterLabel}"` };
            }

            const actualValue = this.getValueBySchemaFieldName(vcDocument, documentPath);
            if (typeof actualValue === 'undefined') {
                return { action: 'error', reason: `Field missing: label="${filterLabel}", path="${documentPath}", expected="${expectedValue.trim()}"` };
            }

            const actual = String(actualValue ?? '').trim();
            const expected = String(expectedValue ?? '').trim();

            if (actual !== expected) {
                return { action: 'error', reason: `Value mismatch: label="${filterLabel}", path="${documentPath}", expected="${expected}", actual="${actual}"` };
            }
        }

        return { action: 'ok' };
    }

    private normalizeBranchFilters(
        branchFilters: Record<string, string> | null | undefined
    ): Record<string, string> {
        const result: Record<string, string> = {};

        if (!branchFilters || typeof branchFilters !== 'object') {
            return result;
        }

        for (const key of Object.keys(branchFilters)) {
            const normalizedKey = String(key ?? '').trim();
            if (!normalizedKey) {
                continue;
            }

            result[normalizedKey] = String(branchFilters[key] ?? '').trim();;
        }

        return result;
    }

    private tryParseJson(payload: unknown): any | null {
        try {
            if (typeof payload === 'string') {
                return JSON.parse(payload);
            }

            if (payload && typeof payload === 'object') {
                return payload;
            }

            return null;
        } catch (_e) {
            return null;
        }
    }

    private buildSchemaFieldIndex(schemaDoc: any): SchemaFieldIndex | null {
        const schemaFieldsTree = this.getSchemaFields(schemaDoc);
        if (!schemaFieldsTree || schemaFieldsTree.length === 0) {
            return null;
        }

        const byName = new Map<string, SchemaFieldRef>();
        const byTitle = new Map<string, SchemaFieldRef>();
        const byDescription = new Map<string, SchemaFieldRef>();

        const stack: { field: SchemaField; prefix: string }[] = [];

        for (const field of schemaFieldsTree) {
            stack.push({ field, prefix: '' });
        }

        while (stack.length > 0) {
            const item = stack.pop();
            if (!item) {
                continue;
            }

            const field = item.field;

            const name = String(field?.name ?? '').trim();
            const documentPath = this.joinDocumentPath(item.prefix, name);
            const ref: SchemaFieldRef = {
                field,
                documentPath,
            };

            const nameKey = this.normalizeText(field?.name);
            if (nameKey) {
                byName.set(nameKey, ref);
            }

            const titleKey = this.normalizeText(field?.title);
            if (titleKey) {
                byTitle.set(titleKey, ref);
            }

            const descKey = this.normalizeText(field?.description);
            if (descKey) {
                byDescription.set(descKey, ref);
            }

            if (Array.isArray(field.fields) && field.fields.length > 0) {
                for (const child of field.fields) {
                    stack.push({ field: child, prefix: documentPath });
                }
            }
        }

        return {
            byName,
            byTitle,
            byDescription,
        };
    }

    private joinDocumentPath(prefix: string, name: string): string {
        const p = String(prefix ?? '').trim();
        const n = String(name ?? '').trim();

        if (!n) {
            return p;
        }

        if (!p) {
            return n;
        }

        return `${p}.${n}`;
    }

    private resolveSchemaFieldByLabel(index: SchemaFieldIndex, label: string): SchemaFieldRef | null {
        const key = this.normalizeText(label);
        if (!key) {
            return null;
        }

        const byName = index.byName.get(key);
        if (byName) {
            return byName;
        }

        const byTitle = index.byTitle.get(key);
        if (byTitle) {
            return byTitle;
        }

        const byDescription = index.byDescription.get(key);
        if (byDescription) {
            return byDescription;
        }

        return null;
    }

    private normalizeText(value: unknown): string {
        return String(value ?? '')
            .trim()
            .toLowerCase();
    }

    private getValueBySchemaFieldName(document: any, schemaFieldName: string): any {
        const raw = String(schemaFieldName ?? '').trim();
        if (!raw) {
            return undefined;
        }

        // 1) try as-is
        const direct = this.getValueByPath(document, raw);
        if (typeof direct !== 'undefined') {
            return direct;
        }

        // 2) try inside credentialSubject (object or [0])
        const cs = this.getCredentialSubject(document);
        if (cs) {
            const fromCs = this.getValueByPath(cs, raw);
            if (typeof fromCs !== 'undefined') {
                return fromCs;
            }
        }

        // 3) try credentialSubject.<path>
        const prefixed = this.getValueByPath(document, `credentialSubject.${raw}`);
        if (typeof prefixed !== 'undefined') {
            return prefixed;
        }

        return undefined;
    }

    private getCredentialSubject(document: any): any | null {
        if (!document || typeof document !== 'object') {
            return null;
        }

        const cs = (document as any).credentialSubject;
        if (!cs) {
            return null;
        }

        if (Array.isArray(cs)) {
            return cs.length > 0 ? cs[0] : null;
        }

        if (typeof cs === 'object') {
            return cs;
        }

        return null;
    }

    private getValueByPath(obj: any, path: string): any {
        const normalized = this.normalizePath(path);
        if (!normalized) {
            return undefined;
        }

        const parts = normalized.split('.').filter((p) => p.length > 0);

        let current: any = obj;

        for (const part of parts) {
            if (current === null || typeof current === 'undefined') {
                return undefined;
            }

            // array index support
            if (Array.isArray(current)) {
                const index = Number(part);
                if (!Number.isFinite(index)) {
                    return undefined;
                }
                if (index < 0 || index >= current.length) {
                    return undefined;
                }
                current = current[index];
                continue;
            }

            if (typeof current !== 'object') {
                return undefined;
            }

            if (!Object.prototype.hasOwnProperty.call(current, part)) {
                return undefined;
            }

            current = current[part];
        }

        return current;
    }

    private normalizePath(path: string): string {
        let p = String(path ?? '').trim();

        if (!p) {
            return '';
        }

        // Strip common jsonpath prefix
        if (p.startsWith('$.')) {
            p = p.slice(2);
        }

        // Some implementations may include leading dot
        if (p.startsWith('.')) {
            p = p.slice(1);
        }

        // Sometimes schema paths use "/" (rare, but happens)
        p = p.replace(/\//g, '.');

        // Collapse multiple dots
        p = p.replace(/\.+/g, '.');

        // Trim trailing dot
        if (p.endsWith('.')) {
            p = p.slice(0, -1);
        }

        return p;
    }
}

export default GlobalEventsReaderBlock
