#!/usr/bin/env npx tsx
/**
 * Live end-to-end check for the issuance-notification pipeline, against
 * whatever local Postgres this machine is already pointed at (the SAME
 * databases your locally-running API uses) — no mocks, no isolated test
 * instance. It inserts one fully synthetic project/registry/mint event,
 * then polls for the real, already-running NotificationScanService to
 * pick it up and insert a real `notifications` row.
 *
 * Requires: your local API (`yarn start:dev` or similar) must be running —
 * this script only inserts rows, it does NOT run the scan itself.
 *
 * Usage:
 *   npx tsx scripts/test-issuance-notification.ts [network] [email]
 *   npx tsx scripts/test-issuance-notification.ts cleanup [network]
 *
 * Examples:
 *   npx tsx scripts/test-issuance-notification.ts
 *   npx tsx scripts/test-issuance-notification.ts mainnet admin@sustainability.local
 *   npx tsx scripts/test-issuance-notification.ts cleanup mainnet
 *
 * Everything this script creates is tagged so cleanup is unambiguous:
 *   - business_view rows: sourceTimestamp IN ('e2e-test-project-1', 'e2e-test-registry-1')
 *   - project_mint_link rows: token_id = 'E2E-TEST-TOKEN' (also copied into the
 *     resulting notification's payload.tokenId, so notifications are found the
 *     same way)
 *   - watchlist_subscriptions: (test user, network, the synthetic project's business_view.id)
 * It never touches notification_watermarks — advancing that to "now" is exactly
 * what the real scanner would do on its own, and resetting it would force a
 * rescan of the network DB's entire real mint history.
 */
import 'dotenv/config';
import { Client } from 'pg';
import { resolveDatabaseName, getSystemDatabaseName } from '../src/shared/config/database.config';

const DEFAULT_NETWORK = 'mainnet';
const DEFAULT_EMAIL = 'admin@sustainability.local';
const SOURCE_TIMESTAMP_PROJECT = 'e2e-test-project-1';
const SOURCE_TIMESTAMP_REGISTRY = 'e2e-test-registry-1';
const PROJECT_KEY = 'e2e-test-project-key-1';
const REGISTRY_DID = 'did:e2e:test-registry-1';
const SENTINEL_TOKEN_ID = 'E2E-TEST-TOKEN';
const DISPLAY_NAME = 'E2E Test Project — Full Name For Expand Verification (safe to delete)';
const METHODOLOGY = 'E2E Test Methodology — Full Name For Expand Verification v1.0 (safe to delete)';
const REGISTRY_NAME = 'E2E Test Registry (safe to delete)';
const POLL_INTERVAL_MS = 3000;
const POLL_MAX_ATTEMPTS = 12; // ~36s — comfortably longer than the 20s default scan interval

