import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { RedisService } from '@shared/redis/redis.service';
import { SingleFlightService } from '@shared/single-flight/single-flight.service';
import {
    ProjectQueryDto,
    ProjectResponseDto,
    ActivityEventDto,
    ProjectIdsDto,
    PaginatedProjectsDto,
    ProjectFilterOptionsDto,
    MintSerialsResponseDto,
    MintTransactionsResponseDto,
} from '../dto/project.dto';
import { PaginatedResponse } from '../dto/pagination.dto';
import { NetworkDataSourceRegistry } from '../database/network-datasource.registry';
import { PgProjectRepository } from '../repositories/pg-project.repository';
import { ProjectRepository, ProjectListSummary } from '../repositories/project.repository';
import { MappingReprocessService } from './mapping-reprocess.service';
import { PolicyWorkflowGraph } from './policy-graph.builder';
import { AdditionalDetailsSchemaDto } from '../dto/additional-details.dto';
import { MrvDataQueryDto, MrvDataResponseDto } from '../dto/mrv-data.dto';

// Short TTL — unlike the MV-backed dashboard/portfolio caches, project detail
// data changes on ingest and on admin re-extract/refresh-ipfs actions, not on
// a fixed refresh cadence, so this stays short to keep those changes visible quickly.
const FIND_BY_ID_CACHE_TTL_SECONDS = 30;

// Short TTL, same reasoning as above — count/summary read live business_view
// rows, not an MV. Only bounds how long a page-flip within one search can
// reuse the prior total/summary instead of re-running the search predicate.
const COUNT_SUMMARY_CACHE_TTL_SECONDS = 20;

// Long TTL — filter facet values are distinct-value lists that only change when
// ingest introduces a genuinely new country/registry/methodology, never per
// request, and this endpoint is not MV-backed so there is no MV refresh cadence
// to stay aligned with. A new value surfacing minutes late is harmless.
const FILTER_OPTIONS_CACHE_TTL_SECONDS = 300;

// Soft TTL: past this the cached value is still served, but a background
// refresh is kicked off. Recomputing costs seconds (the methodology facet scans
// the whole METHODOLOGY population), so no request should ever block on it once
// any value exists.
const FILTER_OPTIONS_STALE_AFTER_SECONDS = 60;

interface CachedFilterOptions {
    value: ProjectFilterOptionsDto;
    computedAt: number;
}

@Injectable()
export class ProjectsService {
    private readonly logger = new Logger(ProjectsService.name);

    constructor(
        private readonly dataSources: NetworkDataSourceRegistry,
        private readonly mappingReprocessService: MappingReprocessService,
        private readonly redis: RedisService,
        private readonly singleFlight: SingleFlightService,
    ) {}

    async findAll(
        network: string,
        query: ProjectQueryDto,
    ): Promise<PaginatedProjectsDto> {
        const repo = this.getRepository(network);
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;

        // count/summary don't depend on page/limit — cache them separately so
        // flipping pages within the same search reuses page 1's total/summary
        // instead of re-running the search predicate for count and summary too.
        const countSummaryCacheKey = this.countSummaryCacheKey(network, query);
        const cachedCountAndSummary = await this.redis.getJson<{ total: number; summary: ProjectListSummary }>(
            countSummaryCacheKey,
        );

        const result = await repo.findAll({
            page,
            limit,
            search: query.search,
            sortBy: query.sortBy,
            sortDir: query.sortDir,
            name: query.name,
            country: query.country,
            methodology: query.methodology,
            registry: query.registry,
            registryDid: query.registryDid,
            developer: query.developer,
            vintage: query.vintage,
            status: query.status,
            policyTopicId: query.policyTopicId,
            instanceTopicId: query.instanceTopicId,
            sdgs: query.sdgs,
            sector: query.sector,
            sectoralScope: query.sectoralScope,
            vintageRange: query.vintageRange,
            methodologyId: query.methodologyId,
            lifecycleStage: query.lifecycleStage,
            expectedIssuanceYearRange: query.expectedIssuanceYearRange,
            isPipeline: query.isPipeline,
            cachedCountAndSummary: cachedCountAndSummary ?? undefined,
        });

        if (!cachedCountAndSummary) {
            await this.redis.setJson(
                countSummaryCacheKey,
                { total: result.total, summary: result.summary },
                COUNT_SUMMARY_CACHE_TTL_SECONDS,
            );
        }

        const data = result.rows.map(row => ProjectResponseDto.fromRow(row, network, false));
        return {
            data,
            meta: { page, limit, total: result.total, totalPages: Math.ceil(result.total / limit) },
            summary: result.summary,
        };
    }

    /**
     * Encodes every findAll filter that affects the search predicate — everything
     * except page/limit, which don't change count or summary.
     */
    private countSummaryCacheKey(network: string, query: ProjectQueryDto): string {
        return `projects:count-summary:${network}` +
            `:${query.search ?? ''}:${query.name ?? ''}:${query.country ?? ''}` +
            `:${query.methodology ?? ''}:${query.registry ?? ''}:${query.registryDid ?? ''}` +
            `:${query.developer ?? ''}:${query.vintage ?? ''}:${query.status ?? ''}` +
            `:${query.policyTopicId ?? ''}:${query.instanceTopicId ?? ''}:${query.sdgs ?? ''}` +
            `:${query.sector ?? ''}:${query.sectoralScope ?? ''}:${query.vintageRange ?? ''}` +
            `:${query.methodologyId ?? ''}:${query.lifecycleStage ?? ''}` +
            `:${query.expectedIssuanceYearRange ?? ''}:${query.isPipeline ?? ''}`;
    }

    /**
     * Cache-aside + single-flight + stale-while-revalidate. The underlying
     * facet queries scan the whole METHODOLOGY population and cost seconds cold,
     * so a plain cache-aside would still make whichever request lands on the TTL
     * expiry pay that in full; serving the stale value and refreshing behind it
     * keeps the live query off the request path entirely after the first miss.
     */
    async getFilterOptions(network: string): Promise<ProjectFilterOptionsDto> {
        const cacheKey = `project-filter-options:${network}`;
        const cached = await this.redis.getJson<CachedFilterOptions>(cacheKey);

        if (cached) {
            if (Date.now() - cached.computedAt > FILTER_OPTIONS_STALE_AFTER_SECONDS * 1000) {
                void this.singleFlight
                    .run(cacheKey, () => this.computeAndCacheFilterOptions(network, cacheKey))
                    .catch(err => {
                        const msg = err instanceof Error ? err.message : String(err);
                        this.logger.warn(`Background filter-options refresh failed for ${network}: ${msg}`);
                    });
            }
            return cached.value;
        }

        // No value to serve — this caller has to wait for the computation.
        return this.singleFlight.run(cacheKey, async () => {
            // Re-check: another request may have populated the cache while
            // this one was waiting to be scheduled onto the event loop.
            const cachedAgain = await this.redis.getJson<CachedFilterOptions>(cacheKey);
            if (cachedAgain) return cachedAgain.value;

            return this.computeAndCacheFilterOptions(network, cacheKey);
        });
    }

    private async computeAndCacheFilterOptions(
        network: string,
        cacheKey: string,
    ): Promise<ProjectFilterOptionsDto> {
        const repo = this.getRepository(network);
        const result = await repo.getFilterOptions();
        await this.redis.setJson(
            cacheKey,
            { value: result, computedAt: Date.now() },
            FILTER_OPTIONS_CACHE_TTL_SECONDS,
        );
        return result;
    }

    /**
     * Same filters as findAll, but returns only (sourceTimestamp, name) pairs —
     * for the "add all matching" bulk-select action once browsing is
     * paginated, so the client doesn't have to download every matching
     * project's full row just to collect ids.
     *
     * Reuses findAll/fromRow rather than a parallel lean query: the display
     * `name` isn't a plain column — ProjectResponseDto.fromRow falls back
     * through the linked project-schema name (and then methodology) whenever
     * the stored displayName looks like a bare DID/topic id, which needs the
     * same policy-schema batch-load findAll already does. Reimplementing that
     * for a lean query would either duplicate it or show the wrong name for
     * exactly the projects that need the fallback. limit=5000 is a generous
     * cap for a user-triggered bulk action, not a route millions of rows
     * would ever hit — the point is avoiding a second name-resolution
     * algorithm, not shaving a few joins off an infrequent request.
     */
    async findIds(network: string, query: ProjectQueryDto): Promise<ProjectIdsDto> {
        const repo = this.getRepository(network);
        const result = await repo.findAll({
            page: 1,
            limit: 5000,
            search: query.search,
            name: query.name,
            country: query.country,
            methodology: query.methodology,
            registry: query.registry,
            developer: query.developer,
            vintage: query.vintage,
            status: query.status,
            policyTopicId: query.policyTopicId,
            instanceTopicId: query.instanceTopicId,
            sdgs: query.sdgs,
            sector: query.sector,
            sectoralScope: query.sectoralScope,
            vintageRange: query.vintageRange,
            methodologyId: query.methodologyId,
            lifecycleStage: query.lifecycleStage,
            expectedIssuanceYearRange: query.expectedIssuanceYearRange,
            isPipeline: query.isPipeline,
        });
        const items = result.rows.map(row => {
            const dto = ProjectResponseDto.fromRow(row, network, false);
            return {
                id: dto.sourceTimestamp,
                name: dto.name ?? dto.sourceTimestamp,
                projectKey: dto.projectKey ?? null,
            };
        });
        return { items };
    }

    /**
     * Batch-fetches projects by sourceTimestamp ID (the watchlist's stored ID),
     * reusing findAll's row-shaping and N+1-avoidance schema-loading rather than
     * a parallel implementation. limit=200 comfortably covers the watchlist size
     * cap (Phase 5), so one page always returns the whole batch.
     */
    async findByIds(network: string, sourceTimestamps: string[]): Promise<ProjectResponseDto[]> {
        const repo = this.getRepository(network);
        const result = await repo.findAll({
            page: 1,
            limit: 200,
            sourceTimestamps,
        });
        return result.rows.map(row => ProjectResponseDto.fromRow(row, network, false));
    }

    async findById(network: string, id: string): Promise<ProjectResponseDto | null> {
        const cacheKey = `project-detail:${network}:${id}`;
        const cached = await this.redis.getJson<ProjectResponseDto>(cacheKey);
        if (cached) return cached;

        const repo = this.getRepository(network);
        const row = await repo.findById(id);
        if (!row) return null;

        const result = ProjectResponseDto.fromRow(row, network, true);
        await this.redis.setJson(cacheKey, result, FIND_BY_ID_CACHE_TTL_SECONDS);
        return result;
    }

    /**
     * NFT serials attributed to one of this project's mint events, resolved via
     * Guardian's NFT-metadata → mint-VP linkage. Throws NotFound when the mint
     * isn't linked to this project, so a project's namespace can't be used to
     * read another project's serials.
     */
    async findMintSerials(
        network: string,
        id: string | null,
        mintConsensusTimestamp: string,
        page: number,
        limit: number,
    ): Promise<MintSerialsResponseDto> {
        const repo = this.getRepository(network);
        const result = await repo.findMintSerials(id, mintConsensusTimestamp, page, limit);
        if (!result) {
            throw new NotFoundException(
                id
                    ? `Mint "${mintConsensusTimestamp}" is not linked to project "${id}" on ${network}`
                    : `Mint "${mintConsensusTimestamp}" not found on ${network}`,
            );
        }
        const { ranges, totalRanges, ...rest } = result;
        // Pagination counts ranges, not serials — the two differ by orders of
        // magnitude, and it is ranges the caller is paging through.
        return { ...rest, ...new PaginatedResponse(ranges, totalRanges, page, limit) };
    }

    /** Retirement and transfer transactions for one issuance, or for the whole project when no mint is given. */
    async findMintTransactions(
        network: string,
        id: string,
        mintConsensusTimestamp: string | null,
        page: number,
        limit: number,
        sortBy?: string,
        sortDir?: 'asc' | 'desc',
    ): Promise<MintTransactionsResponseDto> {
        const repo = this.getRepository(network);
        const result = await repo.findMintTransactions(id, mintConsensusTimestamp, page, limit, sortBy, sortDir);
        if (!result) {
            throw new NotFoundException(
                mintConsensusTimestamp
                    ? `Mint "${mintConsensusTimestamp}" is not linked to project "${id}" on ${network}`
                    : `Project "${id}" has no linked issuances on ${network}`,
            );
        }
        return {
            mintConsensusTimestamp,
            transferHistorySynced: result.transferHistorySynced,
            ...new PaginatedResponse(result.transactions, result.total, page, limit),
        };
    }

    async findActivity(network: string, id: string): Promise<ActivityEventDto[]> {
        const repo = this.getRepository(network);
        const rows = await repo.findActivity(id);
        return rows.map(r => ActivityEventDto.fromRow(r));
    }

    /**
     * Re-enqueues PROJECT_REPARSE jobs for every VC already attached to this
     * project via businessData->linkedVcs. Delegates to MappingReprocessService
     * which owns the queue interaction.
     */
    async reextractProject(network: string, id: string): Promise<{ enqueued: number }> {
        return this.mappingReprocessService.reextractProject(network, id);
    }

    /**
     * Re-fetches IPFS for every VC in the project's topic (clearing failed
     * BullMQ jobs and ipfs_fetch_failure rows) and reparses already-fetched
     * VCs through the project mapper.
     */
    async refreshIpfsAndReparseProject(
        network: string,
        id: string,
    ): Promise<{ refreshed: number; reparseEnqueued: number }> {
        return this.mappingReprocessService.refreshIpfsAndReparseProject(network, id);
    }

    /**
     * Returns the raw VC document for a single linked VC, verifying that the
     * requested consensusTimestamp is in the project's linkedVcs list before
     * querying the message table.
     */
    async getLinkedVcDocument(
        network: string,
        projectId: string,
        consensusTimestamp: string,
    ): Promise<Record<string, unknown>> {
        return this.mappingReprocessService.getLinkedVcDocument(network, projectId, consensusTimestamp);
    }

    /**
     * Returns the raw VC document plus a per-field label map derived from the
     * policy's schemaFields.  Delegates entirely to MappingReprocessService.
     */
    async getLinkedVcEvidence(
        network: string,
        projectId: string,
        consensusTimestamp: string,
    ): Promise<{ document: Record<string, unknown>; fieldLabels: Record<string, string> }> {
        return this.mappingReprocessService.getLinkedVcEvidence(network, projectId, consensusTimestamp);
    }

    /**
     * Returns the project's "Detailed Information" — decoded VC payloads grouped
     * by schema. Delegates to MappingReprocessService.
     */
    async getAdditionalDetails(network: string, id: string): Promise<AdditionalDetailsSchemaDto[]> {
        return this.mappingReprocessService.getAdditionalDetails(network, id);
    }

    /**
     * Returns one page of the server-paginated MRV data table for one
     * externalDataBlock-bound schema. Delegates to MappingReprocessService.
     */
    async getMrvData(
        network: string,
        id: string,
        schemaUuid: string,
        query: MrvDataQueryDto,
    ): Promise<MrvDataResponseDto> {
        return this.mappingReprocessService.getMrvData(network, id, schemaUuid, query);
    }

    /**
     * Returns the methodology workflow graph (role swimlanes + real flow edges)
     * for a project's policy, extracted from policy.json. Delegates to
     * MappingReprocessService.
     */
    async getPolicyGraph(network: string, id: string): Promise<PolicyWorkflowGraph> {
        return this.mappingReprocessService.getPolicyGraph(network, id);
    }

    /** Raw decoded policy.json for the project's policy (JSON inspector). */
    async getPolicyJson(network: string, id: string): Promise<Record<string, unknown> | null> {
        return this.mappingReprocessService.getPolicyJson(network, id);
    }

    /**
     * Resolves the appropriate ProjectRepository for the given network.
     * Currently only PostgreSQL is supported; add a factory here to swap
     * in a different backend implementation.
     */
    private getRepository(network: string): ProjectRepository {
        const ds = this.dataSources.getDataSource(network);
        return new PgProjectRepository(ds);
    }
}
