/**
 * Generic SQL query builder for repository implementations.
 *
 * Encapsulates the boilerplate of building parameterized WHERE clauses,
 * ORDER BY clauses, and tracking the parameter index. Driven by a declarative
 * field schema, so adding a new filter only requires updating the schema —
 * not writing more SQL.
 *
 * Special operations (full-text search, materialized view joins, custom
 * computed columns) are not driven by the schema and remain explicit on the
 * builder or in the calling repository.
 */

export type FilterOperator =
    | 'eq'
    | 'ilike'
    | 'in'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'contains-any';

export interface FieldDefinition {
    /**
     * SQL expression for this field (column reference, jsonb path, etc.).
     * Example: `bv."displayName"` or `bv."businessData"->'options'->>'geography'`
     */
    sql: string;

    /**
     * Filter operator(s) supported by this field. Omit if the field is
     * sort-only / display-only.
     */
    filter?: FilterOperator;

    /**
     * Whether this field is sortable via sortBy.
     */
    sortable?: boolean;
}

export type FieldSchema = Record<string, FieldDefinition>;

export interface OrderByOptions {
    sortBy?: string;
    sortDir?: 'asc' | 'desc' | string;
    /** Fallback ORDER BY clause if sortBy is missing or unknown */
    defaultExpr: string;
}

/**
 * Builds parameterized SQL WHERE / ORDER BY fragments for a TypeORM raw query.
 *
 * Usage:
 *   const builder = new QueryBuilder(REGISTRY_SCHEMA);
 *   builder.addClause(`bv."viewType" = 'REGISTRY'`);
 *   builder.addFilters({ did: query.did, id: query.id, tags: query.tags });
 *   const where = builder.getWhereClause();
 *   const orderBy = builder.buildOrderBy({ sortBy: query.sortBy, sortDir: query.sortDir,
 *                                          defaultExpr: 'bv."createdAt" DESC NULLS LAST' });
 *   const params = builder.getParams();
 */
export class QueryBuilder {
    private whereClauses: string[] = [];
    private params: any[] = [];
    private paramIdx = 1;

    constructor(private readonly schema: FieldSchema) {}

    /**
     * Adds a literal WHERE clause that doesn't use the schema.
     * Useful for hardcoded constraints (e.g., `viewType = 'REGISTRY'`).
     */
    addClause(clause: string): this {
        this.whereClauses.push(clause);
        return this;
    }

    /**
     * Adds filters from a key-value map. Keys must match schema field names.
     * Empty / null / undefined values are skipped. Unknown or non-filterable
     * fields are silently ignored.
     */
    addFilters(filters: Record<string, unknown>): this {
        for (const [key, value] of Object.entries(filters)) {
            if (value === undefined || value === null || value === '') continue;

            const def = this.schema[key];
            if (!def || !def.filter) continue;

            const sql = this.buildOperatorClause(def.sql, def.filter, value);
            if (sql) {
                this.whereClauses.push(sql);
            }
        }
        return this;
    }

    /**
     * Adds a single filter explicitly, bypassing schema lookup. Useful for
     * one-off constraints from the calling repository.
     */
    addFilter(sql: string, op: FilterOperator, value: unknown): this {
        if (value === undefined || value === null || value === '') return this;
        const clause = this.buildOperatorClause(sql, op, value);
        if (clause) this.whereClauses.push(clause);
        return this;
    }

    /**
     * Reserves a parameter slot and returns its placeholder + index.
     * Used by callers that need to inject custom SQL with parameters.
     */
    nextParam(value: unknown): string {
        this.params.push(value);
        return `$${this.paramIdx++}`;
    }

    /**
     * Builds the WHERE clause as a single string. Returns "1=1" if there
     * are no clauses (so the caller can always interpolate it safely).
     */
    getWhereClause(): string {
        return this.whereClauses.length > 0 ? this.whereClauses.join(' AND ') : '1=1';
    }

    /**
     * Returns the params array in registration order.
     */
    getParams(): any[] {
        return this.params;
    }

    /**
     * Returns the next param index (for callers that need to append more
     * params manually after the generic filters are added).
     */
    getNextParamIdx(): number {
        return this.paramIdx;
    }

    /**
     * Builds an ORDER BY clause. Falls back to `defaultExpr` if sortBy is
     * missing or refers to a non-sortable field.
     */
    buildOrderBy(opts: OrderByOptions): string {
        const { sortBy, sortDir, defaultExpr } = opts;
        if (!sortBy) return defaultExpr;

        const def = this.schema[sortBy];
        if (!def || !def.sortable) return defaultExpr;

        const dir = String(sortDir || '').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        return `${def.sql} ${dir} NULLS LAST`;
    }

    /**
     * Splits a pipe-joined multi-value filter param into individual values,
     * percent-decoding each part. Falls back to the raw trimmed part if a part
     * isn't validly percent-encoded, so legacy (never-encoded) values still work.
     */
    private decodeMultiValue(raw: string): string[] {
        return String(raw).split('|').map(part => {
            try { return decodeURIComponent(part.trim()); } catch { return part.trim(); }
        }).filter(Boolean);
    }

    /**
     * Translates an operator + value into a parameterized SQL fragment.
     * Internal — public callers should use addFilters() / addFilter().
     */
    private buildOperatorClause(sql: string, op: FilterOperator, value: unknown): string | null {
        switch (op) {
            case 'eq': {
                if (typeof value === 'string' && value.includes('|')) {
                    const parts = this.decodeMultiValue(value);
                    if (parts.length > 1) {
                        this.params.push(parts);
                        return `${sql} = ANY($${this.paramIdx++}::text[])`;
                    }
                }
                this.params.push(value);
                return `${sql} = $${this.paramIdx++}`;
            }

            case 'ilike': {
                const parts = this.decodeMultiValue(String(value));
                if (parts.length > 1) {
                    const clauses = parts.map(p => {
                        this.params.push(`%${p}%`);
                        return `${sql} ILIKE $${this.paramIdx++}`;
                    });
                    return `(${clauses.join(' OR ')})`;
                }
                this.params.push(`%${parts[0] ?? String(value)}%`);
                return `${sql} ILIKE $${this.paramIdx++}`;
            }

            case 'in':
                if (!Array.isArray(value) || value.length === 0) return null;
                this.params.push(value);
                return `${sql} = ANY($${this.paramIdx++}::text[])`;

            case 'contains-any': {
                // JSONB array-of-numbers "match any" (e.g. sdgs). `?|`/`?` only match
                // string array elements, so this ORs together `@>` containment checks
                // against numeric JSON scalars instead — each one GIN-index-backed.
                const parts = this.decodeMultiValue(String(value))
                    .filter(s => Number.isInteger(Number(s)));
                if (parts.length === 0) return null;
                const clauses = parts.map(p => {
                    this.params.push(String(Number(p)));
                    return `${sql} @> $${this.paramIdx++}::jsonb`;
                });
                return `(${clauses.join(' OR ')})`;
            }

            case 'gt':
                this.params.push(value);
                return `${sql} > $${this.paramIdx++}`;

            case 'gte':
                this.params.push(value);
                return `${sql} >= $${this.paramIdx++}`;

            case 'lt':
                this.params.push(value);
                return `${sql} < $${this.paramIdx++}`;

            case 'lte':
                this.params.push(value);
                return `${sql} <= $${this.paramIdx++}`;

            default:
                return null;
        }
    }
}