function dbClient(database: string): Client {
    return new Client({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        user: process.env.DB_USER || 'explorer',
        password: process.env.DB_PASSWORD || 'explorer_password',
        database,
    });
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function resolveUserId(sysDb: Client, email: string): Promise<{ id: string; email: string }> {
    const byEmail = await sysDb.query('SELECT id, email FROM users WHERE email = $1', [email]);
    if (byEmail.rows.length > 0) return byEmail.rows[0];

    console.warn(`No user found with email "${email}" — falling back to the first user in the table.`);
    const fallback = await sysDb.query('SELECT id, email FROM users ORDER BY email ASC LIMIT 1');
    if (fallback.rows.length === 0) {
        throw new Error('No users exist in the system DB — create one (sign up / seed) before running this script.');
    }
    return fallback.rows[0];
}

async function run(): Promise<void> {
    const network = (process.argv[2] || DEFAULT_NETWORK).toLowerCase();
    const email = process.argv[3] || DEFAULT_EMAIL;

    const netDb = dbClient(resolveDatabaseName(network));
    const sysDb = dbClient(getSystemDatabaseName());
    await netDb.connect();
    await sysDb.connect();

    try {
        const user = await resolveUserId(sysDb, email);
        console.log(`Using test user: ${user.email} (${user.id}) on network "${network}"`);

        // 1. Synthetic REGISTRY + PROJECT business_view rows (idempotent upsert —
        //    safe to run repeatedly without cleaning up first).
        await netDb.query(
            `INSERT INTO business_view ("viewType", "sourceTimestamp", "registryDid", "displayName", "lastUpdate")
             VALUES ('REGISTRY', $1, $2, $3, 0)
             ON CONFLICT ("sourceTimestamp", "viewType")
             DO UPDATE SET "displayName" = EXCLUDED."displayName"`,
            [SOURCE_TIMESTAMP_REGISTRY, REGISTRY_DID, REGISTRY_NAME],
        );

        const projectResult = await netDb.query(
            `INSERT INTO business_view ("viewType", "sourceTimestamp", "registryDid", "relatedTopicId", "displayName", "businessData", "projectKey", "lastUpdate")
             VALUES ('PROJECT', $1, $2, '0.0.0', $3, $4::jsonb, $5, 0)
             ON CONFLICT ("sourceTimestamp", "viewType")
             DO UPDATE SET "displayName" = EXCLUDED."displayName", "businessData" = EXCLUDED."businessData"
             RETURNING id`,
            [SOURCE_TIMESTAMP_PROJECT, REGISTRY_DID, DISPLAY_NAME, JSON.stringify({ methodology: METHODOLOGY }), PROJECT_KEY],
        );
        const bvId = String(projectResult.rows[0].id);
        console.log(`Synthetic project business_view.id = ${bvId}`);

        // 2. Watch it as the test user.
        await sysDb.query(
            `INSERT INTO watchlist_subscriptions ("userId", network, "projectKey")
             VALUES ($1, $2, $3)
             ON CONFLICT DO NOTHING`,
            [user.id, network, bvId],
        );

        // 3. A fresh mint event, timestamped at "now" (always past the stored
        //    watermark for a normally-running scanner, and never artificially
        //    in the future — see the file header on why that matters).
        const seconds = Math.floor(Date.now() / 1000);
        const nanos = `${String(Date.now() % 1000).padStart(3, '0')}000000`;
        const mintTimestamp = `${seconds}.${nanos}`;
        const dedupeKey = `issuance:${mintTimestamp}`;

        await netDb.query(
            `INSERT INTO project_mint_link (mint_consensus_timestamp, project_topic_id, token_id, amount, mint_date, link_method, project_key)
             VALUES ($1, '0.0.0', $2, 4200, now(), 'cs_ref', $3)`,
            [mintTimestamp, SENTINEL_TOKEN_ID, PROJECT_KEY],
        );
        console.log(`Inserted mint event at ${mintTimestamp} (dedupeKey: ${dedupeKey})`);
        console.log(`Waiting for the running NotificationScanService to pick it up (polling every ${POLL_INTERVAL_MS / 1000}s)...`);

        for (let attempt = 1; attempt <= POLL_MAX_ATTEMPTS; attempt++) {
            await sleep(POLL_INTERVAL_MS);
            const found = await sysDb.query(
                `SELECT id, type, payload, "isRead", "createdAt" FROM notifications WHERE "userId" = $1 AND network = $2 AND "dedupeKey" = $3`,
                [user.id, network, dedupeKey],
            );
            if (found.rows.length > 0) {
                console.log('\n✅ Notification created:');
                console.log(JSON.stringify(found.rows[0], null, 2));
                console.log(`\nLog in as ${user.email} and open the bell — it should show "${DISPLAY_NAME}".`);
                console.log('\nWhen you\'re done looking, clean up with:');
                console.log(`  npx tsx scripts/test-issuance-notification.ts cleanup ${network}`);
                return;
            }
            console.log(`  attempt ${attempt}/${POLL_MAX_ATTEMPTS}: not yet...`);
        }

        console.error('\n❌ No notification appeared within the poll window.');
        console.error('Is your local API running (the process that hosts NotificationScanService)?');
        console.error(`You can still clean up the rows this script inserted with:`);
        console.error(`  npx tsx scripts/test-issuance-notification.ts cleanup ${network}`);
        process.exitCode = 1;
    } finally {
        await netDb.end();
        await sysDb.end();
    }
}

async function cleanup(): Promise<void> {
    const network = (process.argv[3] || DEFAULT_NETWORK).toLowerCase();
    const netDb = dbClient(resolveDatabaseName(network));
    const sysDb = dbClient(getSystemDatabaseName());
    await netDb.connect();
    await sysDb.connect();

    try {
        const bv = await netDb.query(
            `SELECT id FROM business_view WHERE "sourceTimestamp" = $1 AND "viewType" = 'PROJECT'`,
            [SOURCE_TIMESTAMP_PROJECT],
        );

        const notifResult = await sysDb.query(
            `DELETE FROM notifications WHERE payload->>'tokenId' = $1 AND network = $2 RETURNING id`,
            [SENTINEL_TOKEN_ID, network],
        );
        console.log(`Deleted ${notifResult.rows.length} notification(s).`);

        if (bv.rows.length > 0) {
            const bvId = String(bv.rows[0].id);
            const subResult = await sysDb.query(
                `DELETE FROM watchlist_subscriptions WHERE network = $1 AND "projectKey" = $2 RETURNING "userId"`,
                [network, bvId],
            );
            console.log(`Deleted ${subResult.rows.length} watchlist subscription(s).`);
        }

        const mintResult = await netDb.query(
            `DELETE FROM project_mint_link WHERE token_id = $1 RETURNING mint_consensus_timestamp`,
            [SENTINEL_TOKEN_ID],
        );
        console.log(`Deleted ${mintResult.rows.length} mint event(s).`);

        const bvResult = await netDb.query(
            `DELETE FROM business_view WHERE "sourceTimestamp" IN ($1, $2) RETURNING "sourceTimestamp"`,
            [SOURCE_TIMESTAMP_PROJECT, SOURCE_TIMESTAMP_REGISTRY],
        );
        console.log(`Deleted ${bvResult.rows.length} business_view row(s).`);

        console.log('\nCleanup complete. notification_watermarks was left untouched (see file header).');
    } finally {
        await netDb.end();
        await sysDb.end();
    }
}

const mode = process.argv[2] === 'cleanup' ? 'cleanup' : 'run';
(mode === 'cleanup' ? cleanup() : run()).catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
