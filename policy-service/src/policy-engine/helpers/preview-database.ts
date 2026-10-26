import { GlobalEventsReaderStream } from '@guardian/common/entity/global-events-reader-stream';
import { getPreviewTokenAccount } from './preview-token.js';
import { ApproveStatus, DidDocumentStatus, DocumentSignature, DocumentStatus, GenerateUUIDv4, GlobalEventsStreamStatus, SchemaEntity } from '@guardian/interfaces';
import { GlobalEventsWriterStream } from '@guardian/common/entity/global-events-writer-stream';
import { ObjectId } from '@mikro-orm/mongodb';
import { DatabaseServer } from '@guardian/common/database-modules/database-server';
import { RecordActionStep } from '../record-action-step.js';
import { PreviewScope } from './preview.js';
import {
    PreviewQueryUnsupportedError,
    buildPreviewDocumentCache,
    comparePreviewRecords,
    matchesPreviewFilter,
    normalizePreviewFilter,
    normalizePreviewOrder
} from './preview-query.js';

export class PreviewIncompleteError extends Error {
    public readonly data: { previewIncomplete: true; reason: string };

    constructor(reason: string) {
        super(`Calculation preview result is incomplete: ${reason}`);
        this.name = 'PreviewIncompleteError';
        this.data = { previewIncomplete: true, reason };
    }
}

export interface IPreviewIncomplete {
    blockType: string | null;
    reason: string;
}

interface IPreviewEntry {
    record: Record<string, unknown> | null;
    stored: boolean;
}

type EntityClass = new () => unknown;

class PreviewDatabaseStore {
    public readonly entities: Map<string, Map<string, IPreviewEntry>> = new Map();
    public readonly incomplete: string[] = [];

    public bucket(entityClass: EntityClass): Map<string, IPreviewEntry> {
        let bucket = this.entities.get(entityClass.name);
        if (!bucket) {
            bucket = new Map();
            this.entities.set(entityClass.name, bucket);
        }
        return bucket;
    }

    public touched(entityClass: EntityClass): boolean {
        return !!this.entities.get(entityClass.name)?.size;
    }
}

const stores = new WeakMap<RecordActionStep, PreviewDatabaseStore>();

const CACHED_DOCUMENT_ENTITIES = new Set(['VcDocument', 'VpDocument', 'ApprovalDocument', 'AggregateVC']);

const READ_METHODS = new Set(['find', 'findOne', 'count', 'findAndCount', 'findAll', 'aggregate']);

const WRITE_METHODS = new Set(['save', 'saveMany', 'update', 'updateMany', 'remove', 'deleteEntity']);

const STREAM_ENTITIES = new Set<EntityClass>([GlobalEventsReaderStream, GlobalEventsWriterStream]);

const STREAM_METHODS = new Set(['getGlobalEventsStreamsByUser', 'getActiveGlobalEventsStreams', 'getGlobalEventsStreamByUserTopic', 'createGlobalEventsStream', 'updateGlobalEventsStream', 'deleteGlobalEventsStream', 'getGlobalEventsWriterStreamsByUser', 'getGlobalEventsWriterStreamByUserTopic', 'createGlobalEventsWriterStream', 'updateGlobalEventsWriterStream', 'deleteGlobalEventsWriterStream']);

const BLOCKED_METHODS = new Set([
    'createMuchData',
    'updateEntity',
    'setVirtualKey',
    'virtualAssociate',
    'virtualDissociate',
    'virtualFreeze',
    'virtualUnfreeze',
    'virtualGrantKyc',
    'virtualRevokeKyc'
]);

function getStore(actionStatus: RecordActionStep): PreviewDatabaseStore {
    let store = stores.get(actionStatus);
    if (!store) {
        store = new PreviewDatabaseStore();
        stores.set(actionStatus, store);
    }
    return store;
}

function getActivePreview(): RecordActionStep | null {
    const actionStatus = PreviewScope.current();
    return actionStatus?.preview ? actionStatus : null;
}

function incomplete(store: PreviewDatabaseStore, reason: string): PreviewIncompleteError {
    store.incomplete.push(reason);
    return new PreviewIncompleteError(reason);
}

