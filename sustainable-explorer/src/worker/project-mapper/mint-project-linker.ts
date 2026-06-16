import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * Resolves each unlinked or stale-linked MintToken VC to its specific project
 * and upserts the result into project_mint_link.
 *
 * Called from BusinessViewBuilderProcessor after registry/methodology/credit
 * views are built. The function is incremental: it processes mints that have
 * NO link at all, AND mints whose existing link's project_key no longer matches
 * any PROJECT row in business_view (stale links that arise after a project is
 * re-keyed during M1 re-processing). The ON CONFLICT DO UPDATE upsert repairs
 * the stale row when the mint is successfully re-resolved.
 *
 * Resolution strategy:
 *   1. Walk options.relationships via recursive CTE (up to 15 hops) until an
 *      ancestor consensusTimestamp matches a business_view PROJECT row.
 *      Stores projectKey (the canonical cs.id) which is stable across
 *      business_view rebuilds, unlike sourceTimestamp.
 *   1.5 Same-topic cs.ref lookup: if the relationship walk fails, look for
 *      any VC in the same topic whose credentialSubject[0].ref points to a
 *      known project's projectKey. Monitoring Reports explicitly carry this
 *      ref ("I am a report FOR this project"), making it a more semantically
 *      precise link than topic-scope. Only used when exactly one project is
 *      referenced to avoid misattribution in shared PoA topics.
 *   1.75 Ref-root match: walk the relationship ancestors for the mint and
 *      look for a PROJECT row whose projectKey equals an ancestor VC's own
 *      cs.id OR its cs.ref. This decouples mint linking from linkedVcs
 *      completeness — the relationship walk often reaches lifecycle VCs
 *      whose cs.ref IS the project key even when those VCs are not yet in
 *      linkedVcs.
 *   2. Topic-scope fallback: only when the instance topic contains exactly
 *      one project. Grouped topics without a resolved chain are skipped to
 *      avoid misattribution.
 */
