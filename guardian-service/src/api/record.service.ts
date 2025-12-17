import { CompareOptions, IChildrenLvl, IEventsLvl, IIdLvl, IKeyLvl, IRefLvl, IPropertiesLvl, RecordComparator, RecordLoader } from '../analytics/index.js';
import { ApiResponse } from '../api/helpers/api-response.js';
import {
    BinaryMessageResponse,
    DatabaseServer,
    IRecordResult,
    MessageError,
    MessageResponse, PinoLogger,
    Policy,
    PolicyRecordMessage,
    RecordImportExport,
    Record as RecordEntity,
    MessageServer,
    MessageType,
    MessageAction
} from '@guardian/common';
import { IOwner, MessageAPI, PolicyEvents, PolicyHelper, GenerateUUIDv4 } from '@guardian/interfaces';
import { GuardiansService } from '../helpers/guardians.js';
import { FilterObject } from '@mikro-orm/core';

const MIN_SPACING_MS = 3000;
const RESULTS_WINDOW_PADDING_MS = 1000;

/**
 * Compare results
 * @param policyId
 * @param owner
 */
export async function compareResults(details: any): Promise<any> {
    if (details) {
        const options = new CompareOptions(
            IPropertiesLvl.All,
            IChildrenLvl.None,
            IEventsLvl.None,
            IIdLvl.None,
            IKeyLvl.Default,
            IRefLvl.Default,
            null
        );
        const documents: IRecordResult[] = details.documents;
        const recorded: IRecordResult[] = details.recorded;
        const comparator = new RecordComparator(options);
        const loader = new RecordLoader(options);
        const recordedModel = await loader.createModel(recorded);
        const documentsModel = await loader.createModel(documents);
        const results = comparator.compare([recordedModel, documentsModel]);
        const result = results[0];
        return result;
    } else {
        return null;
    }
}

/**
 * Compare results
 * @param policyId
 * @param owner
 */
export async function getDetails(details: any): Promise<any> {
    const report = await compareResults(details);
    const total = report?.total;
    const info = report?.right;
    const table = report?.documents?.report || [];

    const documents = [];
    for (let i = 1; i < table.length; i++) {
        const row = table[i];
        if (row.right) {
            const index = row.right.attributes;
            const document = details?.documents?.[index];
            documents.push({
                type: row.document_type,
                rate: row.total_rate,
                schema: row.right_schema,
                document
            })
        }
    }

    return { info, total, details, documents };
}