function isRecordObject(value: unknown): value is Record<string, unknown> {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isObjectIdValue(value: unknown): boolean {
    return value instanceof ObjectId || (!!value && typeof value === 'object' && Reflect.get(value, '_bsontype') === 'ObjectId');
}

function clonePreviewValue(value: unknown): unknown {
    if (value === null || typeof value !== 'object' || isObjectIdValue(value)) {
        return value;
    }
    if (value instanceof Date) {
        return new Date(value.getTime());
    }
    if (value instanceof RegExp || Buffer.isBuffer(value)) {
        return value;
    }
    if (Array.isArray(value)) {
        return value.map(clonePreviewValue);
    }
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(value)) {
        const item = Reflect.get(value, key);
        if (item !== undefined && typeof item !== 'function') {
            result[key] = clonePreviewValue(item);
        }
    }
    return result;
}

function toRecord(value: unknown): Record<string, unknown> {
    const record = clonePreviewValue(value);
    if (!isRecordObject(record)) {
        return {};
    }
    if (record._id !== undefined && record._id !== null) {
        record.id = String(record._id);
    }
    return record;
}

function getRecordId(value: unknown): string | null {
    if (!value || typeof value !== 'object') {
        return null;
    }
    const id = Reflect.get(value, '_id') ?? Reflect.get(value, 'id');
    return id === undefined || id === null ? null : String(id);
}

function applyPreviewDefaults(entityClass: EntityClass, record: Record<string, unknown>, dryRun: boolean): void {
    const now = new Date();
    record.createDate = now;
    record.updateDate = now;
    const option = isRecordObject(record.option) ? record.option : {};
    if (entityClass === GlobalEventsReaderStream) {
        record.active = record.active ?? false;
        record.lastMessageCursor = record.lastMessageCursor ?? '';
        record.status = record.status ?? GlobalEventsStreamStatus.Free;
        record.filterFieldsByBranch = record.filterFieldsByBranch ?? {};
        record.branchDocumentTypeByBranch = record.branchDocumentTypeByBranch ?? {};
        return;
    }
    if (entityClass === GlobalEventsWriterStream) {
        record.active = record.active ?? false;
        record.documentType = record.documentType ?? 'any';
        record.lastPublishMessageId = record.lastPublishMessageId ?? '';
        return;
    }
    if (dryRun) {
        record.option = { ...option, status: option.status || ApproveStatus.NEW };
        record.status = record.status || DocumentStatus.NEW;
        record.uuid = record.uuid || GenerateUUIDv4();
        record.codeVersion = record.codeVersion || '1.0.0';
        record.entity = record.entity || SchemaEntity.NONE;
        record.readonly = !!record.readonly;
        record.iri = record.iri || `${record.uuid}`;
        record.system = record.system || false;
        record.active = record.active || false;
        record.hederaStatus = record.hederaStatus || DocumentStatus.NEW;
        record.signature = record.signature || DocumentSignature.NEW;
        return;
    }
    switch (entityClass.name) {
        case 'VcDocument':
            record.hederaStatus = record.hederaStatus || DocumentStatus.NEW;
            record.signature = record.signature || DocumentSignature.NEW;
            record.option = { ...option, status: option.status || ApproveStatus.NEW };
            break;
        case 'VpDocument':
            record.status = record.status || DocumentStatus.NEW;
            record.signature = record.signature || DocumentSignature.NEW;
            break;
        case 'DidDocument':
            record.status = record.status || DidDocumentStatus.NEW;
            break;
        case 'ApprovalDocument':
            record.option = { ...option, status: option.status || ApproveStatus.NEW };
            break;
        default:
            break;
    }
}

function getStoredView(entityClass: EntityClass, record: Record<string, unknown>, dryRun: boolean): Record<string, unknown> {
    if (!('document' in record)) {
        return record;
    }
    const view = { ...record };
    if (dryRun || CACHED_DOCUMENT_ENTITIES.has(entityClass.name)) {
        const fields = Array.isArray(record.documentFields) ? record.documentFields.map(String) : null;
        const cache = record.document ? buildPreviewDocumentCache(record.document, fields) : null;
        if (cache) {
            view.document = cache;
        } else {
            delete view.document;
        }
    } else if (entityClass.name === 'SplitDocuments') {
        delete view.document;
    }
    return view;
}

function withoutPaging(options: unknown): Record<string, unknown> {
    const result: Record<string, unknown> = isRecordObject(options) ? { ...options } : {};
    delete result.limit;
    delete result.offset;
    return result;
}

function forStoredRead(options: unknown): Record<string, unknown> {
    const result = withoutPaging(options);
    delete result.orderBy;
    return result;
}

function toFilterObject(filters: unknown): Record<string, unknown> {
    if (typeof filters === 'string' || isObjectIdValue(filters)) {
        return { _id: typeof filters === 'string' && ObjectId.isValid(filters) ? new ObjectId(filters) : filters };
    }
    return isRecordObject(filters) ? filters : {};
}

