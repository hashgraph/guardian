import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    Index,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

/**
 * Platform user account. Stored in the system database (separate from per-network DBs).
 *
 * email: callers MUST lowercase before persist/lookup. Uniqueness is enforced by
 * a lower(email) functional unique index created in bootstrapSystemSchema.
 * RFC max email length = 320.
 *
 * uuid PK: relies on gen_random_uuid() (pgcrypto, built-in PG 13+).
 * bootstrapSystemSchema owns `CREATE EXTENSION IF NOT EXISTS pgcrypto` and the
 * actual `DEFAULT gen_random_uuid()` clause. The @PrimaryGeneratedColumn('uuid')
 * here only provides correct TypeORM type metadata.
 */
@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    /**
     * Always stored lowercase. Callers must lowercase before every persist/lookup.
     * The unique index enforces uniqueness at the DB level.
     */
    @Index({ unique: true })
    @Column({ type: 'varchar', length: 320 })
    email: string;

    // Server-generated hash (argon2id ~96-120 chars / bcrypt 60). Bounded ceiling.
    @Column({ type: 'varchar', length: 255 })
    passwordHash: string;

    /** 'system_user' = self-signup, limited access. 'admin' = full access. */
    @Column({ type: 'varchar', length: 20, default: 'system_user' })
    role: 'system_user' | 'admin';

    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    /**
     * Null = email not yet verified (cannot sign in).
     * Self-signup users start null; admin-created users have this set at creation.
     */
    @Column({ type: 'timestamptz', nullable: true })
    emailVerifiedAt: Date | null;

    /**
     * True for admin-created accounts: forces a password change on first login.
     */
    @Column({ type: 'boolean', default: false })
    mustChangePassword: boolean;

    @Column({ type: 'varchar', length: 120, nullable: true })
    firstName: string | null;

    @Column({ type: 'varchar', length: 120, nullable: true })
    lastName: string | null;

    /** Public username, globally unique. Null until the user sets one. */
    @Index({ unique: true })
    @Column({ type: 'varchar', length: 60, nullable: true })
    username: string | null;

    @Column({ type: 'varchar', length: 200, nullable: true })
    organisation: string | null;

    @Column({ type: 'varchar', length: 120, nullable: true })
    jobTitle: string | null;

    @Column({ type: 'varchar', length: 100, nullable: true })
    country: string | null;

    /**
     * Incremented on password change or forced logout. JWTs embed this value;
     * tokens with an older version are rejected. Starts at 0.
     */
    @Column({ type: 'int', default: 0 })
    tokenVersion: number;

    /**
     * Per-hour API quota override for this user. Null = use global default.
     * GLOBAL per user (not per-network). Rate-limit processor reads this.
     */
    @Column({ type: 'int', nullable: true })
    apiQuotaPerHour: number | null;

    /** Count of consecutive failed login attempts. Reset on successful login. */
    @Column({ type: 'int', default: 0 })
    failedLoginCount: number;

    /**
     * When non-null, login is rejected until this timestamp.
     * Set after too many failed login attempts. Null = not locked.
     */
    @Column({ type: 'timestamptz', nullable: true })
    lockedUntil: Date | null;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