export async function syncPolicyCopiedRecords(
    targetPolicyId: string,
    logger: PinoLogger
): Promise<void> {
    try {
        const existingCopies = await DatabaseServer.getRecord(
            {
                policyId: targetPolicyId,
                importedFrom: 'ipfs',
            },
            { orderBy: { createDate: 'ASC' } }
        );
        const sourcePolicy = await DatabaseServer.getPolicyById(targetPolicyId);
        const sourceRecordsTopicId = sourcePolicy?.recordsTopicId;

        const sourcePolicyMessageId = sourcePolicy?.fromMessageId?.toString?.()?.trim?.() || null;
        if (!sourceRecordsTopicId) {
            await logger.error(
                `Failed to sync copied policy records: recordsTopicId is missing for policy ${targetPolicyId}`,
                ['POLICY_RUN_RECORD'],
                null
            );
            return;
        }

        const messages = await MessageServer.getMessages<PolicyRecordMessage>({
            topicId: sourceRecordsTopicId,
            userId: null,
            type: MessageType.PolicyRecordStep,
            action: MessageAction.PolicyRecordStep
        });

        if (!messages || !messages.length) {
            return;
        }

        const existingIds = new Set<string>();
        for (const record of existingCopies) {
            existingIds.add(record.copiedRecordId);
        }

        for (const msg of messages) {
            if (sourcePolicyMessageId && msg.policyMessageId !== sourcePolicyMessageId) {
                continue;
            }

            try {
                await MessageServer.loadDocument(msg);
            } catch (e: any) {
                await logger.error(
                    `Failed to load copied record from IPFS for recordId=${msg.recordId}: ${e?.message || e}`,
                    ['POLICY_RUN_RECORD'],
                    null
                );
                continue;
            }

            const zipBuffer = msg.getDocument?.() as Buffer | undefined;
            if (!zipBuffer) {
                continue;
            }

            let parsed: any;
            try {
                parsed = await RecordImportExport.parseZipFile(zipBuffer);
            } catch (e: any) {
                await logger.error(
                    `Failed to parse copied record zip for recordId=${msg.recordId}: ${e?.message || e}`,
                    ['POLICY_RUN_RECORD'],
                    null
                );
                continue;
            }

            const parsedRecords = parsed?.records || [];
            const parsedResults = parsed?.results || [];

            for (const recordFromZip of parsedRecords) {
                const copiedRecordId = msg.recordId;
                if (!copiedRecordId || existingIds.has(copiedRecordId)) {
                    continue;
                }

                const clone = {
                    uuid: GenerateUUIDv4(),
                    policyId: targetPolicyId,
                    method: recordFromZip.method || msg.method,
                    action: recordFromZip.action || msg.actionName,
                    time: msg.time,
                    user: recordFromZip.user || msg.user,
                    target: recordFromZip.target || msg.target,
                    document: recordFromZip.document ?? null,
                    results: parsedResults.length ? parsedResults : null,
                    userRole: recordFromZip.userRole || null,
                    importedFrom: 'ipfs',
                    copiedRecordId: msg.recordId,
                    recordActionId: msg.recordActionId
                } as FilterObject<RecordEntity>;

                const duplicate = await DatabaseServer.getRecord(
                    {
                        policyId: targetPolicyId,
                        uuid: copiedRecordId,
                        importedFrom: 'ipfs',
                    },
                    { limit: 1 }
                );

                if (Array.isArray(duplicate) && duplicate.length) {
                    existingIds.add(copiedRecordId);
                    continue;
                }

                await DatabaseServer.createRecord(clone);
                existingIds.add(copiedRecordId);
            }
        }
    } catch (error) {
        await logger.error(
            `Failed to sync copied policy records: ${error?.message || error}`,
            ['POLICY_RUN_RECORD'],
            null
        );
        throw error;
    }
}

/**
 * Check policy
 * @param policyId
 * @param owner
 */
export async function checkPolicy(
    policyId: string,
    user: IOwner
): Promise<Policy> {
    const model = await DatabaseServer.getPolicyById(policyId);
    if (!model) {
        throw new Error('Unknown policy');
    }
    if (model.owner !== user.owner) {
        throw new Error('Invalid owner.');
    }
    if (!PolicyHelper.isDryRunMode(model)) {
        throw new Error(`Policy is not in Dry Run`);
    }
    return model;
}

function reorderImportedRecords(importedRecords: RecordEntity[]): RecordEntity[] {
    const fallback = Date.now();

    const getMs = (r: any): number =>
        normalizeTimestamp(r?.time ?? r?.createDate ?? r?.updateDate, fallback);

    const n = importedRecords.length;
    const out: (RecordEntity | null)[] = new Array(n).fill(null);

    const fixed = new Set<number>();
    for (let i = 0; i < n; i++) {
        const r: any = importedRecords[i];
        if (!r) continue;
        if (r.recordActionId === null || r.recordActionId === undefined) {
            out[i] = importedRecords[i];
            fixed.add(i);
        }
    }

    type Group = { firstIdx: number; items: RecordEntity[] };
    const groups = new Map<string, Group>();

    for (let i = 0; i < n; i++) {
        const r: any = importedRecords[i];
        if (!r) continue;
        if (r.recordActionId === null || r.recordActionId === undefined) continue;

        const key = String(r.recordActionId);
        let g = groups.get(key);
        if (!g) {
            g = { firstIdx: i, items: [] };
            groups.set(key, g);
        }
        g.items.push(importedRecords[i]);
    }

    const groupList = Array.from(groups.entries())
        .sort((a, b) => a[1].firstIdx - b[1].firstIdx);

    for (const [, g] of groupList) {
        g.items.sort((a: any, b: any) => {
            const ta = getMs(a);
            const tb = getMs(b);
            return ta === tb ? 0 : (ta - tb);
        });
    }

    const findSlot = (start: number): number => {
        for (let i = start; i < n; i++) {
            if (!out[i]) return i;
        }
        for (let i = 0; i < start; i++) {
            if (!out[i]) return i;
        }
        return -1;
    };

    for (const [, g] of groupList) {
        let pos = g.firstIdx;
        for (const rec of g.items) {
            const slot = findSlot(pos);
            if (slot < 0) break;
            out[slot] = rec;
            pos = slot + 1;
        }
    }

    const result = out.filter(Boolean) as RecordEntity[];

    const baseMs = getMs(result[0]);
    for (let i = 0; i < result.length; i++) {
        (result[i] as any).time = new Date(baseMs + i * 10000).getTime();
    }

    return result;
}