class PreviewDatabase {
    constructor(
        private readonly target: DatabaseServer,
        private readonly dryRun: boolean,
        private readonly store: PreviewDatabaseStore
    ) {
    }

    private call(method: string, args: unknown[]): Promise<any> {
        const fn = Reflect.get(this.target, method);
        const context = Array.from(STREAM_ENTITIES).some((entity) => entity === args[0])
            ? Object.assign(Object.create(this.target), { dryRun: null })
            : this.target;
        return Reflect.apply(fn, context, args);
    }

    private matches(entityClass: EntityClass, record: Record<string, unknown>, filter: Record<string, unknown>): boolean {
        try {
            return matchesPreviewFilter(getStoredView(entityClass, record, this.dryRun), filter);
        } catch (error) {
            if (error instanceof PreviewQueryUnsupportedError) {
                throw incomplete(this.store, error.message);
            }
            throw error;
        }
    }

    private normalize(filters: unknown): Record<string, unknown> {
        try {
            return normalizePreviewFilter(filters);
        } catch (error) {
            if (error instanceof PreviewQueryUnsupportedError) {
                throw incomplete(this.store, error.message);
            }
            throw error;
        }
    }

    private storedIds(bucket: Map<string, IPreviewEntry>): ObjectId[] {
        const ids: ObjectId[] = [];
        for (const [id, entry] of bucket) {
            if (entry.stored && ObjectId.isValid(id)) {
                ids.push(new ObjectId(id));
            }
        }
        return ids;
    }

    public async getGlobalEventsStreamsByUser(policyId: string, blockId: string, userId: string): Promise<unknown[]> {
        return await this.find(GlobalEventsReaderStream, { policyId, blockId, userId });
    }

    public async getActiveGlobalEventsStreams(policyId: string, blockId: string): Promise<unknown[]> {
        return await this.find(GlobalEventsReaderStream, { policyId, blockId, active: true });
    }

    public async getGlobalEventsStreamByUserTopic(policyId: string, blockId: string, userId: string, globalTopicId: string): Promise<unknown> {
        return await this.findOne(GlobalEventsReaderStream, { policyId, blockId, userId, globalTopicId });
    }

    public async createGlobalEventsStream(data: unknown): Promise<unknown> {
        return await this.save(GlobalEventsReaderStream, data);
    }

    public async updateGlobalEventsStream(data: unknown): Promise<unknown> {
        return await this.save(GlobalEventsReaderStream, data);
    }

    public async deleteGlobalEventsStream(data: unknown): Promise<void> {
        await this.remove(GlobalEventsReaderStream, data);
    }

    public async getGlobalEventsWriterStreamsByUser(policyId: string, blockId: string, userId: string): Promise<unknown[]> {
        return await this.find(GlobalEventsWriterStream, { policyId, blockId, userId });
    }

    public async getGlobalEventsWriterStreamByUserTopic(policyId: string, blockId: string, userId: string, globalTopicId: string): Promise<unknown> {
        return await this.findOne(GlobalEventsWriterStream, { policyId, blockId, userId, globalTopicId });
    }

    public async createGlobalEventsWriterStream(data: unknown): Promise<unknown> {
        return await this.save(GlobalEventsWriterStream, data);
    }

    public async updateGlobalEventsWriterStream(data: unknown): Promise<unknown> {
        return await this.save(GlobalEventsWriterStream, data);
    }

    public async deleteGlobalEventsWriterStream(data: unknown): Promise<void> {
        await this.remove(GlobalEventsWriterStream, data);
    }

