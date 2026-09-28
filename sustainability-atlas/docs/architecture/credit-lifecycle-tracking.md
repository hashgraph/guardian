# Credit Lifecycle Tracking — mint, retire, transfer

How the Atlas answers three questions about a carbon credit: **was it really minted**, **was it
retired**, and **did it change hands**. Written for both engineers and analysts — the business meaning
of each figure is stated alongside the mechanism that produces it.

## The one rule that frames everything

> **The Atlas only tracks credits that Guardian issued through a MintToken credential it has synced.**

Every figure on this page starts from a `MintToken` VC-Document found on a Hedera topic the Atlas
follows. If a token's serials were minted outside that flow — by the supply-key holder calling the
SDK directly, or under a registry the Atlas does not index — those serials are **not counted, not
attributed, and not shown**. They are logged as *orphans* and left alone.

This is deliberate. The Atlas is a record of *documented* issuance, not of everything that exists on
the ledger. A serial with no credential behind it has no project, no methodology and no vintage, so
attributing it would be inventing provenance.

---

## Stage 1 — What was actually minted

A MintToken credential states an `amount`. That is a **declaration of intent**, not proof. The Atlas
reconciles it against what the ledger actually did.

Guardian stamps the mint VP-Document's consensus timestamp on-chain in one of two places, depending
on the token type. Both lead back to the same credential:

```
NON-FUNGIBLE                              FUNGIBLE
────────────                              ────────
each NFT's `metadata`                     the TOKENMINT transaction's `memo`
  = base64 VP timestamp                     = base64 VP timestamp
        │                                          │
        ▼                                          ▼
   nft_cache.metadataTimestamp            token_mint_tx.vp_consensus_timestamp
        │                                          │
        └──────────────┬───────────────────────────┘
                       ▼
        VP-Document  →  options.relationships[]
                       ▼
        MintToken VC consensusTimestamp
                       ▼
        project_mint_link.mint_consensus_timestamp   → the project
```

**Real minted amount** (`project_mint_link.minted_amount`):

| Token type | How it is measured |
|---|---|
| Non-fungible | Count of NFT serials carrying this mint's VP timestamp |
| Fungible | Sum of the mint transactions' amounts ÷ 10^`decimals` |

Fungible amounts are recorded on-chain in the token's smallest unit, so decimals must be applied —
a token with `decimals = 2` records `7200` for 72 credits.

> **Never use token `total_supply` as "minted".** Supply is *net of retirements*. A token that minted
> 12 and retired 8 reports a supply of 4 — using it would fabricate a mismatch on every token that has
> ever retired a credit.

### Reconciliation status (`mint_match_status`)

Every issuance carries one of these. It gates every downstream use of the figure.

| Status | Meaning | What the business should read into it |
|---|---|---|
| `verified` | Minted amount equals the declared amount | Fully reconciled. The credential and the ledger agree. |
| `mismatch` | Both known, but different | Real divergence. See the diagnosis table below. |
| `unmatched` | Credential found, but no on-chain mint carries its timestamp | Not yet indexed, or predates Guardian's stamping convention. The declared amount is shown as a fallback. |
| `ambiguous` | More than one VP-Document claims this credential | Cannot be attributed safely. Never counted as verified. |
| `null` | No mint VP resolved yet | Still syncing. |

### Diagnosing a mismatch

**Minted is LESS than declared** — the usual direction:

1. **The mint partially failed.** Hedera caps an NFT mint at 10 serials per transaction, so a large
   issuance is many transactions; some can fail while others succeed.
2. **The credential was issued but minting never completed** — the process stopped part-way.
3. **Serials are still syncing.** The count rises as the worker walks the token. Re-check later.

Note that **retirement never causes this.** Retired serials still carry their mint metadata and are
still counted as minted. If minted is below declared, credits were genuinely never created.

**Minted is MORE than declared** — rarer but real, and observed on mainnet:

1. **An out-of-band top-up.** The supply-key holder minted extra serials carrying the same VP
   timestamp. The credential says one number; the ledger records another.
2. **The credential's amount was wrong** at the time it was issued.
3. **Two credentials share one VP.** Where the linker can tell, this is flagged `ambiguous` instead.