async function loadImportedRecordsFromDb(
    policyId: string,
    policyOwner: string
): Promise<{ records: RunRecordAction[], results: IRecordResult[] }> {
    let importedRecords = await DatabaseServer.getRecord(
        {
            policyId,
            importedFrom: 'ipfs'
        } as any,
        { orderBy: { time: 'ASC'} },
    );

    if (!importedRecords.length) {
        throw new Error('Imported records not found');
    }

    importedRecords = reorderImportedRecords(importedRecords);
    const adminRecord: any = importedRecords.find((r: any) => r?.userRole === 'Administrator');
    const policyOwnerId: string | null = adminRecord?.user || null;

    if (policyOwnerId && policyOwner && policyOwnerId !== policyOwner) {
        for (const rec of importedRecords as any[]) {
            if (rec?.user === policyOwnerId) {
                rec.user = policyOwner;
            }
        }
    }
    let total = 0;
    const resultsMap = new Map<string, IRecordResult>();
    for (const r of importedRecords) {

        const items: any[] = Array.isArray((r as any).results) ? (r as any).results : [];
        for (const res of items) {
            total += 1;
            const id = res.id || res.target || r.uuid || `${Math.random()}` || '';
            if (!id) {
                continue;
            }
            const type = (res.type || '').toString().toLowerCase() as 'vc' | 'vp' | 'schema';
            const key = `${type}:${id}}`;
            if (resultsMap.has(key) || res.document?.credentialSubject?.find?.(({ operation }) => operation === 'PUBLISH')) {
                continue;
            }
            resultsMap.set(key, {
                id,
                type,
                document: res.document ?? res
            });
        }

    }

    const resultsFromDb: IRecordResult[] = Array.from(resultsMap.values()).sort((a, b) => {
        if (!a.document?.proof?.created || !b.document?.proof?.created) {
            return 0;
        }

        return a.document?.proof?.created > b.document?.proof?.created ? 1 : -1;
    });
    const toTimestamp = (value: any): number | null => {
        if (!value) {
            return null;
        }
        const timestamp = new Date(value).getTime();
        return Number.isNaN(timestamp) ? null : timestamp;
    };

    const firstRecord: any = importedRecords[0];
    const hasStart = importedRecords.some(
        (r: any) => (r.method || '').toUpperCase() === 'START'
    );

    if (hasStart) {
        const startRecord: any = importedRecords.find(
            (r: any) => (r.method || '').toUpperCase() === 'START'
        );
        const startUser: string | null = startRecord?.user || null;

        if (startUser && policyOwner && startUser !== policyOwner) {
            for (const rec of importedRecords) {
                if (rec.user === startUser) {
                    (rec as any).user = policyOwner;
                }
            }
        }
    } else if (firstRecord) {
        const firstTimeRaw =
            firstRecord.time ||
            firstRecord.createDate ||
            firstRecord.updateDate ||
            new Date();

        const firstTime = firstTimeRaw instanceof Date
            ? firstTimeRaw
            : new Date(firstTimeRaw);

        const startRecord: any = {
            ...firstRecord,
            method: 'START',
            action: null,
            user: policyOwner || firstRecord.user || null,
            target: null,
            time: new Date(firstTime.getTime() - MIN_SPACING_MS)
        };

        importedRecords.unshift(startRecord);
    }

    const firstTs = toTimestamp(importedRecords[0]?.time) ?? toTimestamp(importedRecords[0]?.createDate);
    const secondTs = toTimestamp(importedRecords[1]?.time) ?? toTimestamp(importedRecords[1]?.createDate);
    const startTime = ((secondTs ?? firstTs ?? Date.now()) - 10000);
    const endTimeCandidate = toTimestamp(importedRecords[importedRecords.length - 1]?.time) ??
        toTimestamp(importedRecords[importedRecords.length - 1]?.createDate);
    const initialEndTime = endTimeCandidate ?? startTime;
    const endTime = (initialEndTime !== null && startTime !== null && initialEndTime <= startTime)
        ? startTime + 1
        : initialEndTime;

    const safeStartTime = (startTime !== null) ? startTime : Date.now();
    let safeEndTime = (endTime !== null) ? endTime : safeStartTime;
    if (safeEndTime <= safeStartTime) {
        safeEndTime = safeStartTime + MIN_SPACING_MS;
    }

    const records = buildRunActionsFromImportedRecords(policyId, importedRecords, safeStartTime);
    const results = resultsFromDb;

    const seen = new Set<string>();
    const unique: RunRecordAction[] = [];

    for (const rec of records) {
        if (rec.action !== 'CREATE_USER' && rec.action !== 'SET_USER' && rec.action !== 'GENERATE_UUID' && rec.action !== 'GENERATE_DID') {
            const { time, ...other } = rec;
            const str = JSON.stringify(other);
            if (seen.has(str)) {
                continue;
            }
            seen.add(str);
        }
        unique.push(rec);
    }

    return {
        records: unique,
        results
    };
}

