# 02 — Navigating the Atlas

This chapter covers the parts of the interface that are on screen no matter which page you are
looking at: the sidebar, the top bar with its breadcrumbs and search, the network and language
selectors, the notification bell, and the account and help menus. Learn these once and every other
chapter becomes shorter.

## The sidebar

The sidebar runs down the left-hand edge and is the main way of moving around.

| Destination | What you will find there |
|---|---|
| **Dashboard** | The at-a-glance overview of everything indexed. Chapter 03. |
| **Projects** | Every sustainability project in the catalogue. Chapter 04. |
| **Issuances** | Every credit token issued on-chain. Chapter 05. |
| **Methodologies** | The published policy workflows projects are verified against. Chapter 06. |
| **Registries** | The standard registries operating on the network. Chapter 07. |
| **Developers** | The organisations that build and run the projects. Chapter 07. |
| **SDG** | Project contributions mapped to the UN Sustainable Development Goals. Chapter 07. |
| **Analytics** | Cross-cutting views of the same data for different audiences. Chapter 08. |
| **Glossary** | Plain-language definitions of the terminology. Chapter 14. |
| **Sync Status** | How current the data is and how the pipeline is behaving. Chapter 12. |

**Requires a signed-in account.** Below a thin divider at the bottom of that list, two more entries
appear once you sign in:

| Destination | What you will find there |
|---|---|
| **Portfolio** | Your private dashboard, driven by your watchlist. Chapter 09. |
| **Reports** | Configured exports and impact summaries. Chapter 10. |

The panel button at the far left of the top bar **collapses** the sidebar to a narrow strip of icons,
which is useful on a small screen or when a wide table needs the room. Collapsed, each icon shows its
name as a tooltip when you hover it. Click the button again to expand.

At the very bottom of the sidebar, under the Hedera Guardian attribution, sits a **Data synced up to**
stamp with a date and time. That is the moment the Atlas last caught up with the ledger — the single
most useful number on the page when something looks like it is missing. Chapter 12 explains it
properly.

## Breadcrumbs

The top bar shows where you are as a trail: **Dashboard › Projects › _record name_**. Every step
except the last is a link, so the breadcrumb is the quickest way back up a level.

On a detail page, the last crumb starts as the record's raw identifier and is replaced by its proper
name a moment later, once the Atlas has looked it up. On narrow screens the earlier crumbs shrink to
icons so the trail still fits.

## Global search

The search box sits in the middle of the top bar and searches the entire Atlas at once — projects,
methodologies, registries and issued credits together, rather than only the page you happen to be on.

- Start typing; results appear once you have entered **at least two characters**.
- Results are grouped visually by type, with a coloured icon and a short line of context (registry,
  methodology, status, token id, supply — whatever is relevant to that kind of record).
- **Arrow up** and **arrow down** move through the results, **Enter** opens the highlighted one, and
  **Escape** closes the list. A mouse works exactly as you would expect.
- Results are limited to the **network you currently have selected**. If you expect a record and it
  does not appear, check the network selector before concluding it is missing.

## Network selector

The Atlas can read either the Hedera **mainnet** — the live network carrying real, financially
meaningful credits — or the **testnet**, a free network used for trials and rehearsals. The selector
in the top bar switches between them, and a coloured dot shows which one is active.

Switching networks reloads **every figure on the page**. Counts, charts, tables and search results
are all scoped to the selected network, and a project that exists on testnet generally does not exist
on mainnet or vice versa. This is by far the most common explanation for "the numbers all changed".

Your choice is stamped into the address bar as `?network=…`. That has a useful consequence: if you
copy the URL out of the address bar and send it to a colleague, they see the same data you were
looking at, on the same network. Links you follow inside the Atlas — including opening one in a new
tab — carry the network with them automatically.

## Language selector

Next to the network selector, the language selector switches the interface between **English** and
**Español**, with a flag and the language code showing the current choice. Your selection is
remembered for a year in this browser, so you only set it once.

The language affects the interface: labels, headings, tooltips, the guided tour and error messages.
It does not translate the underlying records — a project's name and its submitted documents appear as
their authors wrote them.

## Notifications

**Requires a signed-in account.** The bell in the top bar tells you when something happens to a
project on your Portfolio watchlist — a new issuance, a retirement or a transfer. A small badge
counts unread items, showing `9+` once there are more than nine.

Click the bell to open the panel:

- **All** and **Unread** tabs switch between everything and only what you have not read.
- Clicking a notification marks it read and expands it to show the detail — the project, registry,
  methodology and volume involved.
- **Mark all as read** clears the badge without deleting anything.
- **Clear all** removes them permanently. It asks first: the button changes to **Click again to
  confirm**, and only the second click actually clears.
- **Load more** at the bottom fetches older items in batches.
- New notifications arrive live while the panel is open; you do not need to refresh the page.

## Account menu

Signed in, the top-right corner shows your initials and name. Click it for:

- **Account Settings** — your profile, password, request limits, API keys, activity log and the
  product tour card (chapter 11);
- **User Management** — administrators only (chapter 13);
- **Sign Out**.

Signed out, the same corner shows a **Sign In** button that opens the sign-in dialog.

## Help menu

The **?** button sits between the network selector and the notification bell, on every page, for
everyone. It offers two things:

- **Take the Product Tour** — starts (or restarts) the guided tour described in chapter 01;
- **Glossary of Terms** — jumps to the glossary described in chapter 14.

## Feedback

A **Feedback** button is anchored in the bottom-right corner of every page. Chapter 14 explains what
to put in a report and what the optional screen capture does.

---

Next: [03 — Dashboard](03-dashboard.md) · Back to [index](README.md)
