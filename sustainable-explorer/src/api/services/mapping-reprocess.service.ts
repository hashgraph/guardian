import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { NetworkDataSourceRegistry } from '../database/network-datasource.registry';
import { QueueRegistry } from '../queues/queue.registry';
import { BASE_QUEUE_NAMES } from '@shared/config/bullmq.config';
import { PolicyDecodeJobData } from '@worker/processors/policy-decode.processor';
import { ProjectReparseJobData } from '@worker/processors/project-reparse.processor';
import { PROJECT_EXTRACT_FIELDS } from '@worker/project-mapper/project-fields';
import { UpdateMappingDto } from '../dto/update-mapping.dto';
import { DecodedMethodologyResponseDto } from '../dto/decoded-methodology.dto';
import { PgPolicySchemaRepository } from '../repositories/pg-policy-schema.repository';
import { buildPolicyWorkflowGraph, PolicyWorkflowGraph } from './policy-graph.builder';

// ---------------------------------------------------------------------------
// Internal row shapes
// ---------------------------------------------------------------------------

interface PolicyRow {
    policyTopicId: string;
    sourceCid: string;
    decodeStatus: string;
    policyMapping: Record<string, unknown> | null;
}

interface VcMessageRow {
    consensusTimestamp: string;
}

@Injectable()
export class MappingReprocessService {
    private readonly logger = new Logger(MappingReprocessService.name);

    // Valid field label keys derived from PROJECT_EXTRACT_FIELDS — used for
    // validation in updateMapping without being recomputed on every call.
    private static readonly VALID_FIELD_LABELS: ReadonlySet<string> = new Set(
        PROJECT_EXTRACT_FIELDS.map(f => f.label),
    );

    // The API contract documents fieldMap keys as human-readable labels
    // ("Country", "Project Title"); the worker reads policyMapping by the
    // stable field key ("country", "name"). Translate before merging so saved
    // entries land in the same namespace runtime extraction reads from.
    private static readonly LABEL_TO_KEY: ReadonlyMap<string, string> = new Map(
        PROJECT_EXTRACT_FIELDS.map(f => [f.label, f.key]),
    );

    constructor(
        private readonly dataSources: NetworkDataSourceRegistry,
        private readonly queueRegistry: QueueRegistry,
    ) {}

    /**
     * Re-enqueues a POLICY_DECODE job for the given methodology.
     *
     * Uses the `sourceCid` and the `consensusTimestamp` of the original
     * Instance-Policy publish-policy message from the DB, so the processor
     * behaves identically to a first-time decode.
     *
     * The jobId intentionally includes `Date.now()` so successive re-runs show
     * up as distinct jobs in the BullMQ dashboard — the idempotent design is on
     * the processor side (it upserts, never inserts a duplicate row).
     */
    async redecodePolicy(
        network: string,
        methodologyId: string,
    ): Promise<{ enqueued: boolean; jobId?: string }> {
        const ds = this.dataSources.getDataSource(network);
        const policyTopicId = await this.resolvePolicyTopicId(network, methodologyId);

        const policyRows: PolicyRow[] = await ds.query(
            `SELECT "policyTopicId", "sourceCid", "decodeStatus"
             FROM policy
             WHERE "policyTopicId" = $1
             LIMIT 1`,
            [policyTopicId],
        );

        if (policyRows.length === 0) {
            throw new NotFoundException(
                `No policy row for policy topic "${policyTopicId}" on ${network}. ` +
                `The policy must have been processed at least once before re-decoding.`,
            );
        }

        const { sourceCid } = policyRows[0];

        // Recover the original message timestamp for the publish-policy message so
        // the processor can locate the correct source in the message table.
        const msgRows: Array<{ consensusTimestamp: string }> = await ds.query(
            `SELECT "consensusTimestamp"
             FROM message
             WHERE type = 'Instance-Policy'
               AND action = 'publish-policy'
               AND "topicId" = $1
             ORDER BY "consensusTimestamp" DESC
             LIMIT 1`,
            [policyTopicId],
        );

        const messageTimestamp = msgRows[0]?.consensusTimestamp ?? '0.0';

        const jobData: PolicyDecodeJobData = {
            cid: sourceCid,
            messageTimestamp,
            policyTopicId,
        };

        // Include timestamp in jobId so the operator can distinguish re-runs in
        // the BullMQ dashboard; the processor itself is fully idempotent.
        const jobId = `policy-decode-rerun-${policyTopicId}-${Date.now()}`;

        const queue = this.queueRegistry.getQueue(network, BASE_QUEUE_NAMES.POLICY_DECODE);
        await queue.add('decode', jobData, { jobId });

        this.logger.log(
            `Enqueued re-decode for policyTopicId=${policyTopicId} cid=${sourceCid} jobId=${jobId}`,
        );

        return { enqueued: true, jobId };
    }

