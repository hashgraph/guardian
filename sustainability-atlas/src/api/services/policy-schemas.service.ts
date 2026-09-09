import { Injectable } from '@nestjs/common';
import { PaginatedResponse } from '../dto/pagination.dto';
import {
    PolicySchemaQueryDto,
    PolicySchemaResponseDto,
} from '../dto/policy-schema.dto';
import { NetworkDataSourceRegistry } from '../database/network-datasource.registry';
import { PolicySchemaRepository } from '../repositories/policy-schema.repository';
import { PgPolicySchemaRepository } from '../repositories/pg-policy-schema.repository';

@Injectable()
export class PolicySchemasService {
    constructor(
        private readonly dataSources: NetworkDataSourceRegistry,
    ) {}

    async findByMethodologyId(
        network: string,
        methodologyId: string,
        query: PolicySchemaQueryDto,
    ): Promise<PaginatedResponse<PolicySchemaResponseDto>> {
        const repo = this.getRepository(network);
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;

        const result = await repo.findByPolicyTopicId(methodologyId, {
            page,
            limit,
            search: query.search,
            schemaId: query.schemaId,
            name: query.name,
            description: query.description,
            sourceCid: query.sourceCid,
            version: query.version,
            sortBy: query.sortBy,
            sortDir: query.sortDir,
        });

        const data = result.rows.map((row) => PolicySchemaResponseDto.fromRow(row, network));
        return new PaginatedResponse(data, result.total, page, limit);
    }

    private getRepository(network: string): PolicySchemaRepository {
        const ds = this.dataSources.getDataSource(network);
        return new PgPolicySchemaRepository(ds);
    }
}
