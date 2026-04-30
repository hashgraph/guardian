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
}