    /**
     * Enqueues one PROJECT_REPARSE job per VC-Document message in the subtree
     * rooted at `policyTopicId` that already has documents loaded (non-null).
     *
     * Silently returns `{ enqueued: 0 }` when the policy decode is not yet
     * successful — re-parsing before the field map is ready would produce garbage.
     *
     * Each jobId is deterministic (`project-reparse-${consensusTimestamp}`) so
     * clicking the button twice is safe; BullMQ deduplicates within the TTL window.
     */
    async reparseProjects(
        network: string,
        methodologyId: string,
    ): Promise<{ enqueued: number }> {
        const ds = this.dataSources.getDataSource(network);
        const policyTopicId = await this.resolvePolicyTopicId(network, methodologyId);

        const statusRows: Array<{ decodeStatus: string }> = await ds.query(
            `SELECT "decodeStatus" FROM policy WHERE "policyTopicId" = $1 LIMIT 1`,
            [policyTopicId],
        );

        if (statusRows.length === 0 || statusRows[0].decodeStatus !== 'decoded') {
            this.logger.log(
                `reparseProjects skipped for policyTopicId=${policyTopicId}: ` +
                `decodeStatus=${statusRows[0]?.decodeStatus ?? 'missing'} (must be "decoded")`,
            );
            return { enqueued: 0 };
        }

        // Collect VC-Documents that have been fetched and are linked to this policy
        // via the indexed message.policyId column.
        const policyIdRows: Array<{ policyId: string }> = await ds.query(
            `SELECT "policyId" FROM policy WHERE "policyTopicId" = $1 AND "decodeStatus" = 'decoded'`,
            [policyTopicId],
        );
        const policyIds = policyIdRows.map(r => r.policyId);

        const vcRows: VcMessageRow[] = policyIds.length > 0
            ? await ds.query(
                `SELECT "consensusTimestamp"
                 FROM message
                 WHERE "policyId" = ANY($1::varchar[])
                   AND type = 'VC-Document'
                   AND documents IS NOT NULL`,
                [policyIds],
              )
            : [];

        const queue = this.queueRegistry.getQueue(network, BASE_QUEUE_NAMES.PROJECT_REPARSE);

        let enqueued = 0;
        for (const row of vcRows) {
            const jobData: ProjectReparseJobData = {
                messageConsensusTimestamp: row.consensusTimestamp,
            };
            // Remove any stale completed job with the same canonical jobId so a
            // bulk re-parse after a mapping change always re-processes. The
            // upsert is idempotent on the worker side (linkedVcs dedupe check
            // prevents credit/vcCount double-counting), so re-runs are safe.
            const canonicalJobId = `project-reparse-${row.consensusTimestamp}`;
            const stale = await queue.getJob(canonicalJobId);
            if (stale) await stale.remove();

            await queue.add('reparse', jobData, {
                jobId: `project-reparse-${row.consensusTimestamp}-${Date.now()}`,
            });
            enqueued++;
        }

        this.logger.log(
            `Enqueued ${enqueued} project reparse job(s) for policyTopicId=${policyTopicId}`,
        );

        return { enqueued };
    }

    /**
     * Re-enqueues a POLICY_DECODE job for every policy that currently has
     * decodeStatus='decoded'. Useful after classifier keyword updates to
     * re-stamp docType on existing policyMapping entries without manually
     * triggering redecode per methodology.
     *
     * Returns aggregate counts — failed enqueues are skipped and logged.
     */
    async redecodeAllPolicies(network: string): Promise<{
        total: number;
        enqueued: number;
        skipped: number;
    }> {
        const ds = this.dataSources.getDataSource(network);

        const policyRows: Array<{
            policyTopicId: string;
            instanceTopicId: string | null;
            sourceCid: string;
        }> = await ds.query(
            `SELECT "policyTopicId", "instanceTopicId", "sourceCid"
             FROM policy
             WHERE "decodeStatus" = 'decoded'`,
        );

        const queue = this.queueRegistry.getQueue(network, BASE_QUEUE_NAMES.POLICY_DECODE);

        let enqueued = 0;
        let skipped = 0;

        for (const row of policyRows) {
            try {
                const msgRows: Array<{ consensusTimestamp: string }> = await ds.query(
                    `SELECT "consensusTimestamp"
                     FROM message
                     WHERE type = 'Instance-Policy'
                       AND action = 'publish-policy'
                       AND "topicId" = $1
                     ORDER BY "consensusTimestamp" DESC
                     LIMIT 1`,
                    [row.policyTopicId],
                );

                const jobData: PolicyDecodeJobData = {
                    cid: row.sourceCid,
                    messageTimestamp: msgRows[0]?.consensusTimestamp ?? '0.0',
                    policyTopicId: row.policyTopicId,
                    instanceTopicId: row.instanceTopicId,
                };

                const jobId = `policy-decode-rerun-${row.policyTopicId}-${Date.now()}`;
                await queue.add('decode', jobData, { jobId });
                enqueued++;
            } catch (err) {
                skipped++;
                this.logger.warn(
                    `redecodeAllPolicies: skipped policyTopicId=${row.policyTopicId}: ` +
                    `${err instanceof Error ? err.message : String(err)}`,
                );
            }
        }

        this.logger.log(
            `redecodeAllPolicies on ${network}: ${enqueued} enqueued, ${skipped} skipped of ${policyRows.length} total`,
        );

        return { total: policyRows.length, enqueued, skipped };
    }

