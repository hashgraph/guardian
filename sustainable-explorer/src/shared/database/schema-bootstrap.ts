import { DataSource, DataSourceOptions } from 'typeorm';
import { getSystemDatabaseConfig } from '@shared/config/database.config';
import { hashPasswordRaw } from '@shared/security/password-hash.util';

/**
 * Post-TypeORM schema modifications that can't be expressed via decorators.
 * Runs after TypeORM's synchronize step to add:
 *   - tsvector generated column for full-text search
 *   - GIN index on tsvector
 *   - Trigram index on displayName for fuzzy search
 */
export async function bootstrapSchema(dataSource: DataSource): Promise<void> {
    // Ensure required extensions
    await dataSource.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

    // Add tsvector column to business_view if it doesn't exist.
    // This is a generated column that auto-updates whenever the source fields change.
    await dataSource.query(`
        ALTER TABLE business_view
        ADD COLUMN IF NOT EXISTS "searchVector" tsvector
        GENERATED ALWAYS AS (
            setweight(to_tsvector('english', coalesce("displayName", '')), 'A') ||
            setweight(to_tsvector('english', coalesce("registryDid", '')), 'B') ||
            setweight(to_tsvector('english', coalesce("searchText", '')), 'C')
        ) STORED
    `);

    // GIN index on tsvector for fast full-text search (O(log n) instead of O(n))
    await dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_business_view_search_vector
        ON business_view USING GIN ("searchVector")
    `);

    // Trigram index on displayName for fuzzy/similarity search
    await dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_business_view_display_name_trgm
        ON business_view USING GIN ("displayName" gin_trgm_ops)
    `);

    // Trigram index on searchText for broader fuzzy search
    await dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_business_view_search_text_trgm
        ON business_view USING GIN ("searchText" gin_trgm_ops)
    `);

    // Stable dedup key for PROJECT rows in eager mapping.
    // Nullable; partial unique index ensures no two PROJECT rows share a key.
    await dataSource.query(`
        ALTER TABLE business_view
        ADD COLUMN IF NOT EXISTS "projectKey" varchar(120)
    `);

    await dataSource.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_business_view_project_key
        ON business_view ("projectKey")
        WHERE "viewType" = 'PROJECT' AND "projectKey" IS NOT NULL
    `);

    // Partial expression index on MintToken VC tokenId — without this, the
    // credits list endpoint's LATERAL "project link" join scans all 10k+
    // VC-Documents per credit row (Postgres can't index into JSONB without
    // an expression index). With this index the lookup is O(log n).
    // Uses LIKE 'MintToken%' to capture versioned variants (e.g. MintToken&1.0.0).
    // Drop first so a stale index with the old = 'MintToken' condition is replaced.
    await dataSource.query(`DROP INDEX IF EXISTS idx_message_mint_token_tokenid`);
    await dataSource.query(`
        CREATE INDEX idx_message_mint_token_tokenid
        ON message ((documents->'credentialSubject'->0->>'tokenId'))
        WHERE type = 'VC-Document'
          AND documents IS NOT NULL
          AND (documents->'credentialSubject'->0->>'type') LIKE 'MintToken%'
    `);

    // Pre-computed MintToken → project attribution table.
    // Eliminates the grouped-project double-counting bug where a topic-scope
    // join would assign every MintToken in a shared instance topic to all
    // projects in that topic. The linker walks options.relationships to
    // resolve each mint to its specific project by projectKey.
    await dataSource.query(`
        CREATE TABLE IF NOT EXISTS project_mint_link (
            mint_consensus_timestamp VARCHAR(30)  PRIMARY KEY,
            project_key              VARCHAR(120) NOT NULL,
            project_topic_id         VARCHAR(20)  NOT NULL,
            token_id                 VARCHAR(20),
            amount                   BIGINT,
            mint_date                TIMESTAMPTZ,
            link_method              VARCHAR(20)  NOT NULL DEFAULT 'topic_scope'
        )
    `);

    // Migrate existing tables that still use the old project_source_timestamp column.
    // ADD COLUMN IF NOT EXISTS + conditional backfill + DROP COLUMN IF EXISTS are all
    // idempotent, so this runs safely on every startup.
    await dataSource.query(`
        ALTER TABLE project_mint_link
        ADD COLUMN IF NOT EXISTS project_key VARCHAR(120)
    `);
    await dataSource.query(`
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'project_mint_link'
                  AND column_name = 'project_source_timestamp'
            ) THEN
                UPDATE project_mint_link pml
                SET project_key = bv."projectKey"
                FROM business_view bv
                WHERE bv."sourceTimestamp" = pml.project_source_timestamp
                  AND bv."viewType" = 'PROJECT'
                  AND pml.project_key IS NULL;
            END IF;
        END
        $$
    `);
    await dataSource.query(`
        ALTER TABLE project_mint_link
        DROP COLUMN IF EXISTS project_source_timestamp
    `);

    await dataSource.query(`DROP INDEX IF EXISTS idx_pml_project_src`);
    await dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_pml_project_key
            ON project_mint_link (project_key)
    `);

    await dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_pml_token_id
            ON project_mint_link (token_id)
    `);

    // Partial index for the methodology LATERAL in the credits query:
    // resolves METHODOLOGY rows by relatedTopicId in O(log n) instead of a seq scan.
    await dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_business_view_methodology_topic
        ON business_view ("relatedTopicId")
        WHERE "viewType" = 'METHODOLOGY' AND "relatedTopicId" IS NOT NULL
    `);

    // GIN index backing the linkedVcs @> containment lookups used by
    // mint-project-linker (topic-keyed projects) and findActivity.
    await dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_business_view_linked_vcs
        ON business_view USING GIN (("businessData" -> 'linkedVcs'))
        WHERE "viewType" = 'PROJECT'
    `);

    await dataSource.query(`
        CREATE TABLE IF NOT EXISTS guardian_event_log (
            id           BIGSERIAL    PRIMARY KEY,
            network      VARCHAR(60)  NOT NULL,
            "instanceId" VARCHAR(120),
            subject      VARCHAR(120) NOT NULL,
            "refType"    VARCHAR(20),
            "refId"      VARCHAR(120),
            action       VARCHAR(200) NOT NULL,
            "createdAt"  TIMESTAMPTZ  NOT NULL DEFAULT now()
        )
    `);

    await dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_guardian_event_log_network_created
        ON guardian_event_log (network, "createdAt")
    `);

    await dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_guardian_event_log_subject
        ON guardian_event_log (subject)
    `);

    // ── Table: notification_watermarks ─────────────────────────────────────
    // Per-network scan progress for NotificationScanService (API-side, no
    // worker involvement). One row per event source ('issuance' today).
    // No network column needed — this whole DB is already one network.
    await dataSource.query(`
        CREATE TABLE IF NOT EXISTS "notification_watermarks" (
            "source"    varchar(30) NOT NULL,
            "lastValue" varchar(40),
            "updatedAt" timestamptz NOT NULL DEFAULT now(),
            CONSTRAINT "PK_notification_watermarks" PRIMARY KEY ("source")
        )
    `);
}

