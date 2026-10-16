/*
 * Copyright 2026 Hedera Hashgraph, LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// Methodology library README parser.
//
// Each framework directory in hashgraph/guardian's "Methodology Library"
// carries a readme.md (or README.md) with markdown tables that document
// published policies and standalone tools, with their testnet/mainnet
// consensus timestamps. We walk those READMEs, find tables that look like
// timestamp registries, and extract entries.
//
// Format examples (loose — column ordering varies by framework):
//
//   | Policy | Testnet Timestamp | Mainnet Timestamp | Schema/Policy File Link |
//   |---|---|---|---:|
//   | AMS-II.G | 1726671907.504639000 | 1713216985.019528003 | [Link](...) |
//
//   | Tool Number | Description | IPFS Timestamp |
//   |---|---|---:|
//   | Tool 9 | ... | 1713221704.169952003 |
//
// We don't hard-code column positions. Instead we look at headers, identify
// which column carries which kind of value (name, testnet-ts, mainnet-ts,
// link), and extract from that. Rows with empty timestamps are dropped.

import fs from 'node:fs';
import path from 'node:path';

// Hedera consensus timestamps are <seconds>.<nanos>, where nanos is always
// exactly 9 digits. Loosening this to 1-9 digits would pick up truncated
// values that appear in some readmes (e.g. Verra's Tool 3 listed as
// 1706867833.67638 instead of 1706867833.676387003) and cause spurious
// hedera-message-missing reports. We accept 6-9 digits to be a little
// forgiving but still reject the most-truncated cases.
const TIMESTAMP_RE = /(\d{9,12}\.\d{6,9})/;

function isLikelyName(header) {
  const h = header.toLowerCase();
  // Exclude columns that are clearly the link/file column, even when their
  // header also mentions "policy" or "schema" (e.g. "Schema/Policy File Link"
  // in iREC's readme would otherwise match both name AND link, with the link
  // pattern winning the cell content but the name role pointing at the same
  // column — producing garbage names like "MRV.schema" instead of "MRV Schema").
  if (/(link|file)/.test(h)) return false;
  return /(policy|tool|module|methodology|name|standard|version|schema)/.test(h);
}
function isTestnetCol(header) {
  const h = header.toLowerCase();
  if (/main/.test(h)) return false;
  return /test/.test(h) || /ipfs/.test(h) || /\btimestamp\b/.test(h);
}
function isMainnetCol(header) {
  return /main/i.test(header) && /(timestamp|hedera|ipfs)/i.test(header);
}
function isLinkCol(header) {
  return /(link|file)/i.test(header);
}

function findReadmes(rootDir) {
  const out = [];
  const stack = [rootDir];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
        stack.push(full);
      } else if (e.isFile() && /^readme\.md$/i.test(e.name)) {
        out.push(full);
      }
    }
  }
  return out.sort();
}

// Split a markdown line "| a | b | c |" into cells.
function splitCells(line) {
  // Strip leading/trailing pipes, split on |, trim.
  const inner = line.replace(/^\s*\|/, '').replace(/\|\s*$/, '');
  return inner.split('|').map((c) => c.trim());
}

function isSeparatorLine(line) {
  // A markdown table separator is like |---|---|---:|
  const trimmed = line.trim();
  if (!trimmed.startsWith('|')) return false;
  const cells = splitCells(trimmed);
  return cells.every((c) => /^:?[-]{2,}:?$/.test(c));
}

// Find every markdown table in the file. A table is a header row, a separator
// row, then zero-or-more body rows. Returns an array of { headers, rows }.
function parseTables(markdown) {
  const lines = markdown.split(/\r?\n/);
  const tables = [];
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i];
    const next = lines[i + 1];
    if (!line.trim().startsWith('|')) continue;
    if (!isSeparatorLine(next)) continue;
    const headers = splitCells(line);
    const rows = [];
    let j = i + 2;
    while (j < lines.length && lines[j].trim().startsWith('|') && !isSeparatorLine(lines[j])) {
      rows.push(splitCells(lines[j]));
      j++;
    }
    tables.push({ headers, rows });
    i = j - 1;
  }
  return tables;
}

// Decide whether a parsed table looks like a timestamp registry, and if so,
// map columns to (name, testnet, mainnet, link) roles.
function classifyTable(headers) {
  const roles = { name: -1, testnet: -1, mainnet: -1, link: -1 };
  headers.forEach((h, i) => {
    if (roles.name === -1 && isLikelyName(h)) roles.name = i;
    if (isMainnetCol(h)) roles.mainnet = i;
    else if (roles.testnet === -1 && isTestnetCol(h)) roles.testnet = i;
    if (isLinkCol(h)) roles.link = i;
  });
  if (roles.testnet === -1 && roles.mainnet === -1) return null; // not a timestamp table
  if (roles.name === -1) return null; // can't identify the entity
  return roles;
}

function extractTimestamp(cell) {
  if (!cell) return null;
  // Cells sometimes have stray whitespace, asterisks, or text after the ts.
  const m = String(cell).match(TIMESTAMP_RE);
  return m ? m[1] : null;
}

function extractLink(cell) {
  if (!cell) return null;
  const m = String(cell).match(/\[[^\]]*\]\(([^)]+)\)/);
  return m ? m[1] : null;
}

function inferEntityType(tableHeaders, readmePath) {
  const joined = tableHeaders.join(' ').toLowerCase();
  if (/\btool\b/.test(joined)) return 'tool';
  if (/\bmodule\b/.test(joined)) return 'module';
  if (/\bpolicy\b/.test(joined) || /\bmethodology\b/.test(joined)) return 'policy';
  // Fall back to the readme's directory if we can't tell from headers.
  if (/\/Tools\/?(readme\.md)?$/i.test(readmePath)) return 'tool';
  return 'policy';
}

function inferFramework(readmePath, libraryRoot) {
  const rel = path.relative(libraryRoot, readmePath);
  // The first path segment is usually the framework name.
  const seg = rel.split(path.sep)[0] || '(root)';
  return seg;
}

// Walk all readmes under libraryRoot and extract every entity row.
// Returns a list of { name, type, framework, testnetTs, mainnetTs, link, source }.
export function scanManifests(libraryRoot) {
  const root = path.resolve(libraryRoot);
  const readmes = findReadmes(root);
  const entries = [];

  for (const readmePath of readmes) {
    const md = fs.readFileSync(readmePath, 'utf8');
    const tables = parseTables(md);
    for (const table of tables) {
      const roles = classifyTable(table.headers);
      if (!roles) continue;
      const type = inferEntityType(table.headers, readmePath);
      const framework = inferFramework(readmePath, root);
      for (const row of table.rows) {
        const rawName = row[roles.name];
        const testnetTs = roles.testnet >= 0 ? extractTimestamp(row[roles.testnet]) : null;
        const mainnetTs = roles.mainnet >= 0 ? extractTimestamp(row[roles.mainnet]) : null;
        // Prefer an explicit link column; if missing, fall back to a link
        // embedded in the name cell. Verra readmes use `[Policy Name](url)` as
        // the entity column rather than a separate name+link split.
        const explicitLink = roles.link >= 0 ? extractLink(row[roles.link]) : null;
        const linkInName = rawName ? extractLink(rawName) : null;
        const link = explicitLink || linkInName || null;
        // Clean the name: if it's a markdown link, prefer the link text; if
        // the link text is just "Link", derive a name from the URL filename.
        let name = rawName?.trim() || null;
        if (name) {
          const linkMatch = name.match(/^\[([^\]]*)\]\(([^)]+)\)$/);
          if (linkMatch) {
            const linkText = linkMatch[1].trim();
            const url = linkMatch[2];
            if (linkText && !/^link$/i.test(linkText)) {
              name = linkText;
            } else {
              // Derive from URL's last meaningful segment.
              const segs = url.split('/').filter(Boolean);
              const last = decodeURIComponent(segs.pop() || '').replace(/\.(policy|tool)$/, '');
              name = last || null;
            }
          }
        }
        if (!testnetTs && !mainnetTs) continue;
        if (!name) continue; // skip rows we couldn't identify
        entries.push({
          name,
          type,
          framework,
          testnetTs,
          mainnetTs,
          link,
          source: path.relative(root, readmePath),
        });
      }
    }
  }
  return entries;
}
