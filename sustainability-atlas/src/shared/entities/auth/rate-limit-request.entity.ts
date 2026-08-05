import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    Index,
    CreateDateColumn,
} from 'typeorm';

/**
 * A user's request to increase their API rate limit quota.
 *
 * Workflow: user submits (status='pending') → admin reviews → status transitions
 * to 'approved', 'adjusted' (approved but at a different quota), or 'declined'.
 *
 * Rate limits are GLOBAL per user (not per-network). The effective quota lives
 * on users.apiQuotaPerHour; this table is the approval audit trail only.
 *
 * userId / reviewerId are plain uuid columns (no @ManyToOne/@JoinColumn) — all
 * cross-table logic is handled via raw SQL per repository convention (plan A5).
 */
@Entity('rate_limit_requests')
export class RateLimitRequest {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    /** FK → users.id. Indexed for per-user history queries. */
    @Index()
    @Column({ type: 'uuid' })
    userId: string;

    /** Requested requests-per-hour. Must be a positive integer. */
    @Column({ type: 'int' })
    requestedQuota: number;

    /** Free-text justification from the user explaining the need. Bounded to cap payload size. */
    @Column({ type: 'varchar', length: 2000 })
    justification: string;

    /**
     * 'pending'  = awaiting admin review.
     * 'approved' = granted at the requested quota.
     * 'adjusted' = granted, but at a different quota (see approvedQuota).
     * 'declined' = denied.
     */
    @Column({ type: 'varchar', length: 20, default: 'pending' })
    status: 'pending' | 'approved' | 'adjusted' | 'declined';

    /**
     * The actual quota granted. Null until approved/adjusted.
     * When status='approved', this equals requestedQuota.
     * When status='adjusted', this may differ from requestedQuota.
     */
    @Column({ type: 'int', nullable: true })
    approvedQuota: number | null;

    /** FK → users.id of the admin who reviewed. Null until reviewed. */
    @Column({ type: 'uuid', nullable: true })
    reviewerId: string | null;

    /** Optional note from the reviewer explaining the decision. Bounded to cap payload size. */
    @Column({ type: 'varchar', length: 1000, nullable: true })
    resolvedNote: string | null;

    /** When the review decision was made. Null until reviewed. */
    @Column({ type: 'timestamptz', nullable: true })
    reviewedAt: Date | null;

    @CreateDateColumn()
    createdAt: Date;
}
