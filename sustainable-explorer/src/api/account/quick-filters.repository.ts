import { Injectable } from '@nestjs/common';
import { SystemDataSource, returningRows } from '@api/database/system-database.module';
import type { QuickFilterCriteria } from './dto/quick-filter-criteria.type';

export interface QuickFilterRow {
    id: string;
    name: string;
    criteria: QuickFilterCriteria;
    createdAt: Date;
}

@Injectable()
export class QuickFiltersRepository {
    constructor(private readonly systemDataSource: SystemDataSource) {}

    /** Single indexed query — all saved searches for a user+network+section. */
    async findAll(userId: string, network: string, section: string): Promise<QuickFilterRow[]> {
        return this.systemDataSource.getDataSource().query<QuickFilterRow[]>(
            `SELECT id, name, criteria, "createdAt"
               FROM quick_filters
              WHERE "userId" = $1 AND network = $2 AND section = $3
              ORDER BY "createdAt" ASC`,
            [userId, network, section],
        );
    }

    async create(
        userId: string,
        network: string,
        section: string,
        name: string,
        criteria: QuickFilterCriteria,
    ): Promise<QuickFilterRow> {
        const result = await this.systemDataSource.getDataSource().query(
            `INSERT INTO quick_filters ("userId", network, section, name, criteria)
             VALUES ($1, $2, $3, $4, $5::jsonb)
             RETURNING id, name, criteria, "createdAt"`,
            [userId, network, section, name, JSON.stringify(criteria)],
        );
        return returningRows<QuickFilterRow>(result)[0];
    }

    /** Ownership enforced inline — deletes 0 rows (silently) if not owned by userId. */
    async delete(id: string, userId: string): Promise<number> {
        const result = await this.systemDataSource.getDataSource().query(
            `DELETE FROM quick_filters WHERE id = $1 AND "userId" = $2`,
            [id, userId],
        );
        return result[1] ?? 0;
    }
}
