# 03 — Dashboard

This chapter covers the Dashboard, the page you land on when you open the Atlas. It answers "how big
is this network, where is it, and what has been happening lately" in a single screen, and every panel
on it is a doorway into the detailed pages behind.

Everything on the Dashboard is scoped to the network you have selected in the top bar and, if you set
one, to the dashboard filter described below.

## The five stat cards

Across the top sit five cards. Each shows a headline figure, a short subtitle and a change indicator
comparing the current total against the previous year. Every card is a link — click it to open the
full list behind the number. Hovering the small info icon on a card explains exactly what is being
counted.

| Card | What it counts | Where it takes you |
|---|---|---|
| **Registries** | Unique standard registries with any data at all — methodologies, projects, users or issuances. | Registries |
| **Methodologies** | Unique published policy methodologies across those registries. | Methodologies |
| **Projects** | Sustainability projects registered and verified on the network. | Projects |
| **Total Minted Credits** | Credits issued on-chain across all matching projects. | Issuances |
| **Total Retired** | Credits permanently retired — taken out of circulation for offsetting. | Issuances |

## The dashboard filter

Below the heading is a filter bar with two chip pickers, **Developers** and **Registries**. Choosing
one or both re-scopes the *entire* page — the stat cards, the map, both donuts, the registry table
and every trend chart update together to show only projects that match.

This is the fastest way to answer questions like "what does Gold Standard's footprint look like on
its own" without leaving the overview. Clear the chips to return to the whole network.

## Project Distribution

A world map coloured by project count: the darker the green, the more projects that country hosts.
Small dots mark individual project locations where the Atlas has coordinates for them.

Click a country to open a side panel breaking down what is there. The **Map** / **Table** toggle in
the panel header swaps the map for a plain sortable table with **Country**, **Projects**, **Minted
Credits** and **Methodologies** columns, which is easier to read precisely and easier to scan for
small countries. **View all projects** opens the full Projects page.

If nothing renders, the current filter combination has no projects with usable location data — the
panel says so rather than showing an empty map.

## Sector & Registry Breakdown

Two donut charts side by side: **By Sector** and **By Registry**. A toggle above them switches what
is being measured between **Projects** (a count of projects) and **Minted Credits** (issued volume).
The two views can look very different — a sector with few but very large projects dominates one and
barely registers in the other, which is usually the interesting part.

Small slices are grouped into **Other** so the chart stays readable. Clicking a row in the legend
opens the Projects page already filtered to that sector or registry.

## Top Registries

A compact ranking of the most active registries, ordered by project count, with columns for
**Policies** (how many distinct methodologies that registry has published) and **Minted Credits**
(total issued on-chain under it). Chapter 07 covers what a registry record contains.

## Minted Credits Trend

A time series of issuance volume. The **Monthly** / **Quarterly** / **Yearly** toggle changes the
grouping: monthly for recent detail, yearly for long-run shape. The caption underneath tells you how
many periods are being shown.

## Retirement Trend

The same idea applied to retirements — credits permanently removed from circulation for offsetting.
Read together with the issuance trend, this is where you see whether credits are being used or merely
created.

## Vintage Distribution

Issued credits grouped by **vintage year** — the year the emission reduction actually happened, which
is not the same as the year the credit was issued. A cluster of credits in one vintage often reflects
one large project reaching verification, so the caption also shows how many projects contribute.

The glossary entry for **Vintage** explains the distinction if it is unfamiliar.

## Network Activity

A reverse-chronological feed of recent changes across the network — new project registrations, credit
issuances, policy publications and verifications — each with a relative timestamp ("3 hours ago").
It is the quickest way to see whether the network has been busy without reading any charts.

## When a panel says there is no data

Every panel has its own empty message ("No countries match the selected filters", "No issuance data
matches the selected filters", and so on). That wording is deliberate: it means the query ran and came
back with nothing, not that the panel failed. Widen or clear the dashboard filter, or check that you
are on the network you meant to be on.

---

Next: [04 — Projects](04-projects.md) · Back to [index](README.md)
