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

    /**
     * Syncs watchlist_subscriptions (the reverse index NotificationScanService
     * watches) to match the caller's current watchlist exactly, for this
     * (userId, network). "projectRefs" holds WatchlistItem.id values (=
     * business_view.sourceTimestamp, the frontend's app-wide project
     * identifier), NOT business_view.id and NOT project_mint_link.project_key
     * — see the "watchlist_subscriptions" table comment in schema-bootstrap.ts.
     * NotificationScanService resolves mint rows to business_view.sourceTimestamp
     * (never business_view.id) before matching against this table, so no
     * cross-DB lookup is needed here — the raw ref is already the right key.
     *
     * Two statements: delete rows no longer present, then insert any new ones
     * (ON CONFLICT DO NOTHING — existing rows are left untouched, so their
     * createdAt is preserved). An empty projectRefs array is valid and clears
     * all subscriptions for this (userId, network) via the vacuously-true
     * `<> ALL(ARRAY[]::text[])`.
     */
    async syncWatchlistSubscriptions(
        userId: string,
        network: string,
        projectRefs: string[],
    ): Promise<void> {
        const ds = this.systemDataSource.getDataSource();

        await ds.query(
            `DELETE FROM watchlist_subscriptions
              WHERE "userId" = $1 AND network = $2 AND "projectKey" <> ALL($3::text[])`,
            [userId, network, projectRefs],
        );

        await ds.query(
            `INSERT INTO watchlist_subscriptions ("userId", network, "projectKey")
             SELECT $1, $2, unnest($3::text[])
             ON CONFLICT ("userId", network, "projectKey") DO NOTHING`,
            [userId, network, projectRefs],
        );
    }
}
