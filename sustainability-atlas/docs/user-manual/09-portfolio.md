# 09 — Portfolio

**Requires a signed-in account.**

This chapter covers the Portfolio page — your own private dashboard. Unlike every other page in the
Atlas, which shows the whole network, the Portfolio shows only the projects you have chosen to
follow, arranged with the widgets you have chosen to keep.

Nothing you do here is visible to anyone else, and nothing you do here changes the underlying data.

## Starting from empty

A new account has an empty Portfolio, and the page says so: *Your portfolio is empty*, with a
**Manage Watchlist** button. Until you add something, there is nothing for the widgets to summarise.

## The watchlist

The watchlist is the list of projects the whole page is driven by. Every figure and chart on the
Portfolio reflects it — change the watchlist and everything recalculates.

Click **Manage Watchlist** to open the picker. It shows every project on the current network with
**Add** and **Remove** controls, and its own filters for **Country**, **Methodology**, **Registry**
and **SDG** so you can narrow a large catalogue down before choosing. Two extra controls help with
bulk work:

- **Add all projects to watchlist** adds everything currently matching your filters at once, and
  tells you how many it added.
- **Show selected only** hides everything you have not picked, which is the quickest way to review
  your current list.

Duplicates are prevented, so adding the same project twice is harmless. Press **Update Watchlist** to
apply your changes, or **Cancel** to discard them. **Clear watchlist** empties it entirely.

The subtitle at the top of the page always tells you how many items are on the watchlist, as a
reminder of what the numbers below are scoped to.

## Widgets

The body of the page is a set of widgets. Which ones appear is up to you.

Click **Widget Library** to open the catalogue. Widgets are grouped so the list stays navigable:

| Group | Contains |
|---|---|
| **KPI Cards** | Total Minted Credits, Active Supply, Total Credits Retired, Active Projects. |
| **Trend Charts** | Minted Credits Trend, Retirement Trend, Vintage Distribution. |
| **Breakdowns** | Projects by Sector, Projects by Registry, SDG Coverage, Project Distribution (a map of your watchlisted projects). |
| **Tables & Lists** | Watched Projects, Top 10 Host Countries by Credits, Top Registries, Recent Issuances, Top 10 SDG by Project Count, Network Activity. |
| **System** | Last Sync Timestamp. |

Each entry has a one-line description of what it draws. Toggle the ones you want on or off and press
**Apply Changes**.

You can also remove a widget **from the page itself** — each one carries a small × in its corner. That
is the fastest way to tidy up: turn things off where you are looking at them rather than hunting for
them in the library. To bring one back, reopen the Widget Library and toggle it on again. Nothing is
ever deleted; a removed widget is simply switched off.

The **Watched Projects** widget deserves a mention of its own: it is a horizontally scrollable row of
cards, one per watchlisted project, each showing issued, retired and transferred credits, the
methodology, the crediting period and the SDG count, with an **Open** action through to the full
project record.

**Network Activity** shows the same event taxonomy as the Dashboard's version (see the Dashboard
chapter) — project registrations, methodology and registry registrations, credit issuance and
retirement, and other network events — refreshing automatically roughly every 25 seconds. Project
registrations and credit issuance are scoped to your watchlist; methodology/registry registrations,
credit retirement, and the "other" events bucket remain network-wide, since those aren't really
events any one project "owns."

## Custom charts

**Add Custom Chart** lets you build something the library does not offer.

You choose a **Chart Title**, a **Chart Type** (line, vertical bar, horizontal bar, pie, donut or
radar), an **X-Axis (Categories)** to group by and a **Y-Axis (Metric)** to measure.

- X-axis options: Time — Month, Vintage Year, Sector, Country, Registry, SDG Goal.
- Y-axis options: Credits Issued, Project Count, Retirement Volume.

Custom charts sit alongside the built-in widgets and, like them, reflect your active watchlist rather
than the whole network. There is a maximum number of custom charts per person; the dialog shows how
many of your allowance you have used, and the **Add Custom Chart** button tells you when you have
reached the limit. You cannot create two charts with the same name, and if you build a chart whose
configuration duplicates an existing one, the Atlas names the chart it would duplicate rather than
silently creating a second copy. Existing charts can be edited afterwards to change their type, data
source or title.

## How your layout is saved

Everything on this page — your watchlist, which widgets are on, your custom charts and the watchlist
picker's own filters — is saved to **your account**, automatically, shortly after you change it.
There is no save button and nothing to remember.

Two consequences are worth knowing.

**It is stored per network.** Your mainnet Portfolio and your testnet Portfolio are separate. This is
deliberate: a watchlist of mainnet projects is meaningless on testnet, where those projects do not
exist. If you switch networks and the page looks empty, you are looking at a different portfolio, not
a lost one — switch back and yours returns intact.

**It follows you between devices.** Because the layout lives on your account rather than in the
browser, signing in somewhere else gives you the same watchlist, the same widgets and the same custom
charts. (This is different from the guided tour's "already seen" flag, which is per-browser — see
chapter 01.) If a second device shows an empty Portfolio, check the network selector first.

---

Next: [10 — Reports and exports](10-reports-and-exports.md) · Back to [index](README.md)
