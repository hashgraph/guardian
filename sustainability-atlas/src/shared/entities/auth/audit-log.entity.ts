import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    Index,
    CreateDateColumn,
} from 'typeorm';

/**
 * Append-only security and admin audit trail.
 *
 * Records every authentication event (login, logout, token rotation, key
 * creation/revocation) and admin action (user role/quota change, rate-limit
 * approval, forced logout). Intentionally denormalized — all fields are
 * recorded at the time of the event so the log is self-contained even if the
 * referenced user is later deleted.
 *
 * bigint PK (string-typed, matching business-view.entity.ts + guardian-event-log
 * convention) for high-volume insert throughput.
 *
 * The composite @Index(['actorUserId','createdAt']) supports the admin audit
 * trail query: "show me everything actor X did between T1 and T2".
 *
 * actorUserId is nullable to support system-initiated events (e.g. automatic
 * account lock after too many failed attempts) where there is no authenticated
 * user. Plain uuid column, no @ManyToOne/@JoinColumn (plan A5).
 */
@Entity('audit_log')
@Index('idx_audit_log_actor_created', ['actorUserId', 'createdAt'])
export class AuditLog {
    @PrimaryGeneratedColumn({ type: 'bigint' })
    id: string;

    /**
     * FK → users.id of the user who performed the action.
     * Null for system-initiated events (automatic locks, cron jobs, etc.).
     */
    @Index()
    @Column({ type: 'uuid', nullable: true })
    actorUserId: string | null;

    /** Short machine-readable action code (e.g. 'user.login', 'api_key.revoke'). */
    @Column({ type: 'varchar', length: 120 })
    action: string;

    /** Type of the primary resource affected (e.g. 'user', 'api_key', 'refresh_token'). */
    @Column({ type: 'varchar', length: 60, nullable: true })
    targetType: string | null;

    /** Identifier of the affected resource (e.g. userId, apiKeyId). */
    @Column({ type: 'varchar', length: 120, nullable: true })
    targetId: string | null;

    /** Hedera network context, if the action was network-scoped. Null for cross-network actions. */
    @Column({ type: 'varchar', length: 60, nullable: true })
    network: string | null;

    @Column({ type: 'varchar', length: 64, nullable: true })
    ip: string | null;

    @Column({ type: 'varchar', length: 512, nullable: true })
    userAgent: string | null;

    /** 'success' = action completed normally. 'failure' = action was denied or errored. */
    @Column({ type: 'varchar', length: 10 })
    outcome: 'success' | 'failure';

    /**
     * Arbitrary structured detail for the action (e.g. diff of changed fields,
     * reason for failure). Null when no additional context is needed.
     */
    @Column({ type: 'jsonb', nullable: true })
    detail: Record<string, unknown> | null;

    @CreateDateColumn()
    createdAt: Date;
}
