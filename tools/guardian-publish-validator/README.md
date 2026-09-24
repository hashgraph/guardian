# guardian-publish-validator

Scans a Hedera Guardian methodology library and reports whether each published artifact (policy, tool, module, schema) is still end-to-end retrievable: Hedera consensus message still exists *and* the IPFS payload it references can still be fetched.

Two failure classes are common in practice, and both produce silent "Cannot read properties of null" import errors for users:

1. **Hedera-side rot** — testnet resets wipe consensus messages periodically. References published before a reset stop resolving.
2. **IPFS-side rot** — the original publisher's pinning service degrades or shuts down (Storacha/web3.storage is sunsetting through 2026), and the public IPFS gateway ecosystem no longer has the bytes. The Hedera anchor is fine, but `getFile(cid)` returns nothing.

This tool surfaces both failure modes in a single sweep so library maintainers can fix them before users hit them.

## Quick start

```bash
# From the repo root
cd tools/guardian-publish-validator
npm install

# Validate the upstream methodology library (auto-clones hashgraph/guardian
# into ~/.cache/guardian-publish-validator/, refreshes on subsequent runs)
npm run validate

# Or against a local clone:
npm run validate -- --path "../../Methodology Library"

# Browse results in a web UI:
npm run ui
# → open http://localhost:5173
```

## The four buckets

Every published artifact lands in one of four buckets based on its Hedera + IPFS state:

| Bucket    | Meaning |
|-----------|---------|
| **Healthy**   | Hedera anchor alive AND at least one operator-controlled (local) Kubo gateway serves the IPFS bytes. No external dependency at retrieval time. |
| **Resilient** | Hedera anchor alive AND ≥2 independent public gateways serve it. Safe — any one of them can go dark without breaking consumers. The **ideal state for upstream library content**, where there's no single operator-controlled Kubo. |
| **Fragile**   | Hedera anchor alive but exactly one gateway serves the IPFS payload. Works today; single point of failure. |
| **Broken**    | Hedera message is missing, or no gateway serves the IPFS content, or another hard failure. Needs repair. |

## CLI usage

```
guardian-publish-validator [options]

OPTIONS
  -p, --path <dir>          Library root. Defaults to auto-cloned upstream.
  -n, --network <net>       testnet | mainnet | previewnet. Default: testnet.
  -f, --filter <substring>  Scan only archives matching this substring.
      --concurrency <n>     Parallel checks. Default: 6.
      --skip-ipfs           Hedera-only check (faster, less thorough).
      --ipfs-timeout-ms <n> Per-gateway timeout. Default: 10000.
      --json <path>         Write the full report to a JSON file.
      --fail-on <mode>      Exit non-zero in CI. Modes:
                              broken   — fail only on Broken entities
                              fragile  — fail on Fragile or Broken (require
                                         Resilient or Healthy for all)
      --repo <owner/name>   Source repo. Default: hashgraph/guardian.
      --branch <name>       Branch. Default: main.
      --repo-base <dir>     Subdirectory. Default: "Methodology Library".
      --local-gateway <url> Operator's Kubo gateway. Use ${cid} placeholder.
                            Repeatable.
      --changed-only <list> Comma-separated paths. Only scan entities found
                            in those files. PR-CI use case.
      --changed-only-from <file>
                            Same as --changed-only but reads paths from a
                            file (one per line). Pairs with `git diff --name-only`.
```

### Examples

Full check of upstream `develop` on testnet, fail CI if anything is Fragile or worse:

```bash
guardian-publish-validator --branch develop --fail-on fragile
```

PR-level check scoped to changed files only:

```bash
git diff --name-only origin/develop... > /tmp/changed.txt
guardian-publish-validator --changed-only-from /tmp/changed.txt --fail-on broken
```

Operator with their own Kubo pinning service (CIDs there count as Healthy):

```bash
guardian-publish-validator \
  --local-gateway 'https://my-kubo.example.com/ipfs/${cid}'
```

## Web UI

```bash
npm run ui [-- --port 5173] [-- --report path/to/report.json]
```

Provides a browsable dashboard over a JSON report — summary cards per bucket, sortable/searchable table, per-entity detail panel showing gateway-by-gateway probe results and clickable GitHub links to each occurrence. Light and dark modes, scan-on-demand button, CSV export.

The UI is **read-only over a saved report file**, except for an optional "Run new scan" button that shells out to the CLI in the background. No data is sent to any external service.

## CI/CD integration

