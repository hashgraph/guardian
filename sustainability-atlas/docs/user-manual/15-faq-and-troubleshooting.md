# 15 — FAQ and troubleshooting

This chapter collects the questions people actually ask when something in the Atlas looks wrong.
Most of the time nothing is broken: the answer is a network selector set differently than you
expected, data that has not finished synchronising, or a feature that needs an account. Each entry
below gives the short answer first, then where to look next.

## Data looks wrong or has changed

### The numbers changed, or everything disappeared

Check the **network selector** in the top bar. The Atlas covers more than one Hedera network —
mainnet carries real, production carbon-credit data, while testnet carries test records published by
registries and developers trying things out. The two are entirely separate datasets. Switching
between them changes every figure on every page, and a project that exists on one may not exist on
the other at all.

If the page looks empty, confirm you are on the network you meant to be on before assuming anything
is missing.

### I copied a link and my colleague saw different data

The network you are viewing travels in the address bar as a `?network=` part at the end of the link.
If you copy the address straight from your browser, that part comes with it and your colleague sees
exactly what you see.

If the link was retyped, shortened, or pasted without the end of the address, they will land on
whichever network their own session was last set to. When you share a link and the data matters,
send the full address and say which network it points at.

### Why is a project (or issuance, or methodology) missing?

Almost always synchronisation lag. The Atlas copies records from the ledger continuously, but a
record published a few minutes ago may not have been picked up yet.

Check **Data synced up to** in the top bar — that timestamp tells you how current the data is. If
the record you are looking for was published after it, it has not arrived yet. The
[Sync Status page](12-sync-status.md) shows what the pipeline is working through and whether it is
running behind.

If the timestamp is current and the record still is not there, it may not have been published to the
network the Atlas reads, or it may be on the other network.

### Why does a project show no issuances?

Because it has not issued any credits yet. A large share of projects in the Atlas are in the
pipeline: registered, documented, and working through validation, but not yet at the point of having
credits minted against them. Their project record is complete and their documents are readable —
there is simply nothing in the issuance history to show.

This is normal and is not a data error. Chapter 04 explains how to tell a pipeline project from an
issuing one.

### Why does the projected volume say "Not estimated"?

Because the source documents contain no forecast. The Atlas reports what registries and developers
have actually published; where a project's paperwork includes no estimate of future volume, the
Atlas says so rather than calculating a guess of its own.

"Not estimated" means the number does not exist upstream, not that it failed to load.

### Total minted does not match the current supply

These measure two different things, and they are expected to differ.

**Total minted** is the cumulative count of every credit ever issued for that project — a number
that only ever goes up. **Current supply** is how many of those credits still exist and are held.
Credits leave the supply when they are **retired** (permanently cancelled, usually because someone
has claimed the offset) and they move between holders when they are **transferred**.

A project with a large minted total and a small current supply has had most of its credits retired,
which is the intended end state for a carbon credit. Chapter 05 covers how to read the issuance and
retirement history.

## Accounts and access

### I did not get the verification email

Check your spam or junk folder first — automated verification mail is a frequent false positive.

If it is genuinely not there, use the **Resend** button on the verification screen. Resending is
throttled: if you press it repeatedly you will be asked to wait before another message can be sent.
That delay is deliberate and waiting it out is the only fix.

If several attempts over a longer period produce nothing, the address may have been mistyped at
sign-up. Contact an administrator, who can check what address the account was created with.

### I am asked to change my password immediately after signing in

Your account was created for you by an administrator rather than through self sign-up. Accounts made
this way start with a temporary password and require you to set your own before you can do anything
else.

Set a new password at the prompt and you will not be asked again. Chapter 11 covers the password
rules.

### A button is greyed out, or a tab is missing

Three possible reasons, in order of likelihood:

1. **It needs an account.** Portfolio, Reports, saved quick filters, exports, notifications and API
   keys all require you to be signed in. Sign in and they become available.
2. **It needs administrator rights.** User Management, and the maintenance actions on projects,
   methodologies and the sync pipeline, are restricted to administrators. If you do not see **User
   Management** in your account menu, you do not have those rights — see chapter 13.
3. **The feature is switched off platform-wide.** Some capabilities can be disabled for everyone by
   configuration. In that case nobody sees them, regardless of account level.

If you believe you should have access to something you cannot reach, an administrator can confirm
what your account is entitled to.

### My saved dashboard or watchlist is empty on a new device

Your Portfolio is stored against your account, so signing in elsewhere should bring it with you.
Two things scope it more narrowly than people expect:

- **It is per-network.** A watchlist built on mainnet does not appear while you are viewing testnet.
  Check the network selector.
- **It is per-account.** If you have more than one login, each keeps its own Portfolio.

If you are on the right network and the right account and it is still empty, nothing has been added
to it yet on that combination.

## The guided tour

### The tour will not start again

Once you have seen it, the tour does not launch itself a second time — that is deliberate, so it
does not interrupt you on every sign-in.

To run it again, use the **Help** button (**?**) in the top bar and choose **Take the product tour**,
or go to Account Settings and use the product tour card there. It can be restarted as many times as
you like.

### The tour started again on a different computer

The "you have already seen this" flag is remembered **per browser**, not against your account. A new
device, a different browser, a private window, or clearing your cookies all present themselves as a
first visit, so the tour offers itself again.

Skipping it takes a moment and it will stay skipped on that browser afterwards.

### I cannot click anything while the tour is running

That is expected. The tour is read-only and pauses interaction with the page underneath so a stray
click does not navigate you away mid-step.

End it with **Skip tour**, the **×**, or the **Escape** key, and the page becomes interactive again
immediately.

## Still stuck

If your question is not answered here:

- Look the term up in [the glossary](14-glossary-and-help.md) — a surprising number of apparent
  problems are vocabulary differences between registries.
- Check [Sync Status](12-sync-status.md) if it is a "data is missing or stale" question.
- Use the feedback button to report it. Say which **network** you were on, which **page**, and what
  you expected to see instead — those three details resolve most reports without a follow-up.

---

Back to [index](README.md)