    public async find(entityClass: EntityClass, filters: unknown, options?: unknown): Promise<unknown[]> {
        if (!this.store.touched(entityClass)) {
            return await this.call('find', [entityClass, filters, options]);
        }
        const settings = isRecordObject(options) ? options : {};
        if (settings.fields || settings.exclude || settings.populate) {
            throw incomplete(this.store, 'a read with a field projection or populate');
        }
        const bucket = this.store.bucket(entityClass);
        const filter = this.normalize(filters);
        const base = toFilterObject(filters);
        const ids = this.storedIds(bucket);
        const storedFilter = ids.length ? { $or: [base, { _id: { $in: ids } }] } : base;
        const stored: unknown[] = await this.call('find', [entityClass, storedFilter, forStoredRead(options)]);
        const records: { value: unknown; view: Record<string, unknown> }[] = [];
        for (const item of stored) {
            const id = getRecordId(item);
            const entry = id ? bucket.get(id) : undefined;
            if (!entry) {
                records.push({ value: item, view: getStoredView(entityClass, toRecord(item), this.dryRun) });
            } else if (entry.record && this.matches(entityClass, entry.record, filter)) {
                records.push({ value: toRecord(entry.record), view: getStoredView(entityClass, entry.record, this.dryRun) });
            }
        }
        for (const entry of bucket.values()) {
            if (!entry.stored && entry.record && this.matches(entityClass, entry.record, filter)) {
                records.push({ value: toRecord(entry.record), view: getStoredView(entityClass, entry.record, this.dryRun) });
            }
        }
        if (settings.orderBy) {
            let order;
            try {
                order = normalizePreviewOrder(settings.orderBy);
            } catch (error) {
                if (error instanceof PreviewQueryUnsupportedError) {
                    throw incomplete(this.store, error.message);
                }
                throw error;
            }
            records.sort((a, b) => comparePreviewRecords(a.view, b.view, order));
        }
        const offset = Number(settings.offset) || 0;
        const limit = Number(settings.limit) || 0;
        const values = records.map((record) => record.value);
        return limit ? values.slice(offset, offset + limit) : values.slice(offset);
    }

    public async findOne(entityClass: EntityClass, filters: unknown, options?: unknown): Promise<unknown> {
        if (!this.store.touched(entityClass)) {
            return await this.call('findOne', [entityClass, filters, options]);
        }
        if (!filters) {
            return null;
        }
        const [first] = await this.find(entityClass, filters, { ...withoutPaging(options), limit: 1 });
        return first ?? null;
    }

    public async count(entityClass: EntityClass, filters: unknown, options?: unknown): Promise<number> {
        if (!this.store.touched(entityClass)) {
            return await this.call('count', [entityClass, filters, options]);
        }
        const bucket = this.store.bucket(entityClass);
        const filter = this.normalize(filters);
        const base = toFilterObject(filters);
        const ids = this.storedIds(bucket);
        const all: number = await this.call('count', [entityClass, base, options]);
        const hidden: number = ids.length ? await this.call('count', [entityClass, { $and: [base, { _id: { $in: ids } }] }, options]) : 0;
        let added = 0;
        for (const entry of bucket.values()) {
            if (entry.record && this.matches(entityClass, entry.record, filter)) {
                added++;
            }
        }
        return all - hidden + added;
    }

    public async findAndCount(entityClass: EntityClass, filters: unknown, options?: unknown): Promise<[unknown[], number]> {
        if (!this.store.touched(entityClass)) {
            return await this.call('findAndCount', [entityClass, filters, options]);
        }
        return [await this.find(entityClass, filters, options), await this.count(entityClass, filters)];
    }

    public async findAll(entityClass: EntityClass, options?: unknown): Promise<unknown[]> {
        if (!this.store.touched(entityClass)) {
            return await this.call('findAll', [entityClass, options]);
        }
        return await this.find(entityClass, {}, options);
    }

    public async aggregate(entityClass: EntityClass, aggregation: unknown): Promise<unknown[]> {
        if (!this.store.touched(entityClass)) {
            return await this.call('aggregate', [entityClass, aggregation]);
        }
        throw incomplete(this.store, `an aggregation over ${entityClass.name} changed in this preview`);
    }

    private put(entityClass: EntityClass, id: string, record: Record<string, unknown> | null, existed: boolean): void {
        const bucket = this.store.bucket(entityClass);
        const previous = bucket.get(id);
        const stored = previous ? previous.stored : existed;
        if (!record && !stored) {
            bucket.delete(id);
            return;
        }
        bucket.set(id, { record, stored });
    }

    private async exists(entityClass: EntityClass, id: string): Promise<boolean> {
        const bucket = this.store.bucket(entityClass);
        const entry = bucket.get(id);
        if (entry) {
            return entry.stored;
        }
        if (!ObjectId.isValid(id)) {
            return false;
        }
        return !!(await this.call('findOne', [entityClass, { _id: new ObjectId(id) }]));
    }

    private async insert(entityClass: EntityClass, item: unknown): Promise<Record<string, unknown>> {
        const record = toRecord(item);
        const id = getRecordId(record);
        const objectId = id && ObjectId.isValid(id) ? new ObjectId(id) : new ObjectId();
        const key = String(objectId);
        record._id = objectId;
        record.id = key;
        applyPreviewDefaults(entityClass, record, this.dryRun);
        this.put(entityClass, key, record, id ? await this.exists(entityClass, key) : false);
        return toRecord(record);
    }