Drop this into `.github/workflows/validate-methodology-library.yml`:

```yaml
name: Methodology Library validation
on:
  pull_request:
    paths:
      - 'Methodology Library/**'
  schedule:
    - cron: '0 6 * * *'  # daily sweep

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }

      - uses: actions/setup-node@v4
        with: { node-version: '20' }

      - name: Install validator
        working-directory: tools/guardian-publish-validator
        run: npm ci

      - name: Determine changed files (PR runs)
        if: github.event_name == 'pull_request'
        run: |
          git diff --name-only origin/${{ github.base_ref }}... > /tmp/changed.txt
          echo "CHANGED_FILES_ARG=--changed-only-from /tmp/changed.txt" >> $GITHUB_ENV

      - name: Validate
        working-directory: tools/guardian-publish-validator
        run: |
          node bin/validator.js \
            --path "$GITHUB_WORKSPACE/Methodology Library" \
            --network testnet \
            --fail-on broken \
            --json $GITHUB_WORKSPACE/validator-report.json \
            $CHANGED_FILES_ARG

      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: validator-report
          path: validator-report.json
```

**Modes worth considering:**

- **PR check, strict** (`--fail-on broken`): blocks merges that introduce broken references. Allows Fragile entries (a PR might legitimately add new content that hasn't accumulated multiple pins yet).
- **PR check, ideal-state** (`--fail-on fragile`): every entity must be Resilient or Healthy. Stricter; rejects PRs whose content is only on one gateway.
- **Scheduled sweep** (`--fail-on fragile`): nightly cron over the whole library; failure auto-opens an Issue listing what regressed.

## Output

The CLI prints a summary table and per-bucket detail to stdout. The full machine-readable report goes to `--json <path>`. Report shape:

```json
{
  "network": "testnet",
  "githubRepo": "hashgraph/guardian",
  "githubBranch": "main",
  "scanned": { "archives": 167, "uniqueToolRefs": 84 },
  "summary": {
    "healthy": 42,
    "resilient": 18,
    "fragile": 16,
    "broken": 8,
    "byStatus": { "ipfs-ok-local": 42, "ipfs-resilient": 18, ... }
  },
  "refs": [
    {
      "name": "AMS-II.G",
      "type": "policy",
      "topicId": "0.0.4869164",
      "messageId": "1726671907.504639000",
      "cid": "bafkreib5xc...",
      "status": "ipfs-fragile",
      "bucket": "fragile",
      "publicHits": 1,
      "ipfsGateways": [
        { "gateway": "ipfs.io", "kind": "public", "ok": false, "status": "http-504" },
        { "gateway": "gateway.pinata.cloud", "kind": "public", "ok": true, "status": "http-200" }
      ],
      "occurrences": [
        { "source": "Clean Development Mechanism (CDM)/readme.md", "location": "readme(CDM)", "link": "..." }
      ]
    }
  ]
}
```

## How it works

For each archive (`.policy`/`.tool` file) under `Methodology Library/`, the validator unzips it and extracts every `{ name, topicId, messageId }` triple from the policy's `tools` array. It also parses every framework `readme.md` for tables documenting policy/tool timestamps. Both sources feed into one de-duplicated entity list keyed by `messageId`.

For each entity:

1. **Hedera mirror lookup** — `GET /api/v1/topics/{topicId}/messages?timestamp=eq:{messageId}` on the configured network. If `topicId` is unknown (README-only entry), discover it first via `GET /api/v1/transactions?timestamp=eq:{messageId}`.
2. **Message decode** — base64-decode the consensus message payload and extract its `cid` field (or `uri: ipfs://...`).
3. **Multi-gateway IPFS probe** — issue a small `Range: bytes=0-127` GET to every configured gateway in parallel. Whichever return 200/206 count as serving the content.
4. **Bucket** — combine Hedera + IPFS results into one of Healthy / Resilient / Fragile / Broken.

## Tests

```bash
npm test
```

Runs unit tests for the manifest parser, library walker, and message decoder, plus an integration test against synthetic fixtures in `tests/fixtures/`.

## Contributing

This tool lives in [`hashgraph/guardian`](https://github.com/hashgraph/guardian/tree/main/tools/guardian-publish-validator) under `tools/guardian-publish-validator/`. PRs welcome via the same workflow as the rest of the repo: open against `develop`, sign the CLA, follow the existing code style.

## License

Apache-2.0, matching the rest of `hashgraph/guardian`.
