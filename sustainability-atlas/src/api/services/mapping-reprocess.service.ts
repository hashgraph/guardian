import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import { NetworkDataSourceRegistry } from '../database/network-datasource.registry';
import { QueueRegistry } from '../queues/queue.registry';
import { BASE_QUEUE_NAMES } from '@shared/config/bullmq.config';
import { PolicyDecodeJobData } from '@worker/processors/policy-decode.processor';
import { ProjectReparseJobData } from '@worker/processors/project-reparse.processor';
import { PROJECT_EXTRACT_FIELDS } from '@worker/project-mapper/project-fields';
import { UpdateMappingDto } from '../dto/update-mapping.dto';
import { DecodedMethodologyResponseDto } from '../dto/decoded-methodology.dto';
import { MappingAuditEntryDto, MappingAuditQueryDto, PaginatedMappingAuditDto } from '../dto/mapping-audit.dto';
import { PgPolicySchemaRepository } from '../repositories/pg-policy-schema.repository';
import { buildPolicyWorkflowGraph, PolicyWorkflowGraph } from './policy-graph.builder';
import { bareUuid, buildVcTitleMaps, detectMrvLayout, structureVcData } from '@shared/vc-detail/vc-detail.decoder';
import type { MrvSchemaLayout } from '@shared/vc-detail/vc-detail.decoder';
import { MrvDataQueryDto, MrvDataResponseDto } from '../dto/mrv-data.dto';
import type { VcDocData, VcTitleMaps } from '@shared/vc-detail/vc-detail.types';
import { AdditionalDetailsSchemaDto } from '../dto/additional-details.dto';
import { SystemDataSource } from '../database/system-database.module';
import { AuditLog } from '@shared/entities/auth/audit-log.entity';
import type { AuthenticatedUser } from '../auth/auth.types';

// ---------------------------------------------------------------------------
// Internal row shapes
// ---------------------------------------------------------------------------

