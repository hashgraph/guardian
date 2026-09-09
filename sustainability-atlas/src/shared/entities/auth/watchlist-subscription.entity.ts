import {
    Entity,
    PrimaryColumn,
    Index,
    CreateDateColumn,
} from 'typeorm';

/**
 * Reverse index over each user's watchlist, consumed by
 * NotificationScanService to resolve which users watch a given project.
 *
 * Written exclusively by DashboardPreferencesRepository.syncWatchlistSubscriptions
 * (a DELETE-then-INSERT diff sync) — it deliberately lives in the
 * DashboardPreferences repository rather than a dedicated watchlist repository;
 * this entity does NOT change that module boundary. All access is raw SQL per
 * repository convention (plan A5); the entity exists for typed schema
 * declaration and discoverability only.
 *
 * Composite primary key (userId, network, projectKey). "projectKey" holds
 * WatchlistItem.id (= business_view.id), NOT project_mint_link.project_key.
 *
 * userId is a plain uuid column (no @ManyToOne/@JoinColumn); the FK → users.id
 * ON DELETE CASCADE and the (network, projectKey) index are owned by
 * bootstrapSystemSchema, never TypeORM synchronize (forced false).
 */
@Entity('watchlist_subscriptions')
// Documentary only (synchronize:false): live index idx_watchlist_subscriptions_project
// on (network, projectKey) is owned by bootstrapSystemSchema.
@Index('idx_watchlist_subscriptions_project', ['network', 'projectKey'])
export class WatchlistSubscription {
    @PrimaryColumn({ type: 'uuid' })
    userId: string;

    @PrimaryColumn({ type: 'varchar', length: 60 })
    network: string;

    /** business_view.id of the watched project (WatchlistItem.id). */
    @PrimaryColumn({ type: 'varchar', length: 120 })
    projectKey: string;

    @CreateDateColumn()
    createdAt: Date;
}
