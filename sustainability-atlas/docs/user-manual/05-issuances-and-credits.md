# 05 — Issuances and credits

This chapter covers the Issuances page and the individual credit records behind it. Where the
Projects page is organised around *what was done*, this page is organised around *what was minted* —
the tokens themselves, their supply, when they were created and which project they belong to.

## The issuances table

Each row is a credit token issued on the selected Hedera network.

| Column | What it means |
|---|---|
| **Token** | The token's name. |
| **Symbol** | Its short ticker. |
| **Type** | Fungible or non-fungible. Fungible credits are interchangeable units; non-fungible ones (NFTs) have individually identifiable serial numbers. |
| **Mint Amount** | How many credits were minted. For NFTs this is a count of serials rather than a tonnage. |
| **Mint Date** | When the minting happened. |
| **Project** | The project the issuance is attributed to, linked through to its record. |
| **Methodology** | The policy the project was verified under. |
| **Registry** | The registry behind that methodology. |
| **Raw Data** | Opens the original on-chain record. |

Click a row to open the credit record.

## Filtering

The filter bar behaves exactly as it does on Projects — search text plus any combination of filters,
with a live result count and a summary strip showing total supply, and how many registries and
projects the results span.

| Filter | Notes |
|---|---|
| **Token Type** | Fungible or non-fungible. |
| **Registry** | One or more registries. |
| **Mint Amount** | A numeric range rather than an exact value. |
| **Mint Date** | A date range. |
| **Hide issuances with no project link** | A checkbox, on by default. See below. |

### Unlinked issuances

Some tokens on the ledger cannot (yet) be matched to a project in the catalogue. That usually means
the project's own records have not been indexed yet, or the token was minted outside the normal
policy flow.

By default those rows are hidden, because for most questions they are noise. Uncheck **Hide issuances
with no project link** to see them — useful when you are auditing coverage, or hunting for a token
you know exists but cannot find in the filtered view.

## Quick filters and Download Data

The **Quick filters:** row offers presets such as *Fungible tokens*, *Non-Fungible (NFTs)*, *Minted
2024* and *Minted 2025*.

The **Download Data** CSV export works identically to the Projects page and is open to everyone —
the CSV contains exactly the current filtered, sorted view. **Saving** your own quick filters
requires a signed-in account.
See chapter 04 for the details and chapter 10 for the richer Reports exports.

## Scoping banners

Arriving here from elsewhere in the Atlas narrows the list and shows a banner saying so:

- *Showing issuances for …* — reached from a project record;
- *Showing issuances for …* — reached from a methodology;
- *Showing issuances for registry …* — reached from a registry.

Each has a **Clear filter** link that returns you to the full list. If a count looks unexpectedly
small, check for one of these banners before anything else.

## The credit record

Clicking a row opens the token's own page. The header carries the token name, symbol, token id and
the project it is connected to. Content is split across four tabs, and the active tab appears in the
address bar so you can link straight to it.

### Details

The main tab.

- **Token Supply** — how many units currently exist. Where the Atlas can reach the Hedera Mirror
  Node, this figure is fetched live and carries a **Live** badge, meaning it reflects the ledger right
  now rather than the last sync.
- **Total Minted (All)** — every unit ever minted for this token id, across all projects.
- **Total Minted (Project)** — the portion minted for the project you arrived from.
- **Last Mint Date** and the token's creation date.
- **Related Token Issuances** — other issuance events sharing the same token id.

**When total minted and current supply disagree.** This is normal and expected, not an error. Minting
only ever adds; supply falls when credits are **retired** (permanently destroyed for offsetting).
A gap between the two therefore tells you that some of the credits have been used. The interface flags
the difference with an explanatory tooltip where the two figures sit side by side. Note that
**transfers** do not change supply at all — moving credits between holders leaves the total
untouched.

### Transactions

The Guardian records of transactions attributed to this token, with the date, amount and token type
for each. Where you arrived from a specific project, the tab is scoped to that project's share; where
you came in from the issuances list, it shows the token's activity across all projects. The subtitle
above the table tells you which of the two you are looking at.

### Linkage

The provenance chain: which **project** the token belongs to, which **methodology** that project runs
under, and which **registry** published that methodology. Each is a link, and each states how the
connection was derived — the methodology comes via the token-to-project relationship, the registry via
token to project to methodology. Where a link genuinely does not exist, the tab says so plainly
("No project linked") rather than leaving a blank.

### Advanced

The on-chain identifiers: the token policy id, the token id, the token creation date and the issuing
DID, plus a link to view the token on HashScan for independent verification.

---

Next: [06 — Methodologies](06-methodologies.md) · Back to [index](README.md)
