import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { BusinessView } from '@shared/entities/business-view.entity';
import { MV_REGISTRY_STATS_NAME } from '@shared/materialized-views';
import { RegistryQueryDto, RegistryResponseDto, RegistryStats } from '../dto/registry.dto';
import { PaginatedResponse } from '../dto/pagination.dto';

interface RegistryRow {
    // business_view columns
    id: string;
    network: string;
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
    // joined MV columns
    policy_count: string | null;
    project_count: string | null;
    issuance_count: string | null;
    user_count: string | null;
}

@Injectable()
export class RegistriesService {
    constructor(
        @InjectRepository(BusinessView)
        private readonly businessViewRepo: Repository<BusinessView>,
        private readonly dataSource: DataSource,
    ) {}

    async findAll(query: RegistryQueryDto): Promise<PaginatedResponse<RegistryResponseDto>> {
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const offset = (page - 1) * limit;
        const network = query.network ?? 'mainnet';

        // Build WHERE clauses and params dynamically
        const whereClauses: string[] = [
            `bv."viewType" = 'REGISTRY'`,
            `bv.network = $1`,
        ];
        const params: any[] = [network];
        let paramIdx = 2;

        if (query.did) {
            whereClauses.push(`bv."registryDid" = $${paramIdx++}`);
            params.push(query.did);
        }

        if (query.geography) {
            whereClauses.push(`bv."businessData"->'options'->>'geography' ILIKE $${paramIdx++}`);
            params.push(`%${query.geography}%`);
        }

        // Full-text search (tsvector) + trigram fuzzy match — combined via OR
        let rankExpr = '0';
        if (query.search) {
            const searchTerm = query.search.trim();
            const tsQueryParam = paramIdx++;
            const likeParam = paramIdx++;
            const similarityParam = paramIdx++;

            whereClauses.push(`(
                bv."searchVector" @@ plainto_tsquery('english', $${tsQueryParam})
                OR bv."displayName" ILIKE $${likeParam}
                OR bv."searchText" ILIKE $${likeParam}
                OR bv."registryDid" ILIKE $${likeParam}
                OR bv."businessData"->'options'->>'tags' ILIKE $${likeParam}
                OR bv."businessData"->'options'->>'geography' ILIKE $${likeParam}
                OR similarity(COALESCE(bv."displayName", ''), $${similarityParam}) > 0.3
            )`);
            params.push(searchTerm, `%${searchTerm}%`, searchTerm);

            // Rank by tsvector relevance + trigram similarity
            rankExpr = `
                ts_rank(bv."searchVector", plainto_tsquery('english', $${tsQueryParam}))
                + COALESCE(similarity(bv."displayName", $${similarityParam}), 0)
            `;
        }

        // Sorting
        let orderBy: string;
        if (query.search) {
            orderBy = `search_rank DESC, bv."createdAt" DESC`;
        } else {
            const sortBy = query.sortBy || 'createdAt';
            const sortDir = (query.sortDir?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC') as 'ASC' | 'DESC';
            const allowedSortFields: Record<string, string> = {
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
            const sortCol = allowedSortFields[sortBy] || 'bv."createdAt"';
            orderBy = `${sortCol} ${sortDir} NULLS LAST`;
        }

        const whereSql = whereClauses.join(' AND ');

        // Single query: business_view LEFT JOIN mv_registry_stats (by network + did)
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
                ON s.network = bv.network AND s."registryDid" = bv."registryDid"
            WHERE ${whereSql}
            ORDER BY ${orderBy}
            LIMIT $${paramIdx++} OFFSET $${paramIdx++}
        `;
        params.push(limit, offset);

        const countSql = `
            SELECT COUNT(*)::int AS total
            FROM business_view bv
            WHERE ${whereSql}
        `;
        const countParams = params.slice(0, params.length - 2); // exclude limit/offset

        const [rows, countResult]: [RegistryRow[], Array<{ total: number }>] = await Promise.all([
            this.dataSource.query(rowsSql, params),
            this.dataSource.query(countSql, countParams),
        ]);

        const total = countResult[0]?.total ?? 0;
        const data = rows.map(row => this.mapRow(row));
        return new PaginatedResponse(data, total, page, limit);
    }

    async findByDid(network: string, did: string): Promise<RegistryResponseDto | null> {
        const rows: RegistryRow[] = await this.dataSource.query(
            `
            SELECT
                bv.*,
                s.policy_count,
                s.project_count,
                s.issuance_count,
                s.user_count
            FROM business_view bv
            LEFT JOIN ${MV_REGISTRY_STATS_NAME} s
                ON s.network = bv.network AND s."registryDid" = bv."registryDid"
            WHERE bv."viewType" = 'REGISTRY'
              AND bv.network = $1
              AND bv."registryDid" = $2
            LIMIT 1
            `,
            [network, did],
        );

        if (rows.length === 0) return null;
        return this.mapRow(rows[0]);
    }

    private mapRow(row: RegistryRow): RegistryResponseDto {
        const stats: RegistryStats = {
            policyCount: parseInt(row.policy_count || '0', 10),
            projectCount: parseInt(row.project_count || '0', 10),
            issuanceCount: parseInt(row.issuance_count || '0', 10),
            userCount: parseInt(row.user_count || '0', 10),
        };

        // Reuse DTO mapper — shape matches BusinessView entity
        return RegistryResponseDto.fromBusinessView(row, stats);
    }
}
