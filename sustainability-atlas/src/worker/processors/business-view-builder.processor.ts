import { Processor, WorkerHost, OnWorkerEvent } from "@nestjs/bullmq";
import { Inject, Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { DataSource } from "typeorm";
import Redis from "ioredis";
import { QUEUE_NAMES, getWorkerOptions } from "@shared/config/bullmq.config";
import { buildMintProjectLinks } from "../project-mapper/mint-project-linker";
import { linkSerialsToMints } from "../project-mapper/serial-mint-linker";

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

export interface BusinessViewBuildJobData {
    /**
     * Restrict this run to a single view type. Omitted = rebuild every type in
     * one statement (the original behaviour, kept for ad-hoc/manual triggers).
     *
     * Partitioning is what makes concurrency worth anything here. The conflict
     * key is ("sourceTimestamp", "viewType"), so two runs on different view
     * types touch disjoint rows and never contend — whereas two runs on the
     * SAME set are just duplicate work serialising on each other's row locks.
     */
    viewType?: string;
}

/**
 * Advisory-lock namespace for this processor. Two runs over the same partition
 * are always duplicate work: the statement rebuilds a whole partition, so the
 * second run recomputes what the first is already writing and then blocks on
 * its row locks for the full duration. The loser skips instead of piling up.
 */
const ADVISORY_LOCK_NAMESPACE = 0x62766275; // 'bvbu'

/** Stable small int per partition for the advisory lock's second key. */
const PARTITION_LOCK_KEYS: Record<string, number> = {
    ALL: 0,
    METHODOLOGY: 1,
    REGISTRY: 2,
    CREDIT: 3,
};

/**
 * The partitions the scheduler fans out to. Disjoint in the conflict key, so
 * they run genuinely in parallel — this is what the queue's concurrency is for.
 */
export const BUSINESS_VIEW_PARTITIONS = ['METHODOLOGY', 'REGISTRY', 'CREDIT'] as const;

@Processor(QUEUE_NAMES.BUSINESS_VIEW_BUILD, getWorkerOptions(QUEUE_NAMES.BUSINESS_VIEW_BUILD))
export class BusinessViewBuilderProcessor extends WorkerHost {
    private readonly logger = new Logger(BusinessViewBuilderProcessor.name);

    constructor(
        private readonly dataSource: DataSource,
        @Inject("REDICT_PUB") private readonly redis: Redis,
    ) {
        super();
    }

    async process(job: Job<BusinessViewBuildJobData>): Promise<void> {
        const partition = job.data?.viewType;

        if (partition && !(partition in PARTITION_LOCK_KEYS)) {
            throw new Error(`Unknown business-view partition: ${partition}`);
        }

        // Source message types feeding this partition. No partition = all of them.
        const sourceTypes = Object.entries(TYPE_MAPPINGS)
            .filter(([, viewType]) => !partition || viewType === partition)
            .map(([messageType]) => messageType);

        this.logger.log(
            `Building business views${partition ? ` (${partition})` : ""} from raw messages...`,
        );

        const caseClauses = Object.entries(TYPE_MAPPINGS)
            .filter(([, viewType]) => !partition || viewType === partition)
            .map(
                ([msgType, viewType]) =>
                    `WHEN m.type = '${msgType}' THEN '${viewType}'`,
            )
            .join(" ");
        const typeFilter = sourceTypes.map((t) => `'${t}'`).join(", ");

        // Advisory lock is session-scoped, so it has to be taken and released on
        // ONE pinned connection — dataSource.query() may hand back a different
        // pool member per call and the unlock would then target a session that
        // never held the lock.
        const runner = this.dataSource.createQueryRunner();
        await runner.connect();

        const lockKey = PARTITION_LOCK_KEYS[partition ?? "ALL"];
        const [{ locked }] = await runner.query(
            "SELECT pg_try_advisory_lock($1, $2) AS locked",
            [ADVISORY_LOCK_NAMESPACE, lockKey],
        );

        if (!locked) {
            await runner.release();
            this.logger.log(
                `Business view build${partition ? ` (${partition})` : ""} already running — skipping duplicate`,
            );
            return;
        }

        let result: { rowCount?: number; length?: number } | undefined;
        try {
            result = await runner.query(`
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
            -- Skip rows whose content is unchanged. Without this the statement
            -- rewrites every row on every run: each rewrite is a new tuple
            -- version, a dead tuple, a WAL record, and an update to every index
            -- whose partial predicate matches the row — around a dozen for these
            -- view types, three of them GIN (searchVector, and trigram indexes
            -- on displayName and searchText), which are the costly ones. That is
            -- what took a single run to ~2 hours and left ~3.8M dead tuples
            -- behind 67k live rows. When this predicate is false Postgres writes
            -- nothing at all.
            --
            -- "lastUpdate"/"updatedAt" are deliberately NOT compared: both are
            -- derived from now() and so always differ, which would make the
            -- guard vacuously true. The trade-off is that an unchanged row keeps
            -- its previous lastUpdate, which is the correct meaning anyway —
            -- nothing about it changed.
            WHERE business_view."displayName"
                      IS DISTINCT FROM COALESCE(EXCLUDED."displayName", business_view."displayName")
               OR business_view."registryDid"    IS DISTINCT FROM EXCLUDED."registryDid"
               OR business_view."relatedTopicId" IS DISTINCT FROM EXCLUDED."relatedTopicId"
               OR business_view."searchText"     IS DISTINCT FROM EXCLUDED."searchText"
               OR business_view."businessData"
                      IS DISTINCT FROM (business_view."businessData" || EXCLUDED."businessData")
        `);
        } finally {
            await runner.query("SELECT pg_advisory_unlock($1, $2)", [
                ADVISORY_LOCK_NAMESPACE, lockKey,
            ]);
            await runner.release();
        }

        const totalUpserted = result?.rowCount ?? result?.length ?? 0;

        // Mint/serial linking is global, not per-view-type, so it runs on the
        // unpartitioned job and on the CREDIT partition (the one whose rows the
        // links actually hang off) rather than three times per cycle.
        if (!partition || partition === "CREDIT") {
            await buildMintProjectLinks(this.dataSource, this.logger);
            await linkSerialsToMints(this.dataSource, this.logger);
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
