import { DataSource } from 'typeorm';
import { MV_REGISTRY_STATS_NAME, MV_PROJECT_STATS_NAME } from '@shared/materialized-views';
import { PgSdgRepository } from './pg-sdg.repository';
import { buildSdgStatsList } from '../dto/sdg.dto';
import {
    ImpactSummaryRepository,
    ImpactSummaryRow,
    ImpactSummarySdgRow,
    ImpactSummaryGeoRow,
    ImpactSummarySectorRow,
    ImpactSummaryRegistryRow,
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
}

interface RawMethodologyCountRow {
    methodology_count: string; // bigint
}

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
        const [geo, sectorBreakdown, registryBreakdown, methodologyCount, sdgContributions] = await Promise.all([
            this.getGeoAndTotals(),
            this.getSectorBreakdown(),
            this.getRegistryBreakdown(),
            this.getMethodologyCount(),
            this.getSdgContributions(network),
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

    /** One row per canonical (deduped) registry, joined to mv_registry_stats for its policy/project/issuance counts. */
    private async getRegistryBreakdown(): Promise<ImpactSummaryRegistryRow[]> {
        const rows: RawRegistryRow[] = await this.dataSource.query(`
            SELECT
                bv."registryDid"          AS "registryDid",
                bv."displayName"          AS "displayName",
                s.project_count,
                s.issuance_count,
                s.policy_count
            FROM business_view bv
            LEFT JOIN ${MV_REGISTRY_STATS_NAME} s ON s."registryDid" = bv."registryDid"
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
