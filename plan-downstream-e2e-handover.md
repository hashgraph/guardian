# Handover: downstream e2e failures — CDM resolved (v8), remainder deferred

Status as of 11 Nov 2026, after the full `all` run of 9–10 Nov 2026. The run's
downstream failures were split into problems; this note covers where the work
stands, what is deferred, and how to resume.

## What is done

- **Problem 1 — USER schema coupling** (committed, unsigned — the user signs):
  the active USER system schema row left by the 011 API spec appended a fifth
  step to the USER wizard and broke four UI specs. Fixed in the UI page
  objects; commit `a367d4e6c`.
- **Problem 2 — CDM** (this note's scope; the v8 fix is in the working tree,
  not committed — see "Current state" below): `flow_CDM_0001` died in the login
  phase of every v7 run. Two probes
  (11 Nov, 03:39 and 05:05 UTC) pinned the chain:
  1. a wait budget whose deadline was evaluated **at enqueue time** (the
     spec's commands sit in the Cypress queue behind whatever ran first — a
     115 s task round trip in CDM) read a spent budget on its **first poll**
     and turned a healthy, succeeding login into a phantom recovery;
  2. the recovery wiped the stored tokens and did a bare `cy.reload()`, which
     re-landed on the **current route** (a workspace route such as `/config`);
     a dead session on a workspace route boots a **tokenless document the app
     never recovers from**: no `/login` redirect (the route guard's redirect
     does not survive the initial bootstrap), an eternal 29 s loop of
     `POST /accounts/access-token` with a `null` refresh token answering 422,
     no teardown, no self-recovery (130 s+ observed). Every subsequent step
     then ran logged out.

  The v8 fix (all in the e2e page objects / `pageReadiness.js`):
  - a document-identity probe — a per-tab `sessionStorage` counter advanced by
    every ladder navigation and read by every poll — so reload budgets are
    **per document** and re-arm on a swap (including the app's own
    `location.reload()` on a permission update);
  - every budget arms its deadline **at run time** (the document's first
    poll), which removes the phantom-recovery class;
  - the login ladder's recovery no longer reloads the current route: it wipes
    the keys until the app stops re-storing them, then enters a **fresh
    document on `/login`** (the one route whose logged-out boot is the login
    page) and re-logs in;
  - after a login establishes the session, the app re-fires a same-document
    bootstrap re-init about 11 s after the login 200 (a re-POST login, a WS
    rebind, the workspace fetches): the session is now verified to hold
    across that window before `login()` reports success, so a 401 on the
    re-POST (which tears the session down via `clearSession` + a `/login`
    redirect) is met inside the login itself, not one workflow step later;
  - the polls return their continuations, so `login()` actually returns its
    chain (the 10 Nov v4 chain-leak guard, which the code documented but
    never enforced, now holds);
  - the CDM-path full-document boots carry the probe (`policiesPage`,
    `toolsPage`, `tokensPage`, `userManagementPage` visits; `configPage`
    wizard-recovery reloads), and the `cy.location` assertions on that path
    became window-polling `waitForLocation` / `waitForLocationAwayFrom` gates,
    which cannot throw `UrlNotYetAvailableError` over a long navigation.
  - `pageReadiness.js` exports all its v7 names with unchanged signatures;
    the new names are additive (`docProbe`, `reloadProbed`, `trackDocument`,
    `waitForLocation`, `waitForLocationAwayFrom`), so the non-CDM UI specs
    are unaffected.

  Verification (11 Nov, two consecutive `flow_CDM_0001` runs against the Solo
  stack): the login phase — the defect this fix targets — held in **both**
  runs: no phantom recoveries, no tokenless zombies, and run B (17 min)
  reached the policy-editor Submitted step, far past the login phase where
  every v7 run died. Run A (12 min) and run B each then failed, on **different
  downstream steps that v8 does not touch** — see the "Current state" section
  below. The `unsafe-to-chain` lint count stays zero; v8's files add no new
  lint errors.

## Current state — post-reboot verification (11 Nov, after the user's `solo:up` + `infra:up`)

The user rebuilt the stack (11 Nov ~12:5x); the agent restarted the services
in the container and re-verified `flow_CDM_0001`. The fresh stack is **fast
and healthy** (every app fetch answers 200 in <200 ms — the opposite of the
degraded pre-reboot timings above), yet the spec still failed four consecutive
times (runs C–F, `verify-cdm-v8-{c..f}.log`), and the failures pinned two
separate causes:

1. **Run C — the onboarding round trip, on a path no traced run had ever
   exercised:** with a fresh database `User2` does not exist, so
   `ensureAccount` registers it (201) and runs the **full** setup wizard.
   Every pre-reboot run (10 Nov v6 pass, 11 Nov A/B) found `User2` already
   onboarded (409) and bounced off — the wizard's `/task` round trip was never
   verified in any traced run. In C the wizard completed its work (profile
   push 202, the onboarding task object was even fetched) but the app never
   navigated to `/task/:id` and re-initialized onto `/user-profile` three
   seconds later; the 20 s `waitForTaskRoundtrip` failed on the location.
   This is the `registration-wizard-stalls-when-the-task-result-is-lost`
   class (one `GET` in the `callbackPending` window, one non-replayed
   user-gated push, no polling fallback). The account was fully onboarded
   server-side anyway — the next run's 409 + `ready` phase proves it.
2. **Runs D/E/F (3/3, deterministic) — `openPoliciesTab` on an empty
   workspace:** the app renders the policies filter bar — and with it
   `input.search-policy-input` — **only when the list is non-empty**
   (`showFilterBar = hasPolicies || hasStatusFilter` in
   `policies.component.ts`). A fresh SR workspace has zero policies, so the
   marker can never exist and no reload will surface it; the 10 Nov v6 pass
   was masked by leftover policies in the dirty database. The failure
   screenshot shows a fully healthy page (empty state rendered, toolbar
   present, every fetch 200) — the element is simply not part of the DOM.
   Fixed in `policiesPage.openPoliciesTab`: the readiness gate now waits on
   `div.actions-container`, which renders as soon as the list fetch settles
   in either state (the same two-state idiom `tokensPage` already uses).
   `backToPoliciesList` / `backToPoliciesListBtn` keep the search-input gate:
   in this spec they only run after the spec itself created the first policy.

One environment characteristic worth noting for future runs: the app runs a
full page re-initialization every ~5–24 s (access-token refresh → WS
re-upgrade → the whole workspace fetch set re-issued). The 10 Nov trace shows
the same cycle with a shorter cadence, so it is app-side behavior of this
environment, not a reboot regression, and it explains why page-level waits
measured in seconds can land between two cycles.

Runs G/H (after the `openPoliciesTab` fix) passed that step and then failed
3/3-style at the next same-class marker — `toolsPage._pageToRow` waits on
the table's paginator (`div.table-paginator p-select`), which the tools
template renders only inside `@if (tools && tools.length > 0)`, so on a fresh
workspace (zero tools) it never exists: fixed in `toolsPage` by a one-shot
DOM read up front (row on the current page → no walk; empty list → no-op
walk) with the page walk extracted to `_walkPages`. Runs I/J (after both marker fixes) took the flow deepest yet — 20 and
16 minutes, past every step v8 and the marker fixes gate — and failed on two
different, non-deterministic app-side races in the late wizard sections that
v8 does not touch: I (SR approvals) degenerated in its final minute into a
~1 Hz workspace re-init loop (zero 401s, the app spontaneously re-arming its
bootstrap) whose loading overlay starved the wizard step click for the full
10 s; J (user, project creation) saw its submitted banner (the one-shot push
landed) but the "Waiting for Validation" status never appeared within the
20 s budget, on a fully rendered page with every fetch answering 200 in
<100 ms. Both are the known product-side one-shot / slow-state-update class
against the app's ~5–24 s re-init cycle, not v8 regressions.

The final verification pair, runs K/L (same code, back-to-back): **both
passed end-to-end in ~12 minutes** (1 passing, 0 failing, rc=0) — the
green ×2 acceptance gate is met on the fresh stack. The workspaces were no
longer empty by then (I/J left the two runs' policies, tools and tokens —
closer to the dirty-database conditions of the 10 Nov v6 pass), and the late
wizard races did not fire. They remain a known non-deterministic product-side
class (a candidate for its own issue if they recur in the full `all` run);
nothing in this change chases them further.

## What is deferred

