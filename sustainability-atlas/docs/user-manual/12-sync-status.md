# 12 — Sync status

This chapter covers the Sync Status page. It answers one question that matters to every user of the
Atlas, whatever else they came for: **how current is what I am looking at?**

Everyone can open this page and read everything on it. The actions on it — pausing a queue, retrying
work, requeuing a topic — are administrator-only and are described in chapter 13.

## What synchronisation means here

The Atlas does not hold its own record of the carbon market. Everything it shows is copied from the
Hedera ledger, where registries, projects and credits publish their records as they happen.

A background process continuously reads those published records, works out what they mean, and files
them into the catalogue you browse. That process is what "sync" refers to. It runs constantly, but it
is not instantaneous: a document published on the ledger a minute ago may take a little while to
appear in the Atlas.

This is why the sidebar carries a **Data synced up to** timestamp on every page, and why it is the
first thing to check when something seems to be missing. If the timestamp is recent and a record is
still absent, the record genuinely is not there. If the timestamp is hours old, the record may simply
not have been picked up yet.

## The headline figures

Three cards run across the top:

- **Data Synced Up To** — the same timestamp as the sidebar, in full.
- **Topics Indexed** — how many sources of records the Atlas has read, out of how many it has
  discovered. A "topic" is one stream of on-chain records; a registry, a policy and a project each
  have their own.
- **Messages Processed** — how many individual records have been handled, and how many are still
  waiting.

Read together, they tell you whether the Atlas is caught up or working through a backlog.

## Queue Status

Work is divided into named queues, each handling one kind of job. The table shows, for each queue:

| Column | What it means |
|---|---|
| **Queue** | The kind of work it handles. |
| **Waiting** | Jobs queued but not started. |
| **Active** | Jobs running right now. |
| **Completed** | Jobs finished successfully. |
| **Failed** | Jobs that could not be completed. |
| **Delayed** | Jobs deliberately deferred, usually to be retried later. |
| **Concurrency** | How many of that queue's jobs can run at once. |
| **Status** | **Active**, **Idle** or **Paused**. |

**Total Waiting** and **Total Failed** summarise the whole table above it.

A small indicator shows whether the page is receiving **Live** updates or falling back to
**Polling** — either way the numbers refresh on their own, live just does it sooner. **Last updated**
tells you when the figures on screen were last refreshed.

How to read it as a non-administrator: a queue with a large **Waiting** number and a healthy
**Active** number is simply busy, and the backlog will clear. A queue that is **Paused**, or one with
a growing **Failed** count and nothing active, is stuck and worth reporting. A **View failures**
action opens the detail, which is readable by anyone; the retry controls inside it are not.

## Sync Health

A compact summary: **Last Synced**, the current **Lag** (how far behind the ledger the Atlas is), and
counts of **Topics** and **Tokens**. Lag is the single most useful number on the page — a lag of
minutes is normal operation, a lag of many hours means the pipeline is behind.

## Recent Activity

A running event log of what the pipeline has been doing, with a count of events in the current
session. Two filters: **All** and **Failures only**. Switch to **Failures only** when you are trying
to work out whether a problem is systematic or a one-off.

The log pages through history, and you can change how many events are shown at a time. If it is
empty, it says it is waiting for queue activity — that means nothing is happening, not that the log
is broken.

## Topics

A table of the individual record streams the Atlas reads, with a search box and a status filter, and
paging through what is usually a long list. Search by topic identifier — they take the form
`0.0.` followed by a number — to check whether a specific registry, policy or project stream has been
picked up and how far through it the Atlas has got.

If you need a topic id, the Registries page has a copy control on its **ID** column (chapter 07), and
project and methodology records show theirs on their Advanced and Hedera Policy tabs.

## Tokens

The same idea for credit tokens: a searchable, filterable, paged table of the tokens the Atlas is
tracking, so you can confirm whether a particular token has been indexed.

## What you cannot do here

To be explicit, because the page looks like a control panel: for a guest or an ordinary signed-in
user, **this page is read-only**. There is nothing on it you can break, and nothing you can press
that will change anyone else's data. The buttons that do change things are only rendered for
administrators.

---

Next: [13 — Administration](13-administration.md) · Back to [index](README.md)
