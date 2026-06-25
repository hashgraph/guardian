import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PolicyMapping } from '../../mapping/policy-pipeline.types';
import { TopicClassifierService } from '../topic-classifier';
import { ResolutionContext, ResolutionOutcome, ResolutionMetadata } from './resolver.types';

@Injectable()
export abstract class BaseProjectKeyResolver {
    protected abstract readonly method: string;

    constructor(
        protected readonly dataSource: DataSource,
        protected readonly topicClassifier: TopicClassifierService,
    ) {}

    abstract resolve(ctx: ResolutionContext): Promise<ResolutionOutcome>;

    // ---- outcome factory helpers (used by subclasses) ----
    protected resolved(projectKey: string, metadata: ResolutionMetadata = {}): ResolutionOutcome {
        return { status: 'resolved', projectKey, method: this.method, metadata };
    }
    protected pass(): ResolutionOutcome {
        return { status: 'pass' };
    }
    protected reject(reason: string): ResolutionOutcome {
        return { status: 'reject', reason };
    }

    /**
     * Earliest (chain-root) consensus timestamp of the VC carrying a given cs.id.
     * Recorded as metadata.rootVcTimestamp so a cs.id key is traceable to the
     * transaction that anchors it. Returns '' when the cs.id has no ingested VC.
     */
    protected async earliestTimestampForCsId(csId: string): Promise<string> {
        const rows: Array<{ ts: string }> = await this.dataSource.query(
            `SELECT "consensusTimestamp" AS ts
             FROM message
             WHERE type = 'VC-Document'
               AND documents->'credentialSubject'->0->>'id' = $1
             ORDER BY "consensusTimestamp" ASC
             LIMIT 1`,
            [csId],
        );
        return rows[0]?.ts ?? '';
    }

    /**
     * Canonical cs.id for a (per-project) dynamic topic: the EARLIEST
     * project-schema VC's cs.id in the topic, so every VC in the topic resolves
     * to one stable key. Falls back to the earliest cs.id-carrying VC in the
     * topic, then to null. Used by M1 so dynamic-topic projects are keyed by a
     * cs.id (with the topic recorded in metadata) — not by the topic id.
     */
    protected async canonicalCsIdInTopic(topicId: string, policyMapping: PolicyMapping): Promise<string | null> {
        const uuids = [...this.projectSchemaUuids(policyMapping)];
        if (uuids.length > 0) {
            const rows: Array<{ cs_id: string | null }> = await this.dataSource.query(
                `SELECT documents->'credentialSubject'->0->>'id' AS cs_id
                 FROM message
                 WHERE type = 'VC-Document'
                   AND "topicId" = $1
                   AND documents IS NOT NULL
                   AND documents->'credentialSubject'->0->>'id' IS NOT NULL
                   AND regexp_replace(split_part(documents->'credentialSubject'->0->>'type','&',1),'^#','') = ANY($2::text[])
                 ORDER BY "consensusTimestamp" ASC
                 LIMIT 1`,
                [topicId, uuids],
            );
            if (rows[0]?.cs_id) return rows[0].cs_id;
        }
        const any: Array<{ cs_id: string | null }> = await this.dataSource.query(
            `SELECT documents->'credentialSubject'->0->>'id' AS cs_id
             FROM message
             WHERE type = 'VC-Document'
               AND "topicId" = $1
               AND documents->'credentialSubject'->0->>'id' IS NOT NULL
             ORDER BY "consensusTimestamp" ASC
             LIMIT 1`,
            [topicId],
        );
        return any[0]?.cs_id ?? null;
    }

    // ---- ported graph helpers + new helpers below ----

