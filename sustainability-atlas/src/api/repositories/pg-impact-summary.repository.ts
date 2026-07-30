import { DataSource } from 'typeorm';
import { MV_REGISTRY_STATS_NAME, MV_PROJECT_STATS_NAME, MV_METHODOLOGY_STATS_NAME } from '@shared/materialized-views';
import { PgSdgRepository } from './pg-sdg.repository';
import { buildSdgStatsList } from '../dto/sdg.dto';
import {
    ImpactSummaryRepository,
    ImpactSummaryRow,
    ImpactSummarySdgRow,
    ImpactSummaryGeoRow,
    ImpactSummarySectorRow,
    ImpactSummaryRegistryRow,
    ImpactSummaryMethodologyRow,
    ImpactSummaryProjectRow,
} from './impact-summary.repository';

interface RawGeoRow {
    country: string;
    project_count: number;
    credits_issued: string; // bigint
    credits_retired: string; // bigint
}

interface RawSectorRow {
    sector: string;
    project_count: number;
    credits_issued: string; // bigint
}

interface RawRegistryRow {
    registryDid: string | null;
    displayName: string | null;
    project_count: string | null;
    issuance_count: string | null;
    policy_count: string | null;
    credits_issued: string | null; // bigint
}

interface RawMethodologyCountRow {
    methodology_count: string; // bigint
}

interface RawMethodologyBreakdownRow {
    name: string | null;
    methodology_id: string | null;
    registry_name: string | null;
    version: string | null;
    project_count: string | null;
    issuance_count: string | null;
    credits_issued: string | null; // bigint
}

interface RawProjectBreakdownRow {
    name: string | null;
    country: string;
    methodology: string | null;
    status: string | null;
    registry_name: string | null;
    issuance_count: string | null;
    credits_issued: string | null; // bigint
}

/** Top-N samples for the PDF's "Credits by Methodology"/"Credits by Project" tables — deliberately curated, not the full dataset (see MethodologyRepository/ProjectRepository for that). */
const METHODOLOGY_BREAKDOWN_LIMIT = 10;
const PROJECT_BREAKDOWN_LIMIT = 12;

/** Same LATERAL pattern as PgMethodologyRepository's/PgProjectRepository's REGISTRY_NAME_JOIN, duplicated locally since neither file exports its join fragment for reuse. */
const REGISTRY_NAME_JOIN = `
    LEFT JOIN LATERAL (
        SELECT "displayName" AS registry_name
        FROM business_view
        WHERE "viewType" = 'REGISTRY'
          AND "registryDid" = bv."registryDid"
        ORDER BY "createdAt" DESC NULLS LAST
        LIMIT 1
    ) reg ON true
`;

/** Same canonical-dedup fragment as PgMethodologyRepository.METHODOLOGY_CANONICAL_DEDUP, duplicated locally for the same reason as REGISTRY_CANONICAL_DEDUP above. */
const METHODOLOGY_CANONICAL_DEDUP = `
    (
        bv."relatedTopicId" IS NULL
        OR bv.id = (
            SELECT b2.id
            FROM business_view b2
            WHERE b2."viewType" = 'METHODOLOGY'
              AND b2."relatedTopicId" = bv."relatedTopicId"
            ORDER BY b2."sourceTimestamp"::numeric DESC, b2.id DESC
            LIMIT 1
        )
    )
`;

/** Same canonical-dedup fragment as `PgRegistryRepository.findAll` — keeps one REGISTRY row per `registryDid` so republished registry messages don't inflate the registry breakdown; duplicated locally since no `pg-*.repository.ts` file exports its dedup fragment for reuse. */
const REGISTRY_CANONICAL_DEDUP = `
    (
        bv."registryDid" IS NULL
        OR bv.id = (
            SELECT b2.id
            FROM business_view b2
            WHERE b2."viewType" = 'REGISTRY'
              AND b2."registryDid" = bv."registryDid"
            ORDER BY b2."sourceTimestamp"::numeric DESC, b2.id DESC
            LIMIT 1
        )
    )
`;