function buildRunActionsFromImportedRecords(
    policyId: string,
    importedRecords: RecordEntity[],
    startTimeMs: number
): RunRecordAction[] {
    let orderCounter = 0;
    const fallbackTime = startTimeMs || Date.now();

    const baseActions: InternalRunRecordAction[] = importedRecords.map((record) => ({
        method: record.method,
        action: record.action ?? null,
        user: record.user ?? null,
        target: record.target ?? null,
        time: normalizeTimestamp(record.time ?? record.createDate ?? record.updateDate, fallbackTime),
        document: record.document ?? null,
        uuid: record.uuid,
        origin: 'db',
        __order: orderCounter++
    }));

    if (!baseActions.length) {
        return [];
    }

    const hasStart = baseActions.some((a) => (a.method || '').toUpperCase() === 'START');
    if (!hasStart) {
        const firstTime = baseActions[0]?.time ?? fallbackTime;
        baseActions.unshift({
            method: 'START',
            action: null,
            user: baseActions[0]?.user ?? null,
            target: null,
            time: firstTime - MIN_SPACING_MS,
            document: null,
            uuid: baseActions[0]?.uuid,
            origin: 'synthetic',
            __order: --orderCounter
        });
    }

    baseActions.sort((a, b) => {
        if (a.time === b.time) {
            return a.__order - b.__order;
        }
        return a.time - b.time;
    });

    const firstActionTime = baseActions[0]?.time ?? fallbackTime;
    const startTime = Number.isFinite(startTimeMs) ? startTimeMs : firstActionTime;

    let lastDbActionTime = startTime;
    let lastActionTime = startTime;
    const createdUsers = new Set<string>();
    let currentUser: string | null = null;
    const enriched: InternalRunRecordAction[] = [];

    const pushAction = (action: InternalRunRecordAction) => {
        enriched.push(action);
        if (typeof action.time === 'number') {
            lastActionTime = Math.max(lastActionTime, action.time);
            if (action.origin === 'db') {
                lastDbActionTime = Math.max(lastDbActionTime, action.time);
            }
        }
    };

    const insertCreateUser = (user: string, time: number) => {
        createdUsers.add(user);
        pushAction({
            method: 'ACTION',
            action: 'CREATE_USER',
            user,
            target: null,
            time,
            document: {
                document: {
                    id: user,
                    type: 'DID',
                    policyId
                }
            },
            origin: 'synthetic',
            __order: orderCounter++
        });
    };

    const insertSetUser = (user: string, time: number) => {
        currentUser = user;
        pushAction({
            method: 'ACTION',
            action: 'SET_USER',
            user,
            target: null,
            time,
            origin: 'synthetic',
            __order: orderCounter++
        });
    };

    for (const action of baseActions) {
        const normalizedUser = action.user || null;

        if (action.method === 'START' || action.method === 'STOP') {
            pushAction({ ...action });
            if (action.method === 'START') {
                currentUser = normalizedUser;
                if (normalizedUser) {
                    createdUsers.add(normalizedUser);
                }
            } else if (action.method === 'STOP') {
                currentUser = null;
            }
            continue;
        }

        if (!normalizedUser) {
            pushAction({ ...action });
            continue;
        }

        if (action.action === 'CREATE_USER') {
            createdUsers.add(normalizedUser);
            pushAction({ ...action });
            continue;
        }

        if (action.action === 'SET_USER') {
            if (!createdUsers.has(normalizedUser)) {
                const { createTime } = allocatePreActionTimes(action.time);
                insertCreateUser(normalizedUser, createTime);
            }
            currentUser = normalizedUser;
            pushAction({ ...action });
            continue;
        }

        if (!createdUsers.has(normalizedUser)) {
            const { createTime, setTime } = allocatePreActionTimes(action.time);
            insertCreateUser(normalizedUser, createTime);
            insertSetUser(normalizedUser, setTime);
        } else if (currentUser !== normalizedUser) {
            const switchTime = action.time - 1;
            insertSetUser(normalizedUser, switchTime);
        }

        pushAction({ ...action });
    }

    const hasStop = enriched.some((action) => action.method === 'STOP');
    if (!hasStop) {
        const lastDbTime = baseActions.reduce(
            (max, action) => Math.max(max, action.time),
            startTime
        );
        const stopTime = Math.max(lastActionTime, lastDbTime) + MIN_SPACING_MS;
        pushAction({
            method: 'STOP',
            action: null,
            user: null,
            target: null,
            time: stopTime,
            origin: 'synthetic',
            __order: orderCounter++
        });
    }

    enriched.sort((a, b) => {
        if (a.time === b.time) {
            return a.__order - b.__order;
        }
        return a.time - b.time;
    });

    enforceMinSpacing(enriched, MIN_SPACING_MS);

    return enriched.map(({ __order, origin, ...rest }) => rest);
}


