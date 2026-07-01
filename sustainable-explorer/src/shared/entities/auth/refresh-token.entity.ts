import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    Index,
    CreateDateColumn,
} from 'typeorm';

/**
 * Session store-of-record for refresh tokens.
 *
 * Supports token rotation and family-based revocation (all tokens sharing a
 * familyId are invalidated when a compromised token is detected).
 *
 * userId, familyId are plain uuid columns (no @ManyToOne/@JoinColumn) — all
 * cross-table logic is handled via raw SQL per repository convention (plan A5).
 * FK constraints are owned by bootstrapSystemSchema.
 */
@Entity('refresh_tokens')
export class RefreshToken {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    /** FK → users.id. Indexed for per-user token lookups. */
    @Index()
    @Column({ type: 'uuid' })
    userId: string;

    /**
     * Groups tokens issued from the same login session.
     * When a reuse-attack is detected (rotated token presented), all tokens
     * in the family are immediately revoked. Indexed for family-wide updates.
     */
    @Index()
    @Column({ type: 'uuid' })
    familyId: string;

    /** One-way hash (e.g. sha256) of the raw token value. Never store the raw value. */
    @Column({ type: 'varchar', length: 255 })
    tokenHash: string;

    /**
     * Logical session identifier shared across a rotation chain.
     * Allows the client to correlate which device session a token belongs to
     * without exposing the token itself. Not indexed (queried via familyId).
     */
    @Column({ type: 'uuid' })
    sessionId: string;

    /**
     * 'active'   = can be exchanged for a new access token.
     * 'rotated'  = already used; the replacement token is in replacedById.
     * 'revoked'  = invalidated (logout, security event, admin action).
     */
    @Column({ type: 'varchar', length: 20, default: 'active' })
    status: 'active' | 'rotated' | 'revoked';

    /** FK → refresh_tokens.id of the token that replaced this one. Null if still active. */
    @Column({ type: 'uuid', nullable: true })
    replacedById: string | null;

    @Column({ type: 'varchar', length: 512, nullable: true })
    userAgent: string | null;

    @Column({ type: 'varchar', length: 64, nullable: true })
    ip: string | null;

    @Column({ type: 'timestamptz' })
    expiresAt: Date;

    @CreateDateColumn()
    createdAt: Date;
}
