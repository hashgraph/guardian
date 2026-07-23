import { Injectable } from '@nestjs/common';
import { NetworkDataSourceRegistry } from '../database/network-datasource.registry';
import { PgSdgRepository } from '../repositories/pg-sdg.repository';
import { SdgRepository } from '../repositories/sdg.repository';
import { SdgStatsListResponseDto, buildSdgStatsList } from '../dto/sdg.dto';

@Injectable()
export class SdgsService {
    constructor(private readonly dataSources: NetworkDataSourceRegistry) {}

    async findAll(network: string): Promise<SdgStatsListResponseDto> {
        const repo = this.getRepository(network);
        const ds = this.dataSources.getDataSource(network);

        const [rows, totalRow]: [Awaited<ReturnType<SdgRepository['findAll']>>, Array<{ total: number }>] = await Promise.all([
            repo.findAll(),
            ds.query(`SELECT COUNT(*)::int AS total FROM business_view WHERE "viewType" = 'PROJECT'`),
        ]);

        return buildSdgStatsList(rows, totalRow[0]?.total ?? 0, network);
    }

    private getRepository(network: string): SdgRepository {
        const ds = this.dataSources.getDataSource(network);
        return new PgSdgRepository(ds);
    }
}