    /**
     * Walks every methodology in the network and enqueues per-VC reparse jobs
     * for each that has a successful decode.
     *
     * Used to backfill project rows after a mapping change without clicking the
     * per-methodology button manually. Returns aggregate stats — methodologies
     * with no successful decode contribute 0 and are skipped silently.
     */
    async reparseAllProjects(network: string): Promise<{
        methodologies: number;
        succeeded: number;
        skipped: number;
        enqueued: number;
    }> {
        const ds = this.dataSources.getDataSource(network);

        const rows: Array<{ policy_topic: string }> = await ds.query(
            `SELECT DISTINCT bv."businessData"->>'topicId' AS policy_topic
             FROM business_view bv
             WHERE bv."viewType" = 'METHODOLOGY'
               AND bv."businessData"->>'topicId' IS NOT NULL`,
        );

        let succeeded = 0;
        let skipped = 0;
        let enqueued = 0;

        for (const row of rows) {
            try {
                const result = await this.reparseProjects(network, row.policy_topic);
                if (result.enqueued > 0) {
                    succeeded++;
                    enqueued += result.enqueued;
                } else {
                    skipped++;
                }
            } catch (err) {
                skipped++;
                this.logger.warn(
                    `reparseAllProjects: skipped policyTopicId=${row.policy_topic}: ` +
                    `${err instanceof Error ? err.message : String(err)}`,
                );
            }
        }

        this.logger.log(
            `reparseAllProjects on ${network}: ${succeeded} methodology/ies reparsed, ` +
            `${skipped} skipped, ${enqueued} VC job(s) enqueued`,
        );

        return { methodologies: rows.length, succeeded, skipped, enqueued };
    }