interface RunRecordAction {
    method: string;
    action: string | null;
    user: string | null;
    target: string | null;
    time: number;
    document?: any;
    uuid?: string;
}

interface InternalRunRecordAction extends RunRecordAction {
    __order: number;
    origin: 'db' | 'synthetic';
}

function normalizeTimestamp(value: any, fallback: number): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }
    if (value instanceof Date) {
        return value.getTime();
    }
    const parsed = new Date(value).getTime();
    if (!Number.isNaN(parsed)) {
        return parsed;
    }
    return fallback;
}

function enforceMinSpacing(
    actions: InternalRunRecordAction[],
    minSpacingMs: number
): void {
    if (!actions.length) {
        return;
    }

    let lastTime = actions[0].time;

    if (!Number.isFinite(lastTime)) {
        lastTime = Date.now();
        actions[0].time = lastTime;
    }

    for (let i = 1; i < actions.length; i++) {
        const action = actions[i];
        let t = action.time;

        if (!Number.isFinite(t)) {
            t = lastTime + minSpacingMs;
        }

        const minAllowed = lastTime + minSpacingMs;
        if (t < minAllowed) {
            t = minAllowed;
        }

        action.time = t;
        lastTime = t;
    }
}

function allocatePreActionTimes(baseTime: number): { createTime: number; setTime: number } {
    const setTime = baseTime - 1;
    const createTime = baseTime - 2;

    return { createTime, setTime };
}

/**
 * Connect to the message broker methods of working with records.
 */
