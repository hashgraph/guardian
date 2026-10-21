import { DatabaseServer } from '@guardian/common/database-modules/database-server';
import { DataBaseHelper } from '@guardian/common/helpers/db-helper';
import { IAuthUser } from '@guardian/common/interfaces/auth.interface';
import { MessageError, MessageResponse } from '@guardian/common/models/message-response';
import { PolicyAction } from '@guardian/common/entity/policy-action';
import { PolicyActionStatus, PolicyActionType } from '@guardian/interfaces';

/**
 * Fields the incoming requests grid can be sorted by
 */
const SORT_FIELDS = new Set([
    'createDate',
    'startMessageId',
    'status',
    'type',
    'documentType',
    'topicId',
    'blockTag',
    'policyId'
]);

/**
 * Build the sort stage, `startMessageId` is always the final tie-breaker
 * @param sortField
 * @param sortDirection
 */
export function getRemoteRequestsSort(sortField?: string, sortDirection?: string): { [key: string]: 1 | -1 } {
    const direction = String(sortDirection).toLowerCase() === 'asc' ? 1 : -1;
    if (sortField === 'startMessageId') {
        return { startMessageId: direction };
    }
    if (sortField && SORT_FIELDS.has(sortField)) {
        return { [sortField]: direction, startMessageId: -1 };
    }
    return { startMessageId: -1 };
}

/**
 * Most rows one request returns (also when the page size is not set), about 400 bytes each
 */
export const MAX_UNLIMITED_ROWS = 5000;

/**
 * Match a single value or a comma separated list of values
 * @param value
 */
function matchValues(value: string): any {
    const values = String(value).split(',').map((item) => item.trim()).filter((item) => !!item);
    return values.length > 1 ? { $in: values } : values[0];
}

/**
 * Stages that turn the rows of an account into one row per thread
 * @param accountId
 * @param policyId
 */
function getRemoteThreadsStages(accountId: string, policyId?: string): any[] {
    const leading: any = { accountId };
    if (policyId) {
        leading.policyId = policyId;
    }
    return [{
        $match: leading
    }, {
        $project: {
            _id: '$_id',
            createDate: '$createDate',
            accountId: '$accountId',
            type: '$type',
            documentType: { $ifNull: ['$documentType', '$document.type'] },
            startMessageId: '$startMessageId',
            policyId: '$policyId',
            status: '$status',
            lastStatus: '$lastStatus',
            topicId: '$topicId',
            messageId: '$messageId',
            blockTag: '$blockTag',
            index: '$index',
            loaded: '$loaded',
        }
    }, {
        $sort: { startMessageId: -1 }
    }, {
        $group: {
            _id: '$startMessageId',
            // the request row starts the thread, the replies follow it
            requestType: { $max: { $cond: [{ $eq: ['$messageId', '$startMessageId'] }, '$type', null] } },
            anyType: { $first: '$type' },
            documentType: { $max: '$documentType' },
            statuses: { $addToSet: '$status' },
            // the same on every row of the thread
            lastStatus: { $last: '$lastStatus' },
            createDate: { $min: '$createDate' },
            policyId: { $last: '$policyId' },
            topicId: { $last: '$topicId' },
            startMessageId: { $last: '$startMessageId' },
            blockTag: { $last: '$blockTag' },
            requestLoaded: { $max: { $cond: [{ $eq: ['$messageId', '$startMessageId'] }, '$loaded', null] } },
            // position of the request message in its topic, for a link to the explorer
            requestIndex: { $max: { $cond: [{ $eq: ['$messageId', '$startMessageId'] }, '$index', null] } },
            anyLoaded: { $first: '$loaded' },
        }
    }, {
        $project: {
            statuses: '$statuses',
            type: { $ifNull: ['$requestType', '$anyType'] },
            documentType: '$documentType',
            status: {
                $switch: {
                    branches: [
                        // failed or rejected on this side without a row of its own
                        { case: { $in: ['$lastStatus', ['ERROR', 'REJECTED']] }, then: '$lastStatus' },
                        { case: { $in: ['ERROR', '$statuses'] }, then: 'ERROR' },
                        { case: { $in: ['CANCELED', '$statuses'] }, then: 'CANCELED' },
                        { case: { $in: ['REJECTED', '$statuses'] }, then: 'REJECTED' },
                        { case: { $in: ['COMPLETED', '$statuses'] }, then: 'COMPLETED' },
                    ],
                    default: 'NEW'
                }
            },
            policyId: '$policyId',
            createDate: '$createDate',
            topicId: '$topicId',
            // approve, reject, cancel and reload address the request row
            messageId: '$startMessageId',
            startMessageId: '$startMessageId',
            blockTag: '$blockTag',
            index: '$requestIndex',
            // Reload fetches the document of the request row
            loaded: { $ifNull: ['$requestLoaded', '$anyLoaded'] }
        }
    }];
}