    /**
     * Applies a partial field-map update to `policy."policyMapping"`,
     * persists it, then returns the updated DecodedMethodologyResponseDto.
     *
     * Validation rules:
     *   1. Each key in `body.fieldMap` must be a known PROJECT_EXTRACT_FIELDS label.
     *   2. Each value must be non-empty and contain at least one dot (schemaIri.fieldPath).
     *   3. The schemaIri part of each value must exist in `policy.rawSchemaJson` for this topic.
     *
     * The update is a PATCH-style merge — only the keys present in `body.fieldMap`
     * are overwritten; other existing entries are preserved.
     */
    /**
     * Applies a partial policyMapping update to policy."policyMapping".
     *
     * body.fieldMap keys are field keys from PROJECT_EXTRACT_FIELDS. Each value
     * has the form "schemaIri.fieldPath" — the same format as the old fieldMap.
     * The handler merges the incoming keys into the existing policyMapping JSONB
     * by replacing the first non-mintToken/standardRegistry entry for each
     * field key with the caller-specified schemaIri+fieldPath. Null/empty values
     * remove the entry for that key.
     *
     * Validation:
     *   1. Each key must be a known PROJECT_EXTRACT_FIELDS label.
     *   2. Each value must contain a dot (schemaIri.path).
     *   3. The schemaIri part must exist in policy.rawSchemaJson for this topic.
     */
    async updateMapping(
        network: string,
        methodologyId: string,
        body: UpdateMappingDto,
    ): Promise<DecodedMethodologyResponseDto> {
        const ds = this.dataSources.getDataSource(network);
        const policyTopicId = await this.resolvePolicyTopicId(network, methodologyId);

        // ── Fetch existing policy row ────────────────────────────────────────────
        const policyRows: PolicyRow[] = await ds.query(
            `SELECT "policyTopicId", "sourceCid", "decodeStatus", "policyMapping"
             FROM policy
             WHERE "policyTopicId" = $1
             LIMIT 1`,
            [policyTopicId],
        );

        if (policyRows.length === 0) {
            throw new NotFoundException(
                `No policy row for policy topic "${policyTopicId}" on ${network}.`,
            );
        }

        const existingMapping = (policyRows[0].policyMapping ?? {}) as Record<string, unknown[]>;

        // ── Validate field label keys ───────────────────────────────────────────
        const invalidLabels = Object.keys(body.fieldMap).filter(
            k => !MappingReprocessService.VALID_FIELD_LABELS.has(k),
        );
        if (invalidLabels.length > 0) {
            throw new BadRequestException(
                `Unknown field label(s): ${invalidLabels.join(', ')}. ` +
                `Valid labels are: ${[...MappingReprocessService.VALID_FIELD_LABELS].join(', ')}.`,
            );
        }

        // ── Load known schema IRIs for this policy (latest decoded row) ──────────
        // Needed up front because Guardian schema IRIs contain dots
        // (`#uuid&1.0.0`), so we can't split `schemaIri.fieldPath` with a naive
        // indexOf('.') — we match against the known IRI set longest-first.
        const rawRows: Array<{ rawSchemaJson: Record<string, unknown> | null }> = await ds.query(
            `SELECT "rawSchemaJson"
             FROM policy
             WHERE "policyTopicId" = $1
             ORDER BY ("decodeStatus" = 'decoded') DESC NULLS LAST,
                      "updatedAt" DESC NULLS LAST
             LIMIT 1`,
            [policyTopicId],
        );
        const rawSchemaJson = (rawRows[0]?.rawSchemaJson ?? {}) as Record<string, unknown>;
        const knownIris = Object.keys(rawSchemaJson).sort((a, b) => b.length - a.length);

        // ── Validate path format ─────────────────────────────────────────────────
        // Translate label → key here. The DTO + UI talk in labels ("Country");
        // the worker writes/reads policyMapping by key ("country"). Without
        // this translation, every save landed under the wrong namespace and
        // was invisible to project-mapper.service.ts:139-149.
        const keysToUnset = new Set<string>();
        const keyParsed = new Map<string, { schemaIri: string; fieldPath: string; label: string }>();

        for (const [label, value] of Object.entries(body.fieldMap)) {
            const fieldKey = MappingReprocessService.LABEL_TO_KEY.get(label);
            if (!fieldKey) {
                // Validation above already rejects unknown labels, but be
                // defensive in case PROJECT_EXTRACT_FIELDS drifts.
                throw new BadRequestException(`No key registered for label "${label}".`);
            }
            if (value === null || value === undefined || value === '') {
                keysToUnset.add(fieldKey);
                continue;
            }
            if (typeof value !== 'string') {
                throw new BadRequestException(`fieldMap["${label}"] must be a string or null.`);
            }

            let schemaIri = '';
            let fieldPath = '';
            for (const iri of knownIris) {
                if (value.startsWith(iri + '.')) {
                    schemaIri = iri;
                    fieldPath = value.slice(iri.length + 1);
                    break;
                }
            }
            if (!schemaIri) {
                throw new BadRequestException(
                    `fieldMap["${label}"] value "${value}" does not start with any known schema IRI ` +
                    `for policy "${policyTopicId}". Expected form "schemaIri.fieldPath".`,
                );
            }
            if (!fieldPath) {
                throw new BadRequestException(
                    `fieldMap["${label}"] value "${value}" has an empty fieldPath segment.`,
                );
            }
            keyParsed.set(fieldKey, { schemaIri, fieldPath, label });
        }

        // ── Merge into policyMapping (PATCH semantics) ───────────────────────────
        const mergedMapping: Record<string, unknown[]> = { ...existingMapping };

        // Clean up legacy label-keyed entries written by the pre-fix code path
        // so the same data isn't duplicated under both namespaces.
        for (const legacyLabel of MappingReprocessService.VALID_FIELD_LABELS) {
            if (legacyLabel in mergedMapping) delete mergedMapping[legacyLabel];
        }

        for (const [fieldKey, parsed] of keyParsed) {
            const existing = Array.isArray(mergedMapping[fieldKey]) ? [...mergedMapping[fieldKey]] : [];
            // Replace first non-mintToken/standardRegistry entry, or prepend.
            const manualEntry = {
                source: 'schema',
                schemaIri: parsed.schemaIri,
                fieldPath: parsed.fieldPath,
                title: parsed.label,
                description: '',
                isProjectSchema: true,
                score: 999,
            };
            const idx = existing.findIndex(e => {
                if (!e || typeof e !== 'object') return false;
                const schemaType = (e as Record<string, unknown>)['schemaType'];
                return schemaType !== 'mintToken' && schemaType !== 'standardRegistry';
            });
            if (idx >= 0) {
                existing[idx] = manualEntry;
            } else {
                existing.unshift(manualEntry);
            }
            mergedMapping[fieldKey] = existing;
        }

        for (const fieldKey of keysToUnset) {
            const existing = Array.isArray(mergedMapping[fieldKey]) ? [...mergedMapping[fieldKey]] : [];
            // Remove non-mintToken/standardRegistry entries for this key.
            mergedMapping[fieldKey] = existing.filter(e => {
                if (!e || typeof e !== 'object') return true;
                const schemaType = (e as Record<string, unknown>)['schemaType'];
                return schemaType === 'mintToken' || schemaType === 'standardRegistry';
            });
            if ((mergedMapping[fieldKey] as unknown[]).length === 0) delete mergedMapping[fieldKey];
        }

        // ── Persist updated policyMapping ────────────────────────────────────────
        await ds.query(
            `UPDATE policy
             SET "policyMapping" = $2::jsonb,
                 "updatedAt"     = now()
             WHERE "policyTopicId" = $1`,
            [policyTopicId, JSON.stringify(mergedMapping)],
        );

        this.logger.log(
            `Updated policyMapping for policyTopicId=${policyTopicId} ` +
            `(${Object.keys(body.fieldMap).length} key(s) merged).`,
        );

        // ── Return the refreshed decoded response ────────────────────────────────
        const repo = new PgPolicySchemaRepository(ds);
        const row = await repo.findDecoded(methodologyId);
        if (!row) {
            throw new NotFoundException(
                `Methodology "${methodologyId}" disappeared after update on ${network}.`,
            );
        }
        return DecodedMethodologyResponseDto.fromRow(row);
    }