/**
 * Idempotent schema bootstrap for the system (auth/identity) database.
 *
 * Same pattern as bootstrapSchema() above — plain `CREATE ... IF NOT EXISTS`
 * raw SQL run at startup, NOT a versioned migration framework. The system DB
 * uses synchronize:false, so this function is the single source of truth for
 * its schema. Forward changes are made by appending idempotent
 * `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS` here.
 *
 * Tables (in FK-dependency order):
 *   users, refresh_tokens, api_keys, rate_limit_requests,
 *   user_dashboards, quick_filters, audit_log, auth_email_tokens
 *
 * camelCase identifiers are double-quoted so Postgres preserves the exact
 * casing the TypeORM entities expect. Text columns that hold user/admin input
 * are length-bounded (varchar) to cap payload size; server-generated hashes are
 * bounded to a safe ceiling across argon2id/bcrypt output.
 */
export async function bootstrapSystemSchema(dataSource: DataSource): Promise<void> {
    // ── Extensions ──────────────────────────────────────────────────────────
    // gen_random_uuid() backs the UUID primary-key defaults. It is built into
    // Postgres core since v13; pgcrypto provides it on older versions. Creating
    // the extension is best-effort so a missing/locked-down pgcrypto never blocks
    // boot on PG13+ (where it is unnecessary). Email uniqueness uses a
    // lower(email) functional index — no citext extension required.
    try {
        await dataSource.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[SystemBootstrap] pgcrypto extension not created (ok on PG13+): ${msg}`);
    }

    // ── Table: users ────────────────────────────────────────────────────────
    // emailVerifiedAt null = unverified (self-signup cannot sign in until set).
    // mustChangePassword = true for admin-created accounts.
    // tokenVersion bumped on password change / forced logout to invalidate JWTs.
    // failedLoginCount / lockedUntil back the brute-force lockout.
    // apiQuotaPerHour null = use the role default (GLOBAL per user, not per-network).
    await dataSource.query(`
        CREATE TABLE IF NOT EXISTS "users" (
            "id"                 uuid         NOT NULL DEFAULT gen_random_uuid(),
            "email"              varchar(320) NOT NULL,
            "passwordHash"       varchar(255) NOT NULL,
            "role"               varchar(20)  NOT NULL DEFAULT 'system_user',
            "isActive"           boolean      NOT NULL DEFAULT true,
            "emailVerifiedAt"    timestamptz           DEFAULT NULL,
            "mustChangePassword" boolean      NOT NULL DEFAULT false,
            "firstName"          varchar(120)          DEFAULT NULL,
            "lastName"           varchar(120)          DEFAULT NULL,
            "username"           varchar(60)           DEFAULT NULL,
            "organisation"       varchar(200)          DEFAULT NULL,
            "jobTitle"           varchar(120)          DEFAULT NULL,
            "country"            varchar(100)          DEFAULT NULL,
            "tokenVersion"       int          NOT NULL DEFAULT 0,
            "apiQuotaPerHour"    int                   DEFAULT NULL,
            "failedLoginCount"   int          NOT NULL DEFAULT 0,
            "lockedUntil"        timestamptz           DEFAULT NULL,
            "createdAt"          timestamptz  NOT NULL DEFAULT now(),
            "updatedAt"          timestamptz  NOT NULL DEFAULT now(),
            CONSTRAINT "PK_users" PRIMARY KEY ("id")
        )
    `);

    // ── Table: refresh_tokens ───────────────────────────────────────────────
    // Session store-of-record. tokenHash = sha256(pepper||token); bounded ceiling.
    await dataSource.query(`
        CREATE TABLE IF NOT EXISTS "refresh_tokens" (
            "id"           uuid         NOT NULL DEFAULT gen_random_uuid(),
            "userId"       uuid         NOT NULL,
            "familyId"     uuid         NOT NULL,
            "tokenHash"    varchar(255) NOT NULL,
            "sessionId"    uuid         NOT NULL,
            "status"       varchar(20)  NOT NULL DEFAULT 'active',
            "replacedById" uuid                  DEFAULT NULL,
            "userAgent"    varchar(512)          DEFAULT NULL,
            "ip"           varchar(64)           DEFAULT NULL,
            "expiresAt"    timestamptz  NOT NULL,
            "createdAt"    timestamptz  NOT NULL DEFAULT now(),
            CONSTRAINT "PK_refresh_tokens" PRIMARY KEY ("id"),
            CONSTRAINT "FK_refresh_tokens_userId"
                FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
        )
    `);

    // ── Table: api_keys ─────────────────────────────────────────────────────
    // keyHash = sha256(pepper||secret). NO role/quota snapshot — resolved live.
    await dataSource.query(`
        CREATE TABLE IF NOT EXISTS "api_keys" (
            "id"         uuid         NOT NULL DEFAULT gen_random_uuid(),
            "userId"     uuid         NOT NULL,
            "name"       varchar(120) NOT NULL,
            "prefix"     varchar(64)  NOT NULL,
            "keyHash"    varchar(255) NOT NULL,
            "status"     varchar(20)  NOT NULL DEFAULT 'active',
            "lastUsedAt" timestamptz           DEFAULT NULL,
            "expiresAt"  timestamptz           DEFAULT NULL,
            "createdAt"  timestamptz  NOT NULL DEFAULT now(),
            CONSTRAINT "PK_api_keys" PRIMARY KEY ("id"),
            CONSTRAINT "FK_api_keys_userId"
                FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
        )
    `);

    // ── Table: rate_limit_requests ──────────────────────────────────────────
    // justification (user input) and resolvedNote (admin remark) are bounded.
    await dataSource.query(`
        CREATE TABLE IF NOT EXISTS "rate_limit_requests" (
            "id"             uuid          NOT NULL DEFAULT gen_random_uuid(),
            "userId"         uuid          NOT NULL,
            "requestedQuota" int           NOT NULL,
            "justification"  varchar(2000) NOT NULL,
            "status"         varchar(20)   NOT NULL DEFAULT 'pending',
            "approvedQuota"  int                    DEFAULT NULL,
            "reviewerId"     uuid                   DEFAULT NULL,
            "resolvedNote"   varchar(1000)          DEFAULT NULL,
            "reviewedAt"     timestamptz            DEFAULT NULL,
            "createdAt"      timestamptz   NOT NULL DEFAULT now(),
            CONSTRAINT "PK_rate_limit_requests" PRIMARY KEY ("id"),
            CONSTRAINT "FK_rate_limit_requests_userId"
                FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
            CONSTRAINT "FK_rate_limit_requests_reviewerId"
                FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE SET NULL
        )
    `);

    // ── Table: user_dashboards ──────────────────────────────────────────────
    // Per-user, per-network. layout jsonb size is capped at the API/DTO layer.
    await dataSource.query(`
        CREATE TABLE IF NOT EXISTS "user_dashboards" (
            "id"        uuid         NOT NULL DEFAULT gen_random_uuid(),
            "userId"    uuid         NOT NULL,
            "network"   varchar(60)  NOT NULL,
            "name"      varchar(200) NOT NULL,
            "layout"    jsonb        NOT NULL,
            "createdAt" timestamptz  NOT NULL DEFAULT now(),
            "updatedAt" timestamptz  NOT NULL DEFAULT now(),
            CONSTRAINT "PK_user_dashboards" PRIMARY KEY ("id"),
            CONSTRAINT "FK_user_dashboards_userId"
                FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
        )
    `);

    // ── Table: quick_filters ────────────────────────────────────────────────
    // Per-user, per-network, per-section. criteria jsonb capped at the API layer.
    await dataSource.query(`
        CREATE TABLE IF NOT EXISTS "quick_filters" (
            "id"        uuid         NOT NULL DEFAULT gen_random_uuid(),
            "userId"    uuid         NOT NULL,
            "network"   varchar(60)  NOT NULL,
            "section"   varchar(20)  NOT NULL,
            "name"      varchar(200) NOT NULL,
            "criteria"  jsonb        NOT NULL,
            "createdAt" timestamptz  NOT NULL DEFAULT now(),
            CONSTRAINT "PK_quick_filters" PRIMARY KEY ("id"),
            CONSTRAINT "FK_quick_filters_userId"
                FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
        )
    `);

    // ── Table: audit_log ────────────────────────────────────────────────────
    // bigserial PK for append-only throughput. actorUserId nullable (system events).
    // ON DELETE SET NULL so audit rows survive user deletion.
    await dataSource.query(`
        CREATE TABLE IF NOT EXISTS "audit_log" (
            "id"          bigserial    NOT NULL,
            "actorUserId" uuid                  DEFAULT NULL,
            "action"      varchar(120) NOT NULL,
            "targetType"  varchar(60)           DEFAULT NULL,
            "targetId"    varchar(120)          DEFAULT NULL,
            "network"     varchar(60)           DEFAULT NULL,
            "ip"          varchar(64)           DEFAULT NULL,
            "userAgent"   varchar(512)          DEFAULT NULL,
            "outcome"     varchar(10)  NOT NULL,
            "detail"      jsonb                 DEFAULT NULL,
            "createdAt"   timestamptz  NOT NULL DEFAULT now(),
            CONSTRAINT "PK_audit_log" PRIMARY KEY ("id"),
            CONSTRAINT "FK_audit_log_actorUserId"
                FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL
        )
    `);

    // ── Table: auth_email_tokens ────────────────────────────────────────────
    // Single-use, expiring tokens for email verification (type='verify') and
    // password reset (type='reset'). tokenHash = sha256(pepper||token); the raw
    // token is emailed to the user and never stored here. usedAt enables
    // single-use enforcement; expiresAt enables expiry. The unique index on
    // tokenHash supports O(1) constant-time lookup-by-hash in the verify/reset flow.
    await dataSource.query(`
        CREATE TABLE IF NOT EXISTS "auth_email_tokens" (
            "id"        uuid         NOT NULL DEFAULT gen_random_uuid(),
            "userId"    uuid         NOT NULL,
            "type"      varchar(20)  NOT NULL,
            "tokenHash" varchar(255) NOT NULL,
            "expiresAt" timestamptz  NOT NULL,
            "usedAt"    timestamptz           DEFAULT NULL,
            "createdAt" timestamptz  NOT NULL DEFAULT now(),
            CONSTRAINT "PK_auth_email_tokens" PRIMARY KEY ("id"),
            CONSTRAINT "FK_auth_email_tokens_userId"
                FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
        )
    `);

    // ── Indexes ─────────────────────────────────────────────────────────────
    // users: case-insensitive unique email (callers also lower-case before I/O).
    await dataSource.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_users_email" ON "users" (lower("email"))`,
    );
    // users: unique username, partial so multiple NULLs are allowed.
    await dataSource.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_users_username" ON "users" ("username") WHERE "username" IS NOT NULL`,
    );

    // refresh_tokens: per-user session listing + family-wide revocation.
    await dataSource.query(
        `CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_userId" ON "refresh_tokens" ("userId")`,
    );
    await dataSource.query(
        `CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_familyId" ON "refresh_tokens" ("familyId")`,
    );

    // api_keys: unique prefix for O(1) inbound key lookup + per-user listing.
    await dataSource.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_api_keys_prefix" ON "api_keys" ("prefix")`,
    );
    await dataSource.query(
        `CREATE INDEX IF NOT EXISTS "IDX_api_keys_userId" ON "api_keys" ("userId")`,
    );

    // rate_limit_requests: per-user history.
    await dataSource.query(
        `CREATE INDEX IF NOT EXISTS "IDX_rate_limit_requests_userId" ON "rate_limit_requests" ("userId")`,
    );

    // user_dashboards: one row per (userId, network, name/type) + per-user listing.
    // Drop the old 2-column unique index (one row per user per network) so we can
    // replace it with a 3-column index (one row per user per network per type).
    await dataSource.query(
        `DROP INDEX IF EXISTS "idx_user_dashboards_user_network"`,
    );
    await dataSource.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS "idx_user_dashboards_user_network_type"
           ON "user_dashboards" ("userId", "network", "name")`,
    );
    await dataSource.query(
        `CREATE INDEX IF NOT EXISTS "IDX_user_dashboards_userId" ON "user_dashboards" ("userId")`,
    );

    // quick_filters: per-user/network listing.
    await dataSource.query(
        `CREATE INDEX IF NOT EXISTS "idx_quick_filters_user_network" ON "quick_filters" ("userId", "network")`,
    );
    await dataSource.query(
        `CREATE INDEX IF NOT EXISTS "IDX_quick_filters_userId" ON "quick_filters" ("userId")`,
    );
    // Prevents duplicate saved-search names (case-insensitive) per user/network/section.
    await dataSource.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_quick_filters_user_network_section_name"
            ON "quick_filters" ("userId", "network", "section", lower("name"))`,
    );

    // audit_log: per-actor timeline + global recent-events.
    await dataSource.query(
        `CREATE INDEX IF NOT EXISTS "idx_audit_log_actor_created" ON "audit_log" ("actorUserId", "createdAt")`,
    );
    await dataSource.query(
        `CREATE INDEX IF NOT EXISTS "IDX_audit_log_createdAt" ON "audit_log" ("createdAt")`,
    );

    // auth_email_tokens: unique hash for O(1) lookup + per-user/type listing.
    await dataSource.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_auth_email_tokens_tokenHash" ON "auth_email_tokens" ("tokenHash")`,
    );
    await dataSource.query(
        `CREATE INDEX IF NOT EXISTS "IDX_auth_email_tokens_userId_type" ON "auth_email_tokens" ("userId", "type")`,
    );

    // ── Table: watchlist_subscriptions ──────────────────────────────────────
    // Reverse index over the watchlist JSONB (user_dashboards, name='watchlist').
    // "projectKey" holds WatchlistItem.id (= business_view.id), NOT
    // project_mint_link.project_key — see NotificationScanService, which reads
    // business_view per batch to resolve mint rows' project_key to the matching
    // business_view.id before matching against this table.
    await dataSource.query(`
        CREATE TABLE IF NOT EXISTS "watchlist_subscriptions" (
            "userId"     uuid         NOT NULL,
            "network"    varchar(60)  NOT NULL,
            "projectKey" varchar(120) NOT NULL,
            "createdAt"  timestamptz  NOT NULL DEFAULT now(),
            CONSTRAINT "PK_watchlist_subscriptions" PRIMARY KEY ("userId", "network", "projectKey"),
            CONSTRAINT "FK_watchlist_subscriptions_userId"
                FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
        )
    `);

    await dataSource.query(
        `CREATE INDEX IF NOT EXISTS "idx_watchlist_subscriptions_project" ON "watchlist_subscriptions" ("network", "projectKey")`,
    );

    // ── Table: notifications ────────────────────────────────────────────────
    // "projectKey" stores business_view.id (same identifier watchlist_subscriptions
    // uses) — never project_mint_link.project_key directly. "dedupeKey" (e.g.
    // 'issuance:{mintConsensusTimestamp}') plus the UNIQUE("userId","dedupeKey")
    // constraint makes the scan-and-insert step idempotent (ON CONFLICT DO NOTHING).
    await dataSource.query(`
        CREATE TABLE IF NOT EXISTS "notifications" (
            "id"         uuid         NOT NULL DEFAULT gen_random_uuid(),
            "userId"     uuid         NOT NULL,
            "network"    varchar(60)  NOT NULL,
            "type"       varchar(20)  NOT NULL,
            "projectKey" varchar(120) NOT NULL,
            "payload"    jsonb        NOT NULL,
            "dedupeKey"  varchar(160) NOT NULL,
            "isRead"     boolean      NOT NULL DEFAULT false,
            "createdAt"  timestamptz  NOT NULL DEFAULT now(),
            CONSTRAINT "PK_notifications" PRIMARY KEY ("id"),
            CONSTRAINT "UQ_notifications_user_dedupe" UNIQUE ("userId", "dedupeKey"),
            CONSTRAINT "FK_notifications_userId"
                FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
        )
    `);

    await dataSource.query(
        `CREATE INDEX IF NOT EXISTS "idx_notifications_user_network_created" ON "notifications" ("userId", "network", "createdAt" DESC)`,
    );
    await dataSource.query(
        `CREATE INDEX IF NOT EXISTS "idx_notifications_user_unread" ON "notifications" ("userId", "network") WHERE "isRead" = false`,
    );
    // Supports NotificationScanService.pruneReadNotifications()'s
    // WHERE "isRead" = true AND "createdAt" < ... retention sweep. Without this,
    // that DELETE has no usable index and degrades into a full table scan as the
    // table grows — exactly the case retention exists to protect against.
    await dataSource.query(
        `CREATE INDEX IF NOT EXISTS "idx_notifications_read_created" ON "notifications" ("createdAt") WHERE "isRead" = true`,
    );
}