    private assign(entityClass: EntityClass, existing: unknown, item: unknown): Record<string, unknown> {
        const current = toRecord(existing);
        const record: Record<string, unknown> = { ...current, ...toRecord(item), updateDate: new Date() };
        const key = String(current._id);
        record._id = current._id;
        record.id = key;
        this.put(entityClass, key, record, true);
        return toRecord(record);
    }

    public async save(entityClass: EntityClass, item: unknown, filter?: unknown): Promise<unknown> {
        if (Array.isArray(item)) {
            return await this.saveMany(entityClass, item, filter);
        }
        const id = getRecordId(item);
        if (!id && !filter) {
            return await this.insert(entityClass, item);
        }
        const existing = await this.findOne(entityClass, filter || id);
        if (existing) {
            return this.assign(entityClass, existing, item);
        }
        return await this.insert(entityClass, item);
    }

    public async saveMany(entityClass: EntityClass, items: unknown[], filter?: unknown): Promise<unknown[]> {
        const result: unknown[] = [];
        for (const item of items) {
            result.push(await this.save(entityClass, item, filter));
        }
        return result;
    }

    public async update(entityClass: EntityClass, criteria: unknown, row: unknown): Promise<unknown> {
        if (Array.isArray(criteria)) {
            return await this.updateMany(entityClass, Array.isArray(row) ? row : [row], criteria);
        }
        const filter = criteria || getRecordId(row);
        if (!filter) {
            return undefined;
        }
        const targets = await this.find(entityClass, filter);
        const result = targets.map((existing) => this.assign(entityClass, existing, row));
        return result.length === 1 ? result[0] : result;
    }

    public async updateMany(entityClass: EntityClass, entities: unknown[], filter?: unknown): Promise<unknown[]> {
        const result: unknown[] = [];
        for (const entity of entities) {
            const id = getRecordId(entity);
            if (!filter && !id) {
                continue;
            }
            const targets = await this.find(entityClass, filter || id);
            for (const existing of targets) {
                result.push(this.assign(entityClass, existing, entity));
            }
        }
        return result;
    }

    public async remove(entityClass: EntityClass, entities: unknown): Promise<void> {
        for (const entity of Array.isArray(entities) ? entities : [entities]) {
            const id = getRecordId(entity);
            if (id) {
                this.put(entityClass, id, null, await this.exists(entityClass, id));
            }
        }
    }

    public async deleteEntity(entityClass: EntityClass, filters: unknown): Promise<number> {
        const targets = await this.find(entityClass, filters);
        await this.remove(entityClass, targets);
        return targets.length;
    }
}

export function createPreviewDatabaseServer(target: DatabaseServer, dryRunId: string | null): DatabaseServer {
    return new Proxy(target, {
        get(object, property, receiver) {
            const value = Reflect.get(object, property, receiver);
            if (typeof property !== 'string' || typeof value !== 'function') {
                return value;
            }
            const intercepted = property === 'getVirtualHederaAccountInfo' || READ_METHODS.has(property) || WRITE_METHODS.has(property) || STREAM_METHODS.has(property);
            if (!intercepted && !BLOCKED_METHODS.has(property)) {
                return value;
            }
            return (...args: unknown[]) => {
                const actionStatus = getActivePreview();
                if (!actionStatus) {
                    return Reflect.apply(value, receiver, args);
                }
                if (property === 'getVirtualHederaAccountInfo') {
                    const cached = getPreviewTokenAccount(actionStatus, String(args[0]));
                    return cached ? cached.then((account) => structuredClone(account)) : Reflect.apply(value, object, args);
                }
                const store = getStore(actionStatus);
                if (BLOCKED_METHODS.has(property)) {
                    return Promise.reject(incomplete(store, `the database method ${property}`));
                }
                const preview = new PreviewDatabase(object, !!dryRunId, store);
                return Reflect.apply(Reflect.get(preview, property), preview, args);
            };
        }
    });
}

export function getPreviewIncomplete(actionStatus: RecordActionStep): IPreviewIncomplete[] {
    const reasons = stores.get(actionStatus)?.incomplete || [];
    const errors = actionStatus.getErrors();
    return reasons.map((reason) => {
        const error = errors.find((item) => item.message.endsWith(reason));
        return { blockType: error?.blockType ?? null, reason };
    });
}