    /**
     * Re-enqueues a PROJECT_REPARSE job for every VC already attached to a
     * specific project via `businessData->'linkedVcs'`.
     *
     * Unlike `reparseProjects` (which walks the full methodology subtree), this
     * only targets the VCs that were previously linked to this project — it is
     * safe to call after a mapping update when only one project needs refreshing.
     *
     * Returns `{ enqueued: 0 }` when the project has no linkedVcs yet rather
     * than throwing, because that is a valid state for projects that predate the
     * linkedVcs tracking.
     *
     * Lookup accepts either `sourceTimestamp` or `projectKey` (same dual-key
     * pattern used by the project detail endpoint).
     */
    async reextractProject(
        network: string,
        projectId: string,
    ): Promise<{ enqueued: number }> {
        const ds = this.dataSources.getDataSource(network);

        const rows: Array<{ businessData: Record<string, unknown> | null }> = await ds.query(
            `SELECT "businessData"
             FROM business_view
             WHERE "viewType" = 'PROJECT'
               AND ("sourceTimestamp" = $1 OR "projectKey" = $1)
             LIMIT 1`,
            [projectId],
        );

        if (rows.length === 0) {
            throw new NotFoundException(
                `Project with ID "${projectId}" not found on ${network}.`,
            );
        }

        const businessData = rows[0].businessData ?? {};
        const linkedVcs = Array.isArray(businessData['linkedVcs'])
            ? (businessData['linkedVcs'] as Array<Record<string, unknown>>)
            : [];

        if (linkedVcs.length === 0) {
            this.logger.log(
                `reextractProject: no linkedVcs on project "${projectId}" on ${network} — nothing to enqueue`,
            );
            return { enqueued: 0 };
        }

        const queue = this.queueRegistry.getQueue(network, BASE_QUEUE_NAMES.PROJECT_REPARSE);

        let enqueued = 0;
        for (const entry of linkedVcs) {
            const ts = entry['consensusTimestamp'];
            if (typeof ts !== 'string' || !ts) continue;

            // Per-project re-extract is an explicit user-driven action — it must
            // always re-run, even if a job with the deterministic bulk-flow jobId
            // already completed earlier (e.g. before a mapping change). Remove
            // any stale job, then enqueue a fresh one with a unique jobId so
            // BullMQ doesn't dedupe-and-skip.
            const bulkJobId = `project-reparse-${ts}`;
            const stale = await queue.getJob(bulkJobId);
            if (stale) await stale.remove();

            const jobData: ProjectReparseJobData = { messageConsensusTimestamp: ts };
            await queue.add('reparse', jobData, {
                jobId: `project-reextract-${ts}-${Date.now()}`,
            });
            enqueued++;
        }

        this.logger.log(
            `reextractProject: enqueued ${enqueued} reparse job(s) for project "${projectId}" on ${network}`,
        );

        return { enqueued };
    }

