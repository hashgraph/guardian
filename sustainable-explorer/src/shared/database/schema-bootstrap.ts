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

    // Persist project-schema classification and resolved field config on policy_schema
    // so Step A of the improved-heuristic mapper can skip already-evaluated topics.
    await dataSource.query(`
        ALTER TABLE policy_schema
        ADD COLUMN IF NOT EXISTS "isProjectSchema" BOOLEAN DEFAULT NULL
    `);

    await dataSource.query(`
        ALTER TABLE policy_schema
        ADD COLUMN IF NOT EXISTS "projectSchemaConfig" JSONB DEFAULT NULL
    `);

    // Partial index: only covers rows that have been classified, which is the
    // exact set read at the start of every mapper run (WHERE "isProjectSchema" = TRUE).
    await dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_policy_schema_project_confirmed
        ON policy_schema ("policyTopicId")
        WHERE "isProjectSchema" = TRUE
    `);

    // Partial index: unprocessed rows — used to detect topics needing re-evaluation.
    await dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_policy_schema_unprocessed
        ON policy_schema ("policyTopicId")
        WHERE "isProjectSchema" IS NULL
    `);

    // Per-policy decode status table.
    // Tracks ZIP decode lifecycle so downstream steps (VC IPFS fetch, project mapping)
    // only run against policies whose schema import + mapping pipeline succeeded.
    await dataSource.query(`
        CREATE TABLE IF NOT EXISTS policy_decode_status (
            "policyTopicId" varchar(30) PRIMARY KEY,
            "sourceCid"     varchar(120) NOT NULL,
            status          varchar(20) NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending', 'success', 'failed')),
            error           text,
            attempts        int NOT NULL DEFAULT 0,
            "lastAttemptAt" timestamptz NOT NULL DEFAULT now(),
            "updatedAt"     timestamptz NOT NULL DEFAULT now()
        )
    `);

    await dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_policy_decode_status_status
        ON policy_decode_status (status)
    `);

    // Decode-derived methodology metadata — stored on policy_decode_status so
    // they are written atomically with the status flip and are never read from
    // business_view.businessData (which no longer contains these fields).
    await dataSource.query(`
        ALTER TABLE policy_decode_status ADD COLUMN IF NOT EXISTS "categoriesExport"           jsonb
    `);
    await dataSource.query(`
        ALTER TABLE policy_decode_status ADD COLUMN IF NOT EXISTS "sectoralScopes"             jsonb
    `);
    await dataSource.query(`
        ALTER TABLE policy_decode_status ADD COLUMN IF NOT EXISTS "emissionReductionApproach"  varchar(40)
    `);
    await dataSource.query(`
        ALTER TABLE policy_decode_status ADD COLUMN IF NOT EXISTS "schemaLabelMap"             jsonb
    `);
    await dataSource.query(`
        ALTER TABLE policy_decode_status ADD COLUMN IF NOT EXISTS "fieldMap"                   jsonb
    `);
    // Per-policy resolved project field map: { name: 'G2', country: 'G7', … }
    // where values are field keys in the confirmed project schema.
    // Null when no project schema was confirmed for this policy.
    await dataSource.query(`
        ALTER TABLE policy_decode_status ADD COLUMN IF NOT EXISTS "projectFieldMap"            jsonb
    `);
    // Geo-field key on the confirmed project schema, plus optional wrapper section.
    await dataSource.query(`
        ALTER TABLE policy_decode_status ADD COLUMN IF NOT EXISTS "projectGeoKey"              varchar(120)
    `);
    await dataSource.query(`
        ALTER TABLE policy_decode_status ADD COLUMN IF NOT EXISTS "projectGeoSection"          varchar(120)
    `);
    // schemaId (uuid) of the confirmed project schema. Null if none.
    await dataSource.query(`
        ALTER TABLE policy_decode_status ADD COLUMN IF NOT EXISTS "projectSchemaId"            varchar(255)
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
    await dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_message_mint_token_tokenid
        ON message ((documents->'credentialSubject'->0->>'tokenId'))
        WHERE type = 'VC-Document'
          AND documents IS NOT NULL
          AND (documents->'credentialSubject'->0->>'type') = 'MintToken'
    `);

    // Pre-computed MintToken → project attribution table.
    // Eliminates the grouped-project double-counting bug where a topic-scope
    // join would assign every MintToken in a shared instance topic to all
    // projects in that topic. The linker walks options.relationships to
    // resolve each mint to its specific project by sourceTimestamp.
    await dataSource.query(`
        CREATE TABLE IF NOT EXISTS project_mint_link (
            mint_consensus_timestamp VARCHAR(30)  PRIMARY KEY,
            project_source_timestamp VARCHAR(30)  NOT NULL,
            project_topic_id         VARCHAR(20)  NOT NULL,
            token_id                 VARCHAR(20),
            amount                   BIGINT,
            mint_date                TIMESTAMPTZ,
            link_method              VARCHAR(20)  NOT NULL DEFAULT 'topic_scope'
        )
    `);

    await dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_pml_project_src
            ON project_mint_link (project_source_timestamp)
    `);

    await dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_pml_token_id
            ON project_mint_link (token_id)
    `);
}
