# 08 — Analytics

This chapter covers the Analytics page. It contains no data you cannot reach elsewhere in the Atlas —
what it adds is a set of cross-cutting views, each arranged around the questions one kind of reader
actually asks. If the Dashboard answers "how big is this network", Analytics answers "what does that
mean for me".

Everything here is scoped to the network selected in the top bar.

## The headline strip

Five figures sit above the tabs and stay on screen whichever view you choose. Each one has a short
explanation underneath.

| Figure | What it tells you |
|---|---|
| **Active Supply** | Credits currently in circulation — issued minus retired. |
| **Retirement Rate** | The share of issued credits that have been retired. A high rate means credits are being used, not just created. |
| **Pipeline Projects** | Projects that have not issued yet: registered through to verified. Future supply. |
| **Avg Vintage Year** | The average vintage across issued credits. A lower number means older supply, a higher one fresher. |
| **Avg Crediting Period** | The mean length of a project's crediting period, in years. |

## The five views

A row of tabs switches between them, and a one-line description of the current view sits underneath
the row.

### Market Overview

*Lifecycle, vintage, and pipeline pulse.* The general-purpose view — start here if you are not sure
which of the others you want.

- **Project Lifecycle Funnel** — how projects are distributed across the workflow stages, from
  registration through to issuance. A funnel that narrows sharply at one stage tells you where
  projects are getting stuck.
- **Vintage Distribution** — issued credits grouped by the vintage year of the project behind them.
- **Top Sectors by Credits Issued** and **Top Host Countries by Credits** — the two simplest
  concentration questions: what kind of work, and where.

### Buyer View

*Supply, vintage, and SDG availability.* Written for someone who wants to buy credits and needs to
know what is actually purchasable.

- **Supply Age Profile** — issued credits by how old their vintage is. Most corporate buyers prefer
  fresher vintages, so the shape of this distribution is a direct read on how much of the market is
  attractive to them.
- **Available Supply by Sector** — active credits (issued minus retired) by sector. Note the
  difference from the Market Overview's chart: that one shows everything ever issued, this one shows
  what is still in circulation.
- **Methodology Adoption** — which methodologies account for the most credit volume.
- **SDG Co-benefit Coverage** — how many projects claim each Sustainable Development Goal, for buyers
  with co-benefit requirements to satisfy alongside the tonnage.

### Developer View

*Benchmark project scale and sector performance.* For project developers judging their own work
against the field.

- **Avg Project Size by Sector** — the typical issuance volume per project in each sector, which is
  the benchmark you need before deciding whether a given project is large or small.
- **Status Distribution** — how projects across the network are spread across the reported statuses.
- **Top Developer Leaderboard** — developers ranked by credit volume.

### Registry View

*Throughput, methodology adoption, geographic reach.* For registry staff and anyone comparing
registries.

- **Registry Throughput** — how much each registry is actually processing.
- **Pipeline Heatmap by Registry** — project status crossed with registry, so you can see at a glance
  which registries have a healthy pipeline and which are concentrated at one stage.
- **Registry Market Share** — each registry's share of total issued volume.

### Climate Impact

*SDG alignment, sector contribution, vintage concentration.* For impact and disclosure work rather
than trading.

- **SDG Alignment Matrix** — which goals the network's projects claim, and how densely.
- **Sector Contribution to Total Supply** — what share of all credits each kind of intervention
  accounts for.
- **Country Contribution to Supply** — the same question by geography.

## Reading these charts honestly

Two cautions worth carrying through every view.

First, **credits and projects are different units**, and a chart of one can look nothing like the same
chart of the other. A sector with a handful of very large projects dominates the credit charts and
barely appears in the project-count charts. Check which one you are looking at before drawing a
conclusion.

Second, everything here reflects what has been **indexed** from the ledger, up to the timestamp shown
in the sidebar. It is not a projection and it is not a market price signal — it is a description of
what has been published on-chain. Chapter 12 explains how to check how current that is.

---

Next: [09 — Portfolio](09-portfolio.md) · Back to [index](README.md)
