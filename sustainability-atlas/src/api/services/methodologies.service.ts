import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@shared/redis/redis.service';
import { SingleFlightService } from '@shared/single-flight/single-flight.service';
import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import CID from 'cids';
import { IpfsService } from '@worker/services/ipfs.service';
import { MethodologyQueryDto, MethodologyResponseDto } from '../dto/methodology.dto';
import { PaginatedResponse } from '../dto/pagination.dto';
import { NetworkDataSourceRegistry } from '../database/network-datasource.registry';
import { PgMethodologyRepository } from '../repositories/pg-methodology.repository';
import { MethodologyRepository } from '../repositories/methodology.repository';
import { DecodedMethodologyResponseDto } from '../dto/decoded-methodology.dto';
import { PgPolicySchemaRepository } from '../repositories/pg-policy-schema.repository';

/**
 * Discriminated result for {@link MethodologiesService.getPolicyPackage}.
 * On failure, `reason` explains why the package is unavailable so the
 * controller can return an accurate error message.
 */
export type PolicyPackageResult =
    | { ok: true; cid: string; content: Buffer }
    | { ok: false; reason: 'not-decoded' | 'not-cached' };

/** Matches MV_REFRESH_INTERVAL. */
const OPTIONS_CACHE_TTL_SECONDS = 60;

// Matches MV_REFRESH_INTERVAL, so a cached page is never staler than the
// materialized view its stats are read from.
const FIND_ALL_CACHE_TTL_SECONDS = 60;

// Same 60s convention as the other caches in this file. A worker-driven
// re-decode can't proactively invalidate this from another process without
// new cross-process plumbing, so this TTL is the self-heal backstop for that
// path; admin edits (updateMapping) and manual re-decodes (redecodePolicy) in
// MappingReprocessService proactively refresh/clear it instead of waiting.
export const DECODED_CACHE_TTL_SECONDS = 60;

// Shorter TTL for the includeAllFields=true variant: entries can be multi-MB
// (SE-196: up to ~7 MB for the largest methodology) against a Redict instance
// configured `maxmemory-policy noeviction`, so this bounds how long that
// larger footprint sits in memory. Still long enough to fix the actual
// complaint (SE-198: every "Edit mapping" click on a 400+ schema methodology
// re-paid the ~2-8s driver-parse cost, because this variant was never cached
// at all) — admin edit-mapping traffic is low-volume/low-concurrency, so a
// handful of these entries alive for 20s is a bounded, acceptable cost next
// to fixing a multi-second delay on every click.
export const DECODED_FULL_CACHE_TTL_SECONDS = 20;

/**
 * Cache key for the (thin, default) `findDecoded` response — shared with
 * MappingReprocessService so its post-write cache refresh/invalidation targets
 * the exact same entry. Keyed by the raw URL id (instance topic or policy
 * topic, whichever the caller used) rather than the resolved policyTopicId —
 * simpler, at the minor cost of a separate cache entry per URL form for the
 * same methodology.
 */
export function decodedCacheKey(network: string, id: string): string {
    return `methodology-decoded:${network}:${id}`;
}

/** Cache key for the includeAllFields=true variant — distinct entry, own TTL. */
export function decodedFullCacheKey(network: string, id: string): string {
    return `methodology-decoded-full:${network}:${id}`;
}

@Injectable()
export class MethodologiesService {
    private readonly logger = new Logger(MethodologiesService.name);
    private readonly zipStorageRoot = resolve(process.env.POLICY_ZIP_STORAGE_PATH || './data/policy-zips');

    constructor(
        private readonly dataSources: NetworkDataSourceRegistry,
        private readonly ipfsService: IpfsService,
        private readonly redis: RedisService,
        private readonly singleFlight: SingleFlightService,
    ) {}

    /** Distinct methodology names for filter dropdowns. Cached — the set changes only on ingest. */
    async findNameOptions(network: string): Promise<string[]> {
        const cacheKey = `methodology-options:${network}`;
        const cached = await this.redis.getJson<string[]>(cacheKey);
        if (cached) return cached;

        const names = await this.getRepository(network).findNameOptions();
        await this.redis.setJson(cacheKey, names, OPTIONS_CACHE_TTL_SECONDS);
        return names;
    }

    private toV1Base32(cid: string): string {
        try { return new CID(cid).toV1().toString('base32'); }
        catch { return cid; }
    }

    /**
     * Cache-aside + single-flight. The cache alone still let every request that
     * arrived during a TTL expiry fire its own copy of the search query; the
     * single flight collapses those onto one DB round trip.
     */
    async findAll(
        network: string,
        query: MethodologyQueryDto,
    ): Promise<PaginatedResponse<MethodologyResponseDto>> {
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;

        const cacheKey = this.listCacheKey(network, query, page, limit);
        const cached = await this.redis.getJson<PaginatedResponse<MethodologyResponseDto>>(cacheKey);
        if (cached) return cached;

        return this.singleFlight.run(cacheKey, async () => {
            // Re-check: another request may have populated the cache while this
            // one was waiting to be scheduled onto the event loop.
            const cachedAgain = await this.redis.getJson<PaginatedResponse<MethodologyResponseDto>>(cacheKey);
            if (cachedAgain) return cachedAgain;

            const repo = this.getRepository(network);
            const result = await repo.findAll({
                page,
                limit,
                search: query.search,
                name: query.name,
                id: query.id,
                description: query.description,
                decodeStatus: query.decodeStatus,
                status: query.status,
                registryDid: query.registryDid,
                registryName: query.registryName,
                version: query.version,
                policyTopicId: query.policyTopicId,
                sortBy: query.sortBy,
                sortDir: query.sortDir,
            });

            const data = result.rows.map(row =>
                MethodologyResponseDto.fromRow(row, network, row.stats),
            );
            const response = new PaginatedResponse(data, result.total, page, limit);
            await this.redis.setJson(cacheKey, response, FIND_ALL_CACHE_TTL_SECONDS);
            return response;
        });
    }

    /**
     * Encodes every field that can change the listing result, so two requests
     * share a cache entry only when they would produce the same page.
     * Multi-value filters are pipe-joined, matching the wire format the query
     * builder decodes them from.
     */
    private listCacheKey(
        network: string,
        query: MethodologyQueryDto,
        page: number,
        limit: number,
    ): string {
        return `methodologies:list:${network}:${page}:${limit}` +
            `:${query.search ?? ''}:${query.name ?? ''}:${query.id ?? ''}` +
            `:${query.description ?? ''}:${query.decodeStatus?.join('|') ?? ''}` +
            `:${query.status?.join('|') ?? ''}` +
            `:${query.registryDid ?? ''}:${query.registryName ?? ''}` +
            `:${query.version ?? ''}:${query.policyTopicId ?? ''}` +
            `:${query.sortBy ?? ''}:${query.sortDir ?? ''}`;
    }

    async findById(network: string, id: string): Promise<MethodologyResponseDto | null> {
        const repo = this.getRepository(network);
        const row = await repo.findById(id);
        if (!row) return null;
        return MethodologyResponseDto.fromRow(row, network, row.stats);
    }

    /**
     * Returns the decode status and resolved project schema config for the
     * methodology identified by its policy topic ID.
     *
     * Returns null when the methodology does not exist in business_view at all.
     * When the methodology exists but has no policy row yet, the returned DTO
     * carries decodeStatus = 'unknown'.
     */
    /**
     * Returns the cached policy ZIP bytes for a methodology, resolved via the
     * policy's sourceCid → cached zip on disk (with a legacy ipfs_files fallback).
     *
     * The result is discriminated so callers can tell *why* a package is
     * unavailable:
     *   - 'not-decoded': the policy hasn't been successfully decoded yet, so no
     *     ZIP CID has been resolved — there is nothing to download.
     *   - 'not-cached':  the policy is decoded but its ZIP hasn't been cached by
     *     the indexer yet (or was evicted) — retrying later may succeed.
     */
    async getPolicyPackage(
        network: string,
        id: string,
    ): Promise<PolicyPackageResult> {
        const ds = this.dataSources.getDataSource(network);
        // Resolve the policy ZIP CID the same way the listing does: pick the
        // latest decoded policy row for this methodology's policyTopicId. Also
        // pull its decodeStatus so we can distinguish "not decoded" from
        // "decoded but zip not cached".
        const cidRows: Array<{ sourceCid: string | null; decodeStatus: string | null }> = await ds.query(
            `SELECT p."sourceCid", p."decodeStatus"
             FROM business_view bv
             LEFT JOIN LATERAL (
                 SELECT "sourceCid", "decodeStatus"
                 FROM policy
                 WHERE "policyTopicId" = bv."businessData"->>'topicId'
                 ORDER BY ("decodeStatus" = 'decoded') DESC NULLS LAST,
                          "updatedAt" DESC NULLS LAST
                 LIMIT 1
             ) p ON TRUE
             WHERE bv."viewType" = 'METHODOLOGY' AND bv."relatedTopicId" = $1
             ORDER BY bv."sourceTimestamp"::numeric DESC NULLS LAST, bv.id DESC
             LIMIT 1`,
            [id],
        );
        const row = cidRows[0];
        // No policy row, decode not complete, or no ZIP CID resolved → the
        // package simply doesn't exist to download yet.
        if (!row || row.decodeStatus !== 'decoded' || !row.sourceCid) {
            return { ok: false, reason: 'not-decoded' };
        }
        const cid = row.sourceCid;

        // Policy zips are cached on disk under the CIDv1 base32 form by the
        // worker's IpfsService — that's the authoritative location. The
        // ipfs_files table is used for VC documents only; policy zips are
        // too large to store as DB rows.
        const v1Cid = this.toV1Base32(cid);
        const diskPath = join(this.zipStorageRoot, `${v1Cid}.zip`);
        try {
            const content = await fs.readFile(diskPath);
            return { ok: true, cid, content };
        } catch (err: unknown) {
            if ((err as NodeJS.ErrnoException)?.code !== 'ENOENT') {
                this.logger.error(`Failed to read policy zip ${diskPath}: ${err}`);
            }
        }

        // Fallback: try the legacy ipfs_files table (old data).
        const fileRows: Array<{ content: Buffer }> = await ds.query(
            `SELECT content FROM ipfs_files WHERE cid = $1 LIMIT 1`,
            [cid],
        );
        const legacy = fileRows[0]?.content;
        if (legacy) return { ok: true, cid, content: legacy };

        try {
            const content = await this.ipfsService.fetchContent(cid);
            return { ok: true, cid, content };
        } catch (err) {
            this.logger.warn(
                `On-demand IPFS fetch failed for policy zip cid=${cid}: ` +
                `${err instanceof Error ? err.message : String(err)}`,
            );
            return { ok: false, reason: 'not-cached' };
        }
    }

    /**
     * Cache-aside + single-flight for `findDecoded`, mirroring findAll's
     * pattern above. Thin and full (`includeAllFields=true`) responses are
     * cached under separate keys/TTLs — see DECODED_FULL_CACHE_TTL_SECONDS for
     * why the full variant is cached at all despite its larger footprint.
     */
    async findDecoded(
        network: string,
        id: string,
        includeAllFields = false,
    ): Promise<DecodedMethodologyResponseDto | null> {
        const ds = this.dataSources.getDataSource(network);
        const cacheKey = includeAllFields ? decodedFullCacheKey(network, id) : decodedCacheKey(network, id);
        const ttl = includeAllFields ? DECODED_FULL_CACHE_TTL_SECONDS : DECODED_CACHE_TTL_SECONDS;

        // getJson can't distinguish "cache miss" from "cached null", so — same as
        // findAll/findNameOptions above — only the found (truthy) case is cached;
        // a 404 always falls through and re-resolves against the DB.
        const cached = await this.redis.getJson<DecodedMethodologyResponseDto>(cacheKey);
        if (cached) return cached;

        return this.singleFlight.run(cacheKey, async () => {
            const cachedAgain = await this.redis.getJson<DecodedMethodologyResponseDto>(cacheKey);
            if (cachedAgain) return cachedAgain;

            const repo = new PgPolicySchemaRepository(ds);
            const row = await repo.findDecoded(id);
            if (!row) return null;

            const result = DecodedMethodologyResponseDto.fromRow(row, includeAllFields);
            await this.redis.setJson(cacheKey, result, ttl);
            return result;
        });
    }

    /**
     * Resolves the appropriate MethodologyRepository for the given network.
     * Currently only PostgreSQL is supported; add a factory here to swap
     * in a different backend implementation.
     */
    private getRepository(network: string): MethodologyRepository {
        const ds = this.dataSources.getDataSource(network);
        return new PgMethodologyRepository(ds);
    }
}
