import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import {
    IndexerMessageAPI,
    MessageResponse,
    MessageError,
    DataBaseHelper,
    Message,
} from '@indexer/common';
import {
    AdvancedSearchParams,
    AdvancedSearchResult,
    AdvancedSearchResultItem,
    AdvancedSearchStep,
    SearchCondition,
    ConditionOperator,
} from '@indexer/interfaces';
import escapeStringRegexp from 'escape-string-regexp';

// ── Query builder helpers ────────────────────────────────────────────────────

/**
 * Build a MongoDB filter expression for a single SearchCondition.
 */
function buildConditionFilter(cond: SearchCondition): Record<string, any> {
    const { field, operator, value, valueTo } = cond;

    switch (operator as ConditionOperator) {
        case 'eq':
            return { [field]: value };
        case 'neq':
            return { [field]: { $ne: value } };
        case 'contains':
            return {
                [field]: {
                    $regex: `.*${escapeStringRegexp(String(value)).trim()}.*`,
                    $options: 'si',
                },
            };
        case 'regex':
            return {
                [field]: {
                    $regex: String(value),
                    $options: 'si',
                },
            };
        case 'gt':
            return { [field]: { $gt: value } };
        case 'gte':
            return { [field]: { $gte: value } };
        case 'lt':
            return { [field]: { $lt: value } };
        case 'lte':
            return { [field]: { $lte: value } };
        case 'between':
            return { [field]: { $gte: value, $lte: valueTo ?? value } };
        case 'in':
            return { [field]: { $in: Array.isArray(value) ? value : [value] } };
        case 'not_in':
            return { [field]: { $nin: Array.isArray(value) ? value : [value] } };
        default:
            return { [field]: value };
    }
}

/**
 * Resolve any `$step{n}.fieldPath` placeholders in a condition value
 * against the provided carry-values map from previous steps.
 */
function resolveStepRefs(
    value: string | number | boolean | string[],
    carryValues: Map<string, string[]>
): string | number | boolean | string[] {
    if (typeof value !== 'string') { return value; }
    const match = value.match(/^\$step(\d+)\.(.+)$/);
    if (!match) { return value; }
    const key = `${match[1]}.${match[2]}`;
    const resolved = carryValues.get(key);
    if (!resolved || resolved.length === 0) { return value; }
    if (resolved.length === 1) { return resolved[0]; }
    return resolved; // caller should use 'in' operator with array result
}

/**
 * Build the MongoDB $and filter from a step's conditions,
 * after resolving any cross-step references.
 */
function buildStepFilter(
    step: AdvancedSearchStep,
    carryValues: Map<string, string[]>
): Record<string, any> {
    const andClauses: Record<string, any>[] = [];

    // Type filter
    const types = [
        ...(step.type ? [step.type] : []),
        ...(step.types || []),
    ];
    if (types.length === 1) {
        andClauses.push({ type: types[0] });
    } else if (types.length > 1) {
        andClauses.push({ type: { $in: types } });
    }

    // Field conditions
    for (const cond of step.conditions ?? []) {
        const resolved = resolveStepRefs(cond.value, carryValues);
        // If the resolved value is an array and operator is 'eq', auto-upgrade to 'in'
        const operator: ConditionOperator =
            Array.isArray(resolved) && cond.operator === 'eq' ? 'in' : cond.operator;
        andClauses.push(
            buildConditionFilter({ ...cond, operator, value: resolved as any })
        );
    }

    if (andClauses.length === 0) { return {}; }
    if (andClauses.length === 1) { return andClauses[0]; }
    return { $and: andClauses };
}

/**
 * Extract carry-forward field values from a set of result documents.
 * Returns a map of "stepIndex.fieldPath" → string[]
 */
function extractCarryValues(
    stepIndex: number,
    docs: any[],
    carryFields: string[]
): Map<string, string[]> {
    const result = new Map<string, string[]>();
    for (const field of carryFields) {
        const values: string[] = [];
        for (const doc of docs) {
            const val = getNestedValue(doc, field);
            if (val !== undefined && val !== null) {
                if (Array.isArray(val)) {
                    values.push(...val.map(String));
                } else {
                    values.push(String(val));
                }
            }
        }
        result.set(`${stepIndex}.${field}`, [...new Set(values)]); // deduplicate
    }
    return result;
}

/**
 * Traverse a dot-path into a plain object.
 */
function getNestedValue(obj: any, path: string): any {
    const parts = path.split('.');
    let cur = obj;
    for (const p of parts) {
        if (cur == null) { return undefined; }
        cur = cur[p];
    }
    return cur;
}

