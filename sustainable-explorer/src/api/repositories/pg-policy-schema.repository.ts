import { DataSource } from 'typeorm';
import {
    PolicySchemaRepository,
    PolicySchemaListQuery,
    PolicySchemaListResult,
    PolicySchemaRow,
} from './policy-schema.repository';
import { QueryBuilder } from './query-builder';
import { POLICY_SCHEMA_FIELD_SCHEMA } from './schemas/policy-schema.schema';

export class PgPolicySchemaRepository extends PolicySchemaRepository {
    constructor(private readonly dataSource: DataSource) {
        super();
    }

    async findByPolicyTopicId(
        policyTopicId: string,
        query: PolicySchemaListQuery,
    ): Promise<PolicySchemaListResult> {
        const { page, limit, search, sortBy, sortDir } = query;
        const offset = (page - 1) * limit;

        const builder = new QueryBuilder(POLICY_SCHEMA_FIELD_SCHEMA);
        builder.addFilter('ps."policyTopicId"', 'eq', policyTopicId);
        builder.addFilters({
            schemaId: query.schemaId,
            name: query.name,
            description: query.description,
            sourceCid: query.sourceCid,
            version: query.version,
        });

        if (search) {
            const likeParam = builder.nextParam(`%${search.trim()}%`);
            builder.addClause(`(
                ps."schemaId" ILIKE ${likeParam}
                OR ps.name ILIKE ${likeParam}
                OR ps.description ILIKE ${likeParam}
            )`);
        }

        const orderBy = builder.buildOrderBy({
            sortBy,
            sortDir,
            defaultExpr: 'ps."createdAt" DESC NULLS LAST',
        });

        const whereSql = builder.getWhereClause();
        const params = builder.getParams();

        const limitParam = `$${params.length + 1}`;
        const offsetParam = `$${params.length + 2}`;
        const rowParams = [...params, limit, offset];

        const rowsSql = `
            SELECT
                ps.id,
                ps."policyTopicId",
                ps."messageConsensusTimestamp",
                ps."sourceCid",
                ps."schemaFile",
                ps."schemaId",
                ps."schemaVersion",
                ps.name,
                ps.description,
                ps.document,
                ps."rawSchema",
                ps."lastUpdate",
                ps."createdAt",
                ps."updatedAt"
            FROM policy_schema ps
            WHERE ${whereSql}
            ORDER BY ${orderBy}
            LIMIT ${limitParam} OFFSET ${offsetParam}
        `;

        const countSql = `
            SELECT COUNT(*)::int AS total
            FROM policy_schema ps
            WHERE ${whereSql}
        `;

        const [rows, countResult]: [PolicySchemaRow[], Array<{ total: number }>] = await Promise.all([
            this.dataSource.query(rowsSql, rowParams),
            this.dataSource.query(countSql, params),
        ]);

        return {
            rows,
            total: countResult[0]?.total ?? 0,
        };
    }
}
