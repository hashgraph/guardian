#!/usr/bin/env node
/*
 * Copyright 2026 Hedera Hashgraph, LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// guardian-publish-validator
//
// Scans a Hedera Guardian methodology library (the upstream
// "Methodology Library" tree, or any local fork/clone of it) and checks
// each published artifact for end-to-end retrievability:
//
//   1. Hedera-side: does the (topicId, messageId) consensus message still
//      exist on the configured network's mirror node? Testnet resets wipe
//      messages periodically; older publications drop off.
//   2. IPFS-side:  is the CID embedded inside the Hedera message still
//      retrievable from at least one IPFS gateway? Most "I imported this
//      policy and got a null reference error" failures live here.
//
// Each entity (policy, tool, module, schema — anything with a Hedera publish
// timestamp) lands in one of four buckets:
//
//   Healthy    — Hedera anchor alive + at least one *local* gateway has the
//                IPFS bytes (operator-controlled Kubo). No external dependency.
//   Resilient  — Hedera anchor alive + ≥2 *public* gateways have it. Ideal
//                state for the upstream library where there's no single
//                operator-controlled Kubo: any one gateway can go dark
//                without breaking consumers.
//   Fragile    — Hedera anchor alive but exactly one gateway serves it.
//                Works today, single point of failure long-term.
//   Broken     — Hedera anchor missing, no gateway serves the content, or
//                another hard failure (topic not found, etc.). Needs repair.

import fs from 'node:fs';
import path from 'node:path';
import pLimit from 'p-limit';

import { findArchives, readArchive, extractToolRefs } from '../src/library.js';
import { lookupMessage, findMessageByTimestamp, extractCidFromMessage } from '../src/mirror.js';
import { probeCid, DEFAULT_GATEWAYS } from '../src/ipfs.js';
import { scanManifests } from '../src/manifests.js';
import { ensureUpstreamCheckout } from '../src/repo.js';

// Build the gateway list for this run: any --local-gateway URLs first
// (tagged kind=local), then the open-source public defaults.
function buildGatewayList(localUrls) {
  const local = (localUrls || []).map((url, i) => ({
    name: `local-${i + 1}`,
    url,
    kind: 'local',
  }));
  return [...local, ...DEFAULT_GATEWAYS];
}

function parseArgs(argv) {
  const args = {
    path: null,
    network: 'testnet',
    filter: null,
    concurrency: 6,
    json: null,
    failOn: null, // null | 'broken' | 'fragile'
    skipIpfs: false,
    ipfsTimeoutMs: 10000,
    repo: 'hashgraph/guardian',
    branch: 'main',
    repoBase: 'Methodology Library',
    localGateways: [],
    // PR/CI scoping: when set, only entities whose occurrences touch one of
    // these paths are checked. Lets a PR-level CI job validate only what the
    // PR actually changed instead of walking the entire library.
    changedOnly: [],
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--path' || a === '-p') args.path = argv[++i];
    else if (a === '--network' || a === '-n') args.network = argv[++i];
    else if (a === '--filter' || a === '-f') args.filter = argv[++i];
    else if (a === '--concurrency') args.concurrency = Number(argv[++i]);
    else if (a === '--json') args.json = argv[++i];
    else if (a === '--fail-on') args.failOn = argv[++i];
    else if (a === '--fail-on-stale') args.failOn = 'fragile'; // backward-compat alias
    else if (a === '--skip-ipfs') args.skipIpfs = true;
    else if (a === '--ipfs-timeout-ms') args.ipfsTimeoutMs = Number(argv[++i]);
    else if (a === '--repo') args.repo = argv[++i];
    else if (a === '--branch') args.branch = argv[++i];
    else if (a === '--repo-base') args.repoBase = argv[++i];
    else if (a === '--local-gateway') args.localGateways.push(argv[++i]);
    else if (a === '--changed-only') {
      // Accept either a comma-separated list in one arg or repeatable flag.
      const v = argv[++i];
      v.split(',').map((s) => s.trim()).filter(Boolean).forEach((p) => args.changedOnly.push(p));
    }
    else if (a === '--changed-only-from') {
      const file = argv[++i];
      const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
      lines.map((s) => s.trim()).filter(Boolean).forEach((p) => args.changedOnly.push(p));
    }
    else if (a === '--help' || a === '-h') {
      printHelp();
      process.exit(0);
    } else {
      console.error(`Unknown argument: ${a}`);
      printHelp();
      process.exit(2);
    }
  }
  if (args.failOn && !['broken', 'fragile'].includes(args.failOn)) {
    console.error(`--fail-on must be one of: broken, fragile (got: ${args.failOn})`);
    process.exit(2);
  }
  return args;
}

function printHelp() {
  console.log(`guardian-publish-validator

USAGE
  guardian-publish-validator [options]

DESCRIPTION
  Scans a Hedera Guardian methodology library (the upstream "Methodology
  Library" tree, or any local fork/clone of it) and reports per-entity
  health: Healthy / Resilient / Fragile / Broken.

OPTIONS
  -p, --path <dir>          Library root. Optional: if omitted, the upstream
                            repo (--repo / --branch) is auto-cloned to
                            ~/.cache/guardian-publish-validator/ and its
                            "Methodology Library" directory is used.
  -n, --network <net>       Hedera network. Default: testnet.
                            Values: testnet | mainnet | previewnet.
  -f, --filter <substring>  Only scan archives whose path contains this substring.
      --concurrency <n>     Parallel checks. Default: 6.
      --skip-ipfs           Skip IPFS probing (Hedera-only check, fast).
      --ipfs-timeout-ms <n> Per-gateway timeout in ms. Default: 10000.
      --json <path>         Also write the full report to a JSON file.
      --fail-on <mode>      Exit code 1 if any entity matches the mode:
                              broken   — only fail on Broken entities (lenient)
                              fragile  — fail on Fragile or Broken (require
                                         Resilient or Healthy for every entity)
      --fail-on-stale       Deprecated alias for --fail-on fragile.
      --repo <owner/name>   GitHub repo for occurrence links + auto-fetch source.
                            Default: hashgraph/guardian.
      --branch <name>       Branch. Default: main.
      --repo-base <dir>     Subdirectory inside the repo containing the library.
                            Default: "Methodology Library".
      --local-gateway <url> Operator's own Kubo gateway URL. Use \${cid} as the
                            placeholder. CIDs served here count as Healthy.
                            Repeatable. Defaults to public gateways only.
      --changed-only <list> Comma-separated list of file paths relative to the
                            library root. Only entities found inside those
                            files are checked. Useful for PR-level CI.
      --changed-only-from <file>
                            Same as --changed-only, but reads the list from a
                            file (one path per line). Pairs well with
                            \`git diff --name-only\` in CI.

EXAMPLES
  Full check against upstream develop on testnet:
    guardian-publish-validator --branch develop

  Scoped to a single PR's changed files:
    git diff --name-only origin/develop... > /tmp/changed.txt
    guardian-publish-validator --changed-only-from /tmp/changed.txt --fail-on broken

  Operator with their own Kubo (CIDs there count as Healthy):
    guardian-publish-validator \\
      --local-gateway 'https://my-kubo.example.com/ipfs/\${cid}'
`);
}

// Map a granular probe status to the canonical four-bucket grouping. CI tools
// gate on these, the UI summary cards count from them, downstream analytics
// flow off them — keep the names stable.
function bucket(status) {
  if (status === 'ok' || status === 'ipfs-ok-local') return 'healthy';
  if (status === 'ipfs-resilient') return 'resilient';
  if (status === 'ipfs-fragile') return 'fragile';
  return 'broken';
}

// Decide the overall status for a single ref given mirror + ipfs probe results.
// Hedera takes precedence — if the consensus message is gone, the IPFS state
// is moot (we'd need to republish to Hedera regardless).
function deriveStatus(mirror, ipfs) {
  if (!mirror.found) return mirror.status;
  if (!ipfs) return 'ok'; // IPFS check was skipped
  if (ipfs.status === 'no-cid') return 'ok-no-cid';
  if (ipfs.status === 'multi-chunk') return 'multi-chunk';
  return ipfs.status; // ipfs-ok-local | ipfs-resilient | ipfs-fragile | ipfs-unreachable
}

// Filter logic for --changed-only. We match entities by checking whether ANY
// of their occurrences live inside a path the caller specified. Paths are
// normalized to forward slashes and matched as prefixes — passing a directory
// like "Methodology Library/Verra/VM0003/" matches every occurrence under it.
function buildChangedFilter(paths) {
  if (!paths.length) return null;
  // Normalize once.
  const norm = paths.map((p) => p.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/$/, ''));
  return function matches(occurrenceSource) {
    if (!occurrenceSource) return false;
    const src = occurrenceSource.replace(/\\/g, '/');
    return norm.some((p) => src === p || src.startsWith(p + '/') || p.endsWith('/' + src) || p === src);
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  // Resolve the library root: explicit --path wins, otherwise auto-fetch
  // the upstream repo into the local cache.
  let root;
  if (args.path) {
    root = path.resolve(args.path);
    if (!fs.existsSync(root)) {
      console.error(`Path does not exist: ${root}`);
      process.exit(2);
    }
  } else {
    try {
      root = await ensureUpstreamCheckout({
        repo: args.repo,
        branch: args.branch,
        subpath: args.repoBase,
        onProgress: (msg) => process.stderr.write(msg),
      });
    } catch (err) {
      console.error(`Failed to fetch ${args.repo}@${args.branch}: ${err.message}`);
      process.exit(2);
    }
  }

  let archives = findArchives(root);
  if (args.filter) {
    archives = archives.filter((a) => a.includes(args.filter));
  }

  const gateways = buildGatewayList(args.localGateways);
  const changedMatches = buildChangedFilter(args.changedOnly);

  console.error(`Found ${archives.length} archive(s) under ${root}${args.filter ? ` (filter: ${args.filter})` : ''}`);
  console.error(`Validating against Hedera ${args.network}${args.skipIpfs ? '' : ' + IPFS gateways'}`);
  if (!args.skipIpfs) {
    console.error(`IPFS gateways in probe list: ${gateways.map((g) => `${g.name}(${g.kind})`).join(', ')}`);
  }
  if (changedMatches) {
    console.error(`--changed-only: limiting to entities referenced by ${args.changedOnly.length} path(s)`);
  }
  console.error('');

  // Build the unified entity list:
  // - tool refs extracted from inside .policy/.tool archives (carry topicId)
  // - timestamped entities from README markdown tables (don't carry topicId)
  // De-dup by messageId — one tool referenced by N methodologies needs one check.
  const refsByMessageId = new Map();

  function addEntity({ name, type, topicId, messageId, occurrences }) {
    if (!messageId) return;
    if (!refsByMessageId.has(messageId)) {
      refsByMessageId.set(messageId, {
        name: name || null,
        type,
        topicId: topicId || null,
        messageId,
        occurrences: occurrences || [],
      });
      return;
    }
    const agg = refsByMessageId.get(messageId);
    if (!agg.topicId && topicId) agg.topicId = topicId;
    if (!agg.name && name) agg.name = name;
    if (agg.type === 'tool-ref' && type && type !== 'tool-ref') agg.type = type;
    if (occurrences) occurrences.forEach((o) => agg.occurrences.push(o));
  }

  // Pass 1: in-archive tool refs
  for (const archivePath of archives) {
    let info;
    try {
      info = readArchive(archivePath);
    } catch (err) {
      console.error(`! Failed to read ${path.relative(root, archivePath)}: ${err.message}`);
      continue;
    }
    const refs = extractToolRefs(info);
    for (const ref of refs) {
      addEntity({
        name: ref.name,
        type: 'tool-ref',
        topicId: ref.topicId,
        messageId: ref.messageId,
        occurrences: ref.locations.map((loc) => ({
          source: path.relative(root, archivePath),
          location: loc,
        })),
      });
    }
  }

  // Pass 2: README-extracted entities
  const manifestEntries = scanManifests(root);
  for (const entry of manifestEntries) {
    if (args.filter && !`${entry.framework} ${entry.name}`.includes(args.filter)) continue;
    const ts = args.network === 'mainnet' ? entry.mainnetTs : entry.testnetTs;
    if (!ts) continue;
    addEntity({
      name: entry.name,
      type: entry.type,
      topicId: null,
      messageId: ts,
      occurrences: [
        { source: entry.source, location: `readme(${entry.framework})`, link: entry.link },
      ],
    });
  }

  let uniqueRefs = [...refsByMessageId.values()];

  // Apply --changed-only filter after collection so we still get accurate
  // de-duplication: an entity might be referenced from N archives but only
  // one of them is in the changed-files set.
  if (changedMatches) {
    uniqueRefs = uniqueRefs.filter((ref) =>
      ref.occurrences.some((o) => changedMatches(o.source || o.archive))
    );
  }

  const fromArchive = uniqueRefs.filter((r) => r.topicId).length;
  const fromManifest = uniqueRefs.length - fromArchive;
  console.error(
    `Discovered ${uniqueRefs.length} unique entit${uniqueRefs.length === 1 ? 'y' : 'ies'} ` +
      `(${fromArchive} with topicId from archive scan, ${fromManifest} README-only)${
        changedMatches ? ' [after --changed-only filter]' : ''
      }.\n`
  );

  const limit = pLimit(args.concurrency);
  let progressCount = 0;
  const checked = await Promise.all(
    uniqueRefs.map((ref) =>
      limit(async () => {
        let mirror;
        try {
          mirror = ref.topicId
            ? await lookupMessage(args.network, ref.topicId, ref.messageId)
            : await findMessageByTimestamp(args.network, ref.messageId);
          if (!ref.topicId && mirror.topicId) ref.topicId = mirror.topicId;
        } catch (err) {
          progressCount++;
          process.stderr.write('?');
          return { ...ref, status: 'hedera-error', error: err.message };
        }

        let cidInfo = null;
        let ipfs = null;
        if (mirror.found && !args.skipIpfs) {
          cidInfo = extractCidFromMessage(mirror.message);
          if (cidInfo.cid) {
            ipfs = await probeCid(cidInfo.cid, { gateways, timeoutMs: args.ipfsTimeoutMs });
          } else if (cidInfo.reason === 'multi-chunk-message') {
            ipfs = { status: 'multi-chunk', gateways: [] };
          } else {
            ipfs = { status: 'no-cid', gateways: [], reason: cidInfo.reason };
          }
        }

        const status = deriveStatus(
          mirror.found
            ? { found: true }
            : {
                found: false,
                status:
                  mirror.status === 'topic-not-found' ? 'hedera-topic-not-found'
                  : mirror.status === 'message-missing' ? 'hedera-message-missing'
                  : mirror.status === 'no-topic-id' ? 'no-topic-id'
                  : `hedera-${mirror.status}`,
              },
          ipfs
        );

        progressCount++;
        const b = bucket(status);
        const marker = b === 'healthy' ? '.' : b === 'resilient' ? '+' : b === 'fragile' ? 'o' : 'X';
        process.stderr.write(marker);
        if (progressCount % 60 === 0) process.stderr.write(` ${progressCount}\n`);

        return {
          ...ref,
          status,
          bucket: b,
          cid: cidInfo?.cid ?? null,
          ipfsGateways: ipfs?.gateways ?? null,
          publicHits: ipfs?.publicHits ?? null,
        };
      })
    )
  );
  process.stderr.write('\n\n');

  // Aggregate by bucket
  const buckets = { healthy: [], resilient: [], fragile: [], broken: [] };
  for (const r of checked) buckets[r.bucket].push(r);
  const byStatus = {};
  for (const r of checked) byStatus[r.status] = (byStatus[r.status] || 0) + 1;

  const report = {
    network: args.network,
    libraryPath: root,
    filter: args.filter,
    changedOnly: args.changedOnly.length ? args.changedOnly : null,
    ipfsSkipped: args.skipIpfs,
    githubRepo: args.repo,
    githubBranch: args.branch,
    githubBase: args.repoBase,
    scanned: { archives: archives.length, uniqueToolRefs: uniqueRefs.length },
    summary: {
      healthy: buckets.healthy.length,
      resilient: buckets.resilient.length,
      fragile: buckets.fragile.length,
      broken: buckets.broken.length,
      byStatus,
      // Kept for backward compatibility with older report viewers.
      ok: buckets.healthy.length,
      okOnlyOnExternalGateway: buckets.resilient.length + buckets.fragile.length,
    },
    refs: checked
      .slice()
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      .map((r) => ({
        name: r.name,
        type: r.type,
        topicId: r.topicId,
        messageId: r.messageId,
        cid: r.cid,
        status: r.status,
        bucket: r.bucket,
        publicHits: r.publicHits,
        ipfsGateways: r.ipfsGateways,
        occurrences: r.occurrences,
      })),
  };

  console.log(`SUMMARY (Hedera ${args.network}${args.skipIpfs ? ', IPFS skipped' : ' + IPFS'})`);
  console.log('-'.repeat(72));
  console.log(`Archives scanned:        ${report.scanned.archives}`);
  console.log(`Unique entities:         ${report.scanned.uniqueToolRefs}`);
  console.log(`Healthy   (local Kubo):  ${report.summary.healthy}`);
  console.log(`Resilient (≥2 public):   ${report.summary.resilient}`);
  console.log(`Fragile   (1 public):    ${report.summary.fragile}`);
  console.log(`Broken    (unreachable): ${report.summary.broken}`);
  console.log(`By status:               ${JSON.stringify(byStatus)}`);
  console.log('');

  function printBucket(label, items, limit = 25) {
    if (!items.length) return;
    console.log(label);
    console.log('-'.repeat(72));
    for (const r of items.slice(0, limit)) {
      const okGws = r.ipfsGateways?.filter((g) => g.ok).map((g) => g.gateway).join(', ');
      console.log(`- ${r.name || '(unnamed)'}  status=${r.status}  msg=${r.messageId}`);
      if (r.cid) console.log(`    cid=${r.cid}${okGws ? `  via ${okGws}` : ''}`);
      const head = r.occurrences.slice(0, 2);
      for (const occ of head) {
        const where = occ.source || occ.archive || '(unknown)';
        console.log(`    in ${where}  (${occ.location})`);
      }
      if (r.occurrences.length > head.length) {
        console.log(`    ...and ${r.occurrences.length - head.length} more occurrence(s)`);
      }
    }
    if (items.length > limit) console.log(`  ...and ${items.length - limit} more`);
    console.log('');
  }

  printBucket('FRAGILE — single gateway, single point of failure', buckets.fragile);
  printBucket('BROKEN — action needed', buckets.broken);

  if (args.json) {
    const outPath = path.resolve(args.json);
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
    console.log(`Full report written to: ${outPath}`);
  }

  // CI gate: exit 1 if requested mode has matches.
  if (args.failOn === 'broken' && buckets.broken.length > 0) {
    process.exit(1);
  }
  if (args.failOn === 'fragile' && (buckets.fragile.length > 0 || buckets.broken.length > 0)) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`fatal: ${err.stack || err.message}`);
  process.exit(2);
});