A live mainnet example: token `0.0.7559017` has a single MintToken credential declaring **42,228**,
while serials 1–42,278 all carry that mint's VP timestamp — **50 more than declared**. There is no
second credential. The ledger simply minted more than the document claimed. Nothing enforces that the
`amount` field and the actual `TokenMintTransaction` agree; they are separate operations by the same
key holder.

---

## Stage 2 — Retirement

Retirement is assembled from the most specific evidence available, in this order.

**Tier 1 — Documented.** Guardian deploys a `RETIRE` smart contract per policy. Executing a retirement
emits an on-chain event:

```
Retire(address account, RetireTokenRequest[] { address token; int64 count; int64[] serials })
```

This gives the **retiring account**, the **token**, the **exact serials** (non-fungible) or the
**amount** (fungible), and the **date** — none of which the older method could provide. Ingested into
`token_retire_event`, one row per (event, token).

Only the *executed* event counts. The contract emits a byte-identical payload for the *request* half
of the approval flow, and not every request is executed — counting both would over-report retirement.

**Tier 2 — On-chain fallback.** Registries that wipe or burn directly, without the retirement
contract, leave `TOKENWIPE`/`TOKENBURN` transactions. Exact amounts, but no actor context.

**Tier 3 — Inference.** Mirror Node marks a serial `deleted`. A count and nothing else — no date, no
actor. This was previously the *only* method.

**Attribution:**

- **Non-fungible** — a retired serial carries its mint's VP timestamp, so retirement is attributed to
  the exact issuance, and therefore the exact vintage, that produced it.
- **Fungible** — the amount, date and account are documented, but **which issuance it came from is
  unanswerable in principle**. Fungible units are interchangeable. The Atlas reports fungible
  retirement at token level and never invents a FIFO or pro-rata allocation to make it look
  attributable.

Retired serials no issuance claims, plus fungible retirement, are counted at token level and only for
tokens minted by a single project — where several projects mint the same token there is no way to say
whose credits they were, and counting them for each would report one retirement several times.

---

## Stage 3 — Transfers

**Guardian writes no transfer document.** The Hedera `CRYPTOTRANSFER` is the only evidence a credit
changed hands, which makes transfers the weakest of the three signals.

Two things are derived, and **neither can be computed from the other**:

| Figure | Question it answers | Source | Coverage |
|---|---|---|---|
| *How many transferred* | Where are these credits **now**? | `nft_cache.accountId` ≠ the token's treasury, and not retired | Complete — ownership is a snapshot, and Mirror Node returns it in full |
| *Transfer transactions* | **What happened** to them, and when? | `token_transfer_event`, from sweeping treasury CRYPTOTRANSFERs | Partial — treasury hop only, and only for treasuries already swept |

The first is a **state**, the second a **log of events**, and they diverge for ordinary reasons.
Measured on testnet: of 6,360 serials with a transfer event, only **5,953** count as transferred —
**404** were transferred and later retired, and **3** were sent out and returned to the treasury.
Nine serials moved four or five times, so a count of *transactions* is further off still.

So counting transfers from the event log would report credits that are retired as though they were
still in circulation, and would double-count multi-hop serials unless deduplicated by serial. It
would also collapse to near-zero for any token whose treasury has not been swept yet — the count is
correct today precisely because it does not depend on that sweep.

