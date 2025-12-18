import { CronJob } from 'cron';

import { ActionCallback, EventBlock } from '../helpers/decorators/index.js';
import { BlockActionError } from '../errors/index.js';
import { PolicyInputEventType, PolicyOutputEventType } from '../interfaces/index.js';
import {
    AnyBlockType,
    IPolicyDocument,
    IPolicyEventState,
    IPolicyGetData,
    IPolicyValidatorBlock
} from '../policy-engine.interface.js';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { PolicyUser } from '../policy-user.js';
import { PolicyUtils } from '../helpers/utils.js';
import { ChildrenType, ControlType, PropertyType } from '../interfaces/block-about.js';

import {LocationType, Schema, SchemaField, SchemaHelper, TopicType} from '@guardian/interfaces';
import { ExternalEvent, ExternalEventType } from '../interfaces/external-event.js';
import {
    GlobalEventsReaderStream,
    IPFS, TopicHelper,
    Workers
} from '@guardian/common';
import { WorkerTaskType } from '@guardian/interfaces';

/**
 * Message fetched from Hedera topic via worker-service.
 */
export interface GlobalTopicMessage {
    sequenceNumber: number;
    consensusTimestamp: string;
    message: string;
    runningHash?: string;
}

type GlobalDocumentType = 'vc' | 'json' | 'csv' | 'text' | 'any';

type StreamOperation = 'Create' | 'Update' | 'Delete';

/**
 * GlobalEvent payload stored in a global events topic.
 */
interface GlobalEvent {
    documentType?: GlobalDocumentType;
    documentTopicId: string;
    documentMessageId: string;
    schemaIri?: string;
    schemaContextIri?: string;
    timestamp: string;
}

interface GlobalEventReaderBranchConfig {
    branchEvent: string;
    documentType?: GlobalDocumentType;
    schema?: string; // local policy schema id (from DB)
}

interface GlobalEventReaderConfig {
    eventTopics?: Array<{ topicId: string }>;
    documentType?: GlobalDocumentType;
    branches?: GlobalEventReaderBranchConfig[];
}

type FilterFieldsByBranch = Record<string, Record<string, string>>;
type BranchDocumentTypeByBranch = Record<string, string>;

interface UiStreamRow {
    globalTopicId: string;
    active: boolean;
    status: GlobalEventsStreamStatus;
    filterFieldsByBranch: FilterFieldsByBranch;
    branchDocumentTypeByBranch: BranchDocumentTypeByBranch;
    lastMessageCursor: string;

    /**
     * true -> this row comes from config defaults, not from DB
     */
    isDefault?: boolean;
}

interface SetDataPayload {
    streams: Array<{
        globalTopicId: string;
        active?: boolean;
        filterFieldsByBranch: FilterFieldsByBranch;
        branchDocumentTypeByBranch?: BranchDocumentTypeByBranch;
    }>;
}

type GlobalReaderEventState = IPolicyEventState & {
    user: PolicyUser;
    event: GlobalEvent;
};

export enum GlobalEventsStreamStatus {
    Free = 'FREE',
    Processing = 'PROCESSING',
    Error = 'ERROR'
}

