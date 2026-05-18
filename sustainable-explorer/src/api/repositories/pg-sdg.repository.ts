import { DataSource } from 'typeorm';
import { SdgRepository, SdgStatsRow } from './sdg.repository';

interface RawSdgRow {
    sdg_id: string;
    project_count: string;
    developer_count: string;
    country_count: string;
    total_credits: string;
    top_methodology: string | null;
}

/**
 * PostgreSQL implementation of the SdgRepository.
 *
 * One pass over PROJECT business_view rows: unnest businessData->'sdgs' into
 * one row per (project, sdg) pair, then aggregate. A LATERAL subquery picks
 * the top methodology per SDG by project count, computed inside the same
 * statement so the API call is a single round trip.
 */
export class PgSdgRepository extends SdgRepository {
    constructor(private readonly dataSource: DataSource) {
        super();
    }

    async findAll(): Promise<SdgStatsRow[]> {
        const rows: RawSdgRow[] = await this.dataSource.query(`
            WITH project_sdgs AS (
                SELECT
                    bv."sourceTimestamp"                            AS source_ts,
                    bv."businessData"->>'developer'                 AS developer,
                    bv."businessData"->>'country'                   AS country,
                    bv."businessData"->>'methodology'               AS methodology,
                    COALESCE((bv."businessData"->>'credits')::numeric, 0) AS credits,
                    (sdg.value)::int                                AS sdg_id
                FROM business_view bv
                CROSS JOIN LATERAL jsonb_array_elements_text(
                    COALESCE(bv."businessData"->'sdgs', '[]'::jsonb)
                ) AS sdg(value)
                WHERE bv."viewType" = 'PROJECT'
            ),
            sdg_methodology_counts AS (
                SELECT
                    sdg_id,
                    methodology,
                    COUNT(*) AS proj_count
                FROM project_sdgs
                WHERE methodology IS NOT NULL AND methodology <> ''
                GROUP BY sdg_id, methodology
            ),
            top_methodology AS (
                SELECT DISTINCT ON (sdg_id)
                    sdg_id,
                    methodology
                FROM sdg_methodology_counts
                ORDER BY sdg_id, proj_count DESC, methodology ASC
            )
            SELECT
                ps.sdg_id::text                              AS sdg_id,
                COUNT(DISTINCT ps.source_ts)::text           AS project_count,
                COUNT(DISTINCT NULLIF(ps.developer, ''))::text AS developer_count,
                COUNT(DISTINCT NULLIF(ps.country, ''))::text   AS country_count,
                COALESCE(SUM(ps.credits), 0)::text           AS total_credits,
                tm.methodology                               AS top_methodology
            FROM project_sdgs ps
            LEFT JOIN top_methodology tm ON tm.sdg_id = ps.sdg_id
            GROUP BY ps.sdg_id, tm.methodology
            ORDER BY ps.sdg_id ASC
        `);

        return rows.map(r => ({
            sdgId: parseInt(r.sdg_id, 10),
            projects: parseInt(r.project_count, 10),
            developers: parseInt(r.developer_count, 10),
            countries: parseInt(r.country_count, 10),
            credits: parseFloat(r.total_credits),
            topMethodology: r.top_methodology,
        }));
    }
}
