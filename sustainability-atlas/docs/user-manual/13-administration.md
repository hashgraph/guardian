# 13 — Administration

**Administrators only. Skip this chapter if you do not see User Management in your account menu.**

This chapter covers the User Management page and the administrator-only actions that appear inside
otherwise ordinary pages. Nothing described here is visible to a guest or an ordinary signed-in user
— if you cannot see a control mentioned below, you do not have the rights for it, and the rest of the
page works normally without it.

Reach User Management from the account menu in the top-right corner: click your name, then **User
Management**.

## Users tab

### Creating a user

**Create User** opens a form for adding a new account. You supply the person's first name, last name,
email address, country and **Role** — either a **User** ("personalised features and API keys") or an
**Admin** ("full access including User Management") — plus an **Initial password**.

The form makes one thing explicit and it is important: *the user will be asked to change it on first
login*. The password you type is a handover credential only. The person you give it to will be met by
a non-dismissible password-change dialog when they first sign in, and cannot use the Atlas until they
have replaced it. Send it to them by whatever channel you would use for any temporary secret.

Every field is validated before submission — a missing name, a malformed email address, a missing
country or a password below the minimum length is refused with a specific message rather than a
generic failure.

### The counts bar and filters

Above the table, three figures: **Total**, **Active** and **Inactive**.

The filter bar works exactly as it does everywhere else in the Atlas — a search box for finding a
person by name, email or organisation, plus filters for **Role** (Admin or User) and **Status**
(Active or Inactive). The result count updates as you narrow.

### The users table

Columns cover **First Name**, **Last Name**, **Username**, **Organization Name**, **Job Title**,
**Country**, role, **Status**, **Email** (Verified or Unverified), **Created** and **Actions**. Your
own row is marked **You**.

Three actions sit at the end of each row.

**Make Admin / Make User** changes a person's role. It takes effect on their next request; there is
no need for them to sign out and back in.

**Activate / Deactivate** turns an account on or off. Deactivating is the correct response to
somebody leaving, or to a suspected compromise: it stops the account being used without destroying
its history, and it is reversible. You cannot deactivate your own account — the control is disabled
on your own row, which is deliberate and prevents an administrator locking themselves out.

**Limit** opens the per-user quota dialog. It shows the person's current hourly request limit and
whether that is their role default, and asks for a new limit and a **required justification**. The
justification is not optional and not decorative: it is the record of *why* the limit was changed,
and it is the only thing that will explain the decision to whoever looks at it in six months. The new
quota applies to that person's API keys immediately.

Each action confirms with a short message — *User created*, *User activated*, *User deactivated*,
*Role updated*, *Rate limit updated*.

## Rate Limit Requests tab

This is the queue of increase requests submitted by users from their Account Settings page
(chapter 11). Each entry shows the requester, their **Current** limit, the **Requested** figure, the
justification they gave and when it was **Submitted**.

You have four responses:

- **Approve** — grant exactly what was asked for.
- **Adjust** / **Approve with Adjustment** — grant a different figure. Enter the **Approved quota**
  you are willing to give; the request is recorded as *Adjusted* rather than *Approved*, so the
  requester can see that the number they got is not the number they asked for.
- **Decline** — refuse it.
- An optional **note to the requester** can accompany any decision. Use it, particularly when
  declining or adjusting — a bare "Declined" generates a follow-up conversation that one sentence
  would have prevented.

Whatever you decide applies immediately to that user's keys.

**When the tab is disabled.** If rate limiting is switched off for this deployment, the Rate Limit
Requests tab is faded and cannot be opened, with a tooltip explaining that rate limiting is currently
disabled. The **Limit** action on each user row is disabled for the same reason. Nothing is broken —
there is simply no limit to adjust, so there are no requests to review.

## Administrator actions elsewhere in the Atlas

Three other pages grow extra controls when an administrator is signed in.

### Project record → Advanced tab

Two buttons appear at the top of the tab, ahead of the export buttons everybody sees (chapter 04).

**Re-extract** re-reads the project's linked source documents and rebuilds its derived fields. Use it
when a project is showing stale or incomplete detail — a missing country, an unlinked methodology, a
field that did not populate. It queues the work rather than doing it inline, so the button confirms
how many documents were queued and asks you to refresh in a few seconds. If the project has no linked
documents yet, it tells you there is nothing to re-extract rather than pretending to work.

**Refresh IPFS** forces a re-fetch of every document in the project's topic from IPFS and then
re-parses them. This is the heavier of the two and the right choice when the problem is that a
document's *contents* were never successfully retrieved, rather than that they were retrieved and
interpreted wrongly. It reports how many fetches and re-parses it queued, and says so plainly when
everything in the topic has already been fetched.

Try **Re-extract** first. It is faster and it fixes the more common problem.

### Methodology record → Decoded Mapping tab

Three controls appear under **Mapping actions** (chapter 06).

**Re-run decoder** puts the methodology's policy back through the decoder. This is what to reach for
when the decode status is *Failed* or *Not decoded*, or when a policy has been republished. It queues
the work and asks you to refresh shortly.

**Re-parse projects** re-reads every project registered under this methodology using the current
mapping. It is only useful once the policy has decoded successfully — before that it is disabled with
a hint saying to decode first — and it reports how many projects it queued. If there are no cached
documents to re-read, it says so.

**Edit mapping** lets you correct the field mapping by hand when the decoder has matched a project
field to the wrong schema field, or missed one. Each project field gets a dropdown of the schema's
fields, plus **— None —** to leave it unmapped. For fields that come from an array, an optional index
box picks a specific element by its zero-based position; leaving it blank joins the values instead.
Save applies the change and records it in the **Manual mapping history** table with your name, the
fields you touched and the time — visible to everyone, which is the point. If you save without having
changed anything, it says so rather than writing an empty audit entry.

A manually edited mapping is marked **Manually Edited** rather than **Auto-Decoded**. Be aware that
re-running the decoder may overwrite hand edits, so if you have corrected a mapping by hand, prefer
**Re-parse projects** over **Re-run decoder** unless the policy itself has changed.

### Sync Status page

An administrator sees action controls on the queue table and a requeue box above the topics table
(chapter 12).

Per-queue, **Pause** and **Resume** stop and restart a queue, **View failures** opens the failed-jobs
drawer, and **Retry all** re-queues everything that failed. Inside the drawer, failures are grouped
**By reason** as well as listed under **All failed**, which is the fastest way to tell one systemic
fault from a scatter of unrelated ones. Individual jobs can be retried one at a time, and an
**Override retry limit (force)** option exists for jobs that have exhausted their automatic retry
budget — use it only when you know why the job failed and believe the cause is gone, because forcing a
job that will fail again just moves the problem. **Retry all** asks for confirmation and then reports
how many jobs it retried and how many it skipped.

**Requeue topic** takes a topic identifier in `0.0.<number>` form and queues that stream for
re-reading. The format is validated before anything is sent, so a mistyped id is rejected
immediately rather than silently doing nothing. You can requeue from the current position or from the
beginning of the stream; requeuing from the start is the thorough option and the slow one. The same
action is available inline on each row of the topics table. A confirmation names the topic that was
queued, and a failure names the topic and the reason.

Pausing a queue is worth a specific warning. A paused queue stops processing entirely, and the
**Data synced up to** timestamp that every user relies on will fall behind while it stays paused.
Resume it when you are done.

---

Next: [14 — Glossary and help](14-glossary-and-help.md) · Back to [index](README.md)
