import { Processor, WorkerHost, OnWorkerEvent } from "@nestjs/bullmq";
import { Inject, Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { DataSource } from "typeorm";
import Redis from "ioredis";
import { QUEUE_NAMES } from "@shared/config/bullmq.config";
import { buildMintProjectLinks } from "../project-mapper/mint-project-linker";

/**
 * Builds METHODOLOGY / REGISTRY / CREDIT rows in business_view from raw
 * messages. PROJECT rows are NOT built here — they are produced eagerly by
 * ProjectMapperService.upsertProjectFromVc as each VC's IPFS document lands
 * in IpfsFetchProcessor.
 *
 * This processor only reshapes already-parsed messages into the frontend
 * view-model. It does no decoding.
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

    async process(_job: Job): Promise<void> {
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
                -- For Standard Registry rows, prefer the profile-topic VC's
                -- OrganizationName. Fall through to options.name (newly parsed),
                -- then to the raw attributes.OrganizationName / attributes.Tags
                -- for records parsed before the key-name fix.
                COALESCE(
                    sr_vc.cs ->> 'OrganizationName',
                    m.options->>'name',
                    m.options->'attributes'->>'OrganizationName',
                    m.options->'attributes'->>'name',
                    m.options->'attributes'->>'Tags',
                    m.options->'attributes'->>'tags',
                    m.options->>'tokenName'
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
                    'topicId', COALESCE(NULLIF(m.options->>'topicId', ''), m."topicId"),
                    'tokenId', COALESCE(m.options->>'tokenId', tc."tokenId"),
                    'owner', m.owner,
                    'options', m.options,
                    'documents', m.documents,
                    -- Registry-only fields. Profile VC wins; fall through to
                    -- newly-parsed options fields, then to raw attributes using
                    -- both Pascal (modern Guardian) and lowercase key names.
                    'geography', COALESCE(sr_vc.cs ->> 'Country', m.options->>'geography', m.options->'attributes'->>'Country', m.options->'attributes'->>'geography'),
                    'website',   COALESCE(sr_vc.cs ->> 'Website', m.options->>'website', m.options->'attributes'->>'Website'),
                    'law',       COALESCE(m.options->>'law', m.options->'attributes'->>'law'),
                    'tags',      COALESCE(m.options->>'tags', m.options->'attributes'->>'Tags', m.options->'attributes'->>'tags')
                ),
                -- searchText: concatenation of all searchable fields. Picked up
                -- by the searchVector tsvector generated column for full-text search.
                CONCAT_WS(' ',
                    COALESCE(m.options->>'name', m.options->'attributes'->>'OrganizationName', m.options->'attributes'->>'name', m.options->'attributes'->>'Tags', m.options->'attributes'->>'tags'),
                    m.options->>'description',
                    COALESCE(m.options->>'tags', m.options->'attributes'->>'Tags', m.options->'attributes'->>'tags'),
                    COALESCE(sr_vc.cs ->> 'Country', m.options->>'geography', m.options->'attributes'->>'Country', m.options->'attributes'->>'geography'),
                    COALESCE(m.options->>'law', m.options->'attributes'->>'law'),
                    m.options->>'tokenName',
                    m.options->>'tokenSymbol',
                    m.owner,
                    sr_vc.cs ->> 'OrganizationName',
                    COALESCE(sr_vc.cs ->> 'Website', m.options->>'website', m.options->'attributes'->>'Website')
                ),
                EXTRACT(EPOCH FROM NOW())::bigint,
                NOW(),
                NOW()
            FROM message m
            LEFT JOIN token_cache tc
                ON tc."tokenId" = m.options->>'tokenId'
            -- For Standard Registry rows, pull the latest VC-Document in the
            -- registry's profile topic. NULL when no VC has been fetched yet —
            -- the COALESCEs above degrade to inline options data in that case.
            LEFT JOIN LATERAL (
                SELECT vc.documents -> 'credentialSubject' -> 0 AS cs
                FROM message vc
                WHERE m.type = 'Standard Registry'
                  AND vc."topicId" = m.options->>'topicId'
                  AND vc.type = 'VC-Document'
                  AND vc.documents IS NOT NULL
                ORDER BY vc."consensusTimestamp" DESC
                LIMIT 1
            ) sr_vc ON true
            WHERE m.type IN (${typeFilter})
              -- For Instance-Policy, only canonical 'publish-policy' actions
              -- count as a real methodology. Other types pass through.
              AND (m.type != 'Instance-Policy' OR m.action = 'publish-policy')
            ON CONFLICT ("sourceTimestamp", "viewType") DO UPDATE SET
                "displayName"    = COALESCE(EXCLUDED."displayName", business_view."displayName"),
                "registryDid"    = EXCLUDED."registryDid",
                "relatedTopicId" = EXCLUDED."relatedTopicId",
                -- Merge new VC-sourced fields onto existing businessData so
                -- repeated rebuilds promote freshly-fetched profile-VC data
                -- without losing previously-set keys.
                "businessData"   = business_view."businessData" || EXCLUDED."businessData",
                "searchText"     = EXCLUDED."searchText",
                "lastUpdate"     = EXCLUDED."lastUpdate",
                "updatedAt"      = NOW()
        `);

        const totalUpserted = result?.rowCount ?? result?.length ?? 0;

        await buildMintProjectLinks(this.dataSource, this.logger);

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
