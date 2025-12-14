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

import {LocationType, Schema, SchemaField, SchemaHelper} from '@guardian/interfaces';
import { ExternalEvent, ExternalEventType } from '../interfaces/external-event.js';
import {
    GlobalEventsStream,
    GlobalEventsStreamStatus, IPFS,
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
    schema?: string; // local policy schema id (from DB)
}

interface GlobalEventReaderConfig {
    eventTopics?: Array<{ topicId: string }>;
    documentType?: GlobalDocumentType;
    branches?: GlobalEventReaderBranchConfig[];
}

type FilterFieldsByBranch = Record<string, Record<string, string>>;

interface UiStreamRow {
    globalTopicId: string;
    active: boolean;
    status: GlobalEventsStreamStatus;
    filterFieldsByBranch: FilterFieldsByBranch;
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
    }>;
}

type GlobalReaderEventState = IPolicyEventState & {
    user: PolicyUser;
    event: GlobalEvent;
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
                name: 'documentType',
                label: 'Document type',
                title: 'Expected document type from global event payload (vc | json | csv | text | any)',
                type: PropertyType.Input
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
export class GlobalEventsReaderBlock {
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
                priority: 10
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
        filterFieldsByBranch: FilterFieldsByBranch
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

        const isVcDocument = (event.documentType || '').toLowerCase() === 'vc';

        let currentSchema: any | null = null;

        if (isVcDocument) {
            const validationError = await this.validateDocuments(user, baseState);
            if (validationError) {
                throw new BlockActionError(validationError, ref.blockType, ref.uuid);
            }

            const schemaBatch = await this.loadSchemaBatch(ref, event.schemaContextIri, user.userId);

            currentSchema =
                schemaBatch.find((s) => String(s?.id || s?.iri).trim() === String(event.schemaIri).trim())
                || null;
        }

        for (const branch of branches) {
            const branchEvent = (branch?.branchEvent || '').trim();
            if (!branchEvent) {
                continue;
            }

            if (isVcDocument && branch.schema) {
                const localSchema = await this.getSchemaById(branch.schema);
                const ok = this.isSchemaCompatible(currentSchema, localSchema.document);
                if (!ok) {
                    continue;
                }
            }

            // filters validation per branch (as you asked)
            if (isVcDocument) {
                const branchFilters = filterFieldsByBranch[branchEvent] ?? {};

                const filtersError = await this.validateStreamFilters(
                    payload,
                    branchFilters,
                    currentSchema,
                    branch
                );

                if (filtersError) {
                    throw new BlockActionError(filtersError, ref.blockType, ref.uuid);
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
        try {
            const workers = new Workers();

            const msg = await workers.addRetryableTask(
                {
                    type: WorkerTaskType.GET_TOPIC_MESSAGE,
                    data: {
                        timeStamp: event.documentMessageId,
                        payload: { userId }
                    }
                },
                { userId }
            );

            return msg.message;
        } catch (error) {
            throw new BlockActionError(
                `globalEventsReader: failed to load payload: ${(error as Error).message}`,
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

    private async updateCursor(ref: AnyBlockType, stream: GlobalEventsStream, cursor: string): Promise<void> {
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

    private async pollStream(ref: AnyBlockType, user: PolicyUser, stream: GlobalEventsStream): Promise<void> {
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
                await this.routeEvent(ref, user, event, branches, stream.filterFieldsByBranch);
            }

            await this.updateCursor(ref, stream, cursor);
        }
    }

    private async runByStream(
        ref: AnyBlockType,
        stream: GlobalEventsStream,
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

        const dbStreams = await ref.databaseServer.getGlobalEventsStreamsByUser(ref.policyId, ref.uuid, user.userId);

        const byTopicId = new Map<string, GlobalEventsStream>();
        for (const stream of dbStreams || []) {
            const topicId = (stream.globalTopicId || '').trim();
            if (topicId) {
                byTopicId.set(topicId, stream);
            }
        }

        const rows: UiStreamRow[] = [];


        // 1) defaults from config -> virtual inactive rows unless user has DB override
        for (const topicId of configuredTopicIds) {
            const dbRow = byTopicId.get(topicId);

            if (dbRow) {
                rows.push({
                    globalTopicId: topicId,
                    active: Boolean(dbRow.active),
                    status: dbRow.status || GlobalEventsStreamStatus.Free,
                    lastMessageCursor: dbRow.lastMessageCursor || '',
                    isDefault: true,
                    filterFieldsByBranch: dbRow.filterFieldsByBranch || {}
                });
            } else {
                rows.push({
                    globalTopicId: topicId,
                    active: false,
                    status: GlobalEventsStreamStatus.Free,
                    lastMessageCursor: '',
                    isDefault: true,
                    filterFieldsByBranch: {}
                });
            }
        }

        // 2) user-added topics (not present in defaults)
        for (const stream of dbStreams || []) {
            const topicId = (stream.globalTopicId || '').trim();
            if (!topicId) {
                continue;
            }

            if (configuredTopicIds.includes(topicId)) {
                continue;
            }

            rows.push({
                globalTopicId: topicId,
                active: Boolean(stream.active),
                status: stream.status || GlobalEventsStreamStatus.Free,
                lastMessageCursor: stream.lastMessageCursor || '',
                isDefault: false,
                filterFieldsByBranch: stream.filterFieldsByBranch || {}
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

    private dropStreamFromRef(ref: AnyBlockType, _userId: string, topicId: string): void {
        const options: any = ref.options;

        if (!options || !Array.isArray(options.eventTopics)) {
            return;
        }

        const normalizedTopicId = String(topicId || '').trim();
        if (!normalizedTopicId) {
            return;
        }

        options.eventTopics = options.eventTopics.filter((t: any) => {
            const id = String(t?.topicId || '').trim();

            if (!id) {
                return false;
            }

            return id !== normalizedTopicId;
        });

        if (options.eventTopics.length === 0) {
            delete options.eventTopics;
        }
    }

    public async setData(
        user: PolicyUser,
        data: { value: SetDataPayload; operation: SetDataOperation }
    ): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef<AnyBlockType>(this);

        if (!data || !['Create', 'Update', 'Delete'].includes(data.operation)) {
            throw new BlockActionError('Invalid operation', ref.blockType, ref.uuid);
        }

        const value: SetDataPayload = data.value ?? { streams: [] };
        const streams = Array.isArray(value.streams) ? value.streams : [];

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

            if (data.operation === 'Delete') {
                if (!existing) {
                    continue;
                }

                await ref.databaseServer.deleteGlobalEventsStream(existing);

                this.dropStreamFromRef(ref, user.userId, topicId);
                continue;
            }

            const filterFieldsByBranch = item?.filterFieldsByBranch ?? {};

            if (typeof item.active !== 'boolean') {
                continue;
            }

            if (data.operation === 'Create') {
                if (existing) {
                    continue;
                }

                await ref.databaseServer.createGlobalEventsStream({
                    policyId: ref.policyId,
                    blockId: ref.uuid,
                    userId: user.userId,
                    userDid: user.id,
                    globalTopicId: topicId,
                    active: item.active,
                    lastMessageCursor: '',
                    status: GlobalEventsStreamStatus.Free,
                    filterFieldsByBranch
                });

                this.dropStreamFromRef(ref, user.userId, topicId);
                continue;
            }

            if (!existing) {
                continue;
            }

            existing.active = item.active;
            existing.userDid = user.id;
            existing.filterFieldsByBranch = filterFieldsByBranch;

            await ref.databaseServer.updateGlobalEventsStream(existing);

            this.dropStreamFromRef(ref, user.userId, topicId);
        }

        ref.triggerEvents(PolicyOutputEventType.RefreshEvent, user, {} as any);
        ref.backup();

        return {};
    }

    ////

    private async validateStreamFilters(
        payload: string,
        branchFilters: Record<string, string>,
        currentSchemaDoc: any,
        branch: GlobalEventReaderBranchConfig
    ): Promise<string | null> {
        const filterKeys = branchFilters ? Object.keys(branchFilters) : [];
        if (filterKeys.length === 0) {
            return null;
        }

        let vcDocument: any;
        try {
            vcDocument = typeof payload === 'string' ? JSON.parse(payload) : payload;
        } catch (error) {
            return `Invalid VC payload JSON for filters (branch: ${branch?.branchEvent || 'unknown'})`;
        }

        const schemaFieldsTree = this.getSchemaFields(currentSchemaDoc);
        if (!schemaFieldsTree || schemaFieldsTree.length === 0) {
            return `Cannot parse schema fields for filters (branch: ${branch?.branchEvent || 'unknown'})`;
        }

        const flatSchemaFields = this.flattenSchemaFields(schemaFieldsTree);

        for (const filterKey of filterKeys) {
            const expectedValueRaw = branchFilters[filterKey];
            const expectedValue = String(expectedValueRaw ?? '').trim();

            const matchedSchemaField = this.findSchemaFieldByLabel(flatSchemaFields, filterKey);
            if (!matchedSchemaField) {
                return `Filter field "${filterKey}" is not found in schema (branch: ${branch?.branchEvent || 'unknown'})`;
            }

            const actualValue = this.findValueByKey(vcDocument, matchedSchemaField.name);
            if (typeof actualValue === 'undefined') {
                return `VC does not contain field "${matchedSchemaField.name}" for filter "${filterKey}" (branch: ${branch?.branchEvent || 'unknown'})`;
            }

            const actualValueText = String(actualValue ?? '').trim();
            if (actualValueText !== expectedValue) {
                return `Filter mismatch for "${filterKey}": expected "${expectedValue}", got "${actualValueText}" (branch: ${branch?.branchEvent || 'unknown'})`;
            }
        }

        return null;
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

        for (const field of fields) {
            const candidates = [
                field?.title,
                field?.description,
                field?.name
            ];

            for (const candidate of candidates) {
                if (this.normalizeText(candidate) === normalizedLabel) {
                    return field;
                }
            }
        }

        return null;
    }

    private normalizeText(value: unknown): string {
        return String(value ?? '')
            .trim()
            .toLowerCase();
    }

    private findValueByKey(document: any, key: string): any {
        const targetKey = String(key ?? '').trim();
        if (!targetKey) {
            return undefined;
        }

        if (!document || typeof document !== 'object') {
            return undefined;
        }

        // Direct hit
        if (Object.prototype.hasOwnProperty.call(document, targetKey)) {
            return document[targetKey];
        }

        // Deep scan (simple DFS)
        const stack: any[] = [document];

        while (stack.length > 0) {
            const current = stack.pop();

            if (!current || typeof current !== 'object') {
                continue;
            }

            if (Object.prototype.hasOwnProperty.call(current, targetKey)) {
                return current[targetKey];
            }

            if (Array.isArray(current)) {
                for (const item of current) {
                    stack.push(item);
                }
                continue;
            }

            for (const value of Object.values(current)) {
                if (value && typeof value === 'object') {
                    stack.push(value);
                }
            }
        }

        return undefined;
    }
}