/**
 * Build the pipeline for the incoming requests grid
 * Rows are grouped by `startMessageId`, the page and the total are taken from the same grouped rows
 * `policyId` is constant within a thread, so it is matched before the grouping.
 * `type` is not: the reply to a remote action is saved as an action, so the thread takes the type
 * of its request row and is matched by it after the grouping, together with the derived `status`
 * @param accountId
 * @param filters
 * @param sort
 * @param skip
 * @param limit
 */
export function getRemoteRequestsPipeline(
    accountId: string,
    filters: { policyId?: string, status?: string, type?: string } | undefined,
    sort: { [key: string]: 1 | -1 },
    skip: number,
    limit: number
): any[] {
    const aggregate: any[] = getRemoteThreadsStages(accountId, filters?.policyId);

    const trailing: any = {};
    if (filters?.type) {
        trailing.type = matchValues(filters.type);
    }
    if (filters?.status) {
        trailing.status = matchValues(filters.status);
    }
    if (Object.keys(trailing).length) {
        aggregate.push({ $match: trailing });
    }

    const page: any[] = [{ $sort: sort }];
    if (skip > 0) {
        page.push({ $skip: skip });
    }
    // the facet result is a single document (16 MB), so no page is larger than the cap
    page.push({ $limit: limit > 0 ? Math.min(limit, MAX_UNLIMITED_ROWS) : MAX_UNLIMITED_ROWS });

    aggregate.push({
        $facet: {
            items: page,
            total: [{ $count: 'count' }]
        }
    });
    return aggregate;
}

/**
 * Get remote requests
 * @param msg
 */
export async function getRemoteRequests(msg: {
    options: {
        filters: {
            policyId?: string,
            status?: string,
            type?: string
        },
        pageIndex: string,
        pageSize: string,
        sortField?: string,
        sortDirection?: string
    },
    user: IAuthUser
}) {
    try {
        const { options, user } = msg;
        const { filters, pageIndex, pageSize, sortField, sortDirection } = options;

        let skip = 0;
        let limit = 100;
        const _pageSize = parseInt(pageSize, 10);
        const _pageIndex = parseInt(pageIndex, 10);
        if (Number.isInteger(_pageSize) && Number.isInteger(_pageIndex)) {
            limit = Math.max(_pageSize, 0);
            skip = Math.max(_pageIndex, 0) * limit;
        }

        const aggregate = getRemoteRequestsPipeline(
            user.hederaAccountId,
            filters,
            getRemoteRequestsSort(sortField, sortDirection),
            skip,
            limit
        );
        const [result] = await new DataBaseHelper(PolicyAction).aggregate(aggregate) as any[];
        const items: any[] = result?.items || [];
        const count: number = result?.total?.[0]?.count || 0;

        const policyIds = new Set<string>();
        const legacy: string[] = [];
        for (const row of items) {
            policyIds.add(row.policyId);
            row.document = { type: row.documentType };
            if (!row.documentType) {
                legacy.push(row.startMessageId);
            }
        }

        // Rows created before `documentType` was stored: one batched read for the whole page
        if (legacy.length) {
            const requests = await DatabaseServer.getRemoteRequests({
                startMessageId: { $in: legacy },
                status: PolicyActionStatus.NEW
            });
            const types = new Map<string, string>();
            for (const request of requests) {
                if (request?.document?.type && !types.has(request.startMessageId)) {
                    types.set(request.startMessageId, request.document.type);
                }
            }
            for (const row of items) {
                const type = types.get(row.startMessageId);
                if (!row.documentType && type) {
                    row.documentType = type;
                    row.document.type = type;
                }
            }
        }

        const policies = await DatabaseServer.getPolicies({
            id: { $in: Array.from(policyIds) }
        });

        for (const item of items) {
            const policy = policies.find(p => p.id === item.policyId);
            if (policy) {
                item.policyName = policy.name;
                item.policyDescription = policy.description;
                item.policyVersion = policy.version;
            }
        }

        return new MessageResponse({ items, count });
    } catch (error) {
        return new MessageError(error);
    }
}