/**
 * Build the result item for the final step, picking display columns.
 */
function buildResultItem(
    doc: any,
    displayColumns: Array<{ field: string; header: string }>
): AdvancedSearchResultItem {
    const item: AdvancedSearchResultItem = {
        consensusTimestamp: doc.consensusTimestamp,
        type: doc.type,
        topicId: doc.topicId,
        owner: doc.owner,
    };
    for (const col of displayColumns) {
        item[col.field] = getNestedValue(doc, col.field);
    }
    return item;
}

// ── Service ──────────────────────────────────────────────────────────────────

@Controller()
export class AdvancedSearchService {
    @MessagePattern(IndexerMessageAPI.GET_ADVANCED_SEARCH_API)
    async advancedSearch(
        @Payload() params: AdvancedSearchParams
    ) {
        try {
            if (!params.steps || params.steps.length === 0) {
                throw new Error('At least one search step is required');
            }

            const pageIndex = Number(params.pageIndex) || 0;
            const pageSize = Math.min(Number(params.pageSize) || 10, 100);
            const displayColumns = params.displayColumns ?? [];
            const sortConfig = params.sort ?? [];
            const groupBy = params.groupBy;

            const em = DataBaseHelper.getEntityManager();

            // Accumulated carry values across all steps
            const carryValues = new Map<string, string[]>();

            let finalDocs: any[] = [];
            let totalCount = 0;

            for (let i = 0; i < params.steps.length; i++) {
                const step = params.steps[i];
                const filter = buildStepFilter(step, carryValues);
                const isLastStep = i === params.steps.length - 1;

                if (isLastStep) {
                    // Build sort
                    const orderBy: Record<string, string> = {};
                    for (const s of sortConfig) {
                        orderBy[s.field] = s.order === 'desc' ? 'desc' : 'asc';
                    }

                    const [docs, count] = await (em.findAndCount as any)(
                        Message,
                        filter as any,
                        {
                            offset: pageIndex * pageSize,
                            limit: pageSize,
                            ...(Object.keys(orderBy).length ? { orderBy } : {}),
                        }
                    );
                    finalDocs = docs;
                    totalCount = count;
                } else {
                    // Intermediate step — fetch all matching docs for carry-forward
                    // We cap intermediate steps at 1000 to avoid unbounded memory usage
                    const docs = await (em.find as any)(
                        Message,
                        filter as any,
                        { limit: 1000 }
                    );

                    // Extract carry values from this step's results
                    if (step.carryFields && step.carryFields.length > 0) {
                        const stepCarry = extractCarryValues(i, docs, step.carryFields);
                        stepCarry.forEach((v, k) => carryValues.set(k, v));
                    }

                    // If intermediate step returns nothing, short-circuit
                    if (docs.length === 0) {
                        finalDocs = [];
                        totalCount = 0;
                        break;
                    }
                }
            }

            // Build default display columns if none specified
            const effectiveColumns: Array<{ field: string; header: string }> = displayColumns.length > 0
                ? displayColumns
                : [
                    { field: 'type', header: 'Type' },
                    { field: 'consensusTimestamp', header: 'Timestamp' },
                    { field: 'topicId', header: 'Topic ID' },
                    { field: 'owner', header: 'Owner' },
                ];

            // Map results
            let items: AdvancedSearchResultItem[] = finalDocs.map((doc: any) =>
                buildResultItem(doc, effectiveColumns)
            );

            // Apply groupBy (in-memory after db fetch, for now)
            if (groupBy) {
                const groups = new Map<string, AdvancedSearchResultItem[]>();
                for (const item of items) {
                    const key = String(item[groupBy.field] ?? '__null__');
                    const existing = groups.get(key) ?? [];
                    existing.push(item);
                    groups.set(key, existing);
                }
                // Flatten to grouped rows – add a _group marker field
                items = [];
                groups.forEach((groupItems, key) => {
                    items.push({ consensusTimestamp: '', type: '', _group: key, _count: groupItems.length } as any);
                    items.push(...groupItems);
                });
            }

            // Encode search token for bookmarking
            const searchToken = Buffer.from(JSON.stringify(params)).toString('base64');

            const result: AdvancedSearchResult = {
                items,
                total: totalCount,
                pageIndex,
                pageSize,
                columns: effectiveColumns,
                searchToken,
            };

            return new MessageResponse<AdvancedSearchResult>(result);
        } catch (error) {
            return new MessageError(error);
        }
    }
}
