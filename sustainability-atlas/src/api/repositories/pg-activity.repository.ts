import { DataSource } from 'typeorm';

export type ActivityCategory =
    | 'project_registered'
    | 'methodology_registered'
    | 'registry_registered'
    | 'credit_minted'
    | 'credit_retired'
    | 'other';

export interface ActivityRow {
    category: ActivityCategory;
    consensusTimestamp: string;
    title: string | null;
    subtitle: string | null;
    amount: string | null;
    projectKey: string | null;
    topicId: string | null;
    messageType: string | null;
}

export interface ActivityFilters {
    /** Watchlist project keys (Portfolio). Scopes every branch to those projects. */
    projectKeys?: string[];
    /** Registry display name (Dashboard filter dropdown). */
    registry?: string;
    /** Project developer name (Dashboard filter dropdown). */
    developer?: string;
}

// Registry display names, resolved once — mirrors PgDashboardRepository's
// REGISTRY_NAME_SOURCE so "registry" filtering matches the same canonical
// name the rest of the dashboard filters against.
const REGISTRY_NAME_SOURCE = `
    SELECT DISTINCT ON ("registryDid")
           "registryDid",
           "displayName" AS registry_name
    FROM business_view
    WHERE "viewType" = 'REGISTRY'
    ORDER BY "registryDid", "createdAt" DESC NULLS LAST
`;

/**
 * Network Activity feed — the latest N real Guardian events, newest first.
 *
 * Sourced from `message` (raw HCS messages) and `business_view` (PROJECT
 * rows only, which are upserted eagerly per projectKey with no dedup needed —
 * see ProjectMapperService.upsertProjectFromVc). NOT sourced from
 * `guardian_event_log`, which is an unrelated 7-day observability audit table
 * for the guardian-sync worker's own diagnostics.
 *
 * Each branch is independently ORDER BY ... DESC LIMIT `limit` before the
 * outer re-sort, so the planner can walk a timestamp-ordered (partial) index
 * per branch and stop early instead of scanning+sorting the whole table.
 *
 * Filtering — every branch is scoped when a filter is active:
 *  - `projectKeys` (Portfolio watchlist): Project Registered filters directly
 *    on projectKey; Credit Minted/Retired resolve their project via
 *    project_mint_link (retired resolves it by token_id, since there is no
 *    project_retirement_link yet); Methodology/Registry Registered resolve
 *    via the watchlisted projects' own instanceTopicId/registryDid.
 *  - `registry`/`developer` (Dashboard dropdowns): same idea, matched against
 *    the canonical registry name / businessData.developer.
 *  - The "Other" bucket (Token/DID-Document/VP-Document/Role-Document) has no
 *    reliable project/registry/developer attribution, so it is EXCLUDED
 *    entirely whenever any filter is active, rather than guessing.
 *  - Methodology/Registry Registered have no concept of a project developer,
 *    so they are excluded when `developer` is set (with no matching
 *    registry filter to instead scope by).
 */
export class PgActivityRepository {
    constructor(private readonly dataSource: DataSource) {}

