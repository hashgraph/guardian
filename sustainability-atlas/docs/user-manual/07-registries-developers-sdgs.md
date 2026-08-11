# 07 — Registries, developers and SDGs

This chapter covers the Atlas's three reference catalogues: **Registries**, the bodies that verify
projects and administer credits; **Developers**, the organisations that build and run the projects;
and **SDG**, the UN Sustainable Development Goals that projects contribute to. All three work the
same way — a table you can filter, where the counts are links through to the matching projects.

## Registries

A registry is an independent body that approves methodologies, verifies projects against them and
administers the credits that result. Gold Standard, Verra and TolamEarth are examples.

### The registries table

| Column | What it means |
|---|---|
| **Name** | The registry's name. |
| **ID** | Its Hedera topic identifier, in `0.0.…` form. |
| **Geography** | The region it operates in. |
| **Website** | Its public site. |
| **Law** | The legal jurisdiction it operates under. |
| **Methodologies** | How many policies it has published. |
| **Projects** | How many projects are registered with it. |
| **Users** | How many participant accounts it has on the network. |
| **Issuances** | Credits issued under it. |
| **Tags** | Descriptive labels from its own record. |
| **Created** | When it was first recorded on the network. |

### Filters

Search by name, or filter on **Name**, **ID** (which accepts the `0.0.xxxx` form), **Tags**,
**Geography**, **Law**, registry DID and **Created Date**.

One filter deserves its own note. **Hide registries with no methodologies, projects, users, or
issuances** is **on by default**. The network contains registry records that have registered but not
yet published anything, and including them makes the list much longer without making it more useful.
Uncheck it when you specifically want to see who has signed up but not yet started.

**Download Data** exports the current view as CSV, with or without an account. The **ID** column has a copy
control so you can lift a topic id without selecting text by hand — useful when you need it for the
Sync Status page (chapter 12).

### The registry record

Clicking a row opens the registry's own page, with three headline counts — **Methodologies**,
**Projects** and **Issuances** — and two tabs.

**Details** holds the registry's own information (geography, law and jurisdiction, website, language,
tags, creation date and network), a **Project Locations** map showing where its projects are, a **Top
Methodologies** ranking ordered by project count, and two charts: **Methodologies by Projects** and
**Projects by Sector**. Where the registry has no geolocated projects, the map says so.

**Advanced** holds the on-chain identifiers — source topic id, registry topic id and registry DID —
with **Copy DID**, **View Raw Data** and **View on HashScan** actions.

From either tab you can jump to that registry's projects, credits or methodologies; each opens the
corresponding list page with the *Showing … for registry …* banner in place.

## Developers

Developers are the organisations that design, implement and own the projects. They submit projects to
a registry, run day-to-day operations and hold the resulting credits.

| Column | What it means |
|---|---|
| **Developer** | The organisation's name. |
| **HQ** | Where it is headquartered. |
| **Countries** | How many countries it operates projects in. |
| **Projects** | How many projects it runs. |
| **Issued** | Total credits issued across all its projects. |
| **Retired** | How many of those have been permanently retired for offsetting. |
| **Categories** | The kinds of project it works on. |
| **Registries** | Which registries it works with. |
| **Status** | Its current state. |

Search by name and filter by **Status**. The **Issued** and **Retired** columns each carry an info
icon explaining what is being totalled.

The **Projects** count is a link: clicking it opens the Projects page filtered to that developer, so
you can go from "this organisation runs 14 projects" to the list of those 14 in one click.

## SDG

The UN Sustainable Development Goals give a common vocabulary for the co-benefits a carbon project
delivers beyond the emissions themselves — clean water, decent work, life on land, and so on.
Projects tag which goals they contribute to, and this page aggregates those tags.

| Column | What it means |
|---|---|
| **SDG** | The goal's number and icon. |
| **Goal** | Its full title. |
| **Projects** | How many projects contribute to it. |
| **Coverage** | The share of all projects contributing to this goal, drawn as a bar. |

The **Coverage** bar makes the shape of the network obvious at a glance: climate action is tagged by
almost everything, while some goals are claimed by only a handful of projects. Hovering the coverage
header explains exactly what the percentage is measured against.

As on the Developers page, the **Projects** count is a link through to the Projects page filtered to
that goal.

---

Next: [08 — Analytics](08-analytics.md) · Back to [index](README.md)