/** PostgreSQL implementation of the ImpactSummaryRepository; reuses existing aggregate sources (mv_project_stats, mv_registry_stats, PgSdgRepository) rather than re-deriving them, and computes geographic distribution + totals from one query so they can never disagree — see getGeoAndTotals(). */
export class PgImpactSummaryRepository extends ImpactSummaryRepository {
    constructor(private readonly dataSource: DataSource) {
        super();
    }

    async getSummary(network: string): Promise<ImpactSummaryRow> {
        const [geo, sectorBreakdown, registryBreakdown, methodologyCount, sdgContributions, methodologyBreakdown, projectBreakdown] =
            await Promise.all([
                this.getGeoAndTotals(),
                this.getSectorBreakdown(),
                this.getRegistryBreakdown(),
                this.getMethodologyCount(),
                this.getSdgContributions(network),
                this.getMethodologyBreakdown(),
                this.getProjectBreakdown(),
            ]);

        return {
            totalCreditsIssued: geo.totalCreditsIssued,
            totalRetiredInferred: geo.totalRetiredInferred,
            activeProjects: geo.activeProjects,
            activeCountries: geo.activeCountries,
            sdgContributions,
            geographicDistribution: geo.geographicDistribution,
            sectorBreakdown,
            registryBreakdown,
            methodologyCount,
            methodologyBreakdown,
            projectBreakdown,
        };
    }

    /** One pass over PROJECT rows grouped by country (LEFT JOINed to mv_project_stats), covering every row exactly once — including 'Unknown' for blank/missing country — so summing this result set gives grand totals guaranteed consistent with the per-country breakdown. 'Unknown' is excluded from `activeCountries`. */
    private async getGeoAndTotals(): Promise<{
        totalCreditsIssued: number;
        totalRetiredInferred: number;
        activeProjects: number;
        activeCountries: number;
        geographicDistribution: ImpactSummaryGeoRow[];
    }> {
        const rows: RawGeoRow[] = await this.dataSource.query(`
            SELECT
                COALESCE(NULLIF(bv."businessData"->>'country', ''), 'Unknown') AS country,
                COUNT(*)::int                                                  AS project_count,
                COALESCE(SUM(ps.total_issued), 0)::bigint                      AS credits_issued,
                COALESCE(SUM(ps.total_retired), 0)::bigint                     AS credits_retired
            FROM business_view bv
            LEFT JOIN ${MV_PROJECT_STATS_NAME} ps ON ps."projectKey" = bv."projectKey"
            WHERE bv."viewType" = 'PROJECT'
            GROUP BY country
            ORDER BY credits_issued DESC, project_count DESC
        `);

        let totalCreditsIssued = 0;
        let totalRetiredInferred = 0;
        let activeProjects = 0;
        let activeCountries = 0;
        const geographicDistribution: ImpactSummaryGeoRow[] = [];

        for (const row of rows) {
            const projectCount = Number(row.project_count) || 0;
            const creditsIssued = Number(row.credits_issued) || 0;
            const creditsRetired = Number(row.credits_retired) || 0;

            totalCreditsIssued += creditsIssued;
            totalRetiredInferred += creditsRetired;
            activeProjects += projectCount;
            if (row.country !== 'Unknown') activeCountries += 1;

            geographicDistribution.push({ country: row.country, projectCount, creditsIssued });
        }

        return { totalCreditsIssued, totalRetiredInferred, activeProjects, activeCountries, geographicDistribution };
    }