export async function buildMintProjectLinks(
    dataSource: DataSource,
    logger: Logger,
): Promise<void> {
    const unlinked: Array<{
        consensusTimestamp: string;
        topicId: string;
        token_id: string | null;
        amount: string | null;
        mint_date: string | null;
    }> = await dataSource.query(`
        SELECT
            m."consensusTimestamp",
            m."topicId",
            m.documents->'credentialSubject'->0->>'tokenId' AS token_id,
            m.documents->'credentialSubject'->0->>'amount'  AS amount,
            m.documents->'credentialSubject'->0->>'date'    AS mint_date
        FROM message m
        WHERE m.type = 'VC-Document'
          AND m.documents->'credentialSubject'->0->>'type' LIKE 'MintToken%'
          AND NOT EXISTS (
              SELECT 1
              FROM project_mint_link pml
              JOIN business_view bv
                ON bv."projectKey" = pml.project_key AND bv."viewType" = 'PROJECT'
              WHERE pml.mint_consensus_timestamp = m."consensusTimestamp"
          )
        ORDER BY m."consensusTimestamp"
    `);

    if (unlinked.length === 0) return;

    logger.log(`MintProjectLinker: linking ${unlinked.length} new mint(s)`);

    let linked = 0;
    let csRef = 0;
    let refRoot = 0;
    let fallback = 0;
    let skipped = 0;

    for (const mint of unlinked) {
        // Step 1 — walk options.relationships backwards to find the ancestor
        // PROJECT row. ORDER BY depth ASC + LIMIT 1 picks the shallowest match,
        // which is the Project Registration VC closest to the mint in the chain.
        const chainRows: Array<{
            project_key: string;
            project_topic_id: string;
        }> = await dataSource.query(`
            WITH RECURSIVE rel_chain(ts, depth) AS (
                SELECT
                    jsonb_array_elements_text(m.options->'relationships')::varchar AS ts,
                    1 AS depth
                FROM message m
                WHERE m."consensusTimestamp" = $1
                  AND m.options->'relationships' IS NOT NULL
                  AND jsonb_typeof(m.options->'relationships') = 'array'
                  AND jsonb_array_length(m.options->'relationships') > 0

                UNION ALL

                SELECT
                    jsonb_array_elements_text(p.options->'relationships')::varchar,
                    rc.depth + 1
                FROM rel_chain rc
                JOIN message p ON p."consensusTimestamp" = rc.ts
                WHERE rc.depth < 15
                  AND p.options->'relationships' IS NOT NULL
                  AND p.options->'relationships' != 'null'::jsonb
                  AND jsonb_typeof(p.options->'relationships') = 'array'
            )
            SELECT
                bv."projectKey"     AS project_key,
                bv."relatedTopicId" AS project_topic_id
            FROM rel_chain rc
            JOIN business_view bv
                ON (bv."sourceTimestamp" = rc.ts
                    OR bv."businessData"->'linkedVcs' @>
                       jsonb_build_array(jsonb_build_object('consensusTimestamp', rc.ts)))
               AND bv."viewType" = 'PROJECT'
            ORDER BY rc.depth ASC
            LIMIT 1
        `, [mint.consensusTimestamp]);

        let projectKey: string;
        let projectTopicId: string;
        let linkMethod: string;

        if (chainRows.length > 0) {
            projectKey = chainRows[0].project_key;
            projectTopicId = chainRows[0].project_topic_id;
            linkMethod = 'relationship';
            linked++;
        } else {
            // Step 1.5 — same-topic cs.ref lookup: find any VC in the same topic
            // whose credentialSubject[0].ref explicitly points to a project's
            // projectKey. Monitoring Reports carry this ref; it is a direct
            // semantic assertion that the VC belongs to that specific project.
            // Safe only when exactly one project is referenced to prevent
            // misattribution in shared PoA topics with multiple sub-projects.
            const csRefRows: Array<{ project_key: string; project_topic_id: string }> =
                await dataSource.query(`
                    SELECT DISTINCT
                        bv."projectKey"     AS project_key,
                        bv."relatedTopicId" AS project_topic_id
                    FROM message m
                    JOIN business_view bv
                        ON (bv."projectKey" = m.documents->'credentialSubject'->0->>'ref'
                            OR bv."businessData"->'linkedVcs' @>
                               jsonb_build_array(jsonb_build_object('csId',
                                   m.documents->'credentialSubject'->0->>'ref')))
                       AND bv."viewType" = 'PROJECT'
                    WHERE m."topicId" = $1
                      AND m.type = 'VC-Document'
                      AND m.documents IS NOT NULL
                      AND m.documents->'credentialSubject'->0->>'ref' IS NOT NULL
                `, [mint.topicId]);

            if (csRefRows.length === 1) {
                projectKey = csRefRows[0].project_key;
                projectTopicId = csRefRows[0].project_topic_id;
                linkMethod = 'cs_ref';
                csRef++;
            } else {
                // Step 1.75 — ref-root match: walk relationship ancestors for this mint
                // and match a PROJECT row whose projectKey equals an ancestor VC's own
                // cs.id OR its cs.ref. This decouples mint linking from linkedVcs
                // completeness — the relationship walk often lands on lifecycle VCs
                // whose cs.ref IS the project key even when those VCs are not (yet)
                // in linkedVcs.
                const refRootRows: Array<{ project_key: string; project_topic_id: string }> =
                    await dataSource.query(`
                        WITH RECURSIVE rel_chain(ts, depth) AS (
                            SELECT
                                jsonb_array_elements_text(m.options->'relationships')::varchar AS ts,
                                1 AS depth
                            FROM message m
                            WHERE m."consensusTimestamp" = $1
                              AND m.options->'relationships' IS NOT NULL
                              AND jsonb_typeof(m.options->'relationships') = 'array'
                              AND jsonb_array_length(m.options->'relationships') > 0

                            UNION ALL

                            SELECT
                                jsonb_array_elements_text(p.options->'relationships')::varchar,
                                rc.depth + 1
                            FROM rel_chain rc
                            JOIN message p ON p."consensusTimestamp" = rc.ts
                            WHERE rc.depth < 15
                              AND p.options->'relationships' IS NOT NULL
                              AND p.options->'relationships' != 'null'::jsonb
                              AND jsonb_typeof(p.options->'relationships') = 'array'
                        )
                        SELECT bv."projectKey" AS project_key, bv."relatedTopicId" AS project_topic_id
                        FROM rel_chain rc
                        JOIN message a ON a."consensusTimestamp" = rc.ts AND a.type = 'VC-Document'
                        JOIN business_view bv ON bv."viewType" = 'PROJECT'
                            AND (bv."projectKey" = a.documents->'credentialSubject'->0->>'id'
                                 OR bv."projectKey" = a.documents->'credentialSubject'->0->>'ref')
                        ORDER BY rc.depth ASC
                        LIMIT 1
                    `, [mint.consensusTimestamp]);

                if (refRootRows.length > 0) {
                    projectKey = refRootRows[0].project_key;
                    projectTopicId = refRootRows[0].project_topic_id;
                    linkMethod = 'ref_root';
                    refRoot++;
                } else {
                // Step 2 — topic-scope fallback: safe only for unambiguous single-project topics.
                const fallbackRows: Array<{ project_key: string; relatedTopicId: string }> =
                    await dataSource.query(`
                        SELECT "projectKey" AS project_key, "relatedTopicId"
                        FROM business_view
                        WHERE "viewType" = 'PROJECT'
                          AND "relatedTopicId" = $1
                    `, [mint.topicId]);

                if (fallbackRows.length !== 1) {
                    if (fallbackRows.length > 1) {
                        logger.warn(
                            `MintToken ${mint.consensusTimestamp}: grouped topic ${mint.topicId} — ` +
                            `chain unresolved, skipping to avoid misattribution`,
                        );
                    }
                    skipped++;
                    continue;
                }

                projectKey = fallbackRows[0].project_key;
                projectTopicId = fallbackRows[0].relatedTopicId;
                linkMethod = 'topic_scope';
                fallback++;
                } // end else (Step 2)
            } // end else (Step 1.75 miss)
        }

        // amount arrives as a JSONB string; parseFloat handles decimal values
        // (e.g. "250.5") before rounding to fit the BIGINT column.
        const amount = mint.amount != null ? Math.round(parseFloat(mint.amount)) : null;
        const mintDate = mint.mint_date ? new Date(mint.mint_date) : null;

        await dataSource.query(`
            INSERT INTO project_mint_link (
                mint_consensus_timestamp,
                project_key,
                project_topic_id,
                token_id,
                amount,
                mint_date,
                link_method
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (mint_consensus_timestamp) DO UPDATE SET
                project_key      = EXCLUDED.project_key,
                project_topic_id = EXCLUDED.project_topic_id,
                token_id         = EXCLUDED.token_id,
                amount           = EXCLUDED.amount,
                mint_date        = EXCLUDED.mint_date,
                link_method      = EXCLUDED.link_method
        `, [mint.consensusTimestamp, projectKey, projectTopicId, mint.token_id, amount, mintDate, linkMethod]);
    }

    logger.log(
        `MintProjectLinker: ${linked} via relationship, ${csRef} via cs.ref, ${refRoot} via ref-root, ${fallback} via topic-scope, ${skipped} skipped`,
    );
}
