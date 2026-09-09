import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    Index,
    CreateDateColumn,
} from 'typeorm';

/**
 * A saved search/filter preset for a user on a specific network and section.
 *
 * Users can save any number of quick-filters per section; unlike UserDashboard
 * there is no uniqueness constraint on (userId, network) — a user may have
 * multiple filters per network per section.
 *
 * criteria jsonb stores the full filter state (selected values, text, ranges)
 * as an opaque blob; the API layer owns schema validation.
 *
 * userId is a plain uuid column (no @ManyToOne/@JoinColumn) — all cross-table
 * logic is handled via raw SQL per repository convention (plan A5).
 */
@Entity('quick_filters')
@Index('idx_quick_filters_user_network', ['userId', 'network'])
export class QuickFilter {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    /** FK → users.id. Indexed directly for per-user filter listing. */
    @Index()
    @Column({ type: 'uuid' })
    userId: string;

    /** Hedera network this filter applies to (e.g. 'mainnet', 'testnet'). */
    @Column({ type: 'varchar', length: 60 })
    network: string;

    /** Which page/section this filter belongs to. */
    @Column({ type: 'varchar', length: 20 })
    section: 'projects' | 'methodologies' | 'issuances';

    /** Human-readable label for the saved filter (e.g. "My Gold Standard Projects"). */
    @Column({ type: 'varchar', length: 200 })
    name: string;

    /**
     * Full filter criterion set as an opaque JSON blob.
     * The API layer is responsible for schema validation before persist.
     */
    @Column({ type: 'jsonb' })
    criteria: Record<string, unknown>;

    @CreateDateColumn()
    createdAt: Date;
}