    /**
     * Refresh IPFS for every VC in the project's topic and reparse the project.
     *
     * Unlike `reextractProject` (which only replays already-linked VCs), this
     * targets the underlying topic and forces a clean IPFS re-fetch even for
     * VCs that previously failed and are parked in BullMQ's failed-set or in
     * the ipfs_fetch_failure table. After the IPFS jobs land, each VC's
     * eager project mapper run will re-attach it to the project. Use this
     * when a project page shows incomplete data because part of its chain
     * never came down from IPFS.
     */
    async refreshIpfsAndReparseProject(
        network: string,
        projectId: string,
    ): Promise<{ refreshed: number; reparseEnqueued: number }> {
        const ds = this.dataSources.getDataSource(network);

        const projectRows: Array<{ relatedTopicId: string | null }> = await ds.query(
            `SELECT "relatedTopicId"
             FROM business_view
             WHERE "viewType" = 'PROJECT'
               AND ("sourceTimestamp" = $1 OR "projectKey" = $1)
             LIMIT 1`,
            [projectId],
        );

        if (projectRows.length === 0) {
            throw new NotFoundException(
                `Project with ID "${projectId}" not found on ${network}.`,
            );
        }

        const topicId = projectRows[0].relatedTopicId;
        if (!topicId) {
            throw new BadRequestException(
                `Project "${projectId}" has no relatedTopicId — cannot resolve its VC topic.`,
            );
        }

        // Every VC-Document in the project's topic, with its CIDs and current
        // fetch state. We re-enqueue IPFS for the ones that don't have
        // documents yet, and re-enqueue reparse for the ones that do.
        const vcRows: Array<{
            consensusTimestamp: string;
            files: string[] | null;
            doc_null: boolean;
        }> = await ds.query(
            `SELECT "consensusTimestamp", files, (documents IS NULL) AS doc_null
             FROM message
             WHERE "topicId" = $1
               AND type = 'VC-Document'
             ORDER BY "consensusTimestamp"`,
            [topicId],
        );

        const ipfsQueue = this.queueRegistry.getQueue(network, BASE_QUEUE_NAMES.IPFS_FETCH);
        const reparseQueue = this.queueRegistry.getQueue(network, BASE_QUEUE_NAMES.PROJECT_REPARSE);

        // CIDs to refresh — collect first so we can also clear stale failure
        // records and BullMQ jobs in one pass.
        const cidsToRefresh: Array<{ cid: string; ts: string }> = [];
        const tsToReparse: string[] = [];
        for (const row of vcRows) {
            if (row.doc_null && Array.isArray(row.files)) {
                for (const cid of row.files) {
                    cidsToRefresh.push({ cid, ts: row.consensusTimestamp });
                }
            } else if (!row.doc_null) {
                tsToReparse.push(row.consensusTimestamp);
            }
        }

        // Clear the ipfs_fetch_failure table for these CIDs so the boot-time
        // safety net doesn't immediately re-park them.
        if (cidsToRefresh.length > 0) {
            await ds.query(
                `DELETE FROM ipfs_fetch_failure WHERE cid = ANY($1::text[])`,
                [cidsToRefresh.map(c => c.cid)],
            );
        }

        // Enqueue IPFS fetches: remove stale BullMQ jobs first so the new
        // add() actually runs instead of being deduped against a prior
        // failed/completed job entry.
        let refreshed = 0;
        for (const { cid, ts } of cidsToRefresh) {
            const jobId = `ipfs-${cid}`;
            try {
                const stale = await ipfsQueue.getJob(jobId);
                if (stale) await stale.remove();
            } catch {
                // ignore — job missing is fine
            }
            await ipfsQueue.add(
                'fetch',
                { cid, messageTimestamp: ts },
                { jobId },
            );
            refreshed++;
        }

        // Reparse already-fetched VCs through the project mapper so any
        // newly-reachable chain neighbours pull this project's fields in.
        let reparseEnqueued = 0;
        for (const ts of tsToReparse) {
            const bulkJobId = `project-reparse-${ts}`;
            try {
                const stale = await reparseQueue.getJob(bulkJobId);
                if (stale) await stale.remove();
            } catch {
                // ignore
            }
            const jobData: ProjectReparseJobData = { messageConsensusTimestamp: ts };
            await reparseQueue.add('reparse', jobData, {
                jobId: `project-refresh-${ts}-${Date.now()}`,
            });
            reparseEnqueued++;
        }

        this.logger.log(
            `refreshIpfsAndReparseProject: project="${projectId}" topic=${topicId} ` +
            `ipfsRefreshed=${refreshed} reparseEnqueued=${reparseEnqueued}`,
        );

        return { refreshed, reparseEnqueued };
    }

