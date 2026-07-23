import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    Index,
    CreateDateColumn,
} from 'typeorm';

/**
 * API key credential for machine-to-machine or scripted access.
 *
 * No role/quota snapshot column: the effective role and quota are resolved live
 * from users.role / users.apiQuotaPerHour at request time. This avoids stale
 * snapshots when an admin changes a user's role or quota.
 *
 * prefix is unique and indexed so inbound API key validation can identify the
 * row with a single index lookup before comparing the keyHash. The prefix is
 * shown to the user in the dashboard so they can identify which key is which
 * without exposing the full secret.
 *
 * userId is a plain uuid column (no @ManyToOne/@JoinColumn) — all cross-table
 * logic is handled via raw SQL per repository convention (plan A5).
 */
@Entity('api_keys')
export class ApiKey {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    /** FK → users.id. Indexed for per-user key listing. */
    @Index()
    @Column({ type: 'uuid' })
    userId: string;

    /** Human-readable label for this key (e.g. "CI pipeline", "Dashboard script"). */
    @Column({ type: 'varchar', length: 120 })
    name: string;

    /**
     * Short public prefix of the key (e.g. first 8 chars). Uniquely identifies
     * a row so callers can locate the full record before verifying the hash.
     * Unique + indexed for O(1) lookup.
     */
    @Index({ unique: true })
    @Column({ type: 'varchar', length: 64 })
    prefix: string;

    /** One-way hash (sha256+pepper) of the full secret key. Never store the raw value. */
    @Column({ type: 'varchar', length: 255 })
    keyHash: string;

    /** 'active' = usable. 'revoked' = permanently disabled. */
    @Column({ type: 'varchar', length: 20, default: 'active' })
    status: 'active' | 'revoked';

    /** Updated on each successful request. Null until first use. */
    @Column({ type: 'timestamptz', nullable: true })
    lastUsedAt: Date | null;

    /** Null = never expires. Set to a future date for time-limited keys. */
    @Column({ type: 'timestamptz', nullable: true })
    expiresAt: Date | null;

    @CreateDateColumn()
    createdAt: Date;
}
