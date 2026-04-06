import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessView } from '@shared/entities/business-view.entity';
import { RegistryQueryDto, RegistryResponseDto } from '../dto/registry.dto';
import { PaginatedResponse } from '../dto/pagination.dto';

@Injectable()
export class RegistriesService {
    constructor(
        @InjectRepository(BusinessView)
        private readonly businessViewRepo: Repository<BusinessView>,
    ) {}

    async findAll(query: RegistryQueryDto): Promise<PaginatedResponse<RegistryResponseDto>> {
        const page = query.page ?? 1;
        const limit = query.limit ?? 20;
        const skip = (page - 1) * limit;

        const qb = this.businessViewRepo
            .createQueryBuilder('bv')
            .where('bv.viewType = :viewType', { viewType: 'REGISTRY' });

        // Filters
        if (query.did) {
            qb.andWhere('bv.registryDid = :did', { did: query.did });
        }

        if (query.geography) {
            qb.andWhere("bv.businessData->'options'->>'geography' ILIKE :geo", {
                geo: `%${query.geography}%`,
            });
        }

        if (query.search) {
            qb.andWhere(
                '(bv.displayName ILIKE :search OR bv.registryDid ILIKE :search OR bv.searchText ILIKE :search)',
                { search: `%${query.search}%` },
            );
        }

        // Sorting
        const sortBy = query.sortBy || 'createdAt';
        const sortDir = (query.sortDir?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC') as 'ASC' | 'DESC';
        const allowedSortFields = ['displayName', 'registryDid', 'createdAt', 'updatedAt', 'sourceTimestamp'];
        if (allowedSortFields.includes(sortBy)) {
            qb.orderBy(`bv.${sortBy}`, sortDir);
        } else {
            qb.orderBy('bv.createdAt', 'DESC');
        }

        const [items, total] = await qb.skip(skip).take(limit).getManyAndCount();

        const data = items.map(RegistryResponseDto.fromBusinessView);
        return new PaginatedResponse(data, total, page, limit);
    }

    async findByDid(did: string): Promise<RegistryResponseDto | null> {
        const bv = await this.businessViewRepo.findOne({
            where: { viewType: 'REGISTRY', registryDid: did },
        });
        return bv ? RegistryResponseDto.fromBusinessView(bv) : null;
    }
}
