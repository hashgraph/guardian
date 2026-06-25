import { DataSource } from 'typeorm';

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
}
