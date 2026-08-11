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
 *   1. Mint-specific ancestor walk: walk options.relationships via recursive
 *      CTE (up to 15 hops) and match each ancestor against a business_view
 *      PROJECT row two ways — (a) the ancestor's own consensusTimestamp
 *      equals the project's sourceTimestamp or appears in its linkedVcs, or
 *      (b) the ancestor VC's own credentialSubject[0].id/.ref IS a project's
 *      projectKey (covers lifecycle VCs reached before linkedVcs is complete).
 *      Both conditions are evaluated in ONE pass so the shallowest matching
 *      ancestor wins regardless of which condition matched it. This merges
 *      what used to be two separate steps (a relationship-only walk, and a
 *      later "ref-root" walk tried only after the topic-wide cs_ref heuristic
 *      below had already failed) into one pass that always runs FIRST — a
 *      grouped/shared topic mint whose ancestor chain resolves cleanly no
 *      longer risks losing to a topic-wide guess that fires before it gets a
 *      chance to run.
 *   1.5 Same-topic cs.ref lookup: if the ancestor walk fails, look for any VC
 *      in the same topic whose credentialSubject[0].ref points to a known
 *      project's projectKey. Monitoring Reports explicitly carry this ref
 *      ("I am a report FOR this project"). Only used when exactly one project
 *      is referenced across the topic's VCs, to limit (not eliminate)
 *      misattribution risk in shared PoA topics with multiple sub-projects.
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
        // Step 1 — mint-specific ancestor walk (relationship + ref-root merged).
        // Walk options.relationships backwards up to 15 hops; at each ancestor,
        // match a business_view PROJECT row via EITHER signal:
        //   (a) the ancestor's own consensusTimestamp equals the project's
        //       sourceTimestamp, or appears in its linkedVcs, or
        //   (b) the ancestor VC's own credentialSubject[0].id/.ref IS a
        //       project's projectKey (covers lifecycle VCs reached before
        //       linkedVcs is complete).
        // Both signals are evaluated together so the overall shallowest match
        // wins — this is the only signal tied to THIS mint's own provenance,
        // so it always takes priority over the topic-wide heuristics below.
        const chainRows: Array<{
            project_key: string;
            project_topic_id: string;
            method: string;
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
                bv."relatedTopicId" AS project_topic_id,
                CASE
                    WHEN bv."sourceTimestamp" = rc.ts
                      OR bv."businessData"->'linkedVcs' @>
                         jsonb_build_array(jsonb_build_object('consensusTimestamp', rc.ts))
                    THEN 'relationship'
                    ELSE 'ref_root'
                END AS method
            FROM rel_chain rc
            LEFT JOIN message a ON a."consensusTimestamp" = rc.ts AND a.type = 'VC-Document'
            JOIN business_view bv
                ON bv."viewType" = 'PROJECT'
               AND (
                    bv."sourceTimestamp" = rc.ts
                    OR bv."businessData"->'linkedVcs' @>
                       jsonb_build_array(jsonb_build_object('consensusTimestamp', rc.ts))
                    OR (a."consensusTimestamp" IS NOT NULL
                        AND bv."projectKey" = a.documents->'credentialSubject'->0->>'id')
                    OR (a."consensusTimestamp" IS NOT NULL
                        AND bv."projectKey" = a.documents->'credentialSubject'->0->>'ref')
               )
            ORDER BY rc.depth ASC
            LIMIT 1
        `, [mint.consensusTimestamp]);

        let projectKey: string;
        let projectTopicId: string;
        let linkMethod: string;

        if (chainRows.length > 0) {
            projectKey = chainRows[0].project_key;
            projectTopicId = chainRows[0].project_topic_id;
            linkMethod = chainRows[0].method;
            if (linkMethod === 'ref_root') refRoot++; else linked++;
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
            }
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