type FilterCheckResult =
    | { action: 'ok' }
    | { action: 'skip'; reason: string }
    | { action: 'error'; reason: string };

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
                name: 'eventTopics',
                label: 'Event topics',
                title: 'Hedera topic ids to listen (defaults shown to every user as inactive until user changes)',
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
                name: 'branches',
                label: 'Branches',
                title: 'Branch outputs (+ optional VC schema validation per branch)',
                type: PropertyType.Array,
                items: {
                    label: 'Branch',
                    value: '@branchEvent',
                    properties: [
                        {
                            name: 'branchEvent',
                            label: 'Branch event',
                            title: 'Output event name (connect in Events tab)',
                            type: PropertyType.Input
                        },
                        {
                            name: 'documentType',
                            label: 'Document type',
                            title: 'Expected message type for this branch (reader-side filtering)',
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
                            name: 'schema',
                            label: 'Schema',
                            title: 'Local policy schema (validate VC before routing)',
                            type: PropertyType.Schemas
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

    /**
     * Same pattern as ExternalTopicBlock:
     * cron tick calls run(null) and processes DB-bound active streams.
     */
    protected async afterInit(): Promise<void> {
        const cronMask = process.env.GLOBAL_NOTIFICATIONS_SCHEDULER || '0 */5 * * * *';

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
        );

        if (!Array.isArray(result)) {
            return [];
        }

        const messages: GlobalTopicMessage[] = [];

        for (const raw of result) {
            const consensusTimestamp = String(
                raw?.consensusTimestamp || raw?.timeStamp || raw?.timestamp || ''
            );

            if (!consensusTimestamp) {
                continue;
            }

            const messageText = typeof raw?.message === 'string'
                ? raw.message
                : JSON.stringify(raw?.message ?? '');

            if (!messageText) {
                continue;
            }

            messages.push({
                sequenceNumber: Number(raw?.sequenceNumber || 0),
                consensusTimestamp,
                message: messageText,
                runningHash: raw?.runningHash
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

    private async routeEvent(
        ref: AnyBlockType,
        user: PolicyUser,
        event: GlobalEvent,
        branches: GlobalEventReaderBranchConfig[],
        filterFieldsByBranch: FilterFieldsByBranch,
        branchDocumentTypeByBranch: BranchDocumentTypeByBranch
    ): Promise<void> {
        const payload = await this.loadPayload(ref, event, user.userId);

        const document: IPolicyDocument = {
            document: payload
        } as any;

        const baseState: GlobalReaderEventState = {
            data: document,
            user,
            event
        };

        const schemaBatch = await this.loadSchemaBatch(ref, event.schemaContextIri, user.userId);

        const currentSchema = schemaBatch.find((s) => String(s?.id || s?.iri).trim() === String(event.schemaIri).trim()) || null;

        for (const branch of branches) {
            const branchEvent = branch.branchEvent.trim();
            if (!branchEvent) {
                continue;
            }

            const isTypeDocumentByBranch = branchEvent in branchDocumentTypeByBranch;

            let isVcDocument: boolean

            if(isTypeDocumentByBranch) {
                isVcDocument = branchDocumentTypeByBranch[branchEvent] === 'vc';
            } else {
                isVcDocument = branch.documentType === 'vc';
            }

            if (isVcDocument) {
                const validationError = await this.validateDocuments(user, baseState);
                if (validationError) {
                    throw new BlockActionError(validationError, ref.blockType, ref.uuid);
                }

                const branchFilters = filterFieldsByBranch[branchEvent] ?? {};

                /**
                 * If there are no filters, skip schema requirement.
                 * If filters exist but schema is not loaded -> treat as skip, not error.
                 */
                const hasFilters = Object.keys(branchFilters).length > 0;

                if (hasFilters && !currentSchema) {
                    ref.error(
                        `GlobalEventsReader: skip filters because schema is not resolved (topic=${event.documentTopicId}, branch=${branchEvent}, schemaIri=${event.schemaIri || 'empty'}, schemaContextIri=${event.schemaContextIri || 'empty'})`
                    );
                    continue;
                }

                if (hasFilters) {
                    const check = await this.validateStreamFilters(payload, branchFilters, currentSchema);

                    if (check.action === 'skip') {
                        continue;
                    }

                    if (check.action === 'error') {
                        ref.error(
                            `GlobalEventsReader: filters error (topic=${event.documentTopicId}, branch=${branchEvent}): ${check.reason}`
                        );
                        continue;
                    }
                }
            }

            if (isVcDocument && branch.schema) {
                if (!currentSchema) {
                    continue;
                }

                const localSchema = await this.getSchemaById(branch.schema);
                const ok = this.isSchemaCompatible(currentSchema, localSchema.document);
                if (!ok) {
                    continue;
                }
            }

            const stateForBranch: IPolicyEventState = {
                ...baseState,
                type: branchEvent
            } as any;

            ref.triggerEvents(PolicyOutputEventType.RunEvent, user, stateForBranch);

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
        const topicId = String(event.documentTopicId || '').trim();
        if (!topicId) {
            throw new BlockActionError(
                'globalEventsReader: documentTopicId is empty',
                ref.blockType,
                ref.uuid
            );
        }

        const messageId = String(event.documentMessageId || '').trim();
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

    private extractIpfsCid(iri: string): string {
        let value = String(iri || '').trim();

        if (!value) {
            return '';
        }

        if (value.startsWith('ipfs://')) {
            value = value.slice('ipfs://'.length);
        }

        const hashIndex = value.indexOf('#');
        if (hashIndex !== -1) {
            value = value.slice(0, hashIndex);
        }

        return value.trim();
    }

    private async loadSchemaBatch(
        ref: AnyBlockType,
        schemaContextIri: string,
        userId: string
    ): Promise<any[]> {
        const cid = this.extractIpfsCid(schemaContextIri);
        if (!cid) {
            return [];
        }

        try {
            // Try via workers first (if your WorkerTaskType has an IPFS/file task).
            const workers = new Workers();

            const taskType =
                (WorkerTaskType as any).GET_IPFS_FILE ||
                (WorkerTaskType as any).GET_FILE;

            if (taskType) {
                const result = await workers.addRetryableTask(
                    {
                        type: taskType,
                        data: {
                            cid,
                            responseType: 'str'
                        }
                    } as any,
                    { userId }
                );

                const raw = (result && (result.data || result)) as any;
                const text = typeof raw === 'string' ? raw : raw?.content;

                if (typeof text === 'string' && text.length) {
                    const parsed = JSON.parse(text);

                    if (Array.isArray(parsed)) {
                        return parsed;
                    }
                    if (Array.isArray(parsed.schemas)) {
                        return parsed.schemas;
                    }

                    // If schema batch is a single object – still return as array.
                    return [parsed];
                }
            }

            // Fallback: direct IPFS call
            const row = await IPFS.getFile(cid, 'str');
            const text = typeof row === 'string' ? row : JSON.stringify(row);
            const parsed = JSON.parse(text);

            if (Array.isArray(parsed)) {
                return parsed;
            }
            if (Array.isArray(parsed.schemas)) {
                return parsed.schemas;
            }

            return [parsed];
        } catch (error) {
            throw new BlockActionError(
                `globalEventsReader: failed to load schema batch by schemaContextIri: ${(error as Error).message}`,
                ref.blockType,
                ref.uuid
            );
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

    private async pollStream(ref: AnyBlockType, user: PolicyUser, stream: GlobalEventsReaderStream): Promise<void> {
        const config = (ref.options || {}) as GlobalEventReaderConfig;
        const branches = Array.isArray(config.branches) ? config.branches : [];

        if (!stream.globalTopicId) {
            return;
        }

        if (!branches.length) {
            return;
        }

        const messages = await this.fetchEvents(stream.globalTopicId, stream.lastMessageCursor, user.userId);

        for (const message of messages) {
            const cursor = (message.consensusTimestamp || '').trim();
            if (!cursor) {
                continue;
            }

            if (stream.lastMessageCursor && stream.lastMessageCursor === cursor) {
                continue;
            }

            const event = this.parseEvent(message.message);
            if (event) {
                await this.routeEvent(ref, user, event, branches, stream.filterFieldsByBranch, stream.branchDocumentTypeByBranch);
            }

            await this.updateCursor(ref, stream, cursor);
        }
    }

    private async runByStream(
        ref: AnyBlockType,
        stream: GlobalEventsReaderStream,
    ): Promise<void> {

        stream.status = GlobalEventsStreamStatus.Processing;
        await ref.databaseServer.updateGlobalEventsStream(stream);

        try {
            const user = await PolicyComponentsUtils.GetPolicyUserByDID(stream.userDid, null, ref, stream.userId);

            await this.pollStream(ref, user, stream);

            stream.status = GlobalEventsStreamStatus.Free;
            await ref.databaseServer.updateGlobalEventsStream(stream);
        } catch (error) {
            stream.status = GlobalEventsStreamStatus.Error;
            await ref.databaseServer.updateGlobalEventsStream(stream);

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

        for (const stream of streams || []) {
            if (stream.status !== GlobalEventsStreamStatus.Free) {
                continue;
            }

            await this.runByStream(ref, stream);
        }
    }

    /**
     * =========================
     * UI: getData / setData
     * =========================
     */

    public async getData(user: PolicyUser): Promise<IPolicyGetData> {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);
        const config = (ref.options || {}) as GlobalEventReaderConfig;

        const configuredTopicIds = this.extractConfiguredTopicIds(config);
        const configuredTopicIdSet = new Set(configuredTopicIds);

        const dbStreams = await ref.databaseServer.getGlobalEventsStreamsByUser(
            ref.policyId,
            ref.uuid,
            user.userId
        );

        const byTopicId = new Map<string, GlobalEventsReaderStream>();
        for (const stream of dbStreams || []) {
            const topicId = (stream.globalTopicId || '').trim();
            if (!topicId) {
                continue;
            }
            byTopicId.set(topicId, stream);
        }

        const rows: UiStreamRow[] = [];

        // 1) defaults from config -> virtual rows unless user has DB override
        for (const topicId of configuredTopicIds) {
            const dbRow = byTopicId.get(topicId);

            if (dbRow) {
                rows.push({
                    globalTopicId: topicId,
                    active: Boolean(dbRow.active),
                    status: dbRow.status || GlobalEventsStreamStatus.Free,
                    lastMessageCursor: dbRow.lastMessageCursor || '',
                    isDefault: true,
                    filterFieldsByBranch: dbRow.filterFieldsByBranch || {},
                    branchDocumentTypeByBranch: dbRow.branchDocumentTypeByBranch || {},
                });
            } else {
                rows.push({
                    globalTopicId: topicId,
                    active: false,
                    status: GlobalEventsStreamStatus.Free,
                    lastMessageCursor: '',
                    isDefault: true,
                    filterFieldsByBranch: {},
                    branchDocumentTypeByBranch: {},
                });
            }
        }

        // 2) user-added topics (not present in defaults)
        for (const stream of dbStreams || []) {
            const topicId = (stream.globalTopicId || '').trim();
            if (!topicId) {
                continue;
            }

            if (configuredTopicIdSet.has(topicId)) {
                continue;
            }

            rows.push({
                globalTopicId: topicId,
                active: Boolean(stream.active),
                status: stream.status || GlobalEventsStreamStatus.Free,
                lastMessageCursor: stream.lastMessageCursor || '',
                isDefault: false,
                filterFieldsByBranch: stream.filterFieldsByBranch || {},
                branchDocumentTypeByBranch: stream.branchDocumentTypeByBranch || {},
            });
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
                documentType: config.documentType || 'any',
                branches: config.branches || []
            },
            streams: rows
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
                    submit: true,
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
        data: { value: SetDataPayload; operation: string }
    ): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);

        const operation = data?.operation;
        if (operation !== 'Update' && operation !== 'CreateTopic' && operation !== 'AddTopic' && operation !== 'Delete') {
            throw new BlockActionError('Invalid operation', ref.blockType, ref.uuid);
        }

        const config = ref.options || {};
        const configuredTopicIdSet = new Set<string>(this.extractConfiguredTopicIds(config));

        const value: SetDataPayload = data?.value ?? { streams: [] };
        const streams = Array.isArray(value.streams) ? value.streams : [];

        // ==========================================================
        // Create topic - create Hedera topic + create DB stream row
        // ==========================================================
        if (operation === 'CreateTopic') {
            const topicId = await this.createTopic(ref, user);

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
                branchDocumentTypeByBranch: {},
            });

            ref.triggerEvents(PolicyOutputEventType.RefreshEvent, user, {});
            ref.backup();

            return { topicId };
        }

        for (const item of streams) {
            const topicId = (item?.globalTopicId || '').trim();
            if (!topicId) {
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
            const filterFieldsByBranch: FilterFieldsByBranch = item?.filterFieldsByBranch ?? {};
            const branchDocumentTypeByBranch: Record<string, string> = item?.branchDocumentTypeByBranch ?? {};

            for (const branchEvent of Object.keys(branchDocumentTypeByBranch)) {
                const rawType = String(branchDocumentTypeByBranch[branchEvent] ?? '').toLowerCase().trim();

                if (rawType !== 'vc') {
                    delete filterFieldsByBranch[branchEvent];
                }
            }

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
                    branchDocumentTypeByBranch
                });

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
                    existing.branchDocumentTypeByBranch = branchDocumentTypeByBranch;

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
                        branchDocumentTypeByBranch
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

    private async validateStreamFilters(
        payload: string,
        branchFilters: Record<string, string>,
        currentSchemaDoc: any,
    ): Promise<FilterCheckResult> {
        const filterKeys = Object.keys(branchFilters || {});
        if (filterKeys.length === 0) {
            return { action: 'ok' };
        }

        if (!currentSchemaDoc) {
            return { action: 'skip', reason: 'Schema is not resolved' };
        }

        let vcDocument: any;
        try {
            vcDocument = typeof payload === 'string' ? JSON.parse(payload) : payload;
        } catch (_e) {
            return { action: 'skip', reason: 'Invalid VC JSON payload' };
        }

        const schemaFieldsTree = this.getSchemaFields(currentSchemaDoc);
        if (!schemaFieldsTree || schemaFieldsTree.length === 0) {
            return { action: 'error', reason: 'Cannot parse schema fields' };
        }

        const flatSchemaFields = this.flattenSchemaFields(schemaFieldsTree);

        for (const filterKey of filterKeys) {
            const expectedValue = String(branchFilters[filterKey] ?? '').trim();

            const matchedSchemaField = this.findSchemaFieldByLabel(flatSchemaFields, filterKey);
            if (!matchedSchemaField) {
                return { action: 'error', reason: `Filter field "${filterKey}" not found in schema` };
            }

            const actualValue = this.getValueBySchemaFieldName(vcDocument, matchedSchemaField.name);
            if (typeof actualValue === 'undefined') {
                return { action: 'skip', reason: `Missing field "${matchedSchemaField.name}"` };
            }

            if (String(actualValue ?? '').trim() !== expectedValue) {
                return { action: 'skip', reason: `Mismatch "${filterKey}"` };
            }
        }

        return { action: 'ok' };
    }

    private flattenSchemaFields(fields: SchemaField[]): SchemaField[] {
        const result: SchemaField[] = [];
        const stack: SchemaField[] = Array.isArray(fields) ? [...fields] : [];

        while (stack.length > 0) {
            const current = stack.pop();
            if (!current) {
                continue;
            }

            result.push(current);

            if (Array.isArray(current.fields) && current.fields.length > 0) {
                for (const child of current.fields) {
                    stack.push(child);
                }
            }
        }

        return result;
    }

    private findSchemaFieldByLabel(fields: SchemaField[], label: string): SchemaField | null {
        const normalizedLabel = this.normalizeText(label);
        if (!normalizedLabel) {
            return null;
        }

        // 1) name first (most deterministic)
        for (const field of fields) {
            const fieldName = this.normalizeText(field?.name);
            if (!fieldName) {
                continue;
            }
            if (fieldName === normalizedLabel) {
                return field;
            }
        }

        // 2) title second
        for (const field of fields) {
            const fieldTitle = this.normalizeText(field?.title);
            if (!fieldTitle) {
                continue;
            }
            if (fieldTitle === normalizedLabel) {
                return field;
            }
        }

        // 3) description last (fallback, can be noisy but keeps old behavior)
        for (const field of fields) {
            const fieldDescription = this.normalizeText(field?.description);
            if (!fieldDescription) {
                continue;
            }
            if (fieldDescription === normalizedLabel) {
                return field;
            }
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

        // 2) very common case: schema gives "someField" but VC stores under credentialSubject.someField
        const normalized = this.normalizePath(raw);

        if (!normalized.startsWith('credentialSubject.') && document && typeof document === 'object') {
            const cs = (document as any).credentialSubject;

            if (cs && typeof cs === 'object') {
                const fromCs = this.getValueByPath(cs, normalized);
                if (typeof fromCs !== 'undefined') {
                    return fromCs;
                }
            }

            const prefixed = this.getValueByPath(document, `credentialSubject.${normalized}`);
            if (typeof prefixed !== 'undefined') {
                return prefixed;
            }
        }

        return undefined;
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
