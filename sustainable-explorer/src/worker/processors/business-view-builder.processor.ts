import { Processor, WorkerHost, OnWorkerEvent } from "@nestjs/bullmq";
import { Inject, Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { DataSource } from "typeorm";
import Redis from "ioredis";
import { QUEUE_NAMES } from "@shared/config/bullmq.config";
import { buildProjectViewsGeojson } from "../project-mapper/geojson-heuristic.mapper";
import { buildProjectViewsPolicyBased } from "../project-mapper/policy-based.mapper";

/**
 * Mapping from HCS message types to business domain view types.
 *
 * Note on methodologies: Guardian publishes a draft "Policy" message and a
 * canonical "Instance-Policy" message (with action='PublishPolicy'). The
 * existing Guardian indexer treats Instance-Policy as the canonical
 * methodology entity. We mirror that here by mapping ONLY Instance-Policy
 * messages to METHODOLOGY view rows.
 *
 * Note on projects: VC-Document messages are NOT handled here. Project rows
 * are built separately in the project mapper because they require
 * multi-message aggregation, geo-coordinate deduplication, and methodology
 * resolution that cannot be expressed in a single INSERT … SELECT.
 */
const TYPE_MAPPINGS: Record<string, string> = {
    'Instance-Policy': 'METHODOLOGY',
    'Standard Registry': 'REGISTRY',
    'Token': 'CREDIT',
};

@Processor(QUEUE_NAMES.BUSINESS_VIEW_BUILD)
export class BusinessViewBuilderProcessor extends WorkerHost {
    private readonly logger = new Logger(BusinessViewBuilderProcessor.name);

    constructor(
        private readonly dataSource: DataSource,
        @Inject("REDICT_PUB") private readonly redis: Redis,
    ) {
        super();
    }

    async process(job: Job): Promise<void> {
        this.logger.log("Building business views from raw messages...");

        const caseClauses = Object.entries(TYPE_MAPPINGS)
            .map(
                ([msgType, viewType]) =>
                    `WHEN m.type = '${msgType}' THEN '${viewType}'`,
            )
            .join(" ");
        const typeFilter = Object.keys(TYPE_MAPPINGS)
            .map((t) => `'${t}'`)
            .join(", ");

        const result = await this.dataSource.query(`
            INSERT INTO business_view (
                "sourceTimestamp",
                "viewType",
                "displayName",
                "registryDid",
                "relatedTopicId",
                "businessData",
                "searchText",
                "lastUpdate",
                "createdAt",
                "updatedAt"
            )
            SELECT
                m."consensusTimestamp",
                CASE ${caseClauses} END,
                COALESCE(
                    m.options->>'name',
                    m.options->>'tokenName',
                    CASE WHEN m.type = 'Standard Registry' THEN (
                        SELECT vc.documents -> 'credentialSubject' -> 0 ->> 'OrganizationName'
                        FROM message vc
                        WHERE vc."topicId" = m.options->>'topicId'
                          AND vc.type = 'VC-Document'
                          AND vc.documents -> 'credentialSubject' -> 0 ->> 'OrganizationName' IS NOT NULL
                        ORDER BY vc."consensusTimestamp" DESC
                        LIMIT 1
                    ) END
                ),
                COALESCE(m.owner, m.options->>'did'),
                CASE
                    WHEN m.type = 'Instance-Policy' THEN m.options->>'instanceTopicId'
                    WHEN m.type = 'Token'           THEN m."topicId"
                    ELSE m.options->>'topicId'
                END,
                jsonb_build_object(
                    'description', m.options->>'description',
                    'status', m.status,
                    'topicId', m."topicId",
                    'tokenId', COALESCE(m.options->>'tokenId', tc."tokenId"),
                    'owner', m.owner,
                    'options', m.options,
                    'documents', m.documents
                ),
                -- searchText: concatenation of all searchable fields. Picked up
                -- by the searchVector tsvector generated column for full-text search.
                CONCAT_WS(' ',
                    m.options->>'name',
                    m.options->>'description',
                    m.options->>'tags',
                    m.options->>'geography',
                    m.options->>'law',
                    m.options->>'tokenName',
                    m.options->>'tokenSymbol',
                    m.owner
                ),
                EXTRACT(EPOCH FROM NOW())::bigint,
                NOW(),
                NOW()
            FROM message m
            LEFT JOIN token_cache tc
                ON tc."tokenId" = m.options->>'tokenId'
            WHERE m.type IN (${typeFilter})
              -- For Instance-Policy, only canonical 'publish-policy' actions
              -- count as a real methodology. Other types pass through.
              AND (m.type != 'Instance-Policy' OR m.action = 'publish-policy')
            ON CONFLICT ("sourceTimestamp", "viewType") DO UPDATE SET
                "displayName"    = COALESCE(EXCLUDED."displayName", business_view."displayName"),
                "registryDid"    = EXCLUDED."registryDid",
                "relatedTopicId" = EXCLUDED."relatedTopicId",
                "lastUpdate"     = EXCLUDED."lastUpdate",
                "updatedAt"      = NOW()
        `);

        const totalUpserted = result?.rowCount ?? result?.length ?? 0;

        // ── PROJECT MAPPING STRATEGY ───────────────────────────────────────────────
        // Switch between two project-mapping approaches by changing PROJECT_STRATEGY.
        //
        //  'geojson-heuristic'  — original approach: confirms the project schema by
        //                         finding the ONLY schema per methodology with a direct
        //                         GeoJSON field AND a name/title field (title only).
        //                         Stable; misses policies with opaque field titles
        //                         (e.g. VM0047) or array-type geo fields.
        //
        //  'policy-based'       — improved approach: checks title + description for
        //                         name-field detection, handles array-of-GeoJSON fields,
        //                         nested dict proponent values, and Shape-D lat/lng
        //                         string fallback (ISO14064).
        //
        const PROJECT_STRATEGY: 'geojson-heuristic' | 'policy-based' = 'policy-based';
        // ──────────────────────────────────────────────────────────────────────────

        if (PROJECT_STRATEGY === 'policy-based') {
            await buildProjectViewsPolicyBased(this.dataSource, this.logger);
        } else {
            await buildProjectViewsGeojson(this.dataSource, this.logger);
        }

        await this.redis.publish(
            "se:events",
            JSON.stringify({
                type: "business-views-updated",
                totalUpserted,
                timestamp: new Date().toISOString(),
            }),
        );

        this.logger.log(
            `Business views built: ${totalUpserted} records upserted`,
        );
    }

    @OnWorkerEvent("failed")
    onFailed(job: Job, error: Error): void {
        this.logger.error(
            `Business view builder job ${job.id} failed: ${error.message}`,
            error.stack,
        );
    }
}
