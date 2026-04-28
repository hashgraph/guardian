import {
    MessageAPI,
    PolicyStatus,
    PolicyDataFilterOperator,
    VC_DOCUMENT_SYSTEM_FIELDS,
    VC_DOCUMENT_OPTION_PREFIX,
    VC_DOCUMENT_DOCUMENT_PREFIX,
} from '@guardian/interfaces';
import { ApiResponse } from '../api/helpers/api-response.js';
import {
    DatabaseServer,
    MessageError,
    MessageResponse,
    PinoLogger,
    VcDocument,
} from '@guardian/common';

/** Normalise bracket array notation → dot notation for MongoDB queries.
 *  e.g. "document.credentialSubject[0].field3" → "document.credentialSubject.0.field3"
 */
function normalisePath(field: string): string {
    return field.replace(/\[(\d+)\]/g, '.$1');
}

type FilterOperator = PolicyDataFilterOperator;

const OPERATOR_MAP: Record<Exclude<FilterOperator, 'contains'>, string> = {
    eq: '$eq',
    ne: '$ne',
    in: '$in',
    nin: '$nin',
    gt: '$gt',
    gte: '$gte',
    lt: '$lt',
    lte: '$lte',
};

const ALL_OPERATORS: ReadonlySet<string> = new Set([...Object.keys(OPERATOR_MAP), 'contains']);

/** Escape a string for safe use inside a MongoDB $regex pattern. */
function escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

interface FilterEntry {
    op: FilterOperator;
    value: unknown;
}

/**
 * Translate a caller-supplied filter map into a safe Mongo query fragment.
 * Rejects any field not on the whitelist and any operator not in OPERATOR_MAP.
 * Throws a descriptive Error.
 */
function buildMongoFilter(
    policyId: string,
    schemaIri: string,
    rawFilters: Record<string, FilterEntry> | undefined,
): Record<string, unknown> {
    const q: Record<string, unknown> = {
        policyId,
        schema: schemaIri,
    };

    if (!rawFilters) {
        return q;
    }

    for (const [rawField, entry] of Object.entries(rawFilters)) {
        const field = normalisePath(rawField);

        if (
            !VC_DOCUMENT_SYSTEM_FIELDS.has(field) &&
            !field.startsWith(VC_DOCUMENT_OPTION_PREFIX) &&
            !field.startsWith(VC_DOCUMENT_DOCUMENT_PREFIX)
        ) {
            throw new Error(
                `Unknown filter field: "${rawField}". ` +
                `Allowed system fields: ${[...VC_DOCUMENT_SYSTEM_FIELDS].join(', ')}; ` +
                `or any field beginning with "${VC_DOCUMENT_OPTION_PREFIX}" or "${VC_DOCUMENT_DOCUMENT_PREFIX}".`
            );
        }

        if (!entry || typeof entry !== 'object' || !('op' in entry) || !('value' in entry)) {
            throw new Error(`Filter for field "${field}" must have shape { op, value }.`);
        }
        if (!ALL_OPERATORS.has(entry.op as string)) {
            throw new Error(
                `Unknown operator "${entry.op}" for field "${field}". Allowed: ${[...ALL_OPERATORS].join(', ')}.`
            );
        }

        if (entry.op === 'contains') {
            if (typeof entry.value !== 'string') {
                throw new Error(`Operator "contains" requires a string value for field "${field}".`);
            }
            q[field] = { $regex: escapeRegex(entry.value), $options: 'i' };
            continue;
        }

        let safeValue = entry.value;
        if (entry.op === 'in' || entry.op === 'nin') {
            if (!Array.isArray(safeValue)) {
                safeValue = typeof safeValue === 'string'
                    ? safeValue.split(',').map((s: string) => s.trim())
                    : [safeValue];
            }
        }

        const mongoOp = OPERATOR_MAP[entry.op as Exclude<FilterOperator, 'contains'>];
        q[field] = { [mongoOp]: safeValue };
    }

    return q;
}

/**
 * Dynamic read-only query of VC documents committed by a policy.
 *
 * Payload shape:
 * {
 *   policyId   : string   — MongoDB ObjectId of the policy
 *   schemaName : string   — Schema Name
 *   filters?   : Record<field, { op: FilterOperator, value }>
 *   page       : number   (1-based)
 *   pageSize   : number   (1–200)
 *   sortField? : string   — field name; prefix '-' for descending
 *   ownerDid   : string   — caller's DID for access-control checks
 * }
 */
export async function policyDataAPI(
    dataBaseServer: DatabaseServer,
    logger: PinoLogger,
): Promise<void> {
    ApiResponse(MessageAPI.GET_POLICY_DATA_DOCUMENTS, async (msg: {
        policyId: string;
        schemaName: string;
        filters?: Record<string, FilterEntry>;
        page: number;
        pageSize: number;
        sortField?: string;
        ownerDid: string;
    }) => {
        try {
            if (!msg) {
                return new MessageError('Invalid parameters.');
            }

            const { policyId, schemaName, filters, page, pageSize, sortField } = msg;

            const policy = await dataBaseServer.getPolicy(policyId);
            if (!policy) {
                return new MessageError(`Policy "${policyId}" not found.`, 404);
            }
            if (policy.status !== PolicyStatus.PUBLISH) {
                return new MessageError(
                    `Policy "${policyId}" is not published. Only published policy data is queryable.`,
                    403
                );
            }

            const schemas = await DatabaseServer.getSchemas(
                { name: schemaName, topicId: policy.topicId },
                { limit: 1 }
            );
            if (!schemas || schemas.length === 0) {
                return new MessageError(
                    `Schema with name "${schemaName}" not found under policy topic "${policy.topicId}".`,
                    404
                );
            }
            const schema = schemas[0];
            const schemaIri = schema.iri;

            let mongoFilter: Record<string, unknown>;
            try {
                mongoFilter = buildMongoFilter(policyId, schemaIri, filters);
            } catch (validationError: any) {
                return new MessageError(validationError.message, 400);
            }

            const _page = Math.max(1, page || 1);
            const _pageSize = Math.min(200, Math.max(1, pageSize || 20));
            const offset = (_page - 1) * _pageSize;

            const sortOptions: Record<string, 'ASC' | 'DESC'> = {};
            if (sortField) {
                if (sortField.startsWith('-')) {
                    sortOptions[normalisePath(sortField.slice(1))] = 'DESC';
                } else {
                    sortOptions[normalisePath(sortField)] = 'ASC';
                }
            } else {
                sortOptions['createDate'] = 'DESC';
            }

            const queryOptions: any = {
                orderBy: sortOptions,
                limit: _pageSize,
                offset,
            };

            const [items, total] = await dataBaseServer.findAndCount(
                VcDocument,
                mongoFilter,
                queryOptions
            );

            return new MessageResponse({ items, total });
        } catch (error) {
            await logger.error(error, ['GUARDIAN_SERVICE'], msg?.ownerDid);
            return new MessageError(error);
        }
    });
}