    /**
     * Fetches the raw VC document for a single linked VC, verifying that the
     * requested `consensusTimestamp` actually appears in the project's
     * `linkedVcs[]` before hitting the message table.
     *
     * Throws NotFoundException when the project is not found, the timestamp is
     * not in its linkedVcs list, or the message row has no documents column.
     */
    async getLinkedVcDocument(
        network: string,
        projectId: string,
        consensusTimestamp: string,
    ): Promise<Record<string, unknown>> {
        const ds = this.dataSources.getDataSource(network);

        // Resolve the project and verify the timestamp is in its linkedVcs.
        const projectRows: Array<{ businessData: Record<string, unknown> | null }> = await ds.query(
            `SELECT "businessData"
             FROM business_view
             WHERE "viewType" = 'PROJECT'
               AND ("sourceTimestamp" = $1 OR "projectKey" = $1)
             LIMIT 1`,
            [projectId],
        );

        if (projectRows.length === 0) {
            throw new NotFoundException(
                `Project with ID "${projectId}" not found on ${network}.`,
            );
        }

        const businessData = projectRows[0].businessData ?? {};
        const linkedVcs = Array.isArray(businessData['linkedVcs'])
            ? (businessData['linkedVcs'] as Array<Record<string, unknown>>)
            : [];

        const isLinked = linkedVcs.some(
            v => typeof v['consensusTimestamp'] === 'string' && v['consensusTimestamp'] === consensusTimestamp,
        );

        if (!isLinked) {
            throw new NotFoundException(
                `VC with consensusTimestamp "${consensusTimestamp}" is not linked to project "${projectId}" on ${network}.`,
            );
        }

        // Fetch the raw document from the message table.
        const msgRows: Array<{ documents: Record<string, unknown> | null }> = await ds.query(
            `SELECT documents FROM message WHERE "consensusTimestamp" = $1 LIMIT 1`,
            [consensusTimestamp],
        );

        if (msgRows.length === 0 || !msgRows[0].documents) {
            throw new NotFoundException(
                `No document found for consensusTimestamp "${consensusTimestamp}" on ${network}.`,
            );
        }

        // Non-null asserted: the guard above guarantees documents is present.
        return msgRows[0].documents!;
    }

    /**
     * Returns the raw VC document AND a per-field label map derived from the
     * policy's schemaFields.  The document fetch is delegated to
     * getLinkedVcDocument so all verification logic is reused exactly once.
     *
     * fieldLabels maps credentialSubject key → human label (description or
     * title from the matching schemaFields entry).  Returns an empty map when
     * the schema cannot be resolved — the caller must fall back gracefully.
     */
    async getLinkedVcEvidence(
        network: string,
        projectId: string,
        consensusTimestamp: string,
    ): Promise<{ document: Record<string, unknown>; fieldLabels: Record<string, string> }> {
        const document = await this.getLinkedVcDocument(network, projectId, consensusTimestamp);
        const ds = this.dataSources.getDataSource(network);
        const fieldLabels = await this.buildVcFieldLabels(ds, consensusTimestamp, document);
        return { document, fieldLabels };
    }

    /**
     * Returns the methodology workflow graph (role swimlanes of document/action
     * steps + real flow edges) for a project's policy, extracted from
     * policy.json. Returns an empty graph when the project has no decoded policy
     * (the frontend renders an empty-state).
     */
    async getPolicyGraph(network: string, projectId: string): Promise<PolicyWorkflowGraph> {
        const ds = this.dataSources.getDataSource(network);

        const projectRows: Array<{ businessData: Record<string, unknown> | null }> = await ds.query(
            `SELECT "businessData"
             FROM business_view
             WHERE "viewType" = 'PROJECT'
               AND ("sourceTimestamp" = $1 OR "projectKey" = $1)
             LIMIT 1`,
            [projectId],
        );
        if (projectRows.length === 0) {
            throw new NotFoundException(`Project with ID "${projectId}" not found on ${network}.`);
        }

        const businessData = projectRows[0].businessData ?? {};
        const policyTopicId = typeof businessData['policyTopicId'] === 'string'
            ? (businessData['policyTopicId'] as string)
            : null;
        if (!policyTopicId) return { roles: [], nodes: [], edges: [] };

        const policyRows: Array<{ rawPolicyJson: Record<string, unknown> | null; rawSchemaJson: Record<string, unknown> | null }> =
            await ds.query(
                `SELECT "rawPolicyJson", "rawSchemaJson"
                 FROM policy
                 WHERE "policyTopicId" = $1 AND "decodeStatus" = 'decoded'
                 LIMIT 1`,
                [policyTopicId],
            );
        if (policyRows.length === 0) return { roles: [], nodes: [], edges: [] };

        return buildPolicyWorkflowGraph(policyRows[0].rawPolicyJson, policyRows[0].rawSchemaJson);
    }