**Why a project can show "Transferred: 63" and an empty transaction table.** These are not in
conflict: the ownership snapshot is available as soon as serials sync, while the transaction log
waits on the treasury sweep. Until that treasury is swept, the Atlas can say *where* the credits are
but not *when* they moved. This is the expected state for a token whose treasury is still queued —
see [Transfer ingest](#transfer-ingest) for how the sweep is scheduled and how to check its progress.

**Coverage limit, stated plainly:** the sweep reads each **treasury** account, so it captures the
*registry → first holder* hop — the issuance-to-beneficiary movement. Onward trades between holders
are **not indexed**. A serial's full custody chain is available from Mirror Node per serial, but that
is one HTTP call per serial and is not run in bulk.

**A caveat that matters for interpretation:** Guardian moves minted credits out of the treasury almost
immediately. On sampled tokens, *zero* live serials remain in treasury. So "Transferred" tracks
"issued − retired" closely for most projects. The figure is real, but it means *"not sitting in the
treasury"* rather than *"actively traded"*.

Transfer counts are **null, not zero**, whenever any of an issuance's serials still has an unknown
holder. Ownership arrives a page at a time, and a partial count would look precise while being merely
"how far the sync got".

---

## How it syncs

Everything is watermarked and idempotent; nothing is a one-shot migration.

| Job | Trigger | What it does |
|---|---|---|
| `token-sync` | Per token; NFT tokens re-synced from serial 0 each scheduling pass | Walks serials (metadata, owner, deleted). Fungible tokens: walks TOKENMINT history. |
| `treasury-transfers` | Per **treasury account**, watermarked; never-swept accounts first | Walks the account's CRYPTOTRANSFER history and files serial movements against every token that treasury issued |
| `retire-sync` | Per RETIRE contract, watermarked by log position | Ingests executed retirement events |
| `business-view-build` | Every rebuild cycle | Runs `linkSerialsToMints` — resolves each mint's VP, recomputes counts and status |
| `mv-refresh` | Periodic | Rebuilds `mv_project_stats`, which every dashboard aggregate reads |

`linkSerialsToMints` recomputes on **every** run — `verified` is deliberately not terminal. Serials
arriving late, retirements landing, or ownership syncing all correct themselves on the next cycle,
so arrival-order races heal on their own.

**Mirror Node quirks the ingest has to work around** (each caused a real bug):

- An ascending transaction query with too wide a timestamp range returns an **empty page, not an
  error**. Queries are anchored to the token's creation timestamp.
- An empty page **does not mean end-of-history**. Mirror Node walks fixed time windows and returns
  empty pages with a live `next` link, so the loop follows the link rather than stopping short.
- The contract-logs endpoint calls the timestamp field `timestamp`; the transactions endpoint calls
  it `consensus_timestamp`.

### Transfer ingest

Mirror Node has **no per-token transfer feed** — transfers are readable only from an account's
transaction list. The unit of work is therefore the **treasury account**, not the token, because one
registry treasury commonly issues hundreds of tokens: on testnet, 17,743 NFT tokens resolve to 6,978
accounts, and the busiest single account backs 1,072 of them. Sweeping per token walked that one
account's history 1,072 times and, against a page cap, never reached the end of it.

One sweep of an account now feeds every token it issued. Each pass walks a bounded number of pages
and re-enqueues itself while history remains, so a long account converges across jobs instead of
holding one job open or restarting from the beginning. Scheduling puts never-swept accounts first, so
a restart resumes into unscanned work rather than repeating finished accounts.

State lives on `token_cache`, not in a table of its own: `transferTxWatermark` holds the account's
scan position and is written across every token sharing that treasury, and `createdTimestamp` is the
walk's lower bound — no transfer of a token can predate the token. It is seeded at bootstrap from the
earliest known mint so the first sweep does not start at genesis.

To check progress, group `token_cache` by treasury; a `NULL` watermark means never swept:

```sql
SELECT COUNT(*) AS treasuries, COUNT(*) FILTER (WHERE w IS NULL) AS never_swept
FROM (SELECT treasury, MAX("transferTxWatermark") AS w
      FROM token_cache
      WHERE treasury IS NOT NULL AND type = 'NON_FUNGIBLE_UNIQUE'
      GROUP BY treasury) t;
```

---

## What the frontend shows

**Issuance table** (project detail) — two separate columns, deliberately:

- **Declared** — what the Guardian mint credential stated
- **Minted On-Chain** — what the ledger actually recorded, with an amber warning and a plain-English
  explanation whenever they disagree

Expanding a row shows the serial ranges (retired ones struck through) and the retirement and transfer
transactions affecting exactly those serials. Each row links to the issuance detail page.

**Issuance detail** (`/issuances/:mintTimestamp`) — one page per mint credential, not per token, since
a token routinely carries several. Four tabs:

| Tab | Shows |
|---|---|
| Summary | Declared vs minted with the mismatch explained, reconciliation status, the issuance's project / methodology / registry, and its serial ranges with the account holding each |
| Transactions | Retirements and transfers of this issuance's credits |
| Token Information | Token supply, minted across all projects and for this one, other issuances of the token, and the projects sharing it |
| Advanced | Token ID, policy topic, creation date, issuer DID, and both the mint-credential and mint-VP consensus timestamps — each copyable, with HashScan links where the identifier resolves |

Both consensus timestamps are HCS messages, so HashScan resolves them on its transaction route.

**Credit Lifecycle** (project detail) — Issued / Transferred / Retired / Active, followed by the
project's transaction history: date, event type, accounts involved, credit count, serials.

**Dashboards and stat cards** show **real on-chain minted**, not declared. Headline numbers can
therefore be lower than a registry's own reporting — that gap is the point of the feature.

**`—` never means zero.** It means the value cannot be determined: fungible transfers, or ownership
still syncing. "Nothing happened" and "we don't know" are different claims and are displayed
differently.

---

## Where the data lives

| Table | Holds | Grain |
|---|---|---|
| `nft_cache` | Serial, decoded mint VP timestamp, current holder, deleted flag | One row per serial |
| `token_mint_tx` | Fungible mint transactions and their decoded VP timestamp | One row per transaction |
| `token_retire_event` | Documented retirements: account, serials, amount | One row per (event, token) |
| `token_transfer_event` | Transfers out of treasury: sender, receiver | One row per (transaction, serial) |
| `contract_cache` | Discovered WIPE/RETIRE contracts and their log watermark | One row per contract |
| `project_mint_link` | Per issuance: declared amount, minted amount, serial/retired/transferred counts, status | One row per MintToken VC |

`project_mint_link` is the join point between Guardian's documents and the ledger. Everything else
feeds it.

## API

| Endpoint | Returns |
|---|---|
**Project-scoped** — the mint must belong to the named project, which stops one project's credits being
read through another's URL:

| Endpoint | Returns |
|---|---|
| `GET /projects/:id` | `issuanceEvents[]` with declared vs minted, counts and status; `totalIssued`, `totalDeclared`, `totalRetired`, `totalTransferred` |
| `GET /projects/:id/issuances/:mintTimestamp/serials` | Serial **ranges** for one issuance, paginated |
| `GET /projects/:id/issuances/:mintTimestamp/transactions` | Retirements and transfers for that issuance, newest first, paginated |
| `GET /projects/:id/transactions` | The same across every issuance of the project |

**Issuance-scoped** — address a mint directly, backing the issuance detail page. Each section of that
page is its own route, so it paints from the small summary rather than one aggregate payload:

| Endpoint | Returns |
|---|---|
| `GET /issuances/:mintTimestamp` | Summary: declared vs minted, status, VP timestamp, token, project, methodology, registry |
| `GET /issuances/:mintTimestamp/serials` | Serial ranges, paginated |
| `GET /issuances/:mintTimestamp/transactions` | Retirements and transfers, paginated |
| `GET /issuances/:mintTimestamp/token` | Token supply, minted across all projects and for this one, policy topic, creation date, issuer DID, projects sharing the token |
| `GET /issuances/:mintTimestamp/related-issuances` | Other issuances of the same token, paginated |

### Serials come back as ranges, not one row each

A serials response is a list of `{ from, to, count, deleted, accountId }`. Ranges are **lossless** —
every serial's status is implied by the range containing it — and the volume difference decides it: a
42,278-serial issuance is **one range, 285 bytes**, where enumerating it was ~1.6 MB. The worst case in
either database is 20,000 serials → 238 ranges.

Runs are split on a change of holder as well as retired state, so a range never spans two owners and
`accountId` answers "who holds these credits". It is null for retired serials, which have no holder,
and while ownership is still syncing.

Grouping is done in Postgres (gaps-and-islands over `nft_cache`, backed by `idx_nft_cache_metadata_ts`)
rather than in the browser. Pagination counts **ranges**, not serials.

Transactions are grouped by the transaction that caused them — a distribution moving 10 serials is one
event, not ten.

### Why an issuance can show retired credits but no retirement transaction

`serialRetiredCount` comes from Mirror Node's `deleted` flag (tier 3); a retirement *transaction* only
exists where the registry used Guardian's retirement contract (tier 1). Credits wiped outside it are
genuinely retired, but nothing on-chain records who did it or when. The UI says so explicitly rather
than leaving an unexplained empty table.
