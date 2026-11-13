/*
 * Copyright 2026 Hedera Hashgraph, LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// Walks a Hedera Guardian methodology library (either a local clone or fetched
// from GitHub) and extracts every tool reference found inside .policy and .tool
// archives.
//
// A "tool reference" is the {name, topicId, messageId} triple that points at a
// published tool's Hedera consensus message. Both .policy and .tool files are
// zip archives containing a top-level policy.json / tool.json with a `tools`
// array. We surface the location of each ref so the republisher can rewrite it
// in place.

import fs from 'node:fs';
import path from 'node:path';
import AdmZip from 'adm-zip';

const ARCHIVE_EXTENSIONS = new Set(['.policy', '.tool']);

export function findArchives(rootDir) {
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
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
        stack.push(full);
      } else if (entry.isFile() && ARCHIVE_EXTENSIONS.has(path.extname(entry.name))) {
        out.push(full);
      }
    }
  }
  return out.sort();
}

export function readArchive(archivePath) {
  const zip = new AdmZip(archivePath);
  const entries = zip.getEntries();

  let manifestEntry = null;
  for (const e of entries) {
    if (e.entryName === 'policy.json' || e.entryName === 'tool.json' || e.entryName === 'module.json') {
      manifestEntry = e;
      break;
    }
  }
  if (!manifestEntry) {
    return { archivePath, manifestName: null, manifest: null, embeddedTools: {} };
  }

  const manifest = JSON.parse(manifestEntry.getData().toString('utf8'));

  // Embedded tool JSONs live under tools/*.json inside the zip. Map by hash
  // (filename stem). Useful for sanity-checking nested refs without round-tripping.
  const embeddedTools = {};
  for (const e of entries) {
    if (e.entryName.startsWith('tools/') && e.entryName.endsWith('.json') && !e.isDirectory) {
      const hash = path.basename(e.entryName, '.json');
      try {
        embeddedTools[hash] = JSON.parse(e.getData().toString('utf8'));
      } catch {
        // ignore malformed nested tool
      }
    }
  }

  return { archivePath, manifestName: manifestEntry.entryName, manifest, embeddedTools };
}

// Extract every distinct tool reference from a manifest. A single archive may
// declare the same tool more than once (top-level + nested via embedded tool
// manifests); we de-dup by messageId but preserve every location it appears
// so the republisher can rewrite all of them.
export function extractToolRefs(archive) {
  const { archivePath, manifest, embeddedTools } = archive;
  if (!manifest) return [];

  const byKey = new Map();
  const push = (where, ref) => {
    if (!ref || !ref.messageId) return;
    const key = ref.messageId;
    if (!byKey.has(key)) {
      byKey.set(key, {
        archivePath,
        name: ref.name ?? null,
        topicId: ref.topicId ?? null,
        messageId: ref.messageId,
        locations: [],
      });
    }
    byKey.get(key).locations.push(where);
    // Backfill topicId/name from any location that has them.
    const agg = byKey.get(key);
    if (!agg.topicId && ref.topicId) agg.topicId = ref.topicId;
    if (!agg.name && ref.name) agg.name = ref.name;
  };

  if (Array.isArray(manifest.tools)) {
    manifest.tools.forEach((t, i) => push(`manifest.tools[${i}]`, t));
  }

  for (const [hash, embedded] of Object.entries(embeddedTools)) {
    push(`tools/${hash}.json`, {
      name: embedded.name,
      topicId: embedded.topicId,
      messageId: embedded.messageId,
    });
    if (Array.isArray(embedded.tools)) {
      embedded.tools.forEach((t, i) => push(`tools/${hash}.json#tools[${i}]`, t));
    }
  }

  return [...byKey.values()];
}
