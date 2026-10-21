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
 * Build the pipeline for the incoming requests grid
 * Rows are grouped by `startMessageId`, the page and the total are taken from the same grouped rows
 * `policyId` and `type` are constant within a thread, so they are matched before the grouping,
 * `status` is derived by the grouping and is matched after it
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
    const leading: any = { accountId };
    if (filters?.policyId) {
        leading.policyId = filters.policyId;
    }
    if (filters?.type) {
        leading.type = filters.type;
    }
    const aggregate: any[] = [{
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
            type: { $last: '$type' },
            documentType: { $max: '$documentType' },
            statuses: { $addToSet: '$status' },
            // the same on every row of the thread
            lastStatus: { $last: '$lastStatus' },
            createDate: { $last: '$createDate' },
            policyId: { $last: '$policyId' },
            topicId: { $last: '$topicId' },
            messageId: { $last: '$messageId' },
            startMessageId: { $last: '$startMessageId' },
            blockTag: { $last: '$blockTag' },
            loaded: { $last: '$loaded' },
        }
    }, {
        $project: {
            statuses: '$statuses',
            type: '$type',
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
            messageId: '$messageId',
            startMessageId: '$startMessageId',
            blockTag: '$blockTag',
            loaded: '$loaded'
        }
    }];

    if (filters?.status) {
        aggregate.push({ $match: { status: filters.status } });
    }

    const page: any[] = [{ $sort: sort }];
    if (skip) {
        page.push({ $skip: skip });
    }
    page.push({ $limit: limit });

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
            limit = _pageSize;
            skip = _pageIndex * _pageSize;
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
                    requestsCount: {
                        $sum: {
                            $cond: [{
                                $and: [
                                    { $eq: ['$lastStatus', PolicyActionStatus.NEW] },
                                    { $eq: ['$type', PolicyActionType.REQUEST] }
                                ]
                            }, 1, 0]
                        }
                    },
                    actionsCount: {
                        $sum: {
                            $cond: [{
                                $and: [
                                    { $eq: ['$lastStatus', PolicyActionStatus.NEW] },
                                    { $eq: ['$type', PolicyActionType.ACTION] }
                                ]
                            }, 1, 0]
                        }
                    },
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
        const [counts] = await new DataBaseHelper(PolicyAction).aggregate(pipeline) as any[];

        return new MessageResponse({
            requestsCount: counts?.requestsCount || 0,
            actionsCount: counts?.actionsCount || 0,
            delayCount: counts?.delayCount || 0,
            total: counts?.total || 0
        });
    } catch (error) {
        return new MessageError(error);
    }
}