    /**
     * Returns the raw decoded policy.json for a project's policy (for the
     * "view policy JSON" inspector). Returns null when no decoded policy exists.
     */
    async getPolicyJson(network: string, projectId: string): Promise<Record<string, unknown> | null> {
        const ds = this.dataSources.getDataSource(network);

        const projectRows: Array<{ businessData: Record<string, unknown> | null }> = await ds.query(
            `SELECT "businessData"
             FROM business_view
             WHERE "viewType" = 'PROJECT'
               AND ("sourceTimestamp" = $1 OR "projectKey" = $1)
             LIMIT 1`,
            [projectId],
        );
        if (projectRows.length === 0) {
            throw new NotFoundException(`Project with ID "${projectId}" not found on ${network}.`);
        }

        const policyTopicId = typeof projectRows[0].businessData?.['policyTopicId'] === 'string'
            ? (projectRows[0].businessData!['policyTopicId'] as string)
            : null;
        if (!policyTopicId) return null;

        const policyRows: Array<{ rawPolicyJson: Record<string, unknown> | null }> = await ds.query(
            `SELECT "rawPolicyJson"
             FROM policy
             WHERE "policyTopicId" = $1 AND "decodeStatus" = 'decoded'
             LIMIT 1`,
            [policyTopicId],
        );
        return policyRows[0]?.rawPolicyJson ?? null;
    }

    // ---------------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------------

    /**
     * Builds a map of { [fieldPath]: humanLabel } for the credentialSubject
     * fields of the given VC document by looking up the policy's schemaFields.
     *
     * Returns {} when any required data is absent — callers must handle this
     * gracefully (fall back to humanizeKey on the frontend).
     */
    private async buildVcFieldLabels(
        ds: import('typeorm').DataSource,
        consensusTimestamp: string,
        document: Record<string, unknown>,
    ): Promise<Record<string, string>> {
        try {
            // 1. Extract the schema IRI from credentialSubject[0].type
            const cs = Array.isArray(document['credentialSubject'])
                ? (document['credentialSubject'][0] as Record<string, unknown> | undefined)
                : (document['credentialSubject'] as Record<string, unknown> | undefined);
            if (!cs) return {};

            const schemaIriRaw = String(cs['type'] ?? '');
            const bareUuid = schemaIriRaw.replace(/^#/, '').split('&')[0].trim();
            if (!bareUuid) return {};

            // 2. Fetch policy schemaFields for the message's policyId
            const rows: Array<{ schemaFields: unknown }> = await ds.query(
                `SELECT p."schemaFields"
                 FROM message m
                 JOIN policy p ON p."policyId" = m."policyId"
                 WHERE m."consensusTimestamp" = $1
                   AND p."decodeStatus" = 'decoded'
                 LIMIT 1`,
                [consensusTimestamp],
            );

            if (rows.length === 0) return {};
            const schemaFields = rows[0].schemaFields;
            if (!Array.isArray(schemaFields)) return {};

            // 3. Build the label map for entries whose schemaIri bare-UUID matches
            const labels: Record<string, string> = {};
            for (const entry of schemaFields as Array<Record<string, unknown>>) {
                const entryIri = String(entry['schemaIri'] ?? '');
                const entryBareUuid = entryIri.replace(/^#/, '').split('&')[0].trim();
                if (entryBareUuid !== bareUuid) continue;

                const path = String(entry['path'] ?? '').trim();
                if (!path) continue;

                const description = String(entry['description'] ?? '').trim();
                const title = String(entry['title'] ?? '').trim();
                const label = description || title;
                if (!label) continue;

                labels[path] = label;
            }

            return labels;
        } catch {
            // Never let label resolution failures surface as HTTP errors
            return {};
        }
    }

    /**
     * Resolves the policy topic ID for a methodology given its URL `id` param.
     *
     * The URL param is the methodology's `relatedTopicId` (instance topic). The
     * The policy table is keyed on policyTopicId which equals businessData->>'topicId'.
     * Matches the same lookup logic used by PgPolicySchemaRepository.findDecoded.
     */
    private async resolvePolicyTopicId(network: string, methodologyId: string): Promise<string> {
        const ds = this.dataSources.getDataSource(network);

        const rows: Array<{ policy_topic: string | null }> = await ds.query(
            `SELECT bv."businessData"->>'topicId' AS policy_topic
             FROM business_view bv
             WHERE bv."viewType" = 'METHODOLOGY'
               AND (bv."relatedTopicId" = $1 OR bv."businessData"->>'topicId' = $1)
             LIMIT 1`,
            [methodologyId],
        );

        if (rows.length === 0 || !rows[0].policy_topic) {
            throw new NotFoundException(
                `Methodology with ID "${methodologyId}" not found on ${network}.`,
            );
        }

        return rows[0].policy_topic;
    }
}