/**
 * Get remote request document
 * @param msg
 */
export async function getRemoteRequestDocument(msg: { options: any, user: IAuthUser }) {
    try {
        const { options } = msg;
        const { filters, startMessageId } = options;
        const _filters: any = { ...filters };

        if (startMessageId) {
            _filters.startMessageId = startMessageId;
        }

        const requestDocuments = await DatabaseServer.getRemoteRequests({
            ..._filters
        }, { orderBy: { updateDate: -1 } });

        const requestMap = new Map<string, PolicyAction>();

        requestDocuments.forEach(element => {
            if (element && !requestMap.has(element.status)) {
                requestMap.set(element.status, element);
            }
        });

        const requestDocument: any = requestMap.get(PolicyActionStatus.ERROR)
            || requestMap.get(PolicyActionStatus.CANCELED)
            || requestMap.get(PolicyActionStatus.REJECTED)
            || requestMap.get(PolicyActionStatus.COMPLETED)
            || requestDocuments[0];

        return new MessageResponse(requestDocument);
    } catch (error) {
        return new MessageError(error);
    }
}

/**
 * Build the pipeline that counts the threads of an account by what is expected of the user
 * @param accountId
 * @param policyId
 */
export function getRemoteThreadsCountPipeline(accountId: string, policyId?: string): any[] {
    const count = (type: any, status: string) => ({
        $sum: {
            $cond: [{
                $and: [
                    { $in: ['$type', type] },
                    { $eq: ['$status', status] }
                ]
            }, 1, 0]
        }
    });
    return [
        ...getRemoteThreadsStages(accountId, policyId),
        {
            $group: {
                _id: null,
                requestsCount: count([PolicyActionType.REQUEST], PolicyActionStatus.NEW),
                actionsCount: count(
                    [PolicyActionType.ACTION, PolicyActionType.REMOTE_ACTION],
                    PolicyActionStatus.NEW
                ),
                failedCount: { $sum: { $cond: [{ $eq: ['$status', PolicyActionStatus.ERROR] }, 1, 0] } },
                threads: { $sum: 1 }
            }
        }
    ];
}

/**
 * Get remote requests count
 * @param msg
 */
export async function getRemoteRequestsCount(msg: { options: any, user: IAuthUser }) {
    try {
        const { options, user } = msg;
        const { filters, policyId } = options;
        const match: any = { ...filters };

        match.accountId = user.hederaAccountId;
        if (policyId) {
            match.policyId = policyId;
        }

        const minuteAgo = new Date(Date.now() - 60 * 1000);
        const pipeline: any[] = [
            { $match: match },
            {
                $group: {
                    _id: null,
                    delayCount: {
                        $sum: {
                            $cond: [{
                                $and: [
                                    { $eq: ['$lastStatus', PolicyActionStatus.COMPLETED] },
                                    { $gt: ['$updateDate', minuteAgo] }
                                ]
                            }, 1, 0]
                        }
                    },
                    total: { $sum: 1 }
                }
            }
        ];
        const collection = new DataBaseHelper(PolicyAction);
        const [counts] = await collection.aggregate(pipeline) as any[];
        // requests, actions and failures are counted per thread, as the grid lists them
        const [threads] = await collection.aggregate(
            getRemoteThreadsCountPipeline(user.hederaAccountId, policyId)
        ) as any[];

        return new MessageResponse({
            requestsCount: threads?.requestsCount || 0,
            actionsCount: threads?.actionsCount || 0,
            failedCount: threads?.failedCount || 0,
            threadsCount: threads?.threads || 0,
            delayCount: counts?.delayCount || 0,
            total: counts?.total || 0
        });
    } catch (error) {
        return new MessageError(error);
    }
}
