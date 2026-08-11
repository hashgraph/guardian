# Sustainability Atlas — User Manual

The Sustainability Atlas is a read-only explorer for carbon-credit data published to the Hedera
Guardian network. It gathers what registries, methodologies, projects and issued credits have
recorded on-chain, and presents it as searchable lists, project records, charts and exports. Nothing
you do in the Atlas changes the underlying data — the Atlas reads the ledger, it does not write to it.

## Who this manual is for

Anyone who uses the Atlas through a browser: credit buyers checking supply and vintages, project
developers tracking their own portfolio, registry staff reviewing what has been published under their
policies, analysts building market views, and auditors following a number back to the document it
came from. No technical background is assumed. If you can read a table and click a link, you can use
everything described here.

Developers integrating with the platform should look in the parent `docs/` folder instead — the files
there are written for engineers, not end users.

## What you can do at each access level

| Level | What you get |
|---|---|
| **Guest** (not signed in) | Full read-only access to every public page: the dashboard, projects, issuances, methodologies, registries, developers, SDGs, analytics, the glossary and the sync status page. You can filter, sort, compare projects, open any record and download any table as CSV with **Download Data**. You can also take the guided tour. |
| **Signed-in user** | Everything a guest gets, plus a personal Portfolio with a watchlist and configurable widgets, saved quick filters, the Reports page, watchlist notifications, API keys and a request-limit allowance. |
| **Administrator** | Everything a signed-in user gets, plus User Management, per-user request quotas, and maintenance actions on projects, methodologies and the sync pipeline. |

If a control looks greyed out or a whole section is missing, it is almost always because you are at a
lower level than the feature requires. Chapter 15 lists the common cases.

## Contents

| Chapter | What it covers |
|---|---|
| [01 — Getting started](01-getting-started.md) | Your first visit, the guided tour, creating an account, verifying your email, signing in and resetting a password. |
| [02 — Navigating the Atlas](02-navigating-the-atlas.md) | The sidebar, top bar, global search, breadcrumbs, the network and language selectors, notifications, and the account and help menus. |
| [03 — Dashboard](03-dashboard.md) | The landing page: stat cards, the project map, sector and registry breakdowns, issuance and retirement trends, vintages and network activity. |
| [04 — Projects](04-projects.md) | The projects table, the full filter set, quick filters, CSV download, side-by-side comparison, and every tab of a project record. |
| [05 — Issuances and credits](05-issuances-and-credits.md) | The issuances table and its filters, unlinked credits, and every tab of a credit record. |
| [06 — Methodologies](06-methodologies.md) | The methodologies table, decode status, and every tab of a methodology record including the policy download. |
| [07 — Registries, developers and SDGs](07-registries-developers-sdgs.md) | The three reference catalogues and how to follow a count through to a filtered project list. |
| [08 — Analytics](08-analytics.md) | The five stakeholder views and the question each one answers. |
| [09 — Portfolio](09-portfolio.md) | Your private dashboard: the watchlist, the Widget Library, custom charts and how the layout is saved. |
| [10 — Reports and exports](10-reports-and-exports.md) | Configured dataset exports, impact summaries, and how these differ from Download Data. |
| [11 — Account and security](11-account-and-security.md) | Your profile, password, request limits, API keys, activity log and the product tour card. |
| [12 — Sync status](12-sync-status.md) | What synchronisation means, how to read the queue, event log, topics and tokens. |
| [13 — Administration](13-administration.md) | User Management and the admin-only actions scattered through the rest of the app. |
| [14 — Glossary and help](14-glossary-and-help.md) | Looking terms up, restarting the guided tour, and sending feedback. |
| [15 — FAQ and troubleshooting](15-faq-and-troubleshooting.md) | The questions people actually ask, with short answers. |

## Conventions used here

Interface elements are named by the exact English label you see on screen — **Download Data**,
**Quick filters:**, **Widget Library**, **Compare** — so you can match the text in front of you.
Sections that need more than guest access open with a bold callout: **Requires a signed-in account.**
or **Administrators only.**

This manual is maintained in English. The application interface and the in-app guided tour are
available in English and Spanish.

There are deliberately **no screenshots**. The interface changes faster than a screenshot set can be
maintained, and a stale screenshot is more misleading than none at all. Please keep it that way — if
you find yourself wanting to add one, the usual fix is a clearer sentence.

---

Next: [01 — Getting started](01-getting-started.md)
