import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    Index,
    Unique,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

/**
 * Persisted dashboard layout for a user on a specific network.
 *
 * One dashboard per (userId, network) pair — the @Unique constraint enforces
 * this. The layout jsonb stores the full widget/panel configuration as an
 * opaque blob; the API layer owns schema validation.
 *
 * userId is a plain uuid column (no @ManyToOne/@JoinColumn) — all cross-table
 * logic is handled via raw SQL per repository convention (plan A5).
 */
@Entity('user_dashboards')
@Unique('idx_user_dashboards_user_network', ['userId', 'network'])
export class UserDashboard {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    /** FK → users.id. Indexed for per-user dashboard listing. */
    @Index()
    @Column({ type: 'uuid' })
    userId: string;

    /**
     * Hedera network this dashboard is scoped to (e.g. 'mainnet', 'testnet').
     * Combined with userId the pair is unique (see @Unique above).
     */
    @Column({ type: 'varchar', length: 60 })
    network: string;

    /** Display name for the dashboard (e.g. "My Carbon Portfolio"). */
    @Column({ type: 'varchar', length: 200 })
    name: string;

    /**
     * Full widget/panel layout configuration as an opaque JSON blob.
     * The API layer is responsible for schema validation before persist.
     */
    @Column({ type: 'jsonb' })
    layout: Record<string, unknown>;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
