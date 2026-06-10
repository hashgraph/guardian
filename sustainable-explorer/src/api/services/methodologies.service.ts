import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join, resolve } from 'path';
import CID from 'cids';
import { MethodologyQueryDto, MethodologyResponseDto } from '../dto/methodology.dto';
import { PaginatedResponse } from '../dto/pagination.dto';
import { NetworkDataSourceRegistry } from '../database/network-datasource.registry';
import { PgMethodologyRepository } from '../repositories/pg-methodology.repository';
import { MethodologyRepository } from '../repositories/methodology.repository';
import { DecodedMethodologyResponseDto } from '../dto/decoded-methodology.dto';
import { PgPolicySchemaRepository } from '../repositories/pg-policy-schema.repository';

@Injectable()
export class MethodologiesService {
    private readonly logger = new Logger(MethodologiesService.name);
    private readonly zipStorageRoot = resolve(process.env.POLICY_ZIP_STORAGE_PATH || './data/policy-zips');

    constructor(
        private readonly dataSources: NetworkDataSourceRegistry,
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
     * policy's sourceCid → ipfs_files.content. Returns null when the policy
     * isn't decoded yet or its ZIP hasn't been cached by the indexer.
     */
    async getPolicyPackage(network: string, id: string): Promise<{ cid: string; content: Buffer } | null> {
        const ds = this.dataSources.getDataSource(network);
        // Resolve the policy ZIP CID the same way the listing does: pick the
        // latest decoded policy row for this methodology's policyTopicId.
        const cidRows: Array<{ sourceCid: string | null }> = await ds.query(
            `SELECT p."sourceCid"
             FROM business_view bv
             LEFT JOIN LATERAL (
                 SELECT "sourceCid"
                 FROM policy
                 WHERE "policyTopicId" = bv."businessData"->>'topicId'
                 ORDER BY ("decodeStatus" = 'decoded') DESC NULLS LAST,
                          "updatedAt" DESC NULLS LAST
                 LIMIT 1
             ) p ON TRUE
             WHERE bv."viewType" = 'METHODOLOGY' AND bv."relatedTopicId" = $1
             LIMIT 1`,
            [id],
        );
        const cid = cidRows[0]?.sourceCid;
        if (!cid) return null;

        // Policy zips are cached on disk under the CIDv1 base32 form by the
        // worker's IpfsService — that's the authoritative location. The
        // ipfs_files table is used for VC documents only; policy zips are
        // too large to store as DB rows.
        const v1Cid = this.toV1Base32(cid);
        const diskPath = join(this.zipStorageRoot, `${v1Cid}.zip`);
        try {
            const content = await fs.readFile(diskPath);
            return { cid, content };
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
        const content = fileRows[0]?.content;
        if (!content) return null;
        return { cid, content };
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