/**
 * Opens a short-lived DataSource to the system (auth/identity) DB, runs the
 * idempotent bootstrapSystemSchema above, and destroys it. Called once at API
 * boot (main.ts) after ensureSystemDatabaseExists(). Mirrors the worker's
 * bootstrapSchema(ds) pattern — the system DB uses synchronize:false, so
 * bootstrapSystemSchema is the single source of truth for its schema.
 */
export async function bootstrapSystemDatabase(): Promise<void> {
    const ds = new DataSource(getSystemDatabaseConfig() as DataSourceOptions);
    try {
        await ds.initialize();
        await bootstrapSystemSchema(ds);
        console.log('[SystemBootstrap] System schema is up to date');
    } finally {
        if (ds.isInitialized) {
            await ds.destroy();
        }
    }
}

/**
 * Idempotent: seeds ONE admin account from INITIAL_ADMIN_EMAIL +
 * INITIAL_ADMIN_PASSWORD env vars IF AND ONLY IF no active admin row exists.
 *
 * Safety invariants:
 *  - With an existing active admin → logs and returns WITHOUT writing anything.
 *    Never resets an existing admin's password.
 *  - With INITIAL_ADMIN_* unset → warns and returns WITHOUT crashing boot.
 *  - The hashed password is never printed to logs.
 *  - The seeded admin has mustChangePassword=true (forced change on first login)
 *    and emailVerifiedAt set to now() (admin-created = trusted, no email needed).
 *  - hashPasswordRaw applies PASSWORD_PEPPER consistently with the login path.
 */
