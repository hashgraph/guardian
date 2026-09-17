import { Logger } from '@nestjs/common';
import { DataSource, DataSourceOptions } from 'typeorm';
import { getSystemDatabaseConfig } from '@shared/config/database.config';
import { MATERIALIZED_VIEWS } from '@shared/materialized-views';
import { hashPasswordRaw } from '@shared/security/password-hash.util';

/** Rows per pass of the nft_cache."metadataTimestamp" backfill — large enough to
 *  keep the full-table walk to a handful of passes, small enough that each
 *  statement stays a short transaction on a multi-million-row table. */
const METADATA_BACKFILL_BATCH = 50_000;

/** How long the backfill may run per boot. It resumes on the next boot, and the
 *  scheduler's NFT re-sync decodes rows through the normal write path meanwhile,
 *  so a partial pass costs freshness rather than correctness. */
const METADATA_BACKFILL_BUDGET_MS = 60_000;

/** Messages scanned per pass of the message_ipfs_cid backfill (below). Batches
 *  on `message` rows, not on the unnested cid rows a batch produces, since the
 *  cursor has to advance over `message.id` regardless of how many files each
 *  message carries. */
const IPFS_CID_BACKFILL_BATCH = 50_000;
/** Same per-boot budget rationale as METADATA_BACKFILL_BUDGET_MS — this one's
 *  watermark is persisted (see message_ipfs_cid_backfill below), so unlike the
 *  nft_cache backfill a completed run costs an indexed no-op on every later
 *  boot instead of a full re-scan. */
const IPFS_CID_BACKFILL_BUDGET_MS = 60_000;

const bootstrapLogger = new Logger('SchemaBootstrap');

/**
 * Adds a column only if it's missing. ALTER TABLE needs an ACCESS EXCLUSIVE
 * lock even just to evaluate its own IF NOT EXISTS — on a table under
 * constant read/write load (token_cache, nft_cache, project_mint_link), that
 * lock request can queue for a long time and blocks every other query
 * against the table behind it meanwhile. Checking information_schema first
 * means steady state (column already present, the overwhelming common case)
 * never requests the table lock at all.
 */
