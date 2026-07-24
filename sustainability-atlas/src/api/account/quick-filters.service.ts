import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QuickFiltersRepository, QuickFilterRow } from './quick-filters.repository';
import type { QuickFilterCriteria } from './dto/quick-filter-criteria.type';

const POSTGRES_UNIQUE_VIOLATION = '23505';

@Injectable()
export class QuickFiltersService {
    constructor(
        private readonly repo: QuickFiltersRepository,
        private readonly config: ConfigService,
    ) {}

    private maxPerUser(): number {
        return this.config.get<number>('app.quickFilters.maxPerUser') ?? 10;
    }

    async list(
        userId: string,
        network: string,
        section: string,
    ): Promise<{ items: QuickFilterRow[]; limit: number }> {
        const items = await this.repo.findAll(userId, network, section);
        return { items, limit: this.maxPerUser() };
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

        // Defense-in-depth: the frontend disables the Save Search button once
        // at the limit, so this should only ever fire via direct API use.
        const max = this.maxPerUser();
        const existing = await this.repo.count(userId, network, section);
        if (existing >= max) {
            throw new ConflictException(`Saved search limit reached (maximum ${max}).`);
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
