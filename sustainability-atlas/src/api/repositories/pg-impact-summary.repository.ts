import { DataSource } from 'typeorm';
import {
    MV_REGISTRY_STATS_NAME,
    MV_PROJECT_STATS_NAME,
    MV_METHODOLOGY_STATS_NAME,
    MV_PROJECT_LIFECYCLE_NAME,
} from '@shared/materialized-views';
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
    ImpactSummaryLifecycleRow,
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

interface RawLifecycleRow {
    stage: string;
    project_count: number;
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

/** PostgreSQL implementation of the ImpactSummaryRepository; reuses existing aggregate sources (mv_project_stats, mv_registry_stats, PgSdgRepository) rather than re-deriving them, and computes geographic distribution + totals from one query so they can never disagree — see getGeoAndTotals(). getRegistryBreakdown/getMethodologyBreakdown drive from their stats MV's small canonical set (joined to business_view by primary key) rather than scanning+deduping every REGISTRY/METHODOLOGY row, mirroring PgRegistryRepository/PgMethodologyRepository's own findAll fix. */
export class PgImpactSummaryRepository extends ImpactSummaryRepository {
    constructor(private readonly dataSource: DataSource) {
        super();
    }

    async getSummary(network: string): Promise<ImpactSummaryRow> {
        const [geo, sectorBreakdown, registryBreakdown, methodologyCount, sdgContributions, methodologyBreakdown, projectBreakdown, lifecycleStages] =
            await Promise.all([
                this.getGeoAndTotals(),
                this.getSectorBreakdown(),
                this.getRegistryBreakdown(),
                this.getMethodologyCount(),
                this.getSdgContributions(network),
                this.getMethodologyBreakdown(),
                this.getProjectBreakdown(),
                this.getLifecycleStages(),
            ]);

        return {
            totalCreditsIssued: geo.totalCreditsIssued,
            totalRetiredInferred: geo.totalRetiredInferred,
            activeProjects: geo.activeProjects,
            activeCountries: geo.activeCountries,
            lifecycleStages,
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

    /**
     * Projects per derived lifecycle stage, read from the precomputed `mv_project_lifecycle` rather than
     * re-deriving the classification here — so this agrees with the Projects list and the analytics
     * lifecycle chart by construction (all three read the one `LIFECYCLE_STAGE_CASE` definition).
     *
     * Grouped over the same PROJECT-row population `getGeoAndTotals()` counts, LEFT JOINed to the MV on
     * projectKey, so the stage counts sum to exactly `activeProjects` — a stage breakdown that didn't add up
     * to the "Active Projects" tile it sits under would be worse than no breakdown at all. Rows the MV has no
     * stage for (null projectKey, or a project created since the last refresh) bucket as 'Unclassified'
     * instead of being silently folded into 'Registered', which would overstate that stage.
     */
    private async getLifecycleStages(): Promise<ImpactSummaryLifecycleRow[]> {
        const rows: RawLifecycleRow[] = await this.dataSource.query(`
            SELECT
                COALESCE(pl.lifecycle_stage, 'Unclassified') AS stage,
                COUNT(*)::int                                AS project_count
            FROM business_view bv
            LEFT JOIN ${MV_PROJECT_LIFECYCLE_NAME} pl ON pl."projectKey" = bv."projectKey"
            WHERE bv."viewType" = 'PROJECT'
            GROUP BY stage
        `);

        return rows.map((row) => ({
            stage: row.stage,
            projectCount: Number(row.project_count) || 0,
        }));
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

    /**
     * One row per canonical (deduped) registry, joined to mv_registry_stats for its policy/project/issuance
     * counts, plus a real credits-issued total (SUM of mv_project_stats.total_issued across PROJECT rows
     * published under this registryDid).
     *
     * Driven from the small mv_registry_stats canonical set (joined to business_view by primary key) instead
     * of scanning every REGISTRY row and filtering — same fix as PgRegistryRepository.findAll's
     * REGISTRY_CANDIDATE_CTE. Confirmed via EXPLAIN ANALYZE that the pre-rewrite query evaluated the
     * credits-issued LATERAL once per raw REGISTRY row (looping 8970+ times locally) before the dedup filter
     * ever narrowed it down — driving from the small side instead lets that LATERAL only run once per
     * canonical registry. UNIONed with the (structurally possible but never observed) REGISTRY row with no
     * registryDid, mirroring REGISTRY_CANONICAL_DEDUP's "always kept" rule for it.
     */
    private async getRegistryBreakdown(): Promise<ImpactSummaryRegistryRow[]> {
        const rows: RawRegistryRow[] = await this.dataSource.query(`
            WITH registry_candidate AS (
                SELECT bv."registryDid", bv."displayName"
                FROM ${MV_REGISTRY_STATS_NAME} s
                JOIN business_view bv ON bv.id = s.canonical_id

                UNION ALL

                SELECT bv."registryDid", bv."displayName"
                FROM business_view bv
                WHERE bv."viewType" = 'REGISTRY' AND bv."registryDid" IS NULL
            )
            SELECT
                rc."registryDid"          AS "registryDid",
                rc."displayName"          AS "displayName",
                s.project_count,
                s.issuance_count,
                s.policy_count,
                rc2.credits_issued
            FROM registry_candidate rc
            LEFT JOIN ${MV_REGISTRY_STATS_NAME} s ON s."registryDid" = rc."registryDid"
            LEFT JOIN LATERAL (
                SELECT COALESCE(SUM(ps.total_issued), 0)::bigint AS credits_issued
                FROM business_view proj
                LEFT JOIN ${MV_PROJECT_STATS_NAME} ps ON ps."projectKey" = proj."projectKey"
                WHERE proj."viewType" = 'PROJECT'
                  AND proj."registryDid" = rc."registryDid"
            ) rc2 ON true
            ORDER BY COALESCE(s.project_count, 0) DESC, rc."displayName" ASC
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
     *
     * Driven from the small mv_methodology_stats canonical set (joined to business_view by primary key)
     * instead of scanning every METHODOLOGY row and filtering — same fix as
     * PgMethodologyRepository.findAll's METHODOLOGY_CANDIDATE_CTE, verified identical output (as a set —
     * ties between rows with equal sort keys aren't uniquely ordered in the original query either).
     */
    private async getMethodologyBreakdown(): Promise<ImpactSummaryMethodologyRow[]> {
        const rows: RawMethodologyBreakdownRow[] = await this.dataSource.query(`
            WITH methodology_candidate AS (
                SELECT bv."relatedTopicId", bv."displayName", bv."businessData", bv."registryDid"
                FROM ${MV_METHODOLOGY_STATS_NAME} s
                JOIN business_view bv ON bv.id = s.canonical_id

                UNION ALL

                SELECT bv."relatedTopicId", bv."displayName", bv."businessData", bv."registryDid"
                FROM business_view bv
                WHERE bv."viewType" = 'METHODOLOGY' AND bv."relatedTopicId" IS NULL
            )
            SELECT
                mcand."displayName"                          AS name,
                mcand."relatedTopicId"                        AS methodology_id,
                reg.registry_name,
                mcand."businessData"->'options'->>'version'   AS version,
                s.project_count,
                s.issuance_count,
                mc.credits_issued
            FROM methodology_candidate mcand
            LEFT JOIN ${MV_METHODOLOGY_STATS_NAME} s ON s."relatedTopicId" = mcand."relatedTopicId"
            LEFT JOIN LATERAL (
                SELECT "displayName" AS registry_name
                FROM business_view
                WHERE "viewType" = 'REGISTRY' AND "registryDid" = mcand."registryDid"
                ORDER BY "createdAt" DESC NULLS LAST
                LIMIT 1
            ) reg ON true
            LEFT JOIN LATERAL (
                SELECT COALESCE(SUM(ps.total_issued), 0)::bigint AS credits_issued
                FROM business_view proj
                LEFT JOIN ${MV_PROJECT_STATS_NAME} ps ON ps."projectKey" = proj."projectKey"
                WHERE proj."viewType" = 'PROJECT'
                  AND proj."businessData"->>'policyTopicId' = mcand."businessData"->>'topicId'
            ) mc ON true
            ORDER BY COALESCE(s.project_count, 0) DESC, COALESCE(s.issuance_count, 0) DESC, mcand."displayName" ASC
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

    /**
     * Methodologies are per-message rows; republished versions share a `relatedTopicId`, while a NULL
     * `relatedTopicId` row always counts individually. `mv_methodology_stats` already has exactly one row
     * per distinct non-null `relatedTopicId` (its own canonical definition), so its row count IS
     * `COUNT(DISTINCT "relatedTopicId")` for free — reading it avoids a full-table DISTINCT aggregation over
     * every raw METHODOLOGY row. The NULL-relatedTopicId count still needs its own scan, but a dedicated
     * index (`IDX_3b9845df72425012c7dea3cd21` on `relatedTopicId`) makes that one near-instant.
     */
    private async getMethodologyCount(): Promise<number> {
        const rows: RawMethodologyCountRow[] = await this.dataSource.query(`
            SELECT (
                (SELECT COUNT(*) FROM ${MV_METHODOLOGY_STATS_NAME})
                + (SELECT COUNT(*) FROM business_view WHERE "viewType" = 'METHODOLOGY' AND "relatedTopicId" IS NULL)
            )::bigint AS methodology_count
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
                issuances: sdg.issuances,
                credits: sdg.credits,
            }));
    }
}