- **Commit 3 (needs approval before it happens):** the `policiesPage`
  import gate widened from 4 to 6 readiness attempts (the iREC5 import of a
  heavy archive lost all four boots in the 10 Nov run — same gateway
  no-reply class, see the auth-guard note) plus the matching `pending-issues`
  bullet. It is out of the CDM scope and was held out of the v8 commit on
  purpose.
- **Pass 2 (after commit 3):** re-run the `011_schemas` API specs (they own
  the USER schema rows of the uuid family `0000b23a-b1ea-408f-a573…a2060a`
  from `systemSchemas.js`; the product cannot deactivate a published system
  schema, so a re-run that leaves an active row re-breaks the USER wizard —
  re-clean if it does), then the four UI specs of Problem 1, then the full
  `all`.
- **All 18 `pending-issues/` notes stay open** — they describe product-side
  gaps the tests now only buy time against.

## Product follow-ups (approval-gated — none touched)

1. The ~11 s same-document bootstrap re-init that fires after a login 200
   (re-POSTs `/accounts/login` with the credentials still in the form,
   re-binds the WS, re-fetches branding/session/profile/balance): exact
   trigger not pinned to a code constant — no 11 s timer exists in
   `frontend/src/app`; candidates: the gateway WS rebind after the token is
   set (`web-socket.service.ts`), an HMR socket. The test-side window is a
   workaround, not a fix.
2. `AuthStateService`'s 29 s refresh interval with **no error handler**: a
   422 (a `null` refresh token) loops forever with no `clearSession()` —
   the zombie loop. The refresh leg also races the 30 s token TTL by one
   second (a late interval tick in a backgrounded tab 401s the next boot).
3. A tokenless document on a workspace route is not redirected to `/login`:
   `PermissionsGuard` resolves `sessions()` to `of(null)` and
   `goToDefault`, but the redirect does not survive the initial bootstrap
   navigation — the document parks on `/config`.
4. The login page's demo-accounts cards auto-log-in and store a **null
   username**, after which the app boots a `profiles/null` session (422s, an
   eternal "Creating DID" wizard) — the `profiles/null` boot path.
5. `web-socket.service.ts` L239: an `UPDATE_PERMISSIONS` push triggers a hard
   `location.reload()` — a document swap with no test-side hook.
6. The Cypress/Mocha timer trap: Cypress 15.15.0's `patchRunnableResetTimeout`
   arms a real 10 s timer on every reset and its paired `clearTimeout` patch
   never clears it — orphaned timers kill **promise-returning** `it`s about
   10 s after a command burst. Synchronous `it`s (all CDM specs) are immune;
   the 11 Nov probe defused it locally and the defuse was **not** committed
   (it is a runner-global and belongs in a product/tooling decision, not a
   test fix).
7. `Users.getUserByToken` and the rest of the `Users` lookups: the 31 Oct
   30 s bound covers `getUserByToken` only — see the auth-guard note.
8. `AuthInterceptor` dedupes every 401 onto one shared in-flight `refresh$`
   (`shareReplay`, no timeout, no error path): a refresh that never settles
   freezes every deduped request — the amplifier behind both 10 Nov freezes.
9. `AsyncProgressComponent` / the `/task/:id` route page: no polling fallback
   behind the one-GET-plus-one-push completion — see the registration-wizard
   note.

## How to resume

- Stack: the user runs `npm run solo:up` + `npm run guardian:infra:up` on the
  host; from the container `npm run guardian:services:up` in `e2e-tests`
  (gateway `http://127.0.0.1:3002`, frontend `http://localhost:4200`).
  Rebuild `interfaces`, `common`, `hedera`, then each service, when the
  sources moved — the services run `dist/`.
- CDM: `cd e2e-tests && npx cypress run --spec
  "cypress/e2e/ui-tests/specs/02_policies/flow_CDM_0001.cy.js"` (env comes
  from `cypress.env.json`). Logs land in `e2e-tests/.local/`; the dev-server
  proxy writes a timestamped request trace to `ng-serve-proxy-*.log` (ISO
  UTC) — the unpaired `->`-without-`<-` signature is the no-reply hang class.
- The throwaway probe spec `zz_probe_login.cy.js` was deleted with the v8
  commit; its evidence lives in `e2e-tests/.local/probe-reboot-1111.log` and
  `probe-reboot2-1111.log` (gitignored) and in the comments of
  `pageReadiness.js` / `homePage.js`.