async function addColumnIfMissing(
    dataSource: DataSource,
    table: string,
    column: string,
    typeSql: string,
): Promise<boolean> {
    const [existing] = await dataSource.query(
        `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
        [table, column],
    );
    if (existing) return false;
    await dataSource.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS "${column}" ${typeSql}`);
    return true;
}

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
    // Existence check first: ALTER TABLE needs an ACCESS EXCLUSIVE lock even to
    // evaluate IF NOT EXISTS, so skip the statement when already applied.
    const [searchVectorCol] = await dataSource.query(`
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'business_view' AND column_name = 'searchVector'
    `);
    if (!searchVectorCol) {
        await dataSource.query(`
            ALTER TABLE business_view
            ADD COLUMN IF NOT EXISTS "searchVector" tsvector
            GENERATED ALWAYS AS (
                setweight(to_tsvector('english', coalesce("displayName", '')), 'A') ||
                setweight(to_tsvector('english', coalesce("registryDid", '')), 'B') ||
                setweight(to_tsvector('english', coalesce("searchText", '')), 'C')
            ) STORED
        `);
    }

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
    const [projectKeyCol] = await dataSource.query(`
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'business_view' AND column_name = 'projectKey'
    `);
    if (!projectKeyCol) {
        await dataSource.query(`
            ALTER TABLE business_view
            ADD COLUMN IF NOT EXISTS "projectKey" varchar(120)
        `);
    }

    await dataSource.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_business_view_project_key
        ON business_view ("projectKey")
        WHERE "viewType" = 'PROJECT' AND "projectKey" IS NOT NULL
    `);

    // Batch project-by-IDs lookup (watchlist fetch) filters PROJECT rows by
    // sourceTimestamp = ANY(...). Without this index that's a sequential scan
    // of business_view. Not unique (unlike projectKey above) — findById()
    // already matches sourceTimestamp OR projectKey with LIMIT 1, implying
    // uniqueness isn't guaranteed here.
    await dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_business_view_source_timestamp
        ON business_view ("sourceTimestamp")
        WHERE "viewType" = 'PROJECT'
    `);

    // Partial expression index on MintToken VC tokenId — without this, the
    // credits list endpoint's LATERAL "project link" join scans all 10k+
    // VC-Documents per credit row (Postgres can't index into JSONB without
    // an expression index). With this index the lookup is O(log n).
    // Uses LIKE 'MintToken%' to capture versioned variants (e.g. MintToken&1.0.0).
    // Only drop+rebuild when the live definition doesn't already match (an old
    // deployment may still carry the stale `= 'MintToken'` condition) — this
    // runs on every worker boot, i.e. every deploy, and an unconditional rebuild
    // means re-scanning the full `message` table for no reason on every restart.
    const [mintTokenIdx] = await dataSource.query(`
        SELECT indexdef FROM pg_indexes
        WHERE schemaname = 'public' AND indexname = 'idx_message_mint_token_tokenid'
    `);
    if (!mintTokenIdx || !mintTokenIdx.indexdef.includes(`LIKE 'MintToken%'`)) {
        await dataSource.query(`DROP INDEX IF EXISTS idx_message_mint_token_tokenid`);
        // IF NOT EXISTS guards the DROP+CREATE race across concurrent boots (api + worker(s)).
        await dataSource.query(`
            CREATE INDEX IF NOT EXISTS idx_message_mint_token_tokenid
            ON message ((documents->'credentialSubject'->0->>'tokenId'))
            WHERE type = 'VC-Document'
              AND documents IS NOT NULL
              AND (documents->'credentialSubject'->0->>'type') LIKE 'MintToken%'
        `);
    }

    // Partial expression index on Token-message options->>'tokenId'. Without
    // this, the raw-data viewer's Token-message lookup (ORDER BY
    // consensusTimestamp LIMIT 1 with no supporting index on the JSONB
    // predicate) makes the planner walk the consensusTimestamp index and
    // filter row-by-row — effectively a full scan of the whole message table
    // to find one match. With this index it's a direct bitmap lookup.
    await dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_message_token_tokenid
        ON message ((options->>'tokenId'))
        WHERE type = 'Token'
    `);

    // Resolves a published methodology by its instance topic. Two hot callers:
    // PolicyStatusProcessor (once per policy-status job) and
    // resolveParentPolicyTopicId in message-process.processor.ts (once per VC
    // whose policy topic has to be walked). Without it both fall back to the
    // (type, action) index and then heap-filter every publish-policy row —
    // ~20k of them on testnet — to find one match.
    await dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_message_instance_policy_instance_topic
        ON message ((options->>'instanceTopicId'))
        WHERE type = 'Instance-Policy' AND action = 'publish-policy'
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
    // Runs only while the legacy column is present, to avoid an unconditional
    // ACCESS EXCLUSIVE lock on project_mint_link every boot after migration.
    const [legacyTimestampCol] = await dataSource.query(`
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'project_mint_link' AND column_name = 'project_source_timestamp'
    `);
    if (legacyTimestampCol) {
        await dataSource.query(`
            ALTER TABLE project_mint_link
            ADD COLUMN IF NOT EXISTS project_key VARCHAR(120)
        `);
        await dataSource.query(`
            UPDATE project_mint_link pml
            SET project_key = bv."projectKey"
            FROM business_view bv
            WHERE bv."sourceTimestamp" = pml.project_source_timestamp
              AND bv."viewType" = 'PROJECT'
              AND pml.project_key IS NULL
        `);
        await dataSource.query(`
            ALTER TABLE project_mint_link
            DROP COLUMN IF EXISTS project_source_timestamp
        `);
    }

    await dataSource.query(`DROP INDEX IF EXISTS idx_pml_project_src`);
    await dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_pml_project_key
            ON project_mint_link (project_key)
    `);

    await dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_pml_token_id
            ON project_mint_link (token_id)
    `);

    // ── Serial → mint-event mapping (Guardian NFT-metadata convention) ─────
    // Guardian base64-encodes the mint VP-Document's consensus timestamp into
    // each NFT's metadata. nft_cache."metadataTimestamp" (added via the entity)
    // holds the decoded value; the columns below link each mint row to its VP
    // and carry the serial-count reconciliation computed by serial-mint-linker.
    await addColumnIfMissing(dataSource, 'project_mint_link', 'vp_consensus_timestamp', 'VARCHAR(30)');
    await addColumnIfMissing(dataSource, 'project_mint_link', 'serial_count', 'INT');
    await addColumnIfMissing(dataSource, 'project_mint_link', 'serial_retired_count', 'INT');
    // Serials of this mint no longer held by the token's treasury and not
    // retired — i.e. transferred to a third party. Non-fungible only: fungible
    // balances can't be traced back to the mint that created them.
    await addColumnIfMissing(dataSource, 'project_mint_link', 'serial_transferred_count', 'INT');
    // Real amount actually minted on-chain, in display units: the serial count
    // for non-fungible tokens, the summed mint-transaction amount scaled by
    // token decimals for fungible ones. NUMERIC because fungible amounts are
    // fractional once decimals are applied.
    await addColumnIfMissing(dataSource, 'project_mint_link', 'minted_amount', 'NUMERIC');
    // verified | mismatch | unmatched | ambiguous | NULL (= no VP resolved yet).
    // Named for the mint, not the serial: fungible mints are reconciled too and
    // have no serials. Renamed in place so databases carrying the earlier
    // serial_match_status keep their values instead of silently resetting.
    await dataSource.query(`
        DO $$
        BEGIN
            IF EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'project_mint_link'
                         AND column_name = 'serial_match_status')
               AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                               WHERE table_name = 'project_mint_link'
                                 AND column_name = 'mint_match_status') THEN
                ALTER TABLE project_mint_link
                    RENAME COLUMN serial_match_status TO mint_match_status;
            END IF;
        END
        $$
    `);
    await addColumnIfMissing(dataSource, 'project_mint_link', 'mint_match_status', 'VARCHAR(16)');
    await dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_pml_vp_ts
            ON project_mint_link (vp_consensus_timestamp)
            WHERE vp_consensus_timestamp IS NOT NULL
    `);

    // Add the decoded-timestamp column here as well as on the entity:
    // bootstrapSchema also runs BEFORE TypeORM synchronize (worker pre-boot,
    // guardian-sync with synchronize off), so the backfill/index below cannot
    // rely on synchronize having created it. Same type as the entity column.
    await addColumnIfMissing(dataSource, 'nft_cache', 'metadataTimestamp', 'varchar(30)');
    // Current holder per serial. Declared here as well as on the entity for the
    // same reason as metadataTimestamp: bootstrapSchema also runs before
    // TypeORM synchronize, and in guardian-sync where synchronize is off.
    await addColumnIfMissing(dataSource, 'nft_cache', 'accountId', 'varchar(30)');

    // Backfill nft_cache."metadataTimestamp" for rows synced before the column
    // existed. Set-based and batched: nft_cache holds millions of rows, so the
    // per-row plpgsql loop this replaces was orders of magnitude too slow.
    //
    // Two guards make decoding safe to run over a whole batch at once:
    //   - the length/charset prefilter keeps decode() off anything that isn't
    //     base64 of a 20-char consensus timestamp (IPFS CIDs are 56/64/84 chars),
    //   - LATIN1 rather than UTF8, because convert_from(..., 'UTF8') *throws* on
    //     non-UTF8 bytes and would abort the whole statement. Every byte is valid
    //     LATIN1, and only pure-ASCII results survive the timestamp regex, so the
    //     two are equivalent for values we accept.
    // Idempotent — only touches rows still NULL, so re-runs settle at zero.
    //
    // The loop walks an `id` watermark rather than re-querying "still NULL"
    // rows: a candidate that decodes to something other than a timestamp is
    // deliberately left NULL, so a NULL-driven loop would re-select it forever.
    //
    // Time-budgeted, because this must not hold up boot: a cold 5M-row table
    // costs ~4s per batch just to find candidates, so a full pass can run for
    // tens of minutes. Whatever is left over is not lost — the sync scheduler
    // re-syncs every NFT token from serial 0, which rewrites metadataTimestamp
    // through the normal upsert path, and the next boot resumes here. Until a
    // mint's serials are decoded the linker simply reports it 'unmatched'.
    const backfillDeadline = Date.now() + METADATA_BACKFILL_BUDGET_MS;
    let backfillCursor = '0';
    let backfilled = 0;
    let backfillDone = true;
    for (; ;) {
        if (Date.now() > backfillDeadline) {
            backfillDone = false;
            break;
        }
        const [batch]: Array<{ max_id: string | null; seen: string }> = await dataSource.query(
            `
            WITH candidate AS (
                SELECT id, convert_from(decode(metadata, 'base64'), 'LATIN1') AS ts
                FROM nft_cache
                WHERE metadata IS NOT NULL
                  AND "metadataTimestamp" IS NULL
                  AND id > $1::bigint
                  AND length(metadata) = 28
                  AND metadata ~ '^[A-Za-z0-9+/]{27}=$'
                ORDER BY id
                LIMIT ${METADATA_BACKFILL_BATCH}
            ), applied AS (
                UPDATE nft_cache SET "metadataTimestamp" = c.ts
                FROM candidate c
                WHERE nft_cache.id = c.id AND c.ts ~ '^\\d{10}\\.\\d{9}$'
                RETURNING 1
            )
            SELECT MAX(id)::text AS max_id, COUNT(*)::text AS seen FROM candidate
            `,
            [backfillCursor],
        );
        if (!batch || batch.seen === '0' || batch.max_id === null) {
            break;
        }
        backfilled += Number(batch.seen);
        backfillCursor = batch.max_id;
    }
    if (backfilled > 0) {
        bootstrapLogger.log(
            `nft_cache.metadataTimestamp backfill: ${backfilled} row(s) this pass` +
            (backfillDone ? ' (complete)' : ' — time budget reached, resuming next boot'),
        );
    }

    // Serial lookup per mint event: (tokenId, metadataTimestamp) equality join
    // from project_mint_link — partial, most non-Guardian serials are NULL.
    await dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_nft_cache_metadata_ts
        ON nft_cache ("tokenId", "metadataTimestamp")
        WHERE "metadataTimestamp" IS NOT NULL
    `);

    // ── IPFS CID relationship (message_ipfs_cid) ────────────────────────────
    // GET /:network/ipfs-status's default (unfiltered) view used to unnest
    // message.files across the ENTIRE message table on every request — cost
    // scales with total message count, not the 20 rows the panel shows. At
    // scale this exceeds the API's own statement_timeout outright (measured
    // 38.9s vs a 15s timeout at 3.4M messages locally). This table precomputes
    // the (cid, message) relationship incrementally at ingestion time (see the
    // reconcile step in message-process.processor.ts) so the API can do a
    // plain indexed, paginated SELECT against a table sized to the CID count
    // instead of a live unnest() over a table that only ever grows.
    //
    // No FK to message(id) — consistent with every other per-network derived
    // table in this file (project_mint_link, contract_cache, etc.), none of
    // which reference message despite several being keyed by message data.
    // message is the hottest table in the system; an FK here would tax every
    // write against it to maintain a constraint nothing actually needs, since
    // message rows are never deleted and their id is stable across upsert.
    await dataSource.query(`
        CREATE TABLE IF NOT EXISTS message_ipfs_cid (
            cid           text        NOT NULL,
            "messageId"   bigint      NOT NULL,
            "topicId"     varchar(20) NOT NULL,
            "messageType" varchar(50) NOT NULL,
            CONSTRAINT "PK_message_ipfs_cid" PRIMARY KEY (cid, "messageId")
        )
    `);
    // Serves the already-fast topicId-filtered query shape (today: 4.6ms at
    // 3.4M messages once topicId prunes message before unnesting — this index
    // gives the same win with no unnest step at all).
    await dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_message_ipfs_cid_topic
        ON message_ipfs_cid ("topicId")
    `);
    // The PK's leading column (cid) already serves cid-only lookups/filters —
    // this index is for the reconcile step's per-message DELETE (below and in
    // message-process.processor.ts), which filters on messageId alone and
    // runs on every message upsert. Without it that DELETE is a full scan of
    // this (multi-million-row, at scale) table on every single ingested
    // message.
    await dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_message_ipfs_cid_message
        ON message_ipfs_cid ("messageId")
    `);

    // Denormalized fetch status ('fetched' | 'failed' | 'pending'), kept in sync
    // by whatever writes to ipfs_files/ipfs_fetch_failure (ipfs-fetch.processor.ts,
    // IpfsFetchFailureRepository, and the admin retry endpoints in
    // queue-status.controller.ts / mapping-reprocess.service.ts — see each for
    // its own reconcile call). This exists ONLY so ordering by status can be
    // index-driven: the original derived form (`CASE WHEN ipfs.cid IS NOT NULL
    // THEN 'fetched' ...`) spans two joined tables and can't be indexed at all,
    // so `ORDER BY <that CASE> LIMIT 20` always had to fully sort every matching
    // row before applying LIMIT — measured 30.1s even after message_ipfs_cid
    // made the row *scan* itself cheap. A real column fixes the indexing half;
    // see the default `sortDir` flip in queue-status.controller.ts for the
    // other half (this column alone doesn't help while the default direction
    // still visits 'pending' — ~97% of rows — before the two small groups).
    await addColumnIfMissing(
        dataSource, 'message_ipfs_cid', 'status', `varchar(10) NOT NULL DEFAULT 'pending'`,
    );
    await dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_message_ipfs_cid_status
        ON message_ipfs_cid (status)
    `);

    // Persisted backfill progress. Unlike the nft_cache backfill above (which
    // resets its cursor to 0 every boot and relies on "metadataTimestamp IS
    // NULL" to cheaply skip already-done rows), message_ipfs_cid has no such
    // per-row marker on `message` to test "already backfilled" without an
    // anti-join against a multi-million-row table — so the watermark itself
    // has to survive restarts, or every boot after completion would re-pay a
    // full scan just to confirm there's nothing left to do.
    await dataSource.query(`
        CREATE TABLE IF NOT EXISTS message_ipfs_cid_backfill (
            source       varchar(30) NOT NULL,
            "lastValue"  varchar(40),
            "updatedAt"  timestamptz NOT NULL DEFAULT now(),
            CONSTRAINT "PK_message_ipfs_cid_backfill" PRIMARY KEY (source)
        )
    `);

    const [ipfsCidWatermark] = await dataSource.query(
        `SELECT "lastValue" FROM message_ipfs_cid_backfill WHERE source = 'message_ipfs_cid'`,
    );
    let ipfsCidCursor: string = ipfsCidWatermark?.lastValue ?? '0';
    let ipfsCidBackfilled = 0;
    let ipfsCidBackfillDone = true;
    const ipfsCidBackfillDeadline = Date.now() + IPFS_CID_BACKFILL_BUDGET_MS;
    for (; ;) {
        if (Date.now() > ipfsCidBackfillDeadline) {
            ipfsCidBackfillDone = false;
            break;
        }
        // Batches on message rows (not the cid rows they unnest into) so the
        // cursor advances by a predictable amount regardless of how many
        // files any one message carries. ON CONFLICT DO NOTHING makes this
        // safe to re-run over a range already covered by the live write path
        // (e.g. a message ingested after this boot's cursor was last read).
        const [batch]: Array<{ max_id: string | null; seen: string }> = await dataSource.query(
            `
            WITH candidate AS (
                SELECT id, "topicId", type, files
                FROM message
                WHERE files IS NOT NULL
                  AND id > $1::bigint
                ORDER BY id
                LIMIT ${IPFS_CID_BACKFILL_BATCH}
            ), inserted AS (
                INSERT INTO message_ipfs_cid (cid, "messageId", "topicId", "messageType")
                SELECT unnest(c.files), c.id, c."topicId", c.type
                FROM candidate c
                ON CONFLICT (cid, "messageId") DO NOTHING
                RETURNING 1
            )
            SELECT MAX(id)::text AS max_id, COUNT(*)::text AS seen FROM candidate
            `,
            [ipfsCidCursor],
        );
        if (!batch || batch.seen === '0' || batch.max_id === null) {
            break;
        }
        ipfsCidBackfilled += Number(batch.seen);
        ipfsCidCursor = batch.max_id;
    }
    await dataSource.query(
        `INSERT INTO message_ipfs_cid_backfill (source, "lastValue", "updatedAt")
         VALUES ('message_ipfs_cid', $1, now())
         ON CONFLICT (source) DO UPDATE SET "lastValue" = EXCLUDED."lastValue", "updatedAt" = now()`,
        [ipfsCidCursor],
    );
    if (ipfsCidBackfilled > 0) {
        bootstrapLogger.log(
            `message_ipfs_cid backfill: ${ipfsCidBackfilled} message(s) this pass` +
            (ipfsCidBackfillDone ? ' (complete)' : ' — time budget reached, resuming next boot'),
        );
    }

    // Sync message_ipfs_cid.status for any row the two backfills above just
    // inserted with the column's 'pending' default. Must run AFTER the row
    // backfill, not gated to "only once when the column was first added": the
    // row backfill can span many boots, so a row inserted on a later boot needs
    // this too, and a status column added mid-way through a still-running row
    // backfill would otherwise never correct rows backfilled afterward. Safe
    // and cheap to run unconditionally every boot — bounded by ipfs_files/
    // ipfs_fetch_failure's size (small, tens of thousands of rows even at
    // 3.4M-message scale), not by message_ipfs_cid's.
    const [{ count: ipfsCidFetchedSynced }] = await dataSource.query(`
        WITH updated AS (
            UPDATE message_ipfs_cid mc SET status = 'fetched'
            FROM ipfs_files i
            WHERE i.cid = mc.cid AND mc.status <> 'fetched'
            RETURNING 1
        )
        SELECT COUNT(*)::text AS count FROM updated
    `);
    const [{ count: ipfsCidFailedSynced }] = await dataSource.query(`
        WITH updated AS (
            UPDATE message_ipfs_cid mc SET status = 'failed'
            FROM ipfs_fetch_failure f
            WHERE f.cid = mc.cid AND mc.status = 'pending'
            RETURNING 1
        )
        SELECT COUNT(*)::text AS count FROM updated
    `);
    if (Number(ipfsCidFetchedSynced) > 0 || Number(ipfsCidFailedSynced) > 0) {
        bootstrapLogger.log(
            `message_ipfs_cid.status sync: ${ipfsCidFetchedSynced} -> fetched, ${ipfsCidFailedSynced} -> failed`,
        );
    }

    // ── Fungible mint transactions ─────────────────────────────────────────
    // Fungible tokens have no per-unit metadata, so Guardian carries the mint
    // VP-Document's consensus timestamp in the TOKENMINT transaction memo
    // instead. This table is the fungible counterpart of nft_cache: one row per
    // on-chain mint transaction, holding the real amount the ledger minted.
    await dataSource.query(`
        CREATE TABLE IF NOT EXISTS token_mint_tx (
            consensus_timestamp    VARCHAR(30) PRIMARY KEY,
            token_id               VARCHAR(30) NOT NULL,
            vp_consensus_timestamp VARCHAR(30),
            amount_raw             NUMERIC     NOT NULL,
            last_update            BIGINT      NOT NULL
        )
    `);
    await dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_tmt_token_vp
            ON token_mint_tx (token_id, vp_consensus_timestamp)
    `);
    // Highest TOKENMINT consensus timestamp already ingested for this token, so
    // each sync pass asks Mirror Node only for transactions newer than that.
    await addColumnIfMissing(dataSource, 'token_cache', 'mintTxWatermark', 'VARCHAR(30)');

    // ── Retirement ledger ──────────────────────────────────────────────────
    // Guardian deploys a RETIRE smart contract per policy; executing a
    // retirement emits an on-chain event naming the retiring account, the
    // token, the fungible amount and — for non-fungible tokens — the exact
    // serials. That is a documented retirement record, as opposed to inferring
    // retirement from Mirror Node's nft_cache.deleted flag.
    await dataSource.query(`
        CREATE TABLE IF NOT EXISTS contract_cache (
            contract_id   VARCHAR(30) PRIMARY KEY,
            contract_type VARCHAR(20),
            topic_id      VARCHAR(20),
            owner         VARCHAR(200),
            log_watermark VARCHAR(30),
            last_update   BIGINT NOT NULL
        )
    `);
    await dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_contract_cache_type ON contract_cache (contract_type)
    `);
    // One row per (event, token). log_index is part of the key because a single
    // transaction can retire several tokens, and the same event is echoed more
    // than once in Mirror Node's log feed.
    await dataSource.query(`
        CREATE TABLE IF NOT EXISTS token_retire_event (
            consensus_timestamp VARCHAR(30) NOT NULL,
            log_index           INT         NOT NULL,
            token_id            VARCHAR(30) NOT NULL,
            contract_id         VARCHAR(30) NOT NULL,
            account_id          VARCHAR(30),
            amount              NUMERIC,
            serials             INT[],
            PRIMARY KEY (consensus_timestamp, log_index, token_id)
        )
    `);
    // The retiring party is named by EVM address. A key-derived (ECDSA) address
    // resolves to an account ID through the mirror node, but when the ledger does
    // not know it the 42-character address is kept as the identifier, which does
    // not fit the original account-ID-sized column. The width is checked first:
    // ALTER TABLE takes an ACCESS EXCLUSIVE lock even when it changes nothing,
    // and this runs on every boot.
    const [accountIdCol]: Array<{ character_maximum_length: number | null }> = await dataSource.query(`
        SELECT character_maximum_length FROM information_schema.columns
        WHERE table_name = 'token_retire_event' AND column_name = 'account_id'
    `);
    if (accountIdCol && (accountIdCol.character_maximum_length ?? 0) < 42) {
        await dataSource.query(`
            ALTER TABLE token_retire_event ALTER COLUMN account_id TYPE VARCHAR(42)
        `);
    }
    await dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_tre_token ON token_retire_event (token_id)
    `);

    // ── Transfer ledger ────────────────────────────────────────────────────
    // Guardian writes no transfer document, so the only record of a credit
    // changing hands is the Hedera CRYPTOTRANSFER itself. One row per
    // (transaction, serial): a single distribution moves many serials at once,
    // and the per-serial grain is what lets a transfer be tied back to the mint
    // event that created the serial.
    await dataSource.query(`
        CREATE TABLE IF NOT EXISTS token_transfer_event (
            consensus_timestamp VARCHAR(30) NOT NULL,
            token_id            VARCHAR(30) NOT NULL,
            serial_number       INT         NOT NULL,
            sender_account_id   VARCHAR(30),
            receiver_account_id VARCHAR(30),
            PRIMARY KEY (consensus_timestamp, token_id, serial_number)
        )
    `);
    await dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_tte_token_serial
            ON token_transfer_event (token_id, serial_number)
    `);
    // Retired credits are a tiny fraction of all serials (6.5k of 5M on
    // testnet), so the retirement aggregates read them through a partial index
    // rather than scanning every serial ever minted.
    await dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_nft_cache_deleted
            ON nft_cache ("tokenId", "serialNumber", "metadataTimestamp")
            WHERE deleted
    `);
    // Highest CRYPTOTRANSFER consensus timestamp already scanned for this
    // token's TREASURY, so each pass asks Mirror Node only for newer transfers.
    //
    // Held per token but written per treasury: Mirror Node has no per-token
    // transfer feed, and one registry treasury commonly issues hundreds of
    // tokens (the busiest testnet account backs 1,072). A single walk of that
    // account therefore serves all of them and advances every row's watermark
    // together, so every token of a treasury always carries the same value.
    // --- Topic poll scheduling (TOPIC_POLL_MODE=dispatcher) -----------------
    //
    // Moves a topic's polling schedule out of BullMQ and into its own row.
    //
    // Today a topic keeps polling only because each topic-sync job enqueues its
    // successor, so ~100k idle testnet topics sit in Redis as ~100k perpetually
    // re-created delayed jobs — a structural floor of tens of jobs per second
    // that scales with topic COUNT, not with activity, and that no amount of
    // concurrency removes. With these columns the queue holds only the topics
    // that are due right now; Postgres holds the schedule.
    //
    // Written in both modes so the switch has no cold start: in `chain` mode the
    // processors keep their self-enqueue chains AND maintain nextPollAt, so the
    // dispatcher has a fully populated schedule the moment it is enabled.
    await addColumnIfMissing(dataSource, 'topic_cache', 'nextPollAt', 'TIMESTAMPTZ');
    // Current backoff for this topic, in seconds. The processors own it (they
    // compute the empty-poll backoff); the dispatcher only reads it to re-arm
    // nextPollAt when it hands a topic out.
    await addColumnIfMissing(dataSource, 'topic_cache', 'pollIntervalSec', 'INT NOT NULL DEFAULT 30');
    // Non-zero jumps a topic to the front of the next dispatch and routes it to
    // the priority lane — how a Guardian event asks for "poll this one now".
    // Named pollPriority to stay clear of the unrelated priority* columns.
    await addColumnIfMissing(dataSource, 'topic_cache', 'pollPriority', 'SMALLINT NOT NULL DEFAULT 0');
    // Partial index: the dispatcher's only query is "due, not disabled, most
    // urgent first". Excluding DISABLED rows keeps the index to the working set.
    await dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_topic_cache_next_poll
        ON topic_cache ("pollPriority" DESC, "nextPollAt")
        WHERE status <> 'DISABLED'
    `);

    await addColumnIfMissing(dataSource, 'token_cache', 'transferTxWatermark', 'VARCHAR(30)');
    // Lower bound for a treasury walk: no transfer of a token can predate the
    // token. Without it a sweep starts at genesis and pages through years of
    // unrelated account activity.
    await addColumnIfMissing(dataSource, 'token_cache', 'createdTimestamp', 'VARCHAR(30)');
    // Seed it for tokens cached before the column existed, so the first sweep
    // does not have to wait for every token to re-sync. A token's first mint is
    // a sound lower bound — serials cannot move before they exist — and the
    // token's next sync replaces it with the true creation timestamp. Done here,
    // once, because the sweep reads this column thousands of times per pass and
    // must stay a single-table lookup.
    await dataSource.query(`
        UPDATE token_cache tc
        SET "createdTimestamp" = pml.earliest_mint
        FROM (
            SELECT token_id, MIN(mint_consensus_timestamp) AS earliest_mint
            FROM project_mint_link
            WHERE token_id IS NOT NULL
            GROUP BY token_id
        ) pml
        WHERE tc."tokenId" = pml.token_id
          AND tc."createdTimestamp" IS NULL
    `);
    // Superseded by the per-treasury watermark above. Held nothing that is not
    // recomputable from token_cache, so dropping it loses no ingested data.
    await dataSource.query(`DROP TABLE IF EXISTS treasury_transfer_scan`);

    // Backs the VC→VP reverse lookup in serial-mint-linker:
    // options->'relationships' @> to_jsonb(mint_consensus_timestamp).
    await dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_message_vp_relationships
        ON message USING GIN ((options->'relationships') jsonb_path_ops)
        WHERE type = 'VP-Document'
    `);

    // Partial index for the methodology LATERAL in the credits query:
    // resolves METHODOLOGY rows by relatedTopicId in O(log n) instead of a seq scan.
    await dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_business_view_methodology_topic
        ON business_view ("relatedTopicId")
        WHERE "viewType" = 'METHODOLOGY' AND "relatedTopicId" IS NOT NULL
    `);

    // Same LATERAL's displayName fallback branch (relatedTopicId not yet
    // linked) was falling through to the trigram GIN index on displayName
    // (built for ILIKE/similarity), which serves an exact `=` match at ~24ms
    // via a bitmap scan instead of microseconds. A plain partial btree gives
    // the planner a cheap exact-match path for this branch.
    await dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_business_view_methodology_display_name
        ON business_view ("displayName")
        WHERE "viewType" = 'METHODOLOGY'
    `);

    // Backs the methodology list's lifecycle-status filter. Only METHODOLOGY rows
    // that carry a discontinuation date are indexed, so a Discontinued / To be 
    // Discontinued filter reads those rows instead of scanning the whole table 
    // for a jsonb value.
    await dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_business_view_methodology_discontinued
        ON business_view (id)
        WHERE "viewType" = 'METHODOLOGY' AND ("businessData"->>'discontinuedAt') IS NOT NULL
    `);

    // GIN index backing the linkedVcs @> containment lookups used by
    // mint-project-linker (topic-keyed projects) and findActivity.
    await dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_business_view_linked_vcs
        ON business_view USING GIN (("businessData" -> 'linkedVcs'))
        WHERE "viewType" = 'PROJECT'
    `);

    // GIN index backing the sdgs @> containment lookups (contains-any filter
    // on GET /projects), mirroring the linkedVcs index above.
    await dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_business_view_sdgs
        ON business_view USING GIN (("businessData" -> 'sdgs'))
        WHERE "viewType" = 'PROJECT'
    `);

    // Expression index on PROJECT rows' businessData->>'instanceTopicId'.
    // Without this, every "projects belonging to this methodology instance"
    // lookup (the methodology list's lifecycle LATERAL, findById's issuance
    // query, the project detail credit fallback) is a sequential scan of
    // every PROJECT row extracting the jsonb field on the fly. On the
    // methodology list endpoint this scan repeats once per LATERAL per
    // returned row, which is what made the Testnet methodologies page take
    // 20+ seconds to respond.
    await dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_business_view_project_instance_topic
        ON business_view ((("businessData"->>'instanceTopicId')))
        WHERE "viewType" = 'PROJECT'
    `);

    await dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_business_view_project_policy_topic
        ON business_view ((("businessData"->>'policyTopicId')))
        WHERE "viewType" = 'PROJECT'
    `);

    // Backs the Projects list's sector/sectoralScope filters, now that they're
    // real server-side query params instead of client-side-only filtering.
    await dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_business_view_project_sector
        ON business_view ((("businessData"->>'sector')))
        WHERE "viewType" = 'PROJECT'
    `);
    await dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_business_view_project_sectoral_scope
        ON business_view ((("businessData"->>'sectoralScope')))
        WHERE "viewType" = 'PROJECT'
    `);

    // Btree on the vintage-year cast expression — unlike the ilike/GIN filters
    // above, a range predicate (>=/<=) can actually use a btree index.
    await dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_business_view_project_vintage_year
        ON business_view (((NULLIF("businessData"->>'vintage', '')::int)))
        WHERE "viewType" = 'PROJECT'
    `);

    // Expression index on CREDIT rows' businessData->>'tokenId', backing the
    // credits list's token->registry LATERAL lookup in O(log n).
    await dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_business_view_credit_token_id
        ON business_view ((("businessData"->>'tokenId')))
        WHERE "viewType" = 'CREDIT'
    `);

    // Full-precision project boundary geometry, kept OUT of business_view's
    // "businessData" jsonb deliberately — a boundary can run to hundreds of KB
    // (real-world exports have hit tens of thousands of vertices), and that
    // column is read by every project list/search query. This table is only
    // ever read by the single project-detail fetch, keyed by project_key, so
    // its size has no effect on list/search performance. Stored and served at
    // full precision — no point is ever dropped, the project detail page's
    // map renders every vertex.
    await dataSource.query(`
        CREATE TABLE IF NOT EXISTS project_geometry (
            project_key  VARCHAR(120) PRIMARY KEY,
            geo_type     VARCHAR(20)  NOT NULL,
            geojson      JSONB        NOT NULL,
            point_count  INTEGER      NOT NULL,
            updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
        )
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

    // Backs the canonical-row dedup on the METHODOLOGY / REGISTRY lists, which
    // order by ("sourceTimestamp")::numeric. The cast means the plain column
    // indexes can't serve it, and the sourceTimestamp index above is partial on
    // viewType='PROJECT'.
    await dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_business_view_methodology_canonical
        ON business_view ("relatedTopicId", (("sourceTimestamp")::numeric) DESC, id DESC)
        WHERE "viewType" = 'METHODOLOGY' AND "relatedTopicId" IS NOT NULL
    `);

    await dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_business_view_registry_canonical
        ON business_view ("registryDid", (("sourceTimestamp")::numeric) DESC, id DESC)
        WHERE "viewType" = 'REGISTRY' AND "registryDid" IS NOT NULL
    `);

    // Backs the default `bv."createdAt" DESC NULLS LAST` list ordering.
    await dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_business_view_view_type_created
        ON business_view ("viewType", "createdAt" DESC)
    `);

    // Backs the credits list's default ordering. The predicate matches the
    // list's base filter exactly, so the planner can walk this index in
    // consensus-timestamp order and stop at LIMIT instead of joining and
    // sorting every mint event.
    await dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_message_mint_token_cts
        ON message ("consensusTimestamp" DESC)
        WHERE type = 'VC-Document'
          AND documents IS NOT NULL
          AND (documents->'credentialSubject'->0->>'type') LIKE 'MintToken%'
    `);

    // Backs the raw-data viewer's findRawMintRows: WHERE tokenId = $1 ORDER BY
    // consensusTimestamp ASC. Without this, the planner walks
    // idx_message_mint_token_cts (ordered by consensusTimestamp only) and
    // discards every other token's MintToken rows one by one to find this
    // token's — measured discarding 2,627 of 2,633 rows for a single lookup.
    // Composite so the equality filter and the ORDER BY are served by one
    // index scan, with cost bounded by this token's own mint count rather
    // than total MintToken volume.
    await dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_message_mint_token_tokenid_cts
        ON message ((documents->'credentialSubject'->0->>'tokenId'), "consensusTimestamp")
        WHERE type = 'VC-Document'
          AND documents IS NOT NULL
          AND (documents->'credentialSubject'->0->>'type') LIKE 'MintToken%'
    `);

    // Backs the Network Activity feed's "Credit Retired" branch — same shape
    // as idx_message_mint_token_cts, matching WipeToken VCs instead.
    await dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_message_wipe_token_cts
        ON message ("consensusTimestamp" DESC)
        WHERE type = 'VC-Document'
          AND documents IS NOT NULL
          AND (documents->'credentialSubject'->0->>'type') LIKE 'WipeToken%'
    `);

    // Backs the Network Activity feed's "Methodology Registered" branch.
    await dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_message_published_policy_cts
        ON message ("consensusTimestamp" DESC)
        WHERE type = 'Instance-Policy' AND action = 'publish-policy'
    `);

    // Backs the Network Activity feed's "Registry Registered" branch.
    await dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_message_standard_registry_cts
        ON message ("consensusTimestamp" DESC)
        WHERE type = 'Standard Registry'
    `);

    // Back the Network Activity feed's registry-scoped "Methodology
    // Registered"/"Registry Registered" branches (PgActivityRepository
    // filters by the resolved registryDid, not display name — see the
    // repository's own comment on why display-name filtering through a join
    // defeats bind-parameter planning). Without these, a registry-filtered
    // request falls back to idx_message_published_policy_cts/
    // idx_message_standard_registry_cts's time-only ordering and has to scan
    // every matching message (20k+/16k+ rows) to find the registry's own —
    // measured at 217/80ms per branch even after the query-shape fix.
    // Expression + composite ordering lets Postgres seek directly to one
    // registryDid's rows, already time-sorted: measured at <1ms per branch
    // for a single-DID registry, versus that scan.
    await dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_message_published_policy_owner_cts
        ON message (COALESCE(owner, options->>'did'), "consensusTimestamp" DESC)
        WHERE type = 'Instance-Policy' AND action = 'publish-policy'
    `);
    await dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_message_standard_registry_owner_cts
        ON message (COALESCE(owner, options->>'did'), "consensusTimestamp" DESC)
        WHERE type = 'Standard Registry'
    `);

    // Resolves a token's creation message by token id — the token/issuance
    // detail pages read the creation date and issuer DID from it.
    //
    // Without this the planner falls back to idx_message_other_activity_cts and
    // walks the whole Token partition applying the jsonb filter row by row:
    // measured at 1,120 ms and 222,118 rows discarded on testnet for a single
    // lookup. As an expression index it is a straight probe.
    await dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_message_token_options_token_id
        ON message ((options->>'tokenId'))
        WHERE type = 'Token'
    `);

    // Backs the Network Activity feed's "Other" bucket (Token / DID-Document /
    // VP-Document / Role-Document).
    await dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_message_other_activity_cts
        ON message ("consensusTimestamp" DESC)
        WHERE type IN ('Token', 'DID-Document', 'VP-Document', 'Role-Document')
    `);

    // Backs the credits search: ILIKE '%term%' on tc.name / tc.symbol plus
    // similarity() on tc.name.
    await dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_token_cache_name_trgm
        ON token_cache USING GIN (name gin_trgm_ops)
    `);

    await dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_token_cache_symbol_trgm
        ON token_cache USING GIN (symbol gin_trgm_ops)
    `);

    // POLICY_DECODE_STATUS_JOIN and the credits METHODOLOGY_JOIN's nested
    // subquery both look up `policy` by policyTopicId ordered by updatedAt.
    await dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_policy_topic_updated
        ON policy ("policyTopicId", "updatedAt" DESC)
    `);

    // Backs the MRV data endpoint's topicId + schema-UUID scope. split_part is
    // immutable, so it is indexable as an expression.
    await dataSource.query(`
        CREATE INDEX IF NOT EXISTS idx_message_mrv_topic_schema
        ON message ("topicId", (split_part(documents->'credentialSubject'->0->>'type', '&', 1)))
        WHERE type = 'VC-Document'
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

    // MintToken VC amounts can be fractional for fungible tokens ("250.5"); the
    // original BIGINT forced the linker to round and lose the fraction.
    //
    // The materialized views read this column, so Postgres refuses the type
    // change while they exist. They are dropped and rebuilt around it here
    // rather than left to MvRefreshProcessor: bootstrapSchema also runs in
    // guardian-sync, which has no refresh loop to put them back. Their
    // mv_registry hashes are cleared so the refresh processor still owns
    // definition changes from here on.
    //
    // Kept as the last thing bootstrapSchema does: the materialized view
    // definitions reach across most of this function's tables/columns (e.g.
    // mv_project_stats reads nft_cache."metadataTimestamp" and
    // token_retire_event), so rebuilding them has to run after everything
    // else here has ensured its column/table exists — running this earlier
    // dropped every materialized view and then failed to recreate them
    // because a dependency further down the function hadn't run yet,
    // leaving the database without any materialized views at all.
    const [amountCol]: Array<{ data_type: string }> = await dataSource.query(`
        SELECT data_type FROM information_schema.columns
        WHERE table_name = 'project_mint_link' AND column_name = 'amount'
    `);
    if (amountCol && amountCol.data_type !== 'numeric') {
        for (const mv of [...MATERIALIZED_VIEWS].reverse()) {
            await dataSource.query(`DROP MATERIALIZED VIEW IF EXISTS ${mv.name} CASCADE`);
        }
        await dataSource.query(`
            ALTER TABLE project_mint_link ALTER COLUMN amount TYPE NUMERIC USING amount::numeric
        `);
        for (const mv of MATERIALIZED_VIEWS) {
            await dataSource.query(mv.createSql);
            if (mv.indexSql) {
                await dataSource.query(mv.indexSql);
            }
        }
        const [registryTable] = await dataSource.query(`SELECT to_regclass('mv_registry') AS t`);
        if (registryTable?.t) {
            await dataSource.query(`DELETE FROM mv_registry WHERE name = ANY($1::text[])`, [
                MATERIALIZED_VIEWS.map((mv) => mv.name),
            ]);
        }
    }
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
    // "projectKey" holds WatchlistItem.id (= business_view.sourceTimestamp, the
    // frontend's app-wide project identifier), NOT business_view.id and NOT
    // project_mint_link.project_key — see NotificationScanService, which reads
    // business_view per batch to resolve mint rows' project_key to the matching
    // business_view.sourceTimestamp before matching against this table.
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
    // "projectKey" stores business_view.sourceTimestamp (same identifier
    // watchlist_subscriptions uses) — never business_view.id and never
    // project_mint_link.project_key directly. "dedupeKey" (e.g.
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
