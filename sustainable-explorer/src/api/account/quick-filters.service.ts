import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { QuickFiltersRepository, QuickFilterRow } from './quick-filters.repository';
import type { QuickFilterCriteria } from './dto/quick-filter-criteria.type';

const POSTGRES_UNIQUE_VIOLATION = '23505';

@Injectable()
export class QuickFiltersService {
    constructor(private readonly repo: QuickFiltersRepository) {}

    async list(userId: string, network: string, section: string): Promise<QuickFilterRow[]> {
        return this.repo.findAll(userId, network, section);
    }

    async create(
        userId: string,
        network: string,
        section: string,
        name: string,
        criteria: QuickFilterCriteria,
    ): Promise<QuickFilterRow> {
        const hasSearch = !!criteria.search?.trim();
        const hasFilters = criteria.filters && Object.keys(criteria.filters).length > 0;
        if (!hasSearch && !hasFilters) {
            throw new UnprocessableEntityException('Cannot save a search with no active filters');
        }

        try {
            return await this.repo.create(userId, network, section, name.trim(), criteria);
        } catch (err: unknown) {
            const code = (err as { code?: string })?.code;
            if (code === POSTGRES_UNIQUE_VIOLATION) {
                throw new ConflictException('A saved search with this name already exists');
            }
            throw err;
        }
    }

    async remove(id: string, userId: string): Promise<void> {
        const affected = await this.repo.delete(id, userId);
        if (affected === 0) throw new NotFoundException('Saved search not found');
    }
}
