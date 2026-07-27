# 04 — Projects

This chapter covers the Projects page — the richest surface in the Atlas — and everything reachable
from it: the table and its columns, the full set of filters, quick filters, CSV download, comparing
projects side by side, and each tab of an individual project record.

## The projects table

Every verified sustainability project on the selected network appears here, one row per project.
Click any row to open the full record.

| Column | What it means |
|---|---|
| **Project** | The project's name as submitted to its registry. |
| **Country** | Host country, shown with its flag. |
| **Registry** | The standard registry the project is registered with. |
| **Methodology** | The policy workflow it is verified against. |
| **Sector** | Broad activity type — renewable energy, forestry, waste, and so on. Hovering shows the finer sectoral scope as well. |
| **Issuances** | Credits minted for the project so far. |
| **Transferred** | Credits whose ownership has moved to another holder. Transferred credits are still in circulation. |
| **Retired** | Credits permanently taken out of circulation for offsetting. |
| **Status** | The registry-reported state of the project. |
| **Stage** | Where the project sits in the credit lifecycle: Registered → Validated → MRV Submitted → Verified → Issued. |
| **Proj. Volume** | The forecast issuance volume for projects that have not issued yet. |
| **Exp. Year** | The year credits are first expected to be issued — only meaningful before issuance. |
| **SDG** | Icons for the UN Sustainable Development Goals the project contributes to; hover for the goal names. |
| **Raw Data** | Opens the original on-chain documents behind the row. |

Column headers with a sort control let you order by that column; clicking again reverses the
direction. Sorting is applied to the whole filtered result set, not just the page you are looking at.

## Filtering

The filter bar sits above the table and behaves identically on every list page in the Atlas. Type in
the search box to match project names, and combine as many filters as you need — they narrow the
result together, not separately. The result count updates as you go, and a summary strip appears
showing how many projects matched, their total issuances, and how many distinct countries and
registries they span.

| Filter | Notes |
|---|---|
| **Status** | The registry-reported project status. |
| **Registry** | One or more registries. |
| **Country** | Host country. |
| **Vintage** | A year range rather than a single year. |
| **Issuance Status** | **Pre-Issuance** for projects that have not minted credits yet, **Issued** for those that have. The single most useful filter for separating pipeline from delivered supply. |
| **Stage** | Lifecycle stage, as in the Stage column. |
| **Expected Issuance Year** | Applies to pre-issuance projects only. |
| **Sector** | Broad activity type. |
| **Sectoral Scope** | The finer classification underneath sector. |
| **Developer** | The organisation running the project. |
| **SDG** | One or more Sustainable Development Goals. |

Each applied filter appears as a removable chip, so you can always see what is currently narrowing
the list and drop one without resetting everything.

## Quick filters

The **Quick filters:** row sits directly under the filter bar. It holds one-click presets — things
like *Gold Standard*, *SDG 13: Climate Action*, *Vintage 2022* and *Pre-Issuance* — that apply a
useful filter combination in a single click.

**Requires a signed-in account.** Signed in, you can add your own. Set up whatever combination of
search text, filters and sort order you want, then use the save control on the filter bar, give the
combination a name and save it. It joins the quick-filter row and can be reapplied at any time.

Two rules keep the list tidy: you cannot save two searches with the same name, and you cannot save
the same set of filters twice — if you try, the Atlas tells you which existing saved search already
covers it. There is also a maximum number of saved searches per person; once you reach it the save
control explains that you have hit the limit, and you will need to remove one before adding another.

## Download Data

**Requires a signed-in account.** The **Download Data** button at the right of the quick-filter row
exports the table as a CSV file.

What you get is exactly what is on screen: the current filters, the current search text and the
current sort order, applied to the whole result set rather than just the visible page. Change a
filter and download again and you get a different file. If you want a wider export with a chosen set
of fields and formats, use the Reports page instead — chapter 10 compares the two.

## Comparing projects

The first column of the table holds a checkbox on every row. Tick two or more and a floating bar
appears at the bottom of the screen showing how many you have selected, with **Compare** and **Clear
all** buttons.

You can compare a **minimum of two and a maximum of four** projects. Ticking a fifth is refused with
a "Max 4 projects" message rather than silently dropping one.

