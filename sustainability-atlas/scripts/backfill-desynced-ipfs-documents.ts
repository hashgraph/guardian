#!/usr/bin/env npx tsx
/**
 * Repairs messages left behind by the ipfs-fetch.processor.ts "already
 * cached" shortcut bug: a job that died between the ipfs_files INSERT and
 * the message.documents write-back left ipfs_files holding the content
 * forever while message.documents stayed NULL — and every later job for
 * that same CID took the "already exists" fast path, which returned
 * immediately without ever writing message.documents or running project
 * mapping. The admin IPFS Documents page reports these as "Fetched" (it
 * only checks ipfs_files existence), so the gap is invisible there.
 *
 * The processor no longer has this bug (the shortcut now falls through to
 * reuse the cached content instead of returning early), so this script is a
 * one-time repair for rows already stuck in the desynced state.
 *
 * For each affected message: writes message.documents (and message.policyId
 * when the content is VC-shaped) directly, then enqueues a PROJECT_REPARSE
 * job so the running worker's own ProjectMapperService — not a reimplementation
 * here — does the actual project mapping.
 *
 * Usage:
 *   npx tsx scripts/backfill-desynced-ipfs-documents.ts report [network]
 *   npx tsx scripts/backfill-desynced-ipfs-documents.ts apply  [network]
 *
 * `report` is read-only. `apply` writes message.documents/policyId and
 * enqueues reparse jobs. Both default to every network in HEDERA_NETWORKS
 * when `network` is omitted.
 */

import { config as loadEnv } from 'dotenv';
loadEnv();

import { Client } from 'pg';
import { Queue } from 'bullmq';
import { resolveDatabaseName, getConfiguredNetworks } from '../src/shared/config/database.config';
import { getRedictConfig } from '../src/shared/config/redict.config';
import { BASE_QUEUE_NAMES } from '../src/shared/config/bullmq.config';

interface DesyncedRow {
    consensusTimestamp: string;
    topicId: string;
    type: string;
    cid: string;
    content: Buffer;
}

function dbClient(network: string): Client {
    return new Client({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        user: process.env.DB_USER || 'explorer',
        password: process.env.DB_PASSWORD || 'explorer_password',
        database: resolveDatabaseName(network),
    });
}

/** One cached CID per affected message — mirrors the processor's single-document write-back. */
async function findDesynced(client: Client): Promise<DesyncedRow[]> {
    const { rows } = await client.query<DesyncedRow>(`
        SELECT m."consensusTimestamp", m."topicId", m.type, f.cid, f.content
        FROM message m
        JOIN LATERAL (
            SELECT cid, content FROM ipfs_files WHERE cid = ANY(m.files) LIMIT 1
        ) f ON true
        WHERE m.documents IS NULL
          AND m.files IS NOT NULL
          AND array_length(m.files, 1) > 0
    `);
    return rows;
}

async function processNetwork(network: string, apply: boolean): Promise<void> {
    const client = dbClient(network);
    await client.connect();

    const { keyPrefix: _kp, ...connection } = getRedictConfig();
    const queue = new Queue(`${BASE_QUEUE_NAMES.PROJECT_REPARSE}-${network}`, { connection });

    try {
        const rows = await findDesynced(client);
        console.log(`\n=== ${network} (${resolveDatabaseName(network)}) — ${rows.length} desynced message(s) ===`);

        let fixed = 0;
        let reparseEnqueued = 0;
        let notJson = 0;

        for (const row of rows) {
            let parsed: Record<string, unknown> | null = null;
            try {
                parsed = JSON.parse(row.content.toString('utf-8'));
            } catch {
                notJson++;
                continue; // binary content — nothing to write back
            }

            const isVc = Array.isArray(parsed['credentialSubject']);
            console.log(
                `  [${apply ? 'fixing' : 'would fix'}] ts=${row.consensusTimestamp} topic=${row.topicId} ` +
                `type=${row.type} cid=${row.cid} isVc=${isVc}`,
            );

            if (!apply) continue;

            await client.query(
                `UPDATE message SET documents = $1 WHERE "consensusTimestamp" = $2`,
                [JSON.stringify(parsed), row.consensusTimestamp],
            );
            fixed++;

            if (isVc) {
                const cs = parsed['credentialSubject'] as Array<Record<string, unknown>>;
                const policyId = cs[0] && typeof cs[0] === 'object'
                    ? (cs[0]['policyId'] as string | undefined) ?? null
                    : null;
                if (policyId) {
                    await client.query(
                        `UPDATE message SET "policyId" = $1 WHERE "consensusTimestamp" = $2`,
                        [policyId, row.consensusTimestamp],
                    );
                }

                await queue.add(
                    'reparse',
                    { messageConsensusTimestamp: row.consensusTimestamp },
                    { jobId: `project-reparse-backfill-${row.consensusTimestamp}` },
                );
                reparseEnqueued++;
            }
        }

        console.log(
            `--- ${network}: ${fixed} document(s) written, ${reparseEnqueued} reparse job(s) enqueued, ` +
            `${notJson} non-JSON skipped (of ${rows.length}) ---`,
        );
    } finally {
        await client.end();
        await queue.close();
    }
}

async function main(): Promise<void> {
    const [command, networkArg] = process.argv.slice(2);
    if (command !== 'report' && command !== 'apply') {
        console.error(
            'Usage:\n' +
            '  npx tsx scripts/backfill-desynced-ipfs-documents.ts report [network]\n' +
            '  npx tsx scripts/backfill-desynced-ipfs-documents.ts apply  [network]',
        );
        process.exitCode = 1;
        return;
    }

    const networks = networkArg ? [networkArg] : getConfiguredNetworks();
    for (const network of networks) {
        await processNetwork(network, command === 'apply');
    }
}

void main();
