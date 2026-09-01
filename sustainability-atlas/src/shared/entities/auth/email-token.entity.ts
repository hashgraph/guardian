import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
} from 'typeorm';

/**
 * Single-use, expiring tokens for email-based flows.
 *
 * type='verify' — sent on self-signup; clicking the link sets emailVerifiedAt
 * and allows the user to sign in for the first time.
 * type='reset'  — sent via forgot-password; clicking the link allows the user
 * to set a new password (rotates all refresh-token sessions).
 *
 * tokenHash = sha256(pepper||rawToken); the raw token is sent in the email
 * link and is never persisted. usedAt enables single-use enforcement;
 * expiresAt enables expiry. The UNIQUE index on tokenHash supports O(1)
 * constant-time lookup-by-hash in the verify/reset flow.
 *
 * userId is a plain uuid column (no @ManyToOne/@JoinColumn) — FK constraint
 * is owned by bootstrapSystemSchema (plan A5). ON DELETE CASCADE ensures
 * orphan rows are never left when a user is removed.
 */
@Entity('auth_email_tokens')
export class EmailToken {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    /** FK → users.id. Plain uuid; FK constraint owned by bootstrapSystemSchema. */
    @Column({ type: 'uuid' })
    userId: string;

    /** 'verify' = email-verification link; 'reset' = password-reset link. */
    @Column({ type: 'varchar', length: 20 })
    type: 'verify' | 'reset';

    /** One-way hash (sha256+pepper) of the raw token value. Never store the raw value. */
    @Column({ type: 'varchar', length: 255 })
    tokenHash: string;

    /** Token becomes invalid after this timestamp. */
    @Column({ type: 'timestamptz' })
    expiresAt: Date;

    /** Set when the token is consumed; null = not yet used. Enforces single-use. */
    @Column({ type: 'timestamptz', nullable: true })
    usedAt: Date | null;

    @CreateDateColumn()
    createdAt: Date;
}