    /** Raw per-sector rows ('Unknown' bucketed at query time); top-N/"Others" collapse is a service-layer concern. */
    private async getSectorBreakdown(): Promise<ImpactSummarySectorRow[]> {
        const rows: RawSectorRow[] = await this.dataSource.query(`
            SELECT
                COALESCE(NULLIF(bv."businessData"->>'sector', ''), 'Unknown') AS sector,
                COUNT(*)::int                                                 AS project_count,
                COALESCE(SUM(ps.total_issued), 0)::bigint                     AS credits_issued
            FROM business_view bv
            LEFT JOIN ${MV_PROJECT_STATS_NAME} ps ON ps."projectKey" = bv."projectKey"
            WHERE bv."viewType" = 'PROJECT'
            GROUP BY sector
            ORDER BY credits_issued DESC, project_count DESC
        `);

        return rows.map((row) => ({
            sector: row.sector,
            projectCount: Number(row.project_count) || 0,
            creditsIssued: Number(row.credits_issued) || 0,
        }));
    }

    /** One row per canonical (deduped) registry, joined to mv_registry_stats for its policy/project/issuance counts, plus a real credits-issued total (SUM of mv_project_stats.total_issued across PROJECT rows published under this registryDid). */
    private async getRegistryBreakdown(): Promise<ImpactSummaryRegistryRow[]> {
        const rows: RawRegistryRow[] = await this.dataSource.query(`
            SELECT
                bv."registryDid"          AS "registryDid",
                bv."displayName"          AS "displayName",
                s.project_count,
                s.issuance_count,
                s.policy_count,
                rc.credits_issued
            FROM business_view bv
            LEFT JOIN ${MV_REGISTRY_STATS_NAME} s ON s."registryDid" = bv."registryDid"
            LEFT JOIN LATERAL (
                SELECT COALESCE(SUM(ps.total_issued), 0)::bigint AS credits_issued
                FROM business_view proj
                LEFT JOIN ${MV_PROJECT_STATS_NAME} ps ON ps."projectKey" = proj."projectKey"
                WHERE proj."viewType" = 'PROJECT'
                  AND proj."registryDid" = bv."registryDid"
            ) rc ON true
            WHERE bv."viewType" = 'REGISTRY'
              AND ${REGISTRY_CANONICAL_DEDUP}
            ORDER BY COALESCE(s.project_count, 0) DESC, bv."displayName" ASC
        `);

        return rows.map((row) => ({
            registryDid: row.registryDid,
            displayName: row.displayName,
            projectCount: parseInt(row.project_count || '0', 10),
            issuanceCount: parseInt(row.issuance_count || '0', 10),
            policyCount: parseInt(row.policy_count || '0', 10),
            creditsIssued: Number(row.credits_issued) || 0,
        }));
    }

    /**
     * Top-N sample (by project/issuance activity) for the PDF's "Credits by Methodology" table.
     * Reuses the same join keys as `mv_methodology_stats` (policyTopicId) and `REGISTRY_NAME_JOIN`
     * (registryDid) that `PgMethodologyRepository` already relies on, plus a real credits total summed
     * from PROJECT rows linked to this methodology's policyTopicId — never a fabricated placeholder.
     */
    private async getMethodologyBreakdown(): Promise<ImpactSummaryMethodologyRow[]> {
        const rows: RawMethodologyBreakdownRow[] = await this.dataSource.query(`
            SELECT
                bv."displayName"                          AS name,
                bv."relatedTopicId"                        AS methodology_id,
                reg.registry_name,
                bv."businessData"->'options'->>'version'   AS version,
                s.project_count,
                s.issuance_count,
                mc.credits_issued
            FROM business_view bv
            LEFT JOIN ${MV_METHODOLOGY_STATS_NAME} s ON s."relatedTopicId" = bv."relatedTopicId"
            ${REGISTRY_NAME_JOIN}
            LEFT JOIN LATERAL (
                SELECT COALESCE(SUM(ps.total_issued), 0)::bigint AS credits_issued
                FROM business_view proj
                LEFT JOIN ${MV_PROJECT_STATS_NAME} ps ON ps."projectKey" = proj."projectKey"
                WHERE proj."viewType" = 'PROJECT'
                  AND proj."businessData"->>'policyTopicId' = bv."businessData"->>'topicId'
            ) mc ON true
            WHERE bv."viewType" = 'METHODOLOGY'
              AND ${METHODOLOGY_CANONICAL_DEDUP}
            ORDER BY COALESCE(s.project_count, 0) DESC, COALESCE(s.issuance_count, 0) DESC, bv."displayName" ASC
            LIMIT ${METHODOLOGY_BREAKDOWN_LIMIT}
        `);

        return rows.map((row) => ({
            name: row.name,
            methodologyId: row.methodology_id,
            registryName: row.registry_name,
            version: row.version,
            projectCount: parseInt(row.project_count || '0', 10),
            issuanceCount: parseInt(row.issuance_count || '0', 10),
            creditsIssued: Number(row.credits_issued) || 0,
        }));
    }

