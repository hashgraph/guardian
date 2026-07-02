import { Injectable } from '@nestjs/common';
import { SystemDataSource, returningRows } from '@api/database/system-database.module';
import type { DashboardType } from './dto/dashboard-layout.types';

export interface DashboardRow {
    name: string;
    layout: unknown;
    updatedAt: Date;
}

@Injectable()
export class DashboardPreferencesRepository {
    constructor(private readonly systemDataSource: SystemDataSource) {}

    async findAllByUserAndNetwork(userId: string, network: string): Promise<DashboardRow[]> {
        return this.systemDataSource.getDataSource().query<DashboardRow[]>(
            `SELECT name, layout, "updatedAt"
               FROM user_dashboards
              WHERE "userId" = $1 AND network = $2`,
            [userId, network],
        );
    }

    // Seeds all four default rows for a user+network on their first visit.
    // ON CONFLICT DO NOTHING makes this safe to call multiple times (idempotent).
    async seedDefaults(userId: string, network: string): Promise<void> {
        await this.systemDataSource.getDataSource().query(
            `INSERT INTO user_dashboards ("userId", network, name, layout)
             VALUES
               ($1, $2, 'watchlist',         '[]'::jsonb),
               ($1, $2, 'widgets',           '{}'::jsonb),
               ($1, $2, 'custom_charts',     '[]'::jsonb),
               ($1, $2, 'watchlist_filters', '{}'::jsonb)
             ON CONFLICT ("userId", network, name) DO NOTHING`,
            [userId, network],
        );
    }

    async upsertType(
        userId: string,
        network: string,
        type: DashboardType,
        layout: unknown,
    ): Promise<DashboardRow> {
        const result = await this.systemDataSource.getDataSource().query(
            `INSERT INTO user_dashboards ("userId", network, name, layout)
             VALUES ($1, $2, $3, $4::jsonb)
             ON CONFLICT ("userId", network, name)
             DO UPDATE SET layout = EXCLUDED.layout, "updatedAt" = now()
             RETURNING name, layout, "updatedAt"`,
            [userId, network, type, JSON.stringify(layout)],
        );
        return returningRows<DashboardRow>(result)[0];
    }
}
