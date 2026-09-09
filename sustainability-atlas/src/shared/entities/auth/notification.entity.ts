import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    Index,
    Unique,
    CreateDateColumn,
} from 'typeorm';

/**
 * A watchlist notification delivered to a user on a specific network.
 *
 * Written only by NotificationScanService's leader-elected scan loop
 * (multi-row batch INSERT ... ON CONFLICT ("userId","dedupeKey") DO NOTHING)
 * and read/mutated by NotificationsRepository (keyset list, unreadCount,
 * markRead, markAllRead, clearAll). Every query is raw parameterized SQL per
 * repository convention (plan A5); this entity exists for typed schema
 * declaration, discoverability, and simple getRepository(Notification) lookups.
 *
 * "projectKey" stores business_view.id (the same identifier
 * watchlist_subscriptions uses), NOT project_mint_link.project_key.
 * "dedupeKey" (e.g. 'issuance:{mintConsensusTimestamp}') plus the @Unique
 * (userId, dedupeKey) constraint makes scan-and-insert idempotent.
 *
 * userId is a plain uuid column (no @ManyToOne/@JoinColumn) — cross-table
 * logic is raw SQL; the FK → users.id ON DELETE CASCADE and all indexes are
 * owned by bootstrapSystemSchema, never TypeORM synchronize (forced false).
 */
@Entity('notifications')
@Unique('UQ_notifications_user_dedupe', ['userId', 'dedupeKey'])
// Documentary only (synchronize:false). Live indexes are owned by
// bootstrapSystemSchema: idx_notifications_user_network_created on
// (userId, network, createdAt DESC), the partial idx_notifications_user_unread
// on (userId, network) WHERE isRead=false, and the partial
// idx_notifications_read_created on (createdAt) WHERE isRead=true (supports
// NotificationScanService.pruneReadNotifications()).
@Index('idx_notifications_user_network_created', ['userId', 'network', 'createdAt'])
export class Notification {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    /** FK → users.id (ON DELETE CASCADE, owned by bootstrap). */
    @Column({ type: 'uuid' })
    userId: string;

    /** Hedera network this notification is scoped to (e.g. 'mainnet', 'testnet'). */
    @Column({ type: 'varchar', length: 60 })
    network: string;

    /** Notification source category. 'issuance' is the only type today. */
    @Column({ type: 'varchar', length: 20 })
    type: string;

    /** business_view.id of the watched project this notification is about. */
    @Column({ type: 'varchar', length: 120 })
    projectKey: string;

    /** Fully-rendered notification payload as an opaque JSON blob. */
    @Column({ type: 'jsonb' })
    payload: Record<string, unknown>;

    /** Idempotency key (e.g. 'issuance:{mintConsensusTimestamp}'). Unique per userId. */
    @Column({ type: 'varchar', length: 160 })
    dedupeKey: string;

    @Column({ type: 'boolean', default: false })
    isRead: boolean;

    @CreateDateColumn()
    createdAt: Date;
}
