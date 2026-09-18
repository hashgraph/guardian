#!/usr/bin/env npx tsx
/**
 * Recovers a project's real country from its stored coordinates when the
 * VC's `country` field was mis-mapped (pointed at a lat/lng or a site-name
 * field instead of an actual country) — e.g. a project whose stored country
 * is `"-22° 24' 59.99\" S"` but whose lat/lng sit inside Madagascar.
 *
 * This does NOT touch the existing `businessData.country` value. It only
 * adds a new, optional sibling key `businessData.geoCountryCode` (an
 * ISO 3166-1 alpha-3 code) when the raw country doesn't resolve to a known
 * country but the coordinates do. Existing code that doesn't know about
 * this key is unaffected — it's additive JSONB, no schema migration.
 * PgProjectRepository (applyCountryFilter, getFilterOptions, the country
 * summary count) reads it to pull a recovered project out of the "Other"
 * bucket and make it selectable by its real country.
 *
 * Usage:
 *   npx tsx scripts/backfill-geo-country-code.ts report [network]
 *   npx tsx scripts/backfill-geo-country-code.ts apply  [network]
 *
 * `report` is read-only and safe to run any time — it prints every
 * candidate row and what it would resolve to, without writing anything.
 * `apply` performs the same lookup and writes `geoCountryCode` for rows
 * that resolve. Both default to every network in HEDERA_NETWORKS when
 * `network` is omitted.
 */

import { config as loadEnv } from 'dotenv';
loadEnv();

import { Client } from 'pg';
import { resolveDatabaseName, getConfiguredNetworks } from '../src/shared/config/database.config';
import { ReverseGeoService } from '../src/worker/services/reverse-geo.service';
import { COUNTRY_TOKEN_TO_CODE } from '../src/api/repositories/schemas/recognized-countries';

interface CandidateRow {
    projectKey: string;
    displayName: string | null;
    country: string | null;
    lat: string;
    lng: string;
}

function isRecognizedCountry(raw: string | null): boolean {
    if (!raw) return false;
    return raw.trim().toLowerCase() in COUNTRY_TOKEN_TO_CODE;
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

async function findCandidates(client: Client): Promise<CandidateRow[]> {
    // geoCountryCode IS NULL so a re-run is a no-op for rows already resolved
    // (or already attempted and left unresolved this run — see note below).
    const { rows } = await client.query<CandidateRow>(`
        SELECT
            bv."projectKey"                       AS "projectKey",
            bv."displayName"                       AS "displayName",
            bv."businessData"->>'country'          AS country,
            bv."businessData"->>'lat'              AS lat,
            bv."businessData"->>'lng'              AS lng
        FROM business_view bv
        WHERE bv."viewType" = 'PROJECT'
          AND bv."businessData"->>'lat' IS NOT NULL
          AND bv."businessData"->>'lng' IS NOT NULL
          AND bv."businessData"->>'geoCountryCode' IS NULL
    `);
    return rows.filter(r => !isRecognizedCountry(r.country));
}

async function processNetwork(network: string, apply: boolean): Promise<void> {
    const client = dbClient(network);
    await client.connect();
    const geo = new ReverseGeoService();

    try {
        const candidates = await findCandidates(client);
        console.log(`\n=== ${network} (${resolveDatabaseName(network)}) — ${candidates.length} candidate row(s) ===`);

        let resolved = 0;
        let unresolved = 0;
        for (const row of candidates) {
            const lat = parseFloat(row.lat);
            const lng = parseFloat(row.lng);
            if (!isFinite(lat) || !isFinite(lng)) { unresolved++; continue; }

            const lookup = await geo.lookupCountry(lat, lng);
            if (!lookup) {
                unresolved++;
                console.log(`  [no match]   ${row.projectKey}  country="${row.country ?? ''}"  lat=${lat} lng=${lng}`);
                continue;
            }

            resolved++;
            console.log(
                `  [${apply ? 'writing' : 'would write'}] ${row.projectKey} (${row.displayName ?? '—'}) ` +
                `country="${row.country ?? ''}" → geoCountryCode=${lookup.code} (${lookup.name})`,
            );

            if (apply) {
                await client.query(
                    `UPDATE business_view
                     SET "businessData" = jsonb_set("businessData", '{geoCountryCode}', to_jsonb($1::text))
                     WHERE "projectKey" = $2`,
                    [lookup.code, row.projectKey],
                );
            }
        }

        console.log(`--- ${network}: ${resolved} resolved, ${unresolved} unresolved (of ${candidates.length}) ---`);
    } finally {
        await client.end();
    }
}

async function main(): Promise<void> {
    const [command, networkArg] = process.argv.slice(2);
    if (command !== 'report' && command !== 'apply') {
        console.error(
            'Usage:\n' +
            '  npx tsx scripts/backfill-geo-country-code.ts report [network]\n' +
            '  npx tsx scripts/backfill-geo-country-code.ts apply  [network]',
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
