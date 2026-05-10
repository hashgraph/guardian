import { Injectable } from '@nestjs/common';
import { MethodologyQueryDto, MethodologyResponseDto } from '../dto/methodology.dto';
import { PaginatedResponse } from '../dto/pagination.dto';
import { NetworkDataSourceRegistry } from '../database/network-datasource.registry';
import { PgMethodologyRepository } from '../repositories/pg-methodology.repository';
import { MethodologyRepository } from '../repositories/methodology.repository';
import { DecodedMethodologyResponseDto } from '../dto/decoded-methodology.dto';
import { PgPolicySchemaRepository } from '../repositories/pg-policy-schema.repository';

@Injectable()
export class MethodologiesService {
    constructor(
        private readonly dataSources: NetworkDataSourceRegistry,
    ) {}

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
     * When the methodology exists but has no policy_decode_status row, the
     * returned DTO carries decodeStatus = 'unknown'.
     */
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