export async function seedInitialAdmin(): Promise<void> {
    const email = process.env.INITIAL_ADMIN_EMAIL?.trim();
    const password = process.env.INITIAL_ADMIN_PASSWORD?.trim();

    if (!email || !password) {
        console.warn(
            '[SystemBootstrap] INITIAL_ADMIN_EMAIL or INITIAL_ADMIN_PASSWORD not set — ' +
            'skipping initial admin seed. Set both env vars to create the break-glass admin.',
        );
        return;
    }

    const ds = new DataSource(getSystemDatabaseConfig() as DataSourceOptions);
    try {
        await ds.initialize();

        // Check for any existing active admin — strict: role=admin AND isActive=true.
        const rows = await ds.query<unknown[]>(
            `SELECT 1 FROM users WHERE role = $1 AND "isActive" = true LIMIT 1`,
            ['admin'],
        );

        if (rows.length > 0) {
            console.log('[SystemBootstrap] Active admin already exists — skipping initial admin seed');
            return;
        }

        // No active admin: insert the break-glass admin. Never log the password.
        const passwordHash = await hashPasswordRaw(password);
        const normalizedEmail = email.toLowerCase();

        await ds.query(
            `INSERT INTO users
                (email, "passwordHash", role, "isActive", "emailVerifiedAt", "mustChangePassword")
             VALUES ($1, $2, 'admin', true, now(), true)`,
            [normalizedEmail, passwordHash],
        );

        console.log(
            `[SystemBootstrap] Initial admin seeded (email: ${normalizedEmail}). ` +
            'Password change required on first login.',
        );
    } finally {
        if (ds.isInitialized) {
            await ds.destroy();
        }
    }
}