export async function recordAPI(logger: PinoLogger): Promise<void> {
    /**
     * Get recording or running status
     *
     * @param payload - options
     *
     * @returns {any} result
     */
    ApiResponse(MessageAPI.GET_RECORD_STATUS,
        async (msg: { policyId: string, owner: IOwner, userId: string | null }) => {
            const userId = msg?.userId
            try {
                if (!msg) {
                    throw new Error('Invalid parameters');
                }
                const { policyId, owner } = msg;
                await checkPolicy(policyId, owner);
                const guardiansService = new GuardiansService();
                const result = await guardiansService
                    .sendPolicyMessage(PolicyEvents.GET_RECORD_STATUS, policyId, null);
                return new MessageResponse(result);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                return new MessageError(error);
            }
        });

    /**
     * Start recording
     *
     * @param payload - options
     *
     * @returns {any} result
     */
    ApiResponse(MessageAPI.START_RECORDING,
        async (msg: { policyId: string, owner: IOwner, options: any, userId: string | null }) => {
            const userId = msg?.userId
            try {
                if (!msg) {
                    throw new Error('Invalid parameters');
                }
                const { policyId, owner, options } = msg;
                await checkPolicy(policyId, owner);
                const guardiansService = new GuardiansService();
                const result = await guardiansService
                    .sendPolicyMessage(PolicyEvents.START_RECORDING, policyId, options);
                return new MessageResponse(result);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                return new MessageError(error);
            }
        });

    /**
     * Stop recording
     *
     * @param payload - options
     *
     * @returns {any} result
     */
    ApiResponse(MessageAPI.STOP_RECORDING,
        async (msg: { policyId: string, owner: IOwner, options: any, userId: string | null }) => {
            const userId = msg?.userId
            try {
                if (!msg) {
                    throw new Error('Invalid parameters');
                }
                const { policyId, owner, options } = msg;
                await checkPolicy(policyId, owner);
                const guardiansService = new GuardiansService();
                const result = await guardiansService
                    .sendPolicyMessage(PolicyEvents.STOP_RECORDING, policyId, options);

                if (!result) {
                    throw new Error('Invalid record');
                }

                const items = await DatabaseServer.getRecord({ policyId, method: 'STOP' });
                const uuid = items[items.length - 1]?.uuid;

                const zip = await RecordImportExport.generate(uuid);
                const file = await zip.generateAsync({
                    type: 'arraybuffer',
                    compression: 'DEFLATE',
                    compressionOptions: {
                        level: 3,
                    },
                });
                return new BinaryMessageResponse(file);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                return new MessageError(error);
            }
        });

    /**
     * Get recorded actions
     *
     * @param payload - options
     *
     * @returns {any} result
     */
    ApiResponse(MessageAPI.GET_RECORDED_ACTIONS,
        async (msg: { policyId: string, owner: IOwner, userId: string | null }) => {
            const userId = msg?.userId
            try {
                if (!msg) {
                    throw new Error('Invalid parameters');
                }
                const { policyId, owner } = msg;
                await checkPolicy(policyId, owner);
                const guardiansService = new GuardiansService();
                const result = await guardiansService
                    .sendPolicyMessage(PolicyEvents.GET_RECORDED_ACTIONS, policyId, null);
                return new MessageResponse(result);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                return new MessageError(error);
            }
        });

    /**
     * Run record
     *
     * @param payload - options
     *
     * @returns {any} result
     */
    ApiResponse(MessageAPI.RUN_RECORD,
        async (msg: { policyId: string, owner: IOwner, options: any, userId: string | null }) => {
            const userId = msg?.userId
            try {
                if (!msg) {
                    throw new Error('Invalid parameters');
                }
                const { policyId, owner } = msg;
                const options = msg.options || {};
                const syncNewRecords = !!options.syncNewRecords
                const policy = await checkPolicy(policyId, owner);

                let records: RecordEntity[] | any[] = [];
                let results: IRecordResult[] = [];

                if (options.file?.data?.length) {
                    const zip = options.file;
                    delete options.file;
                    const recordToImport = await RecordImportExport.parseZipFile(Buffer.from(zip.data));
                    records = recordToImport.records;
                    results = recordToImport.results;
                } else {
                    delete options.importRecords;
                    delete options.syncNewRecords;
                    if (syncNewRecords) {
                        await syncPolicyCopiedRecords(policyId, logger);
                    }

                    const dbData = await loadImportedRecordsFromDb(policyId, policy.owner);
                    records = dbData.records;
                    results = dbData.results;
                }
                console.log(results, 'results');
                console.log(records, 'records');
                const guardiansService = new GuardiansService();

                const result = await guardiansService
                    .sendPolicyMessage(PolicyEvents.RUN_RECORD, policyId, {
                        records,
                        results,
                        options
                    });
                return new MessageResponse(result);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                return new MessageError(error);
            }
        });

    /**
     * Stop running
     *
     * @param payload - options
     *
     * @returns {any} result
     */
    ApiResponse(MessageAPI.STOP_RUNNING,
        async (msg: { policyId: string, owner: IOwner, options: any, userId: string | null }) => {
            const userId = msg?.userId
            try {
                if (!msg) {
                    throw new Error('Invalid parameters');
                }

                const { policyId, owner, options } = msg;
                await checkPolicy(policyId, owner);

                const guardiansService = new GuardiansService();
                const result = await guardiansService
                    .sendPolicyMessage(PolicyEvents.STOP_RUNNING, policyId, options);
                return new MessageResponse(result);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                return new MessageError(error);
            }
        });

    /**
     * Get record results
     *
     * @param payload - options
     *
     * @returns {any} result
     */
    ApiResponse(MessageAPI.GET_RECORD_RESULTS,
        async (msg: { policyId: string, owner: IOwner, userId: string | null }) => {
            const userId = msg?.userId
            try {
                if (!msg) {
                    throw new Error('Invalid parameters');
                }

                const { policyId, owner } = msg;
                await checkPolicy(policyId, owner);

                const guardiansService = new GuardiansService();
                const details: any = await guardiansService
                    .sendPolicyMessage(PolicyEvents.GET_RECORD_RESULTS, policyId, null);

                const result = await getDetails(details);
                return new MessageResponse(result);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                return new MessageError(error);
            }
        });

    /**
     * Get record results
     *
     * @param payload - options
     *
     * @returns {any} result
     */
    ApiResponse(MessageAPI.GET_RECORD_DETAILS,
        async (msg: { policyId: string, owner: IOwner, userId: string | null }) => {
            const userId = msg?.userId
            try {
                if (!msg) {
                    throw new Error('Invalid parameters');
                }

                const { policyId, owner } = msg;
                await checkPolicy(policyId, owner);

                const guardiansService = new GuardiansService();
                const details: any = await guardiansService
                    .sendPolicyMessage(PolicyEvents.GET_RECORD_RESULTS, policyId, null);

                const result = await compareResults(details);
                return new MessageResponse(result);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                return new MessageError(error);
            }
        });

    /**
     * Fast Forward
     *
     * @param payload - options
     *
     * @returns {any} result
     */
    ApiResponse(MessageAPI.FAST_FORWARD,
        async (msg: { policyId: string, owner: IOwner, options: any, userId: string | null }) => {
            const userId = msg?.userId
            try {
                if (!msg) {
                    throw new Error('Invalid parameters');
                }

                const { policyId, owner, options } = msg;
                await checkPolicy(policyId, owner);

                const guardiansService = new GuardiansService();
                const result = await guardiansService
                    .sendPolicyMessage(PolicyEvents.FAST_FORWARD, policyId, options);
                return new MessageResponse(result);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                return new MessageError(error);
            }
        });

    /**
     * Retry Step
     *
     * @param payload - options
     *
     * @returns {any} result
     */
    ApiResponse(MessageAPI.RECORD_RETRY_STEP,
        async (msg: { policyId: string, owner: IOwner, options: any, userId: string | null }) => {
            const userId = msg?.userId
            try {
                if (!msg) {
                    throw new Error('Invalid parameters');
                }

                const { policyId, owner, options } = msg;
                await checkPolicy(policyId, owner);

                const guardiansService = new GuardiansService();
                const result = await guardiansService
                    .sendPolicyMessage(PolicyEvents.RECORD_RETRY_STEP, policyId, options);
                return new MessageResponse(result);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                return new MessageError(error);
            }
        });

    /**
     * Skip Step
     *
     * @param payload - options
     *
     * @returns {any} result
     */
    ApiResponse(MessageAPI.RECORD_SKIP_STEP,
        async (msg: { policyId: string, owner: IOwner, options: any, userId: string | null }) => {
            const userId = msg?.userId
            try {
                if (!msg) {
                    throw new Error('Invalid parameters');
                }

                const { policyId, owner, options } = msg;
                await checkPolicy(policyId, owner);

                const guardiansService = new GuardiansService();
                const result = await guardiansService
                    .sendPolicyMessage(PolicyEvents.RECORD_SKIP_STEP, policyId, options);
                return new MessageResponse(result);
            } catch (error) {
                await logger.error(error, ['GUARDIAN_SERVICE'], userId);
                return new MessageError(error);
            }
        });
}