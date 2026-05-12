import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { NetworkDataSourceRegistry } from '../database/network-datasource.registry';
import { QueueRegistry } from '../queues/queue.registry';
import { BASE_QUEUE_NAMES } from '@shared/config/bullmq.config';
import { PolicyDecodeJobData } from '@worker/processors/policy-decode.processor';
import { ProjectReparseJobData } from '@worker/processors/project-reparse.processor';
import { derivePerPolicyProjectMeta } from '@worker/mapping/derive-project-meta';
import { PROJECT_EXTRACT_FIELDS } from '@worker/project-mapper/project-fields';
import { FieldMap } from '@worker/mapping/types';
import { UpdateMappingDto } from '../dto/update-mapping.dto';
import { DecodedMethodologyResponseDto } from '../dto/decoded-methodology.dto';
import { PgPolicySchemaRepository } from '../repositories/pg-policy-schema.repository';

// ---------------------------------------------------------------------------
// Internal row shapes
// ---------------------------------------------------------------------------

interface PolicyDecodeStatusRow {
    policyTopicId: string;
    sourceCid: string;
    status: string;
    fieldMap: Record<string, string> | null;
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

        const statusRows: PolicyDecodeStatusRow[] = await ds.query(
            `SELECT "policyTopicId", "sourceCid", status
             FROM policy_decode_status
             WHERE "policyTopicId" = $1
             LIMIT 1`,
            [policyTopicId],
        );

        if (statusRows.length === 0) {
            throw new NotFoundException(
                `No decode status row for policy topic "${policyTopicId}" on ${network}. ` +
                `The policy must have been processed at least once before re-decoding.`,
            );
        }

        const { sourceCid } = statusRows[0];

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

        const statusRows: Array<{ status: string }> = await ds.query(
            `SELECT status FROM policy_decode_status WHERE "policyTopicId" = $1 LIMIT 1`,
            [policyTopicId],
        );

        if (statusRows.length === 0 || statusRows[0].status !== 'success') {
            this.logger.log(
                `reparseProjects skipped for policyTopicId=${policyTopicId}: ` +
                `status=${statusRows[0]?.status ?? 'missing'} (must be "success")`,
            );
            return { enqueued: 0 };
        }

        // Walk the full topic subtree to collect VC-Documents that have been fetched.
        const vcRows: VcMessageRow[] = await ds.query(
            `WITH RECURSIVE descendants AS (
                 SELECT $1::text AS "topicId"
                 UNION ALL
                 SELECT t."topicId"
                 FROM message t
                 JOIN descendants d ON (t.options->>'parentId') = d."topicId"
                 WHERE t.type = 'Topic'
             )
             SELECT m."consensusTimestamp"
             FROM message m
             JOIN descendants d ON d."topicId" = m."topicId"
             WHERE m.type = 'VC-Document'
               AND m.documents IS NOT NULL`,
            [policyTopicId],
        );

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
     * Applies a partial field-map update to `policy_decode_status."fieldMap"`,
     * re-derives the per-policy project meta columns, persists them, then returns
     * the updated DecodedMethodologyResponseDto.
     *
     * Validation rules:
     *   1. Each key in `body.fieldMap` must be a known PROJECT_EXTRACT_FIELDS label.
     *   2. Each value must be non-empty and contain at least one dot (schemaId.path).
     *   3. The schemaId part of each value must exist in `policy_schema` for this topic.
     *
     * The update is a PATCH-style merge — only the keys present in `body.fieldMap`
     * are overwritten; other existing entries are preserved.
     */
    async updateMapping(
        network: string,
        methodologyId: string,
        body: UpdateMappingDto,
    ): Promise<DecodedMethodologyResponseDto> {
        const ds = this.dataSources.getDataSource(network);
        const policyTopicId = await this.resolvePolicyTopicId(network, methodologyId);

        // ── Fetch existing row ──────────────────────────────────────────────────
        const statusRows: PolicyDecodeStatusRow[] = await ds.query(
            `SELECT "policyTopicId", "sourceCid", status, "fieldMap"
             FROM policy_decode_status
             WHERE "policyTopicId" = $1
             LIMIT 1`,
            [policyTopicId],
        );

        if (statusRows.length === 0) {
            throw new NotFoundException(
                `No decode status row for policy topic "${policyTopicId}" on ${network}.`,
            );
        }

        const existingFieldMap = statusRows[0].fieldMap ?? {};

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

        // ── Validate path format & collect referenced schemaIds ─────────────────
        // null / empty-string values mean "unset this label" — they skip path
        // validation and get deleted from the merged map further down.
        const referencedSchemaIds = new Set<string>();
        const labelsToUnset = new Set<string>();
        for (const [label, value] of Object.entries(body.fieldMap)) {
            if (value === null || value === undefined || value === '') {
                labelsToUnset.add(label);
                continue;
            }
            if (typeof value !== 'string') {
                throw new BadRequestException(
                    `fieldMap["${label}"] must be a string or null.`,
                );
            }
            const dotIdx = value.indexOf('.');
            if (dotIdx === -1) {
                throw new BadRequestException(
                    `fieldMap["${label}"] value "${value}" must have the form "schemaId.path".`,
                );
            }
            const schemaId = value.slice(0, dotIdx);
            const path = value.slice(dotIdx + 1);
            if (!schemaId || !path) {
                throw new BadRequestException(
                    `fieldMap["${label}"] value "${value}" has an empty schemaId or path segment.`,
                );
            }
            referencedSchemaIds.add(schemaId);
        }

        // ── Verify all referenced schemaIds exist for this policy ───────────────
        if (referencedSchemaIds.size > 0) {
            const schemaRows: Array<{ schemaId: string }> = await ds.query(
                `SELECT "schemaId"
                 FROM policy_schema
                 WHERE "policyTopicId" = $1
                   AND "schemaId" = ANY($2)`,
                [policyTopicId, [...referencedSchemaIds]],
            );
            const knownIds = new Set(schemaRows.map(r => r.schemaId));
            const unknownIds = [...referencedSchemaIds].filter(id => !knownIds.has(id));
            if (unknownIds.length > 0) {
                throw new BadRequestException(
                    `Schema ID(s) not found for policy "${policyTopicId}": ${unknownIds.join(', ')}.`,
                );
            }
        }

        // ── Merge maps (PATCH semantics — only overwrite provided keys) ──────────
        // Apply the body, then drop any labels the caller asked to unset.
        const mergedFieldMap: Record<string, string> = {
            ...existingFieldMap,
            ...(body.fieldMap as Record<string, string>),
        };
        for (const label of labelsToUnset) delete mergedFieldMap[label];

        // ── Re-derive project meta ───────────────────────────────────────────────
        const projectMeta = derivePerPolicyProjectMeta(mergedFieldMap as FieldMap, []);

        const projectSchemaId = projectMeta?.projectSchemaId ?? null;
        const projectFieldMap = projectMeta?.projectFieldMap ?? null;
        const projectGeoKey = projectMeta?.projectGeoKey ?? null;
        const projectGeoSection = projectMeta?.projectGeoSection ?? null;

        // ── Persist updated columns ──────────────────────────────────────────────
        await ds.query(
            `UPDATE policy_decode_status
             SET "fieldMap"        = $2::jsonb,
                 "projectFieldMap" = $3::jsonb,
                 "projectGeoKey"   = $4,
                 "projectGeoSection" = $5,
                 "projectSchemaId" = $6,
                 "updatedAt"       = now()
             WHERE "policyTopicId" = $1`,
            [
                policyTopicId,
                JSON.stringify(mergedFieldMap),
                projectFieldMap !== null ? JSON.stringify(projectFieldMap) : null,
                projectGeoKey,
                projectGeoSection,
                projectSchemaId,
            ],
        );

        this.logger.log(
            `Updated fieldMap for policyTopicId=${policyTopicId} ` +
            `(${Object.keys(body.fieldMap).length} key(s) merged). ` +
            `projectSchemaId=${projectSchemaId ?? 'none'}`,
        );

        // ── Return the refreshed decoded response ────────────────────────────────
        const repo = new PgPolicySchemaRepository(ds);
        const row = await repo.findDecoded(methodologyId);
        if (!row) {
            // Should never happen — we just wrote to the table.
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

    // ---------------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------------

    /**
     * Resolves the policy topic ID for a methodology given its URL `id` param.
     *
     * The URL param is the methodology's `relatedTopicId` (instance topic). The
     * policy_decode_status table is keyed on `businessData->>'topicId'` (policy topic).
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