    /**
     * Top-N sample (by credits issued desc) for the PDF's "Credits by Project" table. `methodology`
     * and `status` come straight off business_view's own PROJECT fields (same fields
     * `PROJECT_FIELD_SCHEMA` exposes), not the fuller derived lifecycle-stage logic used by the
     * Projects page — kept simple since this is a curated sample table, not the projects list.
     */
    private async getProjectBreakdown(): Promise<ImpactSummaryProjectRow[]> {
        const rows: RawProjectBreakdownRow[] = await this.dataSource.query(`
            SELECT
                bv."businessData"->>'name'                                     AS name,
                COALESCE(NULLIF(bv."businessData"->>'country', ''), 'Unknown')  AS country,
                bv."businessData"->>'methodology'                              AS methodology,
                bv."businessData"->>'status'                                   AS status,
                reg.registry_name,
                ps.issuance_count,
                ps.total_issued                                                AS credits_issued
            FROM business_view bv
            LEFT JOIN ${MV_PROJECT_STATS_NAME} ps ON ps."projectKey" = bv."projectKey"
            ${REGISTRY_NAME_JOIN}
            WHERE bv."viewType" = 'PROJECT'
            ORDER BY COALESCE(ps.total_issued, 0) DESC, bv."businessData"->>'name' ASC
            LIMIT ${PROJECT_BREAKDOWN_LIMIT}
        `);

        return rows.map((row) => ({
            name: row.name,
            country: row.country,
            methodology: row.methodology,
            status: row.status,
            registryName: row.registry_name,
            issuanceCount: parseInt(row.issuance_count || '0', 10),
            creditsIssued: Number(row.credits_issued) || 0,
        }));
    }

    /** Methodologies are per-message rows; republished versions share a `relatedTopicId`, while a NULL `relatedTopicId` row always counts individually — mirrors METHODOLOGY_CANONICAL_DEDUP's semantics without a correlated subquery. */
    private async getMethodologyCount(): Promise<number> {
        const rows: RawMethodologyCountRow[] = await this.dataSource.query(`
            SELECT (
                COUNT(*) FILTER (WHERE "relatedTopicId" IS NULL)
                + COUNT(DISTINCT "relatedTopicId") FILTER (WHERE "relatedTopicId" IS NOT NULL)
            )::bigint AS methodology_count
            FROM business_view
            WHERE "viewType" = 'METHODOLOGY'
        `);
        return parseInt(rows[0]?.methodology_count || '0', 10);
    }

    /** Reuses PgSdgRepository's per-SDG aggregation + sdg.dto's catalogue enrichment instead of re-deriving either; only SDGs with at least one tagged project are returned, not the full 17-entry catalogue. */
    private async getSdgContributions(network: string): Promise<ImpactSummarySdgRow[]> {
        const repo = new PgSdgRepository(this.dataSource);
        const rows = await repo.findAll();
        const { data } = buildSdgStatsList(rows, 0, network);

        return data
            .filter((sdg) => sdg.projects > 0)
            .map((sdg) => ({
                sdgId: sdg.id,
                name: sdg.name,
                color: sdg.color,
                projectCount: sdg.projects,
                credits: sdg.credits,
            }));
    }
}
