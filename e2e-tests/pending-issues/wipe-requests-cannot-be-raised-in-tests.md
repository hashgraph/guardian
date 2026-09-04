# Wipe contract requests cannot be raised from the API alone

**Status:** open question / parked work
**Affects:** `e2e-tests/cypress/e2e/api-tests/013_contracts/` — `008_getWipeRequests.cy.js`,
`010_clearAndRejectRequests.cy.js`, `012_enableAndDisableWipeRequests.cy.js`
**Parked work:** `013_contracts/012_wipeRequests.cy.js.wip` (the three specs merged into one, see below)

## The problem

`008` and `010` need an existing wipe contract request. Nothing before them creates one, and the
only place that ever produced one is the full policy workflow in `012` (import policy → put the
wipe contract on its draft token → publish → register user → application → approve → device →
issue → mint), which takes ~12 minutes and runs *after* both of them.

`012` then approves the request it raised, so it also leaves nothing behind. In sequence:

- run 1: `008` fails (no request), `010` fails (no request), `012` raises one and consumes it
- run 2: same again — the folder never settles

Worse, the merged flow needs **three** requests (one to approve, one to reject, one to clear) while
the workflow yields **one** per run. `010` has therefore been failing regardless of this work.

## What was tried, and what it did

All verified directly against the API on a local instance, against a wipe contract created by the
same run (`0.0.10354239`) and a retire contract from the same run (`0.0.10354234`):

| attempt | result |
| --- | --- |
| retire pool with a non-fungible token bound to the wipe contract | pool created (200), no request after 90 s |
| same with a freshly created token, in case requests are token-scoped | no request |
| `POST /contracts/retire/{id}/pools/sync` | 200, no request |
| `DELETE /contracts/wipe/{id}/wiper/{retireContractId}` | 500 `CONTRACT_REVERT_EXECUTED` |
| `POST /contracts/wipe/{id}/wiper/{hederaId}` called directly | 500 `CONTRACT_REVERT_EXECUTED` |
| fungible token with `initialSupply: 1000` bound to the wipe contract | pool creation itself returns 500 |

The token used was confirmed to carry the binding (`wipeContractId: 0.0.10354239`,
`enableWipe: true`, `draftToken: false`).

The revert on removing the wiper role is informative: it means the retire contract did **not**
already hold the role, so "the permission was granted by an earlier run, hence no new request" is
*not* the explanation.

## Where the request comes from

Requests are ingested from a Hedera contract event, not created by an API call:

- `guardian-service/src/api/contract.service.ts:91-93` declares
  `event WipeRequestAdded(address account, address token)`
- `guardian-service/src/api/contract.service.ts:638` handles `WipeRequestAdded` and stores the request

So something has to make the retire contract actually call the wipe contract asking for wiper
rights. Setting a pool alone does not do it in the conditions above.

## Open question

What is the minimal, repeatable way to make a retire contract raise a wipe request — ideally without
publishing a policy and running the whole mint workflow? If a retire *request* by a user holding a
balance is what triggers it, the tests need a cheap way to give a user that balance.

## The parked merge

`012_wipeRequests.cy.js.wip` merges `008`, `010` and `012` into one spec, ordered so a single setup
serves them all: requests are switched off first (asserting none is raised), the pool is unset, then
requests are switched on to raise the one the read and approve tests use, and only the tests that
consume a request raise another.

Its first phase already passes — 8 tests green in ~7 minutes, versus ~12 for the old `012` alone —
and it stops at "Enable wipe contract requests", which is exactly the step that needs the answer
above. It is suffixed `.wip` so Cypress does not collect it next to the three original specs, which
are still in place and unchanged.