    async getRecentActivity(limit: number, filters: ActivityFilters = {}): Promise<ActivityRow[]> {
        const params: unknown[] = [];
        let pk = '';
        let registryP = '';
        let developerP = '';

        if (filters.projectKeys && filters.projectKeys.length > 0) {
            params.push(filters.projectKeys);
            pk = `$${params.length}`;
        }
        if (filters.registry) {
            params.push(filters.registry);
            registryP = `$${params.length}`;
        }
        if (filters.developer) {
            params.push(filters.developer);
            developerP = `$${params.length}`;
        }

        const hasProjectFilter = !!pk;
        const hasRegistryFilter = !!registryP;
        const hasDeveloperFilter = !!developerP;
        const hasAnyFilter = hasProjectFilter || hasRegistryFilter || hasDeveloperFilter;

        // Applies to branches with no project-developer concept (Methodology
        // Registered, Registry Registered): scoped by projectKeys/registry when
        // given, but zeroed out entirely if only `developer` is active.
        const noDeveloperConceptGuard = hasDeveloperFilter ? 'AND FALSE' : '';

        const sql = `
            WITH events AS (
                (
                    SELECT
                        'project_registered'::varchar   AS category,
                        bv."sourceTimestamp"             AS "consensusTimestamp",
                        bv."displayName"                 AS title,
                        regname."registry_name"          AS subtitle,
                        NULL::text                        AS amount,
                        bv."projectKey"                  AS "projectKey",
                        bv."relatedTopicId"              AS "topicId",
                        NULL::varchar                     AS "messageType"
                    FROM business_view bv
                    LEFT JOIN (${REGISTRY_NAME_SOURCE}) regname ON regname."registryDid" = bv."registryDid"
                    WHERE bv."viewType" = 'PROJECT'
                    ${hasProjectFilter ? `AND bv."projectKey" = ANY(${pk}::text[])` : ''}
                    ${hasRegistryFilter ? `AND regname.registry_name = ${registryP}` : ''}
                    ${hasDeveloperFilter ? `AND bv."businessData"->>'developer' = ${developerP}` : ''}
                    ORDER BY (bv."sourceTimestamp")::numeric DESC
                    LIMIT ${limit}
                )
                UNION ALL
                (
                    SELECT
                        'methodology_registered', m."consensusTimestamp",
                        COALESCE(m.options->>'name', 'Methodology'), NULL,
                        NULL, NULL, m."topicId", NULL
                    FROM message m
                    LEFT JOIN (${REGISTRY_NAME_SOURCE}) regname
                        ON regname."registryDid" = COALESCE(m.owner, m.options->>'did')
                    WHERE m.type = 'Instance-Policy' AND m.action = 'publish-policy'
                    ${hasProjectFilter ? `AND m.options->>'instanceTopicId' = ANY(
                        SELECT DISTINCT bv."businessData"->>'instanceTopicId'
                        FROM business_view bv
                        WHERE bv."viewType" = 'PROJECT' AND bv."projectKey" = ANY(${pk}::text[])
                    )` : ''}
                    ${hasRegistryFilter ? `AND regname.registry_name = ${registryP}` : ''}
                    ${noDeveloperConceptGuard}
                    ORDER BY m."consensusTimestamp" DESC
                    LIMIT ${limit}
                )
                UNION ALL
                (
                    SELECT
                        'registry_registered', m."consensusTimestamp",
                        COALESCE(m.options->>'name', 'Registry'), NULL,
                        NULL, NULL, m."topicId", NULL
                    FROM message m
                    LEFT JOIN (${REGISTRY_NAME_SOURCE}) regname
                        ON regname."registryDid" = COALESCE(m.owner, m.options->>'did')
                    WHERE m.type = 'Standard Registry'
                    ${hasProjectFilter ? `AND COALESCE(m.owner, m.options->>'did') = ANY(
                        SELECT DISTINCT bv."registryDid"
                        FROM business_view bv
                        WHERE bv."viewType" = 'PROJECT' AND bv."projectKey" = ANY(${pk}::text[])
                    )` : ''}
                    ${hasRegistryFilter ? `AND regname.registry_name = ${registryP}` : ''}
                    ${noDeveloperConceptGuard}
                    ORDER BY m."consensusTimestamp" DESC
                    LIMIT ${limit}
                )
                UNION ALL
                (
                    SELECT
                        'credit_minted', m."consensusTimestamp",
                        COALESCE(tc.name, m.documents->'credentialSubject'->0->>'tokenId'),
                        pml.project_key,
                        m.documents->'credentialSubject'->0->>'amount',
                        pml.project_key, m."topicId", NULL
                    FROM message m
                    LEFT JOIN project_mint_link pml ON pml.mint_consensus_timestamp = m."consensusTimestamp"
                    LEFT JOIN token_cache tc ON tc."tokenId" = m.documents->'credentialSubject'->0->>'tokenId'
                    LEFT JOIN business_view bv ON bv."viewType" = 'PROJECT' AND bv."projectKey" = pml.project_key
                    LEFT JOIN (${REGISTRY_NAME_SOURCE}) regname ON regname."registryDid" = bv."registryDid"
                    WHERE m.type = 'VC-Document'
                      AND m.documents IS NOT NULL
                      AND (m.documents->'credentialSubject'->0->>'type') LIKE 'MintToken%'
                    ${hasProjectFilter ? `AND pml.project_key = ANY(${pk}::text[])` : ''}
                    ${hasRegistryFilter ? `AND regname.registry_name = ${registryP}` : ''}
                    ${hasDeveloperFilter ? `AND bv."businessData"->>'developer' = ${developerP}` : ''}
                    ORDER BY m."consensusTimestamp" DESC
                    LIMIT ${limit}
                )
                UNION ALL
                (
                    -- No project_retirement_link exists yet (unlike mints), so the
                    -- project is approximated via the retired token's own mint
                    -- history: a token belongs to exactly one project's credit
                    -- class, so any prior mint of the same tokenId reveals it.
                    SELECT
                        'credit_retired', m."consensusTimestamp",
                        COALESCE(tc.name, m.documents->'credentialSubject'->0->>'tokenId'),
                        pk3.project_key,
                        m.documents->'credentialSubject'->0->>'amount',
                        pk3.project_key, m."topicId", NULL
                    FROM message m
                    LEFT JOIN token_cache tc ON tc."tokenId" = m.documents->'credentialSubject'->0->>'tokenId'
                    LEFT JOIN LATERAL (
                        SELECT pml3.project_key
                        FROM project_mint_link pml3
                        WHERE pml3.token_id = m.documents->'credentialSubject'->0->>'tokenId'
                          AND pml3.project_key IS NOT NULL
                        LIMIT 1
                    ) pk3 ON true
                    LEFT JOIN business_view bv ON bv."viewType" = 'PROJECT' AND bv."projectKey" = pk3.project_key
                    LEFT JOIN (${REGISTRY_NAME_SOURCE}) regname ON regname."registryDid" = bv."registryDid"
                    WHERE m.type = 'VC-Document'
                      AND m.documents IS NOT NULL
                      AND (m.documents->'credentialSubject'->0->>'type') LIKE 'WipeToken%'
                    ${hasProjectFilter ? `AND pk3.project_key = ANY(${pk}::text[])` : ''}
                    ${hasRegistryFilter ? `AND regname.registry_name = ${registryP}` : ''}
                    ${hasDeveloperFilter ? `AND bv."businessData"->>'developer' = ${developerP}` : ''}
                    ORDER BY m."consensusTimestamp" DESC
                    LIMIT ${limit}
                )
                UNION ALL
                (
                    SELECT
                        'other', m."consensusTimestamp",
                        COALESCE(m.options->>'tokenName', m.options->>'name', m.type),
                        m.type,
                        NULL, NULL, m."topicId", m.type
                    FROM message m
                    WHERE m.type IN ('Token', 'DID-Document', 'VP-Document', 'Role-Document')
                    ${hasAnyFilter ? 'AND FALSE' : ''}
                    ORDER BY m."consensusTimestamp" DESC
                    LIMIT ${limit}
                )
            )
            SELECT * FROM events
            ORDER BY ("consensusTimestamp")::numeric DESC
            LIMIT ${limit}
        `;

        return this.dataSource.query(sql, params);
    }
}
