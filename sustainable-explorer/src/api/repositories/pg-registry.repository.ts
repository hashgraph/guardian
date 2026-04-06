import { DataSource } from 'typeorm';
import { MV_REGISTRY_STATS_NAME } from '@shared/materialized-views';
import {
    RegistryRepository,
    RegistryListQuery,
    RegistryListResult,
    RegistryRow,
    RegistryStatsRow,
} from './registry.repository';

interface RawRow {
    id: string;
    viewType: string;
    sourceTimestamp: string;
    registryDid: string | null;
    policyId: string | null;
    displayName: string | null;
    businessData: Record<string, any> | null;
    searchText: string | null;
    lastUpdate: string;
    createdAt: Date;
    updatedAt: Date;
    policy_count: string | null;
    project_count: string | null;
    issuance_count: string | null;
    user_count: string | null;
}

const ALLOWED_SORT_FIELDS: Record<string, string> = {
    displayName: 'bv."displayName"',
    registryDid: 'bv."registryDid"',
    createdAt: 'bv."createdAt"',
    updatedAt: 'bv."updatedAt"',
    sourceTimestamp: 'bv."sourceTimestamp"',
    geography: `bv."businessData"->'options'->>'geography'`,
    law: `bv."businessData"->'options'->>'law'`,
    tags: `bv."businessData"->'options'->>'tags'`,
    policies: 's.policy_count',
    projects: 's.project_count',
    issuances: 's.issuance_count',
};

/**
 * PostgreSQL implementation of the RegistryRepository.
 *
 * All PostgreSQL-specific features (jsonb operators, tsvector, trigram
 * similarity, materialized view joins) are contained here. Services talk
 * only to the abstract RegistryRepository.
 */
export class PgRegistryRepository extends RegistryRepository {
    constructor(private readonly dataSource: DataSource) {
        super();
    }

    async findAll(query: RegistryListQuery): Promise<RegistryListResult> {
        const { page, limit, search, did, geography, sortBy, sortDir } = query;
        const offset = (page - 1) * limit;

        const whereClauses: string[] = [`bv."viewType" = 'REGISTRY'`];
        const params: any[] = [];
        let paramIdx = 1;

        if (did) {
            whereClauses.push(`bv."registryDid" = $${paramIdx++}`);
            params.push(did);
        }

        if (geography) {
            whereClauses.push(`bv."businessData"->'options'->>'geography' ILIKE $${paramIdx++}`);
            params.push(`%${geography}%`);
        }

        // Full-text search (tsvector) + trigram fuzzy fallback
        let rankExpr = '0';
        if (search) {
            const term = search.trim();
            const tsIdx = paramIdx++;
            const likeIdx = paramIdx++;
            const simIdx = paramIdx++;

            whereClauses.push(`(
                bv."searchVector" @@ plainto_tsquery('english', $${tsIdx})
                OR bv."displayName" ILIKE $${likeIdx}
                OR bv."searchText" ILIKE $${likeIdx}
                OR bv."registryDid" ILIKE $${likeIdx}
                OR bv."businessData"->'options'->>'tags' ILIKE $${likeIdx}
                OR bv."businessData"->'options'->>'geography' ILIKE $${likeIdx}
                OR similarity(COALESCE(bv."displayName", ''), $${simIdx}) > 0.3
            )`);
            params.push(term, `%${term}%`, term);

            rankExpr = `
                ts_rank(bv."searchVector", plainto_tsquery('english', $${tsIdx}))
                + COALESCE(similarity(bv."displayName", $${simIdx}), 0)
            `;
        }

        // Sorting
        let orderBy: string;
        if (search) {
            orderBy = `search_rank DESC, bv."createdAt" DESC`;
        } else {
            const dir = (sortDir?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC') as 'ASC' | 'DESC';
            const sortCol = ALLOWED_SORT_FIELDS[sortBy ?? ''] || 'bv."createdAt"';
            orderBy = `${sortCol} ${dir} NULLS LAST`;
        }

        const whereSql = whereClauses.join(' AND ');

        const rowsSql = `
            SELECT
                bv.*,
                s.policy_count,
                s.project_count,
                s.issuance_count,
                s.user_count,
                ${rankExpr} AS search_rank
            FROM business_view bv
            LEFT JOIN ${MV_REGISTRY_STATS_NAME} s
                ON s."registryDid" = bv."registryDid"
            WHERE ${whereSql}
            ORDER BY ${orderBy}
            LIMIT $${paramIdx++} OFFSET $${paramIdx++}
        `;
        const rowsParams = [...params, limit, offset];

        const countSql = `
            SELECT COUNT(*)::int AS total
            FROM business_view bv
            WHERE ${whereSql}
        `;
        const countParams = params;

        const [rawRows, countResult]: [RawRow[], Array<{ total: number }>] = await Promise.all([
            this.dataSource.query(rowsSql, rowsParams),
            this.dataSource.query(countSql, countParams),
        ]);

        return {
            rows: rawRows.map(PgRegistryRepository.mapRow),
            total: countResult[0]?.total ?? 0,
        };
    }

    async findByDid(did: string): Promise<RegistryRow | null> {
        const rawRows: RawRow[] = await this.dataSource.query(
            `
            SELECT
                bv.*,
                s.policy_count,
                s.project_count,
                s.issuance_count,
                s.user_count
            FROM business_view bv
            LEFT JOIN ${MV_REGISTRY_STATS_NAME} s
                ON s."registryDid" = bv."registryDid"
            WHERE bv."viewType" = 'REGISTRY'
              AND bv."registryDid" = $1
            LIMIT 1
            `,
            [did],
        );

        if (rawRows.length === 0) return null;
        return PgRegistryRepository.mapRow(rawRows[0]);
    }

    private static mapRow(row: RawRow): RegistryRow {
        const stats: RegistryStatsRow = {
            policyCount: parseInt(row.policy_count || '0', 10),
            projectCount: parseInt(row.project_count || '0', 10),
            issuanceCount: parseInt(row.issuance_count || '0', 10),
            userCount: parseInt(row.user_count || '0', 10),
        };

        return {
            id: row.id,
            viewType: row.viewType,
            sourceTimestamp: row.sourceTimestamp,
            registryDid: row.registryDid,
            policyId: row.policyId,
            displayName: row.displayName,
            businessData: row.businessData,
            searchText: row.searchText,
            lastUpdate: row.lastUpdate,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
            stats,
        };
    }
}