interface PolicyRow {
    id: string;
    policyTopicId: string;
    sourceCid: string;
    decodeStatus: string;
    policyMapping: Record<string, unknown> | null;
    instanceTopicId?: string | null;
    rawSchemaJson?: Record<string, unknown> | null;
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
        private readonly systemDataSource: SystemDataSource,
    ) {}

    private async audit(
        action: string,
        actor: AuthenticatedUser,
        network: string,
        targetId: string,
        detail?: Record<string, unknown>,
    ): Promise<void> {
        try {
            const repo = this.systemDataSource.getRepository(AuditLog);
            await repo.save(repo.create({
                action,
                outcome: 'success',
                actorUserId: actor.id,
                targetType: 'policy',
                targetId,
                network,
                ip: null,
                userAgent: null,
                detail: detail ?? null,
            }));
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.error(`audit_log write failed [action=${action}]: ${msg}`);
        }
    }

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
     *
     * `instanceTopicId` must be resolved (from the Instance-Policy message's
     * `options.instanceTopicId` — the same source message-process.processor.ts
     * uses on first decode — falling back to the existing policy row) and
     * passed through in jobData. PolicyDecodeProcessor.runDecode
     * unconditionally writes `job.data.instanceTopicId ?? null` back onto the
     * policy row, so omitting it here would null out a previously-valid
     * value. That then propagates into every project's
     * `businessData.instanceTopicId` on the next reparse, zeroing
     * mv_methodology_stats.instance_project_count and breaking the
     * Methodology link on the project detail page. Deriving it from the
     * message (rather than only the policy row) also lets a re-decode
     * self-heal a methodology that already got nulled out by this bug.
     */
    async redecodePolicy(
        network: string,
        methodologyId: string,
    ): Promise<{ enqueued: boolean; jobId?: string }> {
        const ds = this.dataSources.getDataSource(network);
        const resolved = await this.resolvePolicyVersion(network, methodologyId);
        const { id: policyId, policyTopicId, sourceCid, instanceTopicId } = resolved;

        await ds.query(
            `UPDATE policy
             SET "decodeStatus" = 'pending',
                 attempts        = 0,
                 "policyMapping" = NULL,
                 "schemaFields"  = NULL,
                 "mappingSource" = 'auto',
                 error           = NULL,
                 "updatedAt"     = now()
             WHERE id = $1`,
            [policyId],
        );

        // Recover the original message timestamp (and instanceTopicId, straight from
        // the source message rather than the policy row) for the publish-policy
        // message so the processor can locate the correct source in the message table.
        const msgRows: Array<{ consensusTimestamp: string; instanceTopicId: string | null }> = await ds.query(
            instanceTopicId
                ? `SELECT "consensusTimestamp", options->>'instanceTopicId' AS "instanceTopicId"
                   FROM message
                   WHERE type = 'Instance-Policy'
                     AND action = 'publish-policy'
                     AND "topicId" = $1
                     AND options->>'instanceTopicId' = $2
                   ORDER BY "consensusTimestamp" DESC
                   LIMIT 1`
                : `SELECT "consensusTimestamp", options->>'instanceTopicId' AS "instanceTopicId"
                   FROM message
                   WHERE type = 'Instance-Policy'
                     AND action = 'publish-policy'
                     AND "topicId" = $1
                   ORDER BY "consensusTimestamp" DESC
                   LIMIT 1`,
            instanceTopicId ? [policyTopicId, instanceTopicId] : [policyTopicId],
        );

        const messageTimestamp = msgRows[0]?.consensusTimestamp ?? '0.0';

        const jobData: PolicyDecodeJobData = {
            cid: sourceCid,
            messageTimestamp,
            policyTopicId,
            instanceTopicId: msgRows[0]?.instanceTopicId ?? instanceTopicId,
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
        const resolved = await this.resolvePolicyVersion(network, methodologyId);
        const { policyTopicId, instanceTopicId, decodeStatus } = resolved;

        if (decodeStatus !== 'decoded') {
            this.logger.log(
                `reparseProjects skipped for policyTopicId=${policyTopicId} ` +
                `instanceTopicId=${instanceTopicId ?? ''}: decodeStatus=${decodeStatus} (must be "decoded")`,
            );
            return { enqueued: 0 };
        }

        if (!instanceTopicId) {
            this.logger.warn(
                `reparseProjects skipped for policyTopicId=${policyTopicId}: decodeStatus is "decoded" ` +
                `but instanceTopicId is unknown. Run redecode for this version first to self-heal it.`,
            );
            return { enqueued: 0 };
        }

        // Collect VC-Documents by walking the SPECIFIC VERSION's topic subtree
        // (rooted at instanceTopicId, not the shared policyTopicId), rather
        // than joining on message.policyId = policy.policyId. Those two
        // columns are stamped independently — policy.policyId comes from
        // policy.json's id (or a legacy policyTag when absent), while
        // message.policyId is the VC's own credentialSubject.policyId,
        // stamped later by the IPFS-fetch processor — and can diverge for
        // legacy policies, silently matching zero rows here. This reuses the
        // same topic-subtree pattern established in
        // sync-scheduler.service.ts:backfillSuccessfulPolicyVcFetches and
        // queue-status.controller.ts's topic-tree filter, decoupling VC
        // selection from policy.policyId entirely.
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
             WHERE m.type = 'VC-Document' AND m.documents IS NOT NULL`,
            [instanceTopicId],
        );

        const queue = this.queueRegistry.getQueue(network, BASE_QUEUE_NAMES.PROJECT_REPARSE);

        const BULK_CHUNK = 500;
        const stamp = Date.now();
        let enqueued = 0;
        for (let i = 0; i < vcRows.length; i += BULK_CHUNK) {
            const jobs = vcRows.slice(i, i + BULK_CHUNK).map((row, j) => ({
                name: 'reparse',
                data: { messageConsensusTimestamp: row.consensusTimestamp } as ProjectReparseJobData,
                opts: { jobId: `project-reparse-${row.consensusTimestamp}-${stamp}-${i + j}` },
            }));
            await queue.addBulk(jobs);
            enqueued += jobs.length;
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
            `UPDATE policy
             SET "decodeStatus" = 'pending',
                 attempts        = 0,
                 "policyMapping" = NULL,
                 "schemaFields"  = NULL,
                 "mappingSource" = 'auto',
                 error           = NULL,
                 "updatedAt"     = now()
             WHERE "decodeStatus" = 'decoded'
             RETURNING "policyTopicId", "instanceTopicId", "sourceCid"`,
        );

        const queue = this.queueRegistry.getQueue(network, BASE_QUEUE_NAMES.POLICY_DECODE);

        let enqueued = 0;
        let skipped = 0;

        for (const row of policyRows) {
            try {
                // instanceTopicId read from the message (options->>'instanceTopicId'),
                // not just the policy row, so this also self-heals a policy whose
                // column was previously nulled by the same bug this guards against
                // in redecodePolicy() above.
                const msgRows: Array<{ consensusTimestamp: string; instanceTopicId: string | null }> = await ds.query(
                    row.instanceTopicId
                        ? `SELECT "consensusTimestamp", options->>'instanceTopicId' AS "instanceTopicId"
                           FROM message
                           WHERE type = 'Instance-Policy'
                             AND action = 'publish-policy'
                             AND "topicId" = $1
                             AND options->>'instanceTopicId' = $2
                           ORDER BY "consensusTimestamp" DESC
                           LIMIT 1`
                        : `SELECT "consensusTimestamp", options->>'instanceTopicId' AS "instanceTopicId"
                           FROM message
                           WHERE type = 'Instance-Policy'
                             AND action = 'publish-policy'
                             AND "topicId" = $1
                           ORDER BY "consensusTimestamp" DESC
                           LIMIT 1`,
                    row.instanceTopicId ? [row.policyTopicId, row.instanceTopicId] : [row.policyTopicId],
                );

                const jobData: PolicyDecodeJobData = {
                    cid: row.sourceCid,
                    messageTimestamp: msgRows[0]?.consensusTimestamp ?? '0.0',
                    policyTopicId: row.policyTopicId,
                    instanceTopicId: msgRows[0]?.instanceTopicId ?? row.instanceTopicId,
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

        const rows: Array<{ instance_topic: string }> = await ds.query(
            `SELECT DISTINCT bv."relatedTopicId" AS instance_topic
             FROM business_view bv
             WHERE bv."viewType" = 'METHODOLOGY'
               AND bv."relatedTopicId" IS NOT NULL`,
        );

        let succeeded = 0;
        let skipped = 0;
        let enqueued = 0;

        for (const row of rows) {
            try {
                const result = await this.reparseProjects(network, row.instance_topic);
                if (result.enqueued > 0) {
                    succeeded++;
                    enqueued += result.enqueued;
                } else {
                    skipped++;
                }
            } catch (err) {
                skipped++;
                this.logger.warn(
                    `reparseAllProjects: skipped instanceTopicId=${row.instance_topic}: ` +
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
        actor: AuthenticatedUser,
    ): Promise<DecodedMethodologyResponseDto> {
        const ds = this.dataSources.getDataSource(network);
        const resolved = await this.resolvePolicyVersion(network, methodologyId);
        const { id: policyId, policyTopicId } = resolved;

        const existingMapping = (resolved.policyMapping ?? {}) as Record<string, unknown[]>;

        // Snapshot which schemas are already classified as "the project schema"
        // BEFORE merging, so a manual field-level remap can't silently promote an
        // unrelated schema into that classification below — that reclassification
        // is what perturbs projectKey derivation (base-resolver.ts's
        // projectSchemaUuids()) on the next reparse and can turn an UPDATE into an
        // INSERT for the same logical project.
        const existingProjectSchemaIris = new Set<string>();
        for (const entries of Object.values(existingMapping)) {
            if (!Array.isArray(entries)) continue;
            for (const entry of entries) {
                if (entry && typeof entry === 'object' &&
                    (entry as Record<string, unknown>)['isProjectSchema'] === true &&
                    typeof (entry as Record<string, unknown>)['schemaIri'] === 'string') {
                    existingProjectSchemaIris.add((entry as Record<string, unknown>)['schemaIri'] as string);
                }
            }
        }

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

        // ── Known schema IRIs for THIS version's own row ─────────────────────────
        // Needed up front because Guardian schema IRIs contain dots
        // (`#uuid&1.0.0`), so we can't split `schemaIri.fieldPath` with a naive
        // indexOf('.') — we match against the known IRI set longest-first.
        const rawSchemaJson = (resolved.rawSchemaJson ?? {}) as Record<string, unknown>;
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
                // Preserve the existing classification instead of always forcing
                // true — this field-mapping editor picks a FIELD, it shouldn't
                // silently reclassify which schema is "the project schema" for
                // dedup-key resolution (see snapshot above).
                isProjectSchema: existingProjectSchemaIris.has(parsed.schemaIri),
                score: 999,
            };
            const filtered = existing.filter(e => {
                if (!e || typeof e !== 'object') return false;
                const schemaType = (e as Record<string, unknown>)['schemaType'];
                return schemaType === 'mintToken' || schemaType === 'standardRegistry';
            });

            mergedMapping[fieldKey] = [manualEntry, ...filtered];
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
             "mappingSource" = 'manual',
             "updatedAt"     = now()
         WHERE id = $1`,
            [policyId, JSON.stringify(mergedMapping)],
        );

        this.logger.log(
            `Updated policyMapping for policyTopicId=${policyTopicId} (id=${policyId}) ` +
            `(${Object.keys(body.fieldMap).length} key(s) merged).`,
        );

        await this.audit('methodology.mapping.update', actor, network, policyTopicId, {
            labels: Object.keys(body.fieldMap),
            fieldMap: body.fieldMap,
            actorEmail: actor.email,
        });

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
     * Lists recent manual field-mapping edits for a methodology, newest first,
     * paginated. Reads the shared `audit_log` table (system DB) — the same
     * table used by auth/admin-user actions — filtered to this policy's
     * 'methodology.mapping.update' entries.
     */
    async getMappingAudit(
        network: string,
        methodologyId: string,
        query: MappingAuditQueryDto,
    ): Promise<PaginatedMappingAuditDto> {
        const policyTopicId = await this.resolvePolicyTopicId(network, methodologyId);
        const page = query.page ?? 1;
        const limit = query.limit ?? 10;

        const repo = this.systemDataSource.getRepository(AuditLog);
        const [rows, total] = await repo.findAndCount({
            where: {
                action: 'methodology.mapping.update',
                targetType: 'policy',
                targetId: policyTopicId,
            },
            order: { createdAt: 'DESC' },
            skip: (page - 1) * limit,
            take: limit,
        });

        const data = rows.map(row => {
            const detail = (row.detail ?? {}) as { labels?: unknown; actorEmail?: unknown };
            return {
                id: row.id,
                actorEmail: typeof detail.actorEmail === 'string' ? detail.actorEmail : 'unknown',
                changedLabels: Array.isArray(detail.labels) ? detail.labels.filter((l): l is string => typeof l === 'string') : [],
                createdAt: row.createdAt.toISOString(),
            } satisfies MappingAuditEntryDto;
        });

        return {
            data,
            meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
        };
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
        const projectRows: Array<{ projectKey: string | null; businessData: Record<string, unknown> | null }> = await ds.query(
            `SELECT "projectKey", "businessData"
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

        let isLinked = linkedVcs.some(
            v => typeof v['consensusTimestamp'] === 'string' && v['consensusTimestamp'] === consensusTimestamp,
        );

        // MintToken VCs are attributed via project_mint_link (the mint linker),
        // not businessData.linkedVcs — accept those too so issuance evidence is
        // viewable from the project namespace.
        if (!isLinked && projectRows[0].projectKey) {
            const mintRows: unknown[] = await ds.query(
                `SELECT 1 FROM project_mint_link
                 WHERE mint_consensus_timestamp = $1 AND project_key = $2
                 LIMIT 1`,
                [consensusTimestamp, projectRows[0].projectKey],
            );
            isLinked = mintRows.length > 0;
        }

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
     * Returns the project's "Detailed Information" — the decoded VC payloads
     * (fields/tables/groups, with human-readable titles) grouped by schema.
     *
     * Reads the precomputed `message.decodedDetails` (written at VC ingestion /
     * reparse). For VCs not yet backfilled (decodedDetails IS NULL) it decodes
     * on the fly from the raw document so the response is always correct. The
     * MintToken schema is excluded (issuance evidence is shown elsewhere).
     */
    async getAdditionalDetails(network: string, projectId: string): Promise<AdditionalDetailsSchemaDto[]> {
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
        const linkedVcsRaw = Array.isArray(businessData['linkedVcs'])
            ? (businessData['linkedVcs'] as Array<Record<string, unknown>>)
            : [];

        // Normalise to { consensusTimestamp, schemaUuid (bare) }, preserving order
        // and dropping MintToken / malformed entries.
        const vcEntries = linkedVcsRaw
            .map(v => ({
                consensusTimestamp: typeof v['consensusTimestamp'] === 'string' ? v['consensusTimestamp'] : '',
                schemaUuid: bareUuid(typeof v['schemaUuid'] === 'string' ? v['schemaUuid'] : ''),
            }))
            .filter(v => v.consensusTimestamp && v.schemaUuid && v.schemaUuid !== 'MintToken');
        if (vcEntries.length === 0) return [];

        // Resolve schema metadata (name + docType, keyed by bare UUID) and the
        // title maps for the on-the-fly fallback — all from the project's policy.
        const policyTopicId = typeof businessData['policyTopicId'] === 'string'
            ? (businessData['policyTopicId'] as string)
            : null;
        const schemaNameByUuid = new Map<string, string | null>();
        const docTypeByUuid = new Map<string, string>();
        let titleMaps: VcTitleMaps | null = null;
        if (policyTopicId) {
            const policyRows: Array<{ rawSchemaJson: Record<string, unknown> | null; policyMapping: Record<string, unknown> | null }> =
                await ds.query(
                    `SELECT "rawSchemaJson", "policyMapping"
                     FROM policy
                     WHERE "policyTopicId" = $1 AND "decodeStatus" = 'decoded'
                     LIMIT 1`,
                    [policyTopicId],
                );
            if (policyRows.length > 0) {
                const rawSchemaJson = (policyRows[0].rawSchemaJson ?? {}) as Record<string, unknown>;
                const policyMapping = (policyRows[0].policyMapping ?? {}) as Record<string, unknown>;

                const docTypeByIri = new Map<string, string>();
                for (const entries of Object.values(policyMapping)) {
                    if (!Array.isArray(entries)) continue;
                    for (const entry of entries) {
                        if (!entry || typeof entry !== 'object') continue;
                        const e = entry as Record<string, unknown>;
                        if (typeof e['schemaIri'] === 'string' && typeof e['docType'] === 'string') {
                            docTypeByIri.set(e['schemaIri'] as string, e['docType'] as string);
                        }
                    }
                }
                for (const [iri, schemaDoc] of Object.entries(rawSchemaJson)) {
                    const uuid = bareUuid(iri);
                    const doc = (schemaDoc ?? {}) as Record<string, unknown>;
                    schemaNameByUuid.set(uuid, typeof doc['name'] === 'string' ? (doc['name'] as string) : null);
                    const dt = docTypeByIri.get(iri);
                    if (dt) docTypeByUuid.set(uuid, dt);
                }
                titleMaps = buildVcTitleMaps(rawSchemaJson);
            }
        }

        // Batch-read the decoded payloads (and raw documents for the fallback).
        const timestamps = vcEntries.map(v => v.consensusTimestamp);
        const msgRows: Array<{ consensusTimestamp: string; decodedDetails: VcDocData | null; documents: Record<string, unknown> | null }> =
            await ds.query(
                `SELECT "consensusTimestamp", "decodedDetails", documents
                 FROM message
                 WHERE "consensusTimestamp" = ANY($1::varchar[])`,
                [timestamps],
            );
        const byTs = new Map(msgRows.map(r => [r.consensusTimestamp, r]));

        // Group records by schema, preserving linkedVcs order.
        const groups = new Map<string, VcDocData[]>();
        for (const entry of vcEntries) {
            const row = byTs.get(entry.consensusTimestamp);
            let record: VcDocData | null = row?.decodedDetails ?? null;
            if (!record && row?.documents && titleMaps) {
                // Fallback: decode live for un-backfilled VCs.
                try {
                    const credentialSubject = (row.documents as Record<string, unknown>)['credentialSubject'];
                    const cs = Array.isArray(credentialSubject)
                        ? (credentialSubject[0] as Record<string, any>)
                        : (credentialSubject as Record<string, any> | undefined);
                    if (cs) record = structureVcData(cs, entry.schemaUuid, titleMaps);
                } catch {
                    // ignore — fall through to empty record
                }
            }
            if (!record) record = { fields: [], tables: [], groups: [] };
            const existing = groups.get(entry.schemaUuid);
            if (existing) existing.push(record);
            else groups.set(entry.schemaUuid, [record]);
        }

        return Array.from(groups.entries()).map(([schemaUuid, records]) => ({
            schemaUuid,
            schemaName: schemaNameByUuid.get(schemaUuid) ?? null,
            docType: docTypeByUuid.get(schemaUuid) ?? 'unknown',
            records,
        }));
    }

    /**
     * Returns one page of a real, server-paginated table over an
     * externalDataBlock-bound (MRV) schema's VC records — the "MRV External
     * Data" table view. Unlike getAdditionalDetails (which decodes and returns
     * every linked VC for every schema in one payload — fine for a handful of
     * human-submitted documents, unworkable for pushed/IoT MRV datasets that
     * can run to hundreds of thousands of records), this queries `message`
     * directly with SQL-level filtering/sorting/pagination, scoped to the
     * project's own instance topic (indexed via IDX_fd91b8cf96c0f01a20e3079838
     * on (type, "topicId")) so the working set stays bounded to this project's
     * own records regardless of how large the whole `message` table is.
     */
    async getMrvData(
        network: string,
        projectId: string,
        schemaUuid: string,
        query: MrvDataQueryDto,
    ): Promise<MrvDataResponseDto> {
        const ds = this.dataSources.getDataSource(network);
        const bareSchemaUuid = bareUuid(schemaUuid);
        const page = query.page ?? 1;
        const limit = query.limit ?? 50;
        const sortDir = query.sortDir === 'asc' ? 'ASC' : 'DESC';

        const empty: MrvDataResponseDto = {
            schemaUuid: bareSchemaUuid, schemaName: null, columns: [], rows: [],
            total: 0, page, limit, devices: [], dateColumnKey: null, flattened: false,
        };

        const projectRows: Array<{ relatedTopicId: string | null; businessData: Record<string, unknown> | null }> = await ds.query(
            `SELECT "relatedTopicId", "businessData"
             FROM business_view
             WHERE "viewType" = 'PROJECT'
               AND ("sourceTimestamp" = $1 OR "projectKey" = $1)
             LIMIT 1`,
            [projectId],
        );
        if (projectRows.length === 0) {
            throw new NotFoundException(`Project with ID "${projectId}" not found on ${network}.`);
        }
        const topicId = projectRows[0].relatedTopicId;
        const businessData = projectRows[0].businessData ?? {};
        const policyTopicId = typeof businessData['policyTopicId'] === 'string' ? (businessData['policyTopicId'] as string) : null;
        if (!topicId || !policyTopicId) return empty;

        const policyRows: Array<{ rawSchemaJson: Record<string, unknown> | null }> = await ds.query(
            `SELECT "rawSchemaJson" FROM policy WHERE "policyTopicId" = $1 AND "decodeStatus" = 'decoded' LIMIT 1`,
            [policyTopicId],
        );
        const rawSchemaJson = (policyRows[0]?.rawSchemaJson ?? {}) as Record<string, any>;
        const layout = detectMrvLayout(rawSchemaJson, bareSchemaUuid);
        const schemaDocEntry = Object.entries(rawSchemaJson).find(([iri]) => bareUuid(iri) === bareSchemaUuid);
        const schemaName = typeof schemaDocEntry?.[1]?.['name'] === 'string' ? (schemaDocEntry[1]['name'] as string) : null;
        if (layout.columns.length === 0) return { ...empty, schemaName };

        if (layout.flattenDeviceItems && layout.deviceArrayKey) {
            return this.getFlattenedMrvData(ds, topicId, bareSchemaUuid, schemaName, layout, query, page, limit, sortDir);
        }

        // Base WHERE (topic + schema + optional device/date filters) and its own
        // dedicated params array — frozen once built, so every other query below
        // can safely append its own extra params after copying this array without
        // touching positions the WHERE clause's placeholders already point to.
        // Schema-derived keys (deviceArrayKey/deviceLabelKey/dateColumnKey) are
        // server-controlled, never user input, but parameterizing them anyway costs nothing.
        const filterParams: unknown[] = [topicId, bareSchemaUuid];
        let whereExtra = '';

        if (query.device && layout.deviceArrayKey && layout.deviceLabelKey) {
            filterParams.push(layout.deviceArrayKey, layout.deviceLabelKey, query.device);
            const arrIdx = filterParams.length - 2, keyIdx = filterParams.length - 1, valIdx = filterParams.length;
            whereExtra += ` AND EXISTS (
                SELECT 1 FROM jsonb_array_elements(COALESCE(documents->'credentialSubject'->0->$${arrIdx}, '[]'::jsonb)) b
                WHERE b->>$${keyIdx} = $${valIdx}
            )`;
        }

        if (layout.dateColumnKey && (query.from || query.to)) {
            filterParams.push(layout.dateColumnKey);
            const dateExpr = `(NULLIF(documents->'credentialSubject'->0->>$${filterParams.length}, ''))::timestamptz`;
            if (query.from) {
                filterParams.push(query.from);
                whereExtra += ` AND ${dateExpr} >= $${filterParams.length}::timestamptz`;
            }
            if (query.to) {
                filterParams.push(query.to);
                whereExtra += ` AND ${dateExpr} <= $${filterParams.length}::timestamptz`;
            }
        }

        const baseWhere = `"topicId" = $1 AND type = 'VC-Document'
            AND split_part(documents->'credentialSubject'->0->>'type', '&', 1) = $2${whereExtra}`;

        // Data query: own params array copied from filterParams, then column
        // selects, an optional device-summary subselect, sort key, limit/offset —
        // each appended (and referenced) against this query's own copy only.
        const dataParams = [...filterParams];
        const colSelects = layout.columns.map((c) => {
            dataParams.push(c.key);
            return `documents->'credentialSubject'->0->>$${dataParams.length} AS "col_${dataParams.length}"`;
        });
        const colIndexes = layout.columns.map((_c, i) => dataParams.length - layout.columns.length + i + 1);

        let deviceSelect = '';
        if (layout.deviceArrayKey && layout.deviceLabelKey) {
            dataParams.push(layout.deviceArrayKey, layout.deviceLabelKey);
            const arrIdx = dataParams.length - 1, keyIdx = dataParams.length;
            deviceSelect = `, (SELECT string_agg(DISTINCT b->>$${keyIdx}, ', ')
                FROM jsonb_array_elements(COALESCE(documents->'credentialSubject'->0->$${arrIdx}, '[]'::jsonb)) b) AS device_label`;
        }

        const sortCol = layout.columns.find((c) => c.key === query.sortBy) ?? layout.columns.find((c) => c.key === layout.dateColumnKey);
        let orderBy = `"consensusTimestamp" ${sortDir}`;
        if (sortCol) {
            dataParams.push(sortCol.key);
            orderBy = `documents->'credentialSubject'->0->>$${dataParams.length} ${sortDir}`;
        }

        dataParams.push(limit, (page - 1) * limit);
        const limitIdx = dataParams.length - 1, offsetIdx = dataParams.length;

        // Devices list: same topic/schema/date scope, deliberately WITHOUT the
        // device filter itself (own params array, not baseWhere/filterParams) —
        // the dropdown must always offer every option, independent of the
        // currently-selected device.
        let devicePromise: Promise<Array<{ device: string }>> = Promise.resolve([]);
        if (layout.deviceArrayKey && layout.deviceLabelKey) {
            const dateOnlyWhereBase = `"topicId" = $1 AND type = 'VC-Document'
                AND split_part(documents->'credentialSubject'->0->>'type', '&', 1) = $2`;
            const dateOnlyParams: unknown[] = [topicId, bareSchemaUuid];
            let dateOnlyWhere = '';
            if (layout.dateColumnKey && (query.from || query.to)) {
                dateOnlyParams.push(layout.dateColumnKey);
                const dateExpr = `(NULLIF(documents->'credentialSubject'->0->>$${dateOnlyParams.length}, ''))::timestamptz`;
                if (query.from) {
                    dateOnlyParams.push(query.from);
                    dateOnlyWhere += ` AND ${dateExpr} >= $${dateOnlyParams.length}::timestamptz`;
                }
                if (query.to) {
                    dateOnlyParams.push(query.to);
                    dateOnlyWhere += ` AND ${dateExpr} <= $${dateOnlyParams.length}::timestamptz`;
                }
            }
            dateOnlyParams.push(layout.deviceLabelKey, layout.deviceArrayKey);
            const keyIdx = dateOnlyParams.length - 1, arrIdx = dateOnlyParams.length;
            devicePromise = ds.query(
                `SELECT DISTINCT b->>$${keyIdx} AS device
                 FROM message, jsonb_array_elements(COALESCE(documents->'credentialSubject'->0->$${arrIdx}, '[]'::jsonb)) b
                 WHERE ${dateOnlyWhereBase}${dateOnlyWhere} AND b->>$${keyIdx} IS NOT NULL
                 ORDER BY 1
                 LIMIT 200`,
                dateOnlyParams,
            );
        }

        const [countRows, dataRows, deviceRows] = await Promise.all([
            ds.query(`SELECT COUNT(*)::int AS total FROM message WHERE ${baseWhere}`, filterParams),
            ds.query(
                `SELECT "consensusTimestamp", ${colSelects.join(', ')}${deviceSelect}
                 FROM message
                 WHERE ${baseWhere}
                 ORDER BY ${orderBy}
                 LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
                dataParams,
            ),
            devicePromise,
        ]);

        const rows = dataRows.map((r: Record<string, unknown>) => {
            const values: Record<string, string> = {};
            layout.columns.forEach((c, i) => { values[c.key] = (r[`col_${colIndexes[i]}`] as string | null) ?? ''; });
            return {
                consensusTimestamp: r['consensusTimestamp'] as string,
                values,
                device: (r['device_label'] as string | null) || null,
            };
        });

        return {
            schemaUuid: bareSchemaUuid,
            schemaName,
            columns: layout.columns.map((c) => ({ key: c.key, label: c.label, description: c.description, isDate: c.isDate })),
            rows,
            total: countRows[0]?.total ?? 0,
            page,
            limit,
            devices: (deviceRows as Array<{ device: string }>).map((d) => d.device),
            dateColumnKey: layout.dateColumnKey,
            flattened: false,
        };
    }

    /**
     * Flattened variant of getMrvData for schemas with no top-level scalar fields
     * (detectMrvLayout set flattenDeviceItems) — one row per device-array ITEM
     * rather than one row per VC, via `jsonb_array_elements(...) WITH ORDINALITY`
     * directly in the FROM clause so a single set-returning join gives correct
     * SQL-level pagination/sort/filter over the flattened rows.
     */
    private async getFlattenedMrvData(
        ds: DataSource,
        topicId: string,
        bareSchemaUuid: string,
        schemaName: string | null,
        layout: MrvSchemaLayout,
        query: MrvDataQueryDto,
        page: number,
        limit: number,
        sortDir: 'ASC' | 'DESC',
    ): Promise<MrvDataResponseDto> {
        const deviceArrayKey = layout.deviceArrayKey!;

        // Base WHERE + its own dedicated params array (topic + schema + optional
        // device/date filters, all applied to the flattened item `t.item`, not the
        // outer VC document) — frozen once built, exactly like the record-mode path.
        const filterParams: unknown[] = [topicId, bareSchemaUuid, deviceArrayKey];
        let whereExtra = '';

        if (query.device && layout.deviceLabelKey) {
            filterParams.push(layout.deviceLabelKey, query.device);
            whereExtra += ` AND t.item->>$${filterParams.length - 1} = $${filterParams.length}`;
        }
        if (layout.dateColumnKey && (query.from || query.to)) {
            filterParams.push(layout.dateColumnKey);
            const dateExpr = `(NULLIF(t.item->>$${filterParams.length}, ''))::timestamptz`;
            if (query.from) {
                filterParams.push(query.from);
                whereExtra += ` AND ${dateExpr} >= $${filterParams.length}::timestamptz`;
            }
            if (query.to) {
                filterParams.push(query.to);
                whereExtra += ` AND ${dateExpr} <= $${filterParams.length}::timestamptz`;
            }
        }

        const fromClause = `FROM message m,
            jsonb_array_elements(m.documents->'credentialSubject'->0->$3) WITH ORDINALITY AS t(item, idx)`;
        const baseWhere = `m."topicId" = $1 AND m.type = 'VC-Document'
            AND split_part(m.documents->'credentialSubject'->0->>'type', '&', 1) = $2${whereExtra}`;

        const dataParams = [...filterParams];
        const colSelects = layout.columns.map((c) => {
            dataParams.push(c.key);
            return `t.item->>$${dataParams.length} AS "col_${dataParams.length}"`;
        });
        const colIndexes = layout.columns.map((_c, i) => dataParams.length - layout.columns.length + i + 1);

        let deviceSelect = '';
        if (layout.deviceLabelKey) {
            dataParams.push(layout.deviceLabelKey);
            deviceSelect = `, t.item->>$${dataParams.length} AS device_label`;
        }

        const sortCol = layout.columns.find((c) => c.key === query.sortBy) ?? layout.columns.find((c) => c.key === layout.dateColumnKey);
        let orderBy = 'm."consensusTimestamp" ' + sortDir + ', t.idx ASC';
        if (sortCol) {
            dataParams.push(sortCol.key);
            orderBy = `t.item->>$${dataParams.length} ${sortDir}`;
        }

        dataParams.push(limit, (page - 1) * limit);
        const limitIdx = dataParams.length - 1, offsetIdx = dataParams.length;

        let devicePromise: Promise<Array<{ device: string }>> = Promise.resolve([]);
        if (layout.deviceLabelKey) {
            const dateOnlyParams: unknown[] = [topicId, bareSchemaUuid, deviceArrayKey];
            let dateOnlyWhere = '';
            if (layout.dateColumnKey && (query.from || query.to)) {
                dateOnlyParams.push(layout.dateColumnKey);
                const dateExpr = `(NULLIF(t.item->>$${dateOnlyParams.length}, ''))::timestamptz`;
                if (query.from) {
                    dateOnlyParams.push(query.from);
                    dateOnlyWhere += ` AND ${dateExpr} >= $${dateOnlyParams.length}::timestamptz`;
                }
                if (query.to) {
                    dateOnlyParams.push(query.to);
                    dateOnlyWhere += ` AND ${dateExpr} <= $${dateOnlyParams.length}::timestamptz`;
                }
            }
            dateOnlyParams.push(layout.deviceLabelKey);
            const keyIdx = dateOnlyParams.length;
            devicePromise = ds.query(
                `SELECT DISTINCT t.item->>$${keyIdx} AS device
                 ${fromClause}
                 WHERE m."topicId" = $1 AND m.type = 'VC-Document'
                   AND split_part(m.documents->'credentialSubject'->0->>'type', '&', 1) = $2${dateOnlyWhere}
                   AND t.item->>$${keyIdx} IS NOT NULL
                 ORDER BY 1
                 LIMIT 200`,
                dateOnlyParams,
            );
        }

        const [countRows, dataRows, deviceRows] = await Promise.all([
            ds.query(`SELECT COUNT(*)::int AS total ${fromClause} WHERE ${baseWhere}`, filterParams),
            ds.query(
                `SELECT m."consensusTimestamp", t.idx::int AS item_index, ${colSelects.join(', ')}${deviceSelect}
                 ${fromClause}
                 WHERE ${baseWhere}
                 ORDER BY ${orderBy}
                 LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
                dataParams,
            ),
            devicePromise,
        ]);

        const rows = dataRows.map((r: Record<string, unknown>) => {
            const values: Record<string, string> = {};
            layout.columns.forEach((c, i) => { values[c.key] = (r[`col_${colIndexes[i]}`] as string | null) ?? ''; });
            return {
                consensusTimestamp: r['consensusTimestamp'] as string,
                itemIndex: r['item_index'] as number,
                values,
                device: (r['device_label'] as string | null) || null,
            };
        });

        return {
            schemaUuid: bareSchemaUuid,
            schemaName,
            columns: layout.columns.map((c) => ({ key: c.key, label: c.label, description: c.description, isDate: c.isDate })),
            rows,
            total: countRows[0]?.total ?? 0,
            page,
            limit,
            devices: (deviceRows as Array<{ device: string }>).map((d) => d.device),
            dateColumnKey: layout.dateColumnKey,
            flattened: true,
        };
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
     * Resolves the URL `:id` param (the version-specific instanceTopicId in
     * the normal case, or a bare policyTopicId for legacy/API callers) down
     * to the SPECIFIC policy row for that version — not just the shared
     * policyTopicId.
     *
     * `policy.policyTopicId` is shared across every published version of a
     * methodology (one row per version, disambiguated by instanceTopicId /
     * sourceCid — see docs/decode-flow.md). Every mutation must key on the
     * row `id` returned here, never on bare policyTopicId, or a write meant
     * for one version corrupts every sibling version sharing that topic.
     */
    private async resolvePolicyVersion(network: string, methodologyId: string): Promise<PolicyRow> {
        const ds = this.dataSources.getDataSource(network);

        const bvRows: Array<{
            policy_topic: string | null;
            instance_topic: string | null;
            source_timestamp: string | null;
        }> = await ds.query(
            `SELECT bv."businessData"->>'topicId' AS policy_topic,
                    bv."relatedTopicId" AS instance_topic,
                    bv."sourceTimestamp" AS source_timestamp
             FROM business_view bv
             WHERE bv."viewType" = 'METHODOLOGY'
               AND (bv."relatedTopicId" = $1 OR bv."businessData"->>'topicId' = $1)
             ORDER BY bv."sourceTimestamp"::numeric DESC NULLS LAST, bv.id DESC
             LIMIT 1`,
            [methodologyId],
        );

        if (bvRows.length === 0 || !bvRows[0].policy_topic) {
            throw new NotFoundException(
                `Methodology with ID "${methodologyId}" not found on ${network}.`,
            );
        }

        const { policy_topic: policyTopicId, instance_topic: instanceTopicId, source_timestamp: sourceTimestamp } = bvRows[0];

        // Primary match: the specific version's own instanceTopicId. Fallback
        // (instanceTopicId IS NULL on the policy row) covers a version whose
        // column hasn't been populated yet — or was previously nulled out by
        // the cross-version corruption bug this resolver exists to fix —
        // matched via the originating publish-policy message's CID so the
        // exact row can still be targeted directly to self-heal.
        const policyRows: PolicyRow[] = await ds.query(
            `SELECT p.id, p."policyTopicId", p."instanceTopicId", p."sourceCid",
                    p."decodeStatus", p."policyMapping", p."rawSchemaJson"
             FROM policy p
             WHERE p."policyTopicId" = $1
               AND (
                     p."instanceTopicId" = $2
                     OR (
                          p."instanceTopicId" IS NULL
                          AND $3::varchar IS NOT NULL
                          AND p."sourceCid" IN (
                              SELECT unnest(m.files) FROM message m
                              WHERE m."topicId" = $1 AND m."consensusTimestamp" = $3
                          )
                     )
                   )
             ORDER BY (p."instanceTopicId" IS NOT NULL) DESC, p."updatedAt" DESC NULLS LAST
             LIMIT 1`,
            [policyTopicId, instanceTopicId, sourceTimestamp],
        );

        if (policyRows.length === 0) {
            throw new NotFoundException(
                `No policy row for policy topic "${policyTopicId}" ` +
                `(instanceTopicId="${instanceTopicId ?? ''}") on ${network}. ` +
                `The policy must have been processed at least once before this operation.`,
            );
        }

        return policyRows[0];
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
             ORDER BY bv."sourceTimestamp"::numeric DESC NULLS LAST, bv.id DESC
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