    /**
     * Follows `credentialSubject[0].ref` (a DID pointing to the project's
     * identity VC) to find the canonical project key. Each hop: find the VC
     * whose `cs.id` equals the current ref, take ITS `cs.id` as the new
     * candidate, and if THAT VC also carries a ref, recurse.
     *
     * STOP-AT-PROJECT-SCHEMA: when `opts.projectSchemaUuids` is given, the walk
     * anchors on the project-schema VC instead of continuing to a higher,
     * SHARED root. Some methodologies nest the per-project doc (e.g. "Project
     * Listing Application", unique per project) under a per-developer root (e.g.
     * "Project Developer Application", one per registrant). Walking to that root
     * collapses every sibling project onto one key. We therefore return the
     * cs.id of the project-schema VC and stop as soon as the next ancestor is
     * NOT a project schema. `opts.startIsProjectSchema` seeds the anchor with the
     * start VC so a project-schema VC keys on its own cs.id rather than its root.
     *
     * Without `opts.projectSchemaUuids` the behaviour is unchanged: walk to the
     * first VC without a `ref` (the chain root).
     *
     * Returns null when the starting VC has no `ref`, or the ref points to a
     * cs.id not yet ingested (and no project-schema anchor was found) — the
     * caller then falls back to the HCS walk. Loop guard via visited refs;
     * capped at 8 hops.
     */
    protected async resolveViaRef(
        startTs: string,
        startCsId: string,
        opts: { projectSchemaUuids?: Set<string>; startIsProjectSchema?: boolean } = {},
    ): Promise<{ projectKey: string } | null> {
        const stopAtProjectSchema = !!opts.projectSchemaUuids && opts.projectSchemaUuids.size > 0;
        const isProjectSchema = (rawType: string | null): boolean =>
            stopAtProjectSchema &&
            opts.projectSchemaUuids!.has((rawType ?? '').split('&')[0].trim().replace(/^#/, ''));

        const startRow: Array<{ ref: string | null }> = await this.dataSource.query(
            `SELECT documents->'credentialSubject'->0->>'ref' AS ref
             FROM message
             WHERE "consensusTimestamp" = $1
             LIMIT 1`,
            [startTs],
        );
        const startRef = startRow[0]?.ref;
        if (!startRef || typeof startRef !== 'string') return null;
        if (startRef === startCsId) return null;     // self-ref → no useful pointer

        let currentRef = startRef;
        const visited = new Set<string>([startCsId, currentRef]);
        // The deepest project-schema cs.id seen so far. Seeded with the start VC
        // when it is itself the project schema (so it never keys on its root).
        let anchorCsId: string | null = opts.startIsProjectSchema ? startCsId : null;

        for (let i = 0; i < 8; i++) {
            const targetRow: Array<{ cs_id: string | null; next_ref: string | null; schema_type: string | null }> =
                await this.dataSource.query(
                    `SELECT documents->'credentialSubject'->0->>'id'   AS cs_id,
                            documents->'credentialSubject'->0->>'ref'  AS next_ref,
                            documents->'credentialSubject'->0->>'type' AS schema_type
                     FROM message
                     WHERE type = 'VC-Document'
                       AND documents->'credentialSubject'->0->>'id' = $1
                     ORDER BY "consensusTimestamp" ASC
                     LIMIT 1`,
                    [currentRef],
                );
            if (targetRow.length === 0 || !targetRow[0].cs_id) {
                // Ref doesn't resolve to any ingested VC. Prefer a project-schema
                // anchor already found; else let the HCS walk produce a fallback.
                return anchorCsId ? { projectKey: anchorCsId } : null;
            }
            const { cs_id, next_ref, schema_type } = targetRow[0];

            if (stopAtProjectSchema) {
                if (isProjectSchema(schema_type)) {
                    anchorCsId = cs_id;                  // climb through project-schema VCs
                } else if (anchorCsId) {
                    return { projectKey: anchorCsId };   // left the project level → stop
                }
            }

            if (!next_ref || typeof next_ref !== 'string' || visited.has(next_ref)) {
                return { projectKey: anchorCsId ?? cs_id };
            }
            visited.add(next_ref);
            currentRef = next_ref;
        }
        return { projectKey: anchorCsId ?? currentRef };
    }

    /**
     * Walk `message.options.relationships` backwards from a VC to find the root
     * cs.id-carrying VC in the chain. The root is treated as the project's
     * identity, so monitoring / verification VCs merge into the project rather
     * than creating phantom rows keyed by their own cs.id.
     *
     * Stops at the first ancestor that has no relationships (or no cs.id-
     * carrying VC among its relationships). Up to 12 hops. Skips
     * Role-Documents and other non-VC referenced messages.
     */
    protected async resolveViaRelationships(
        startTs: string,
        startCsId: string,
    ): Promise<{ projectKey: string; walked: boolean; hadRelationships: boolean }> {
        // Content-level link (preferred). Many Guardian VCs (monitoring,
        // verification, etc.) carry `credentialSubject[0].ref` pointing to the
        // project's identity DID. That's a deterministic intra-policy link
        // independent of HCS message relationships, which can branch through
        // registry-side artifacts and produce sibling cs.id winners on
        // different walks of the same logical project.
        const refResolved = await this.resolveViaRef(startTs, startCsId);
        if (refResolved) {
            return {
                projectKey: refResolved.projectKey,
                walked: refResolved.projectKey !== startCsId,
                hadRelationships: true,
            };
        }

        // If THIS VC's cs.id is the target of other VCs' `ref` fields, it is
        // the canonical project root — other monitoring/verification VCs in
        // the policy explicitly point to it as the project identity. Don't
        // walk past it to an older sibling registration just because the HCS
        // relationship graph has one (Guardian sometimes publishes multiple
        // registration VCs with different DIDs for the same logical project).
        if (await this.isCsIdReferencedByOtherVcs(startCsId, startTs)) {
            return { projectKey: startCsId, walked: false, hadRelationships: false };
        }

        // Fall back to BFS the ancestor tree via `options.relationships`. We
        // must walk THROUGH cs.id-less intermediate VCs (e.g. wrapper / system
        // VCs in some Guardian policies) — they don't claim a project
        // identity but their parents do. Stopping at the first cs.id-less hop
        // misses the real Project Registration VC further up.
        //
        // The winner is the OLDEST cs.id-carrying VC found anywhere in the
        // reachable tree (oldest == closest to chain root == Project VC).
        let oldestTs = startTs;
        let oldestCsId = startCsId;
        let walked = false;
        let hadRelationships = false;

        const visited = new Set<string>([startTs]);
        const queue: string[] = [startTs];
        let hops = 0;

        while (queue.length > 0 && hops < 24) {
            const currentTs = queue.shift()!;
            hops++;

            const relsRow: Array<{ rels: string[] | null }> = await this.dataSource.query(
                `SELECT
                    CASE
                        WHEN jsonb_typeof(options->'relationships') = 'array'
                            THEN ARRAY(SELECT jsonb_array_elements_text(options->'relationships'))
                        ELSE NULL
                    END AS rels
                 FROM message
                 WHERE "consensusTimestamp" = $1
                 LIMIT 1`,
                [currentTs],
            );
            const rels = relsRow[0]?.rels ?? [];
            if (currentTs === startTs) hadRelationships = rels.length > 0;
            if (rels.length === 0) continue;

            const fresh = rels.filter(r => !visited.has(r));
            if (fresh.length === 0) continue;

            // Fetch all VC-Document parents in this hop (with or without
            // cs.id) so we can both record candidates AND continue walking
            // through cs.id-less ones.
            const parents: Array<{ consensusTimestamp: string; cs_id: string | null }> =
                await this.dataSource.query(
                    `SELECT "consensusTimestamp",
                            documents->'credentialSubject'->0->>'id' AS cs_id
                     FROM message
                     WHERE "consensusTimestamp" = ANY($1::text[])
                       AND type = 'VC-Document'
                     ORDER BY "consensusTimestamp" ASC`,
                    [fresh],
                );

            for (const p of parents) {
                visited.add(p.consensusTimestamp);
                queue.push(p.consensusTimestamp);
                if (p.cs_id && p.consensusTimestamp < oldestTs) {
                    oldestTs = p.consensusTimestamp;
                    oldestCsId = p.cs_id;
                    walked = true;
                }
            }
        }

        return { projectKey: oldestCsId, walked, hadRelationships };
    }

    /**
     * Returns true when any OTHER VC's `credentialSubject[0].ref` equals the
     * given csId. The presence of such a reference means downstream VCs
     * explicitly treat this cs.id as the project's identity — we should not
     * walk past it via HCS relationships to an older sibling.
     */
    protected async isCsIdReferencedByOtherVcs(
        csId: string,
        selfTs: string,
    ): Promise<boolean> {
        const row: Array<{ exists: boolean }> = await this.dataSource.query(
            `SELECT 1 AS exists
             FROM message
             WHERE type = 'VC-Document'
               AND documents->'credentialSubject'->0->>'ref' = $1
               AND "consensusTimestamp" <> $2
             LIMIT 1`,
            [csId, selfTs],
        );
        return row.length > 0;
    }

    /**
     * Check if a given cs.id belongs to a VC whose schema is classified as
     * the project schema for its policy. Used to verify that a cs.ref chain
     * resolves to an actual project VC, not an intermediate artifact.
     */
    protected async isCsIdOnProjectSchema(
        csId: string,
        policyMapping: PolicyMapping,
    ): Promise<boolean> {
        const projectSchemaUuids = this.projectSchemaUuids(policyMapping);
        if (projectSchemaUuids.size === 0) return true;

        const rows: Array<{ schema_type: string | null }> = await this.dataSource.query(
            `SELECT documents->'credentialSubject'->0->>'type' AS schema_type
             FROM message
             WHERE type = 'VC-Document'
               AND documents->'credentialSubject'->0->>'id' = $1
             ORDER BY "consensusTimestamp" ASC
             LIMIT 1`,
            [csId],
        );
        if (rows.length === 0) return false;
        const rawType = rows[0].schema_type ?? '';
        const uuid = rawType.split('&')[0].trim().replace(/^#/, '');
        return projectSchemaUuids.has(uuid);
    }

    // ---- new helpers ----

    /**
     * Collects all project-schema UUIDs from the policy mapping (synchronous).
     */
    protected projectSchemaUuids(policyMapping: PolicyMapping): Set<string> {
        const uuids = new Set<string>();
        for (const entries of Object.values(policyMapping)) {
            if (!Array.isArray(entries)) continue;
            for (const entry of entries) {
                if (entry?.isProjectSchema === true && entry.schemaIri) {
                    uuids.add(entry.schemaIri.split('&')[0].trim().replace(/^#/, ''));
                }
            }
        }
        return uuids;
    }

    /**
     * Returns true when a PROJECT row keyed by projectKey already exists in
     * business_view (used as a last-resort confirmation signal).
     */
    protected async isKnownProjectRow(projectKey: string): Promise<boolean> {
        const rows: unknown[] = await this.dataSource.query(
            `SELECT 1 FROM business_view
             WHERE "viewType" = 'PROJECT' AND "projectKey" = $1
             LIMIT 1`,
            [projectKey],
        );
        return rows.length > 0;
    }

    /**
     * Independently verifies a candidate ancestor cs.id and returns the
     * CONFIRMED projectKey, or null.
     *
     * Order of checks:
     *   1. Classify the topic that hosts the earliest VC for this csId.
     *      dynamic-project → return the topic-id (topic-keyed).
     *   2. If the VC's schema UUID is in the policy's project-schema set →
     *      return csId (project-schema → cs.id-keyed).
     *   3. If a PROJECT business_view row already exists for csId →
     *      return csId (known row → cs.id-keyed).
     *   4. Otherwise null.
     */
    protected async confirmProjectKey(
        csId: string,
        policyMapping: PolicyMapping,
    ): Promise<string | null> {
        const rows: Array<{ topic_id: string | null; schema_type: string | null }> =
            await this.dataSource.query(
                `SELECT "topicId" AS topic_id,
                        documents->'credentialSubject'->0->>'type' AS schema_type
                 FROM message
                 WHERE type = 'VC-Document'
                   AND documents->'credentialSubject'->0->>'id' = $1
                 ORDER BY "consensusTimestamp" ASC
                 LIMIT 1`,
                [csId],
            );

        if (rows.length > 0 && rows[0].topic_id) {
            const cls = await this.topicClassifier.classifyTopic(this.dataSource, rows[0].topic_id);
            if (cls.kind === 'dynamic-project') {
                return rows[0].topic_id;
            }
            const uuid = (rows[0].schema_type ?? '').split('&')[0].trim().replace(/^#/, '');
            if (this.projectSchemaUuids(policyMapping).has(uuid)) {
                return csId;
            }
        }

        if (await this.isKnownProjectRow(csId)) {
            return csId;
        }

        return null;
    }
}
