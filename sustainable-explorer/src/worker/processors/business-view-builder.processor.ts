import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';
import { QUEUE_NAMES } from '@shared/config/bullmq.config';

/**
 * Mapping from HCS message types to business domain view types.
 */
const TYPE_MAPPINGS: Record<string, string> = {
    'Policy': 'METHODOLOGY',
    'Standard Registry': 'REGISTRY',
    'Token': 'CREDIT',
    'VC-Document': 'PROJECT',
};

@Processor(QUEUE_NAMES.BUSINESS_VIEW_BUILD)
export class BusinessViewBuilderProcessor extends WorkerHost {
    private readonly logger = new Logger(BusinessViewBuilderProcessor.name);
    private readonly network: string;

    constructor(
        private readonly dataSource: DataSource,
        private readonly configService: ConfigService,
        @Inject('REDICT_PUB') private readonly redis: Redis,
    ) {
        super();
        this.network = this.configService.get<string>('app.hedera.network') || 'testnet';
    }

    async process(job: Job): Promise<void> {
        this.logger.log(`Building business views for ${this.network} network...`);

        const caseClauses = Object.entries(TYPE_MAPPINGS)
            .map(([msgType, viewType]) => `WHEN m.type = '${msgType}' THEN '${viewType}'`)
            .join(' ');
        const typeFilter = Object.keys(TYPE_MAPPINGS).map((t) => `'${t}'`).join(', ');

        const result = await this.dataSource.query(`
            INSERT INTO business_view (
                network,
                "sourceTimestamp",
                "viewType",
                "displayName",
                "registryDid",
                "policyId",
                "businessData",
                "searchText",
                "lastUpdate",
                "createdAt",
                "updatedAt"
            )
            SELECT
                $1,
                m."consensusTimestamp",
                CASE ${caseClauses} END,
                COALESCE(m.options->>'name', m.options->>'tokenName'),
                COALESCE(m.owner, m.options->>'did'),
                m.options->>'topicId',
                jsonb_build_object(
                    'description', m.options->>'description',
                    'status', m.status,
                    'topicId', m."topicId",
                    'tokenId', COALESCE(m.options->>'tokenId', tc."tokenId"),
                    'owner', m.owner,
                    'options', m.options,
                    'documents', m.documents
                ),
                COALESCE(m.options->>'name', '') || ' ' || COALESCE(m.options->>'description', '') || ' ' || COALESCE(m.owner, ''),
                EXTRACT(EPOCH FROM NOW())::bigint,
                NOW(),
                NOW()
            FROM message m
            LEFT JOIN token_cache tc
                ON tc."tokenId" = m.options->>'tokenId'
            WHERE m.type IN (${typeFilter})
            ON CONFLICT ("sourceTimestamp", "viewType") DO UPDATE SET
                network = EXCLUDED.network,
                "displayName" = EXCLUDED."displayName",
                "registryDid" = EXCLUDED."registryDid",
                "policyId" = EXCLUDED."policyId",
                "businessData" = EXCLUDED."businessData",
                "searchText" = EXCLUDED."searchText",
                "lastUpdate" = EXCLUDED."lastUpdate",
                "updatedAt" = NOW()
        `, [this.network]);

        const totalUpserted = result?.rowCount ?? result?.length ?? 0;

        await this.redis.publish('se:events', JSON.stringify({
            type: 'business-views-updated',
            totalUpserted,
            timestamp: new Date().toISOString(),
        }));

        this.logger.log(`Business views built: ${totalUpserted} records upserted`);
    }

    @OnWorkerEvent('failed')
    onFailed(job: Job, error: Error): void {
        this.logger.error(
            `Business view builder job ${job.id} failed: ${error.message}`,
            error.stack,
        );
    }
}
