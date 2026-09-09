# 10 — Reports and exports

**Requires a signed-in account.**

This chapter covers the Reports page: building a configured export of a dataset and generating an
impact summary. It ends with a short comparison against the **Download Data** buttons found on the
list pages, because choosing between the two is the main question people have.

## Before the tabs

Three cards sit at the top of the page:

- **Exports This Month** — how many exports you have run this calendar month.
- **ESG Fields Available** — how many ESG Climate Data fields the selected dataset offers, out of its
  total field count. The number always matches the "ESG Climate Data" group in the field picker below.
- **Last Export** — when you last exported anything, or *No exports yet*.

Below them, two tabs: **Export Data** and **Impact Summary**.

## Export Data

This tab builds an export in four steps, top to bottom. Each step narrows or shapes what the next one
sees, so working downwards is the intended order.

### 1. Choose a dataset and scope

Pick the **Dataset** — **Issuances**, **Projects**, **Methodologies** or **Registries** — then apply
whatever scope filters you need: **Registry**, **Project**, **Vintage** and a **Date Range**. The
registry and project fields accept a partial name and suggest matches as you type.

Each applied filter shows as **Applied** with a **Remove filter** control, and a running count tells
you how many **records match scope**. That count is the number of rows your file will contain — watch
it as you add filters, because it is the fastest way to notice that you have narrowed too far.

### 2. Choose fields

The **ESG Reporting Fields** picker lists every field available for the chosen dataset, arranged in
groups:

- **Project Identifiers** and **Identifiers** — names and reference values: project name, registry,
  developer, country.
- **ESG Climate Data** — the substantive figures: **Emissions Reduced** (tCO₂e sequestered or
  avoided), **Reporting Year**, **Standard / Methodology**, and **Vintage**. On the **Issuances**
  dataset this group also carries **Issuance Date** — the UTC calendar day the credits were minted
  on-chain, and the day whose year **Reporting Year** reports.
- **Traceability References** — the fields that let a third party check your figures independently:
  **Transaction ID** (the Hedera on-chain reference), **Registry Record ID**, **Verification URL**
  and **Source System ID**.

Fields carry an **ESG** or **Traceability** pill so you can see at a glance which category a column
belongs to, and hovering a traceability field explains exactly what it enables. **Select all** and
**Deselect all** are there for when you want everything or want to start from nothing.

If your export is going into a disclosure or an audit, include the traceability group. It is the
difference between a number somebody has to trust and a number they can verify.

### 3. Choose a format

**CSV**, **Excel** or **PDF**. CSV and Excel are for further analysis; PDF is for circulating a fixed
document.

### 4. Check the preview and export

The preview shows the shape of the file — the columns you selected against the records in scope —
before you commit to generating it. Use it to catch an empty scope or a missing column while it is
still cheap to fix.

### Recent Exports

Below the builder, a **Recent Exports** table lists what has already been produced: **Filename**,
**Format**, **Records**, **Exported By** and **Date**. If you have not exported anything yet, it says
so.

## Impact Summary

Where Export Data produces raw rows, Impact Summary produces a compiled narrative document.

**Configure Summary** asks for an **Output Format**, then **Generate Impact Summary** builds it. The
preview that appears is titled *Portfolio Impact Overview* and covers:

- **Total Credits Issued** and **Total Retired** — retirement figures are derived from token-deletion
  activity rather than a dedicated retirement ledger; how that derivation works is set out in the
  Limitations note in the generated report rather than tagged onto each figure;
- **Active Projects** and **Countries**;
- **SDG Contributions** and **Geographic Distribution** sections;
- a footer confirming the network the data was verified on and when the summary was generated.

The generated PDF carries two things the preview does not:

- **Projects by Lifecycle Stage** — how many projects sit at each of *Registered*, *Validation*,
  *Monitoring*, *Verified* and *Issued*. The stage is derived from the verification documents a
  project has actually submitted on-chain, not from a self-declared status field, and it is the same
  classification the Projects page filters on. The counts always add up to the **Active Projects**
  figure above them.
- Each SDG carries both a **project count** and an **issuance count**, because the two can diverge
  sharply — a goal claimed by many projects that have issued nothing reads very differently from one
  claimed by a single heavily-issuing project. A project may claim several goals, so these counts
  overlap and deliberately do not sum to the portfolio total.

If the selected network has no impact data yet, the preview says so instead of rendering an empty
document.

## Reports exports vs. Download Data

Both produce files. They are for different jobs.

| | **Download Data** (list pages) | **Reports → Export Data** |
|---|---|---|
| Where it lives | The quick-filter row on Projects, Issuances, Methodologies and Registries. | The Reports page. |
| What it exports | Exactly the current filtered, sorted view of that table. | A dataset you choose, scoped by registry, project, vintage and date range. |
| Which columns | The table's own columns. You do not choose. | You choose, from the full ESG field catalogue including traceability references. |
| Formats | CSV. | CSV, Excel or PDF. |
| Preview | None — the file downloads immediately. | Yes, before you generate. |
| History | None. | Listed in Recent Exports. |
| Best for | "I want this table, now." | "I need a defensible file for a disclosure or an audit." |

The rule of thumb: if you are looking at the right rows on screen and just want them in a spreadsheet,
use **Download Data**. If somebody else is going to read the file and ask questions about it, build it
here.

---

Next: [11 — Account and security](11-account-and-security.md) · Back to [index](README.md)
