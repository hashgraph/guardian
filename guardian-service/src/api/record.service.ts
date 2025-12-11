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
import { IOwner, MessageAPI, PolicyEvents, PolicyHelper } from '@guardian/interfaces';
import { GuardiansService } from '../helpers/guardians.js';

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
    // const normalize = (items: IRecordResult[] | undefined | null): IRecordResult[] => {
    //     if (!Array.isArray(items)) {
    //         return [];
    //     }
    //     // Keep only generated documents, ignore schemas/undefined to avoid skewing comparison
    //     return items.filter((item) => item && (item.type === 'vc' || item.type === 'vp'));
    // };

    // const report = await compareResults({
    //     ...details,
    //     recorded: normalize(details?.recorded),
    //     documents: normalize(details?.documents)
    // });
    // console.log(details, 'details');
    // details.documents.forEach((i) => console.log(i.document, 'documents'))
    // details.recorded.forEach((i) => console.log(i.document, 'recorded'))
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
        console.log(targetPolicyId, 'targetPolicyId');
        if (!targetPolicyId) {
            return;
        }
        const existingCopies = await DatabaseServer.getRecord(
            {
                policyId: targetPolicyId,
                fromPolicyId: { $ne: null },
                copiedRecordId: { $ne: null }
            } as any,
            { orderBy: { createDate: 'ASC' } } as any
        );
        // if (!Array.isArray(existingCopies) || !existingCopies.length) {
        //     return;
        // }

        // const policy = await DatabaseServer.getPolicy({
        //     id: targetPolicyId,
        // });
        const sourcePolicyId = '';
        // const sourcePolicyId = existingCopies[0].fromPolicyId;
        // if (!sourcePolicyId) {
        //     return;
        // }

        const sourcePolicy = await DatabaseServer.getPolicyById(targetPolicyId);
        const sourceActionsTopicId = sourcePolicy?.actionsTopicId;
        const sourcePolicyMessageId = sourcePolicy?.fromMessageId?.toString?.()?.trim?.() || null;
        console.log(sourcePolicy, 'sourcePolicy');
        console.log(sourceActionsTopicId, 'sourceActionsTopicId');
        console.log(sourcePolicyMessageId, 'sourcePolicyMessageId');
        if (!sourceActionsTopicId) {
            await logger.error(
                `Failed to sync copied policy records: actionsTopicId is missing for policy ${targetPolicyId}`,
                ['POLICY_RUN_RECORD'],
                null
            );
            return;
        }

        const messages = await MessageServer.getMessages<PolicyRecordMessage>({
            topicId: sourceActionsTopicId,
            userId: null,
            type: MessageType.PolicyRecordStep,
            action: MessageAction.PolicyRecordStep
        });

        if (!messages || !messages.length) {
            return;
        }

        const existingIds = new Set<string>();
        for (const record of existingCopies) {
            const id = record.copiedRecordId?.toString?.();
            if (id) {
                existingIds.add(id);
            }
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

            const parsedRecords: any[] = Array.isArray(parsed?.records)
                ? parsed.records
                : parsed?.record
                    ? [parsed.record]
                    : [];
            const parsedResults: any[] = Array.isArray(parsed?.results) ? parsed.results : [];
            // parsedResults.forEach((res) => console.log(res, 'resresresresres'))
            for (const recordFromZip of parsedRecords) {
                console.log(recordFromZip, 'recordFromZip');
                const copiedRecordId = recordFromZip.id?.toString?.() || msg.recordId?.toString?.();

                if (!copiedRecordId || existingIds.has(copiedRecordId)) {
                    continue;
                }

                const clone: any = {
                    uuid: recordFromZip.uuid || msg.recordingUuid,
                    policyId: targetPolicyId,
                    method: recordFromZip.method || msg.method,
                    action: recordFromZip.action || msg.actionName,
                    time: recordFromZip.time || recordFromZip.createDate || msg.time,
                    user: recordFromZip.user || msg.user,
                    target: recordFromZip.target || msg.target,
                    document: recordFromZip.document ?? null,
                    results: parsedResults.length ? parsedResults : null,
                    ipfsCid: recordFromZip.ipfsCid ?? null,
                    ipfsUrl: recordFromZip.ipfsUrl ?? null,
                    ipfsTimestamp: recordFromZip.ipfsTimestamp ?? new Date(),
                    fromPolicyId: sourcePolicyId,
                    copiedRecordId
                };

                const duplicate = await DatabaseServer.getRecord(
                    {
                        policyId: targetPolicyId,
                        copiedRecordId
                    } as any,
                    { limit: 1 } as any
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

async function loadImportedRecordsFromDb(
    policyId: string,
    policyOwner: string
): Promise<{ records: RunRecordAction[], results: IRecordResult[] }> {
    const sortOptions = { orderBy: { time: 'ASC', createDate: 'ASC' } } as any;

    let importedRecords = await DatabaseServer.getRecord(
        {
            policyId,
            fromPolicyId: { $ne: null }
        } as any,
        sortOptions
    );

    if (!importedRecords.length) {
        importedRecords = await DatabaseServer.getRecord(
            {
                policyId,
                ipfsCid: { $ne: null }
            } as any,
            sortOptions
        );
    }
    if (!importedRecords.length) {
        throw new Error('Imported records not found');
    }

    importedRecords = importedRecords.filter(Boolean);
    console.log(importedRecords, 'importedRecords');

    let total = 0;
    const resultsMap = new Map<string, IRecordResult>();
    for (const r of importedRecords) {
        const items: any[] = Array.isArray((r as any).results) ? (r as any).results : [];
        console.log(items.length, 'items.lengthitems.length');
        for (const res of items) {
            total += 1;
            console.log(res, 'resresres');
            console.log(res.document, 'res.documentres.document');
            const id = res.id || res.target || (r as any).copiedRecordId || `${Math.random()}` || '';
            if (!id) {
                continue;
            }
            const type = (res.type || '').toString().toLowerCase() as 'vc' | 'vp' | 'schema';
            const key = `${type}:${id}`;
            if (resultsMap.has(key)) {
                continue;
            }
            resultsMap.set(key, {
                id,
                type,
                document: res.document ?? res
            });
        }
    }

    console.log(total, 'totaltotaltotal');
    const resultsFromDb: IRecordResult[] = Array.from(resultsMap.values());
    console.log(resultsFromDb.length, 'resultsFromDbresultsFromDb');

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
    console.log(hasStart, 'hasStarthasStarthasStart 123');

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
    const paddedEndTime = safeEndTime + RESULTS_WINDOW_PADDING_MS;

    const firstSourceRecord: any = importedRecords.find((record: any) => record.fromPolicyId);
    const sourcePolicyId = firstSourceRecord?.fromPolicyId || policyId;

    const records = buildRunActionsFromImportedRecords(policyId, importedRecords, safeStartTime);
    const results = resultsFromDb.length
        ? resultsFromDb
        : await RecordImportExport.loadRecordResults(
            sourcePolicyId,
            safeStartTime,
            paddedEndTime
        );

    console.log(records, 'records');

    return {
        records,
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
                const leftBound = Math.max(lastDbActionTime, startTime);
                const { createTime } = allocatePreActionTimes(leftBound, action.time);
                insertCreateUser(normalizedUser, createTime);
            }
            currentUser = normalizedUser;
            pushAction({ ...action });
            continue;
        }

        if (!createdUsers.has(normalizedUser)) {
            const leftBound = Math.max(lastDbActionTime, startTime);
            const { createTime, setTime } = allocatePreActionTimes(leftBound, action.time);
            insertCreateUser(normalizedUser, createTime);
            insertSetUser(normalizedUser, setTime);
        } else if (currentUser !== normalizedUser) {
            const leftBound = Math.max(lastDbActionTime, lastActionTime, startTime);
            const switchTime = allocateSwitchTime(leftBound, action.time);
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

function allocatePreActionTimes(leftBound: number, baseTime: number): { createTime: number; setTime: number } {
    // const available = baseTime - leftBound;
    // let createTime = baseTime - MIN_SPACING_MS * 2;
    // let setTime = baseTime - MIN_SPACING_MS;

    // if (available <= MIN_SPACING_MS * 2) {
    //     const step = Math.max(Math.floor(available / 3), 1);
    //     createTime = leftBound + step;
    //     setTime = Math.min(baseTime - 1, createTime + step);
    //     if (setTime <= createTime) {
    //         createTime = Math.max(leftBound + 1, baseTime - 3);
    //         setTime = Math.max(createTime + 1, baseTime - 2);
    //     }
    //     return { createTime, setTime };
    // }

    // createTime = baseTime - MIN_SPACING_MS * 2;

    // if (createTime <= leftBound + MIN_SPACING_MS) {
    //     createTime = leftBound + MIN_SPACING_MS;
    // }

    // setTime = baseTime - MIN_SPACING_MS;

    // if (setTime <= createTime) {
    //     setTime = createTime + MIN_SPACING_MS;
    //     if (setTime >= baseTime) {
    //         setTime = baseTime - 1;
    //     }
    // }

    // return { createTime, setTime };
    const setTime = baseTime - 1;
    const createTime = baseTime - 2;

    return { createTime, setTime };
}

function allocateSwitchTime(leftBound: number, baseTime: number): number {
    // const available = baseTime - leftBound;
    // if (available <= MIN_SPACING_MS) {
    //     return Math.max(leftBound + 1, baseTime - 1);
    // }
    // let candidate = baseTime - MIN_SPACING_MS;
    // if (candidate <= leftBound + MIN_SPACING_MS) {
    //     candidate = leftBound + MIN_SPACING_MS;
    // }
    // if (candidate >= baseTime) {
    //     candidate = baseTime - 1;
    // }
    // return candidate;
    return baseTime - 1;
}

// function buildRunActionsFromImportedRecords(
//     policyId: string,
//     importedRecords: RecordEntity[],
//     startTimeMs: number
// ): RunRecordAction[] {
//     let orderCounter = 0;
//     const fallbackTime = startTimeMs || Date.now();
//     const baseActions: InternalRunRecordAction[] = importedRecords.map((record) => ({
//         method: record.method,
//         action: record.action ?? null,
//         user: record.user ?? null,
//         target: record.target ?? null,
//         time: normalizeTimestamp(record.time ?? record.createDate ?? record.updateDate, fallbackTime),
//         document: record.document ?? null,
//         uuid: record.uuid,
//         origin: 'db',
//         __order: orderCounter++
//     }));

//     if (!baseActions.length) {
//         return [];
//     }

//     baseActions.sort((a, b) => {
//         if (a.time === b.time) {
//             return a.__order - b.__order;
//         }
//         return a.time - b.time;
//     });

//     if (baseActions[0]) {
//         baseActions[0].time = baseActions[1]?.time - 10000;
//     }

//     const firstActionTime = baseActions[0]?.time ?? fallbackTime;
//     const startTime = Number.isFinite(startTimeMs) ? startTimeMs : firstActionTime;
//     let lastDbActionTime = startTime;
//     let lastActionTime = startTime;
//     const createdUsers = new Set<string>();
//     let currentUser: string | null = null;
//     const enriched: InternalRunRecordAction[] = [];

//     const firstBusinessActionTime = new Map<string, number>();
//     for (const action of baseActions) {
//         if (
//             action.user &&
//             action.method === 'ACTION' &&
//             action.action !== 'CREATE_USER' &&
//             action.action !== 'SET_USER'
//         ) {
//             if (!firstBusinessActionTime.has(action.user)) {
//                 firstBusinessActionTime.set(action.user, action.time);
//             }
//         }
//     }

//     const pushAction = (action: InternalRunRecordAction) => {
//         enriched.push(action);
//         if (typeof action.time === 'number') {
//             lastActionTime = Math.max(lastActionTime, action.time);
//             if (action.origin === 'db') {
//                 lastDbActionTime = Math.max(lastDbActionTime, action.time);
//             }
//         }
//     };

//     const insertCreateUser = (user: string, time: number) => {
//         createdUsers.add(user);
//         pushAction({
//             method: 'ACTION',
//             action: 'CREATE_USER',
//             user,
//             target: null,
//             time,
//             document: {
//                 document: {
//                     id: user,
//                     type: 'DID',
//                     policyId
//                 }
//             },
//             origin: 'synthetic',
//             __order: orderCounter++
//         });
//     };

//     const insertSetUser = (user: string, time: number) => {
//         currentUser = user;
//         pushAction({
//             method: 'ACTION',
//             action: 'SET_USER',
//             user,
//             target: null,
//             time,
//             origin: 'synthetic',
//             __order: orderCounter++
//         });
//     };

//     for (const action of baseActions) {
//         const normalizedUser = action.user || null;

//         if (action.method === 'START' || action.method === 'STOP') {
//             pushAction({ ...action });
//             if (action.method === 'START') {
//                 currentUser = action.user || null;
//             } else if (action.method === 'STOP') {
//                 currentUser = null;
//             }
//             continue;
//         }

//         if (!normalizedUser) {
//             pushAction({ ...action });
//             continue;
//         }

//         if (action.action === 'CREATE_USER') {
//             createdUsers.add(normalizedUser);
//             pushAction({ ...action });
//             continue;
//         }

//         if (action.action === 'SET_USER') {
//             if (!createdUsers.has(normalizedUser)) {
//                 const leftBound = Math.max(lastDbActionTime, startTime);
//                 const { createTime } = allocatePreActionTimes(leftBound, action.time);
//                 insertCreateUser(normalizedUser, createTime);
//             }
//             currentUser = normalizedUser;
//             pushAction({ ...action });
//             continue;
//         }

//         const firstBusinessTime = firstBusinessActionTime.get(normalizedUser);
//         const isFirstBusinessAction = firstBusinessTime !== undefined && firstBusinessTime === action.time;

//         if (isFirstBusinessAction && !createdUsers.has(normalizedUser)) {
//             const leftBound = Math.max(lastDbActionTime, startTime);
//             const { createTime, setTime } = allocatePreActionTimes(leftBound, action.time);
//             insertCreateUser(normalizedUser, createTime);
//             insertSetUser(normalizedUser, setTime);
//         } else if (currentUser !== normalizedUser) {
//             const leftBound = Math.max(lastDbActionTime, lastActionTime, startTime);
//             const switchTime = allocateSwitchTime(leftBound, action.time);
//             insertSetUser(normalizedUser, switchTime);
//         }

//         pushAction({ ...action });
//     }

//     const hasStop = enriched.some((action) => action.method === 'STOP');
//     if (!hasStop) {
//         const lastDbTime = baseActions.reduce(
//             (max, action) => Math.max(max, action.time),
//             startTime
//         );
//         const stopTime = Math.max(lastActionTime, lastDbTime) + MIN_SPACING_MS;
//         pushAction({
//             method: 'STOP',
//             action: null,
//             user: null,
//             target: null,
//             time: stopTime,
//             origin: 'synthetic',
//             __order: orderCounter++
//         });
//     }

//     enriched.sort((a, b) => {
//         if (a.time === b.time) {
//             return a.__order - b.__order;
//         }
//         return a.time - b.time;
//     });

//     return enriched.map(({ __order, origin, ...rest }) => rest);
// }

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
                    console.log(records, 'records from file');
                    console.log(results, 'results from file');
                } else {
                    delete options.importRecords;
                    delete options.syncNewRecords;
                    if (syncNewRecords) {
                        console.log(syncNewRecords, 'syncNewRecords');
                        await syncPolicyCopiedRecords(policyId, logger);
                    }

                    const dbData = await loadImportedRecordsFromDb(policyId, policy.owner);
                    records = dbData.records;
                    results = dbData.results;

                    console.log(records, 'records from ipfs');
                    // console.log(results, 'results from ipfs');
                    results.forEach((r) => console.log(r.document, 'rrrrrrrrrrrr'));
                }

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