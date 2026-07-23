import { Injectable, Logger } from '@nestjs/common';
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

@Injectable()
export class MethodologiesService {
    private readonly logger = new Logger(MethodologiesService.name);
    private readonly zipStorageRoot = resolve(process.env.POLICY_ZIP_STORAGE_PATH || './data/policy-zips');

    constructor(
        private readonly dataSources: NetworkDataSourceRegistry,
        private readonly ipfsService: IpfsService,
    ) {}

    private toV1Base32(cid: string): string {
        try { return new CID(cid).toV1().toString('base32'); }
        catch { return cid; }
    }

    async findAll(
        network: string,
        query: MethodologyQueryDto,
    ): Promise<PaginatedResponse<MethodologyResponseDto>> {
        const repo = this.getRepository(network);
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;

        const result = await repo.findAll({
            page,
            limit,
            search: query.search,
            name: query.name,
            id: query.id,
            description: query.description,
            decodeStatus: query.decodeStatus,
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
        return new PaginatedResponse(data, result.total, page, limit);
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

    async findDecoded(network: string, id: string): Promise<DecodedMethodologyResponseDto | null> {
        const ds = this.dataSources.getDataSource(network);
        const repo = new PgPolicySchemaRepository(ds);
        const row = await repo.findDecoded(id);
        if (!row) return null;
        return DecodedMethodologyResponseDto.fromRow(row);
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