Pressing **Compare** opens a side-by-side table with one column per project and one row per
attribute — country, registry, methodology, status, estimated credits, total issued, total retired,
total active, crediting period end and so on. Rows where the projects **differ** are highlighted, and
a legend under the table says so; scanning only the highlighted rows is the fastest way to see what
actually separates two candidates. Use the browser's back control or the breadcrumb to return to the
list with your selection intact.

## The "filtered by registry" banner

Arriving at Projects from a registry record (or from a chart legend elsewhere in the Atlas) shows a
banner along the top: *Showing projects for registry …*, with a **Clear filter** link. That banner is
your reminder that you are not looking at the whole catalogue. Clear it to see everything again.

## The project record

Clicking a row opens the project's own page. A header carries the project name, its registry, status
and key identifiers, and the content below is split into tabs. The tab you are on is reflected in the
address bar, so you can link someone straight to a particular tab.

### Summary

The default tab. It holds:

- **Key facts** — name, country, status, methodology, registry, developer, sector, vintage, created
  date and crediting period, each with an info icon where the term needs explaining.
- **Milestone Tracker** — the project's progress through Registration → Validation → MRV Submission →
  Verification → Issuance, with dates where they are known and **TBD** or an *expected* marker where
  they are not.
- **SDG icons** for the goals the project contributes to.
- A **location map** where the project's coordinates are available.

### Detailed Information

The documents the project actually submitted, grouped by document type and by the schema they were
filed under. Expand a group to read the individual records; a search box at the top filters across
them. This is the human-submitted evidence layer — design documents, monitoring reports, validation
statements and so on — presented as readable fields rather than raw files.

### Issuances & Credits

Everything about the credits themselves:

- the **credit lifecycle** bar, splitting total issued into what is still active, what has been
  transferred and what has been retired;
- a **projected issuance** card for projects that have not issued yet, showing forecast volume and
  expected year. If the source documents contain no forecast, this reads **No Estimations Available**
  — that is an honest statement that the registry did not publish a number, not a loading state and
  not a zero;
- the **issuances table**, listing each minting event with its amount and date, filterable by year.
  Each row links through to the credit record described in chapter 05.

### MRV External Data

This tab only appears for projects that have monitoring, reporting and verification data submitted by
external systems — sensor feeds, meter readings, automated monitoring records. It is separated from
the Detailed Information tab because the two are genuinely different in kind: Detailed Information
holds documents a person wrote and submitted, while MRV External Data holds machine-generated records
that can run to hundreds of thousands of rows.

Because those volumes are large, records are loaded a page at a time per schema rather than all at
once. Pick the schema you are interested in and page through it.

### Advanced

The provenance and export tab, for when you need to prove where a number came from.

- **Export as IWA**, **Export as CADTrust** and **Export as CDOP** download this single project in
  the corresponding interoperability format.
- The **policy canvas** and **pipeline** diagrams show the verification workflow the project ran
  through, and how far along it is.
- **Linked Raw Data** lists the original on-chain documents that contributed to this project, grouped
  by schema, each with a **View JSON** action.
- The **trust chain** traces the record back through the credentials that support it.
- **Methodology Field Mapping** — expandable — shows how this project's fields were derived from its
  methodology's schema fields, and links to the methodology itself.
- **Relationships** is a diagram of how the registry, policy, schema, roles, raw data and token
  connect.
- **Emission Parameters** appears when the project publishes them: baseline emissions, project
  emissions, leakage emissions and the baseline emission factor.

**Administrators only.** Two further buttons, **Re-extract** and **Refresh IPFS**, sit at the top of
this tab for administrators. They re-read the project's source documents and are described in
chapter 13. If you do not see them, you do not have the rights to use them, and nothing on the tab is
affected.

## View Raw Data and HashScan

Wherever you see a **Raw Data** action — in the table's last column, on the Advanced tab, or beside a
document — it opens the original on-chain record as structured JSON, with its own search box for
finding a field inside a large document. This is the ground truth behind every derived figure in the
Atlas.

A **View on HashScan** link opens the same record in Hedera's public block explorer. That takes you
outside the Atlas entirely, which is the point: it lets you confirm independently that the record
exists on the ledger and has not been altered.

---

Next: [05 — Issuances and credits](05-issuances-and-credits.md) · Back to [index](README.md)
