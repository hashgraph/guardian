#!/usr/bin/env npx tsx
/**
 * Fetches the IWA → CADTrust V2 and IWA → CDOP field mappings from the
 * Guardian Data Model Mapping Google Sheet and writes the result to
 *   src/shared/config/standard-field-mappings.generated.ts
 *
 * Usage:
 *   npx tsx scripts/generate-standard-mappings.ts
 *
 * The generated file is committed to the repo so the backend can use it
 * without a build-time network dependency. Re-run this script whenever
 * the spreadsheet is updated.
 */

import { writeFileSync } from 'fs';
import { join } from 'path';

const SHEET_ID = '1VpMcVXP-WOXS2P2MwSUoL8ja7v-pH5A9SKuaF7Qj9F8';

function sheetCsvUrl(sheetName: string): string {
    return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
}

/**
 * Parses CSV properly handling quoted fields with embedded newlines and commas.
 * Returns array of rows, each row is array of cell strings.
 */
function parseCsv(text: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let cell = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (inQuotes) {
            if (ch === '"' && text[i + 1] === '"') {
                cell += '"';
                i++;
            } else if (ch === '"') {
                inQuotes = false;
            } else {
                cell += ch;
            }
        } else {
            if (ch === '"') {
                inQuotes = true;
            } else if (ch === ',') {
                row.push(cell.trim());
                cell = '';
            } else if (ch === '\n' || (ch === '\r' && text[i + 1] === '\n')) {
                if (ch === '\r') i++;
                row.push(cell.trim());
                if (row.some(c => c !== '')) rows.push(row);
                row = [];
                cell = '';
            } else {
                cell += ch;
            }
        }
    }
    row.push(cell.trim());
    if (row.some(c => c !== '')) rows.push(row);
    return rows;
}

/**
 * Extracts the first clean IWA field path from a cell that may contain
 * multiple paths separated by `|`, newlines, or annotations.
 */
function extractIwaPath(raw: string): string | null {
    if (!raw) return null;
    const first = raw.split(/[|\n]/)[0].trim();
    const cleaned = first.replace(/\s+/g, '');
    if (!cleaned) return null;
    if (cleaned.startsWith('<') || cleaned.startsWith('(')) return null;
    if (!cleaned.includes('.')) return null;
    if (cleaned.includes('(')) return cleaned.split('(')[0];
    return cleaned;
}

type StandardMap = Record<string, string>;

function parseCadtrust(csv: string): StandardMap {
    const rows = parseCsv(csv);
    const map: StandardMap = {};

    // Skip header row (row 0) — it has "Table", "Column Name", "IWA Mapped Field", ...
    for (let i = 1; i < rows.length; i++) {
        const cols = rows[i];
        const table = cols[0] ?? '';
        const column = cols[1] ?? '';
        const iwaRaw = cols[2] ?? '';

        if (!table || !column) continue;
        // Skip system-generated / auto fields
        if (column === 'created_at' || column === 'updated_at') continue;
        if (column.startsWith('cad_trust_')) continue;

        const iwaPath = extractIwaPath(iwaRaw);
        if (!iwaPath) continue;

        const standardPath = `${table}.${column}`;
        if (!map[iwaPath]) {
            map[iwaPath] = standardPath;
        }
    }
    return map;
}

function parseCdop(csv: string): StandardMap {
    const rows = parseCsv(csv);
    const map: StandardMap = {};

    for (let i = 1; i < rows.length; i++) {
        const cols = rows[i];
        // CDOP columns: schema, Pre-issuance Inclusion, field_id, field_name, IWA Mapped Field, associated_entity, ...
        const fieldName = cols[3] ?? '';
        const iwaRaw = cols[4] ?? '';
        const entity = (cols[5] ?? '').toLowerCase().replace(/\s+/g, '_');

        if (!fieldName) continue;
        if (fieldName === 'field_name') continue;

        const iwaPath = extractIwaPath(iwaRaw);
        if (!iwaPath) continue;

        const standardPath = `${entity || 'project'}.${fieldName}`;
        if (!map[iwaPath]) {
            map[iwaPath] = standardPath;
        }
    }
    return map;
}

async function fetchSheet(sheetName: string): Promise<string> {
    const url = sheetCsvUrl(sheetName);
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) throw new Error(`Failed to fetch ${sheetName}: ${res.status}`);
    return res.text();
}

function generateFileContent(cadtrustMap: StandardMap, cdopMap: StandardMap): string {
    const cadtrustJson = JSON.stringify(cadtrustMap, null, 4);
    const cdopJson = JSON.stringify(cdopMap, null, 4);

    return `/**
 * AUTO-GENERATED — do not edit manually.
 * Run \`npx tsx scripts/generate-standard-mappings.ts\` to regenerate.
 *
 * Maps IWA DMRV field paths → CADTrust V2 / CDOP field paths.
 * Source: https://docs.google.com/spreadsheets/d/${SHEET_ID}
 *
 * Generated: ${new Date().toISOString()}
 */

/** IWA field path → CADTrust V2 field path (table.column) */
export const IWA_TO_CADTRUST: Record<string, string> = ${cadtrustJson};

/** IWA field path → CDOP field path (entity.field_name) */
export const IWA_TO_CDOP: Record<string, string> = ${cdopJson};
`;
}

async function main() {
    console.log('Fetching CADTrust V2 mapping sheet...');
    const cadtrustCsv = await fetchSheet('CADTrust V2 - Mapping');
    const cadtrustMap = parseCadtrust(cadtrustCsv);
    console.log(`  CADTrust: ${Object.keys(cadtrustMap).length} unique IWA fields mapped`);

    console.log('Fetching CDOP mapping sheet...');
    const cdopCsv = await fetchSheet('CDOP - Mapping');
    const cdopMap = parseCdop(cdopCsv);
    console.log(`  CDOP: ${Object.keys(cdopMap).length} unique IWA fields mapped`);

    const content = generateFileContent(cadtrustMap, cdopMap);

    const backendPath = join(__dirname, '..', 'src', 'shared', 'config', 'standard-field-mappings.generated.ts');
    writeFileSync(backendPath, content, 'utf-8');
    console.log(`\nWritten to ${backendPath}`);

    const frontendPath = join(__dirname, '..', 'frontend', 'lib', 'standard-field-mappings.generated.ts');
    writeFileSync(frontendPath, content, 'utf-8');
    console.log(`Written to ${frontendPath}`);
}

main().catch(err => {
    console.error('Failed:', err);
    process.exit(1);
});
