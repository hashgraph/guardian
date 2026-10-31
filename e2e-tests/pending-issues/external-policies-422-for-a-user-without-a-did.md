# A user without a DID gets 422 "User is not registered." from `GET /external-policies`

**Status:** open — product bug, cosmetic for the UI tests (the suite dismisses the sticky toast)
**Component:** `api-gateway` — `helpers/entity-owner.ts` + `api/service/external-policy.ts`
**Severity:** low — a stray error toast; the wizard and all other flows keep working
**Found by:** `e2e-tests/cypress/e2e/ui-tests/specs/00_account_registration/` — every spec registers a
fresh Standard Registry account, which lands on `/config` with a sticky toast a few seconds later.
Probe 23 (browser-level XHR/fetch tap) captured the exact request on 31 Oct 2026.

## Symptom

A few seconds after a freshly registered account lands on `/config` (registration wizard, step 1),
the global HTTP interceptor shows two sticky error toasts, bottom right:

```
422 Other Error
User is not registered.
```

The wizard itself is unaffected and the tests dismiss the toasts (`dismissStickyToasts()` in
`pages/configPage.js`); the bug is only visible as a toast.

## The request

```
GET /api/v1/external-policies?pageIndex=0&pageSize=1
  -> 422 {"statusCode":422,"message":"User is not registered."}
```

fired on navigation, not on any user action. Two identical requests (the header component
subscribes per navigation event).

## Where it comes from

1. **Frontend:** `frontend/src/app/views/new-header/new-header.component.ts`,
   `updateRemotePolicyRequests()` — the new header is mounted on every authenticated page. On
   navigation it polls `externalPoliciesService.getActionRequestsCount()` and, if the user holds
   `POLICIES_EXTERNAL_POLICY_READ`, also `getPolicyRequests(0, 1)` — a one-item probe that fills the
   "has remote policies" badge. Neither subscription has an error handler, so any failure surfaces
   as a global toast.
2. **Backend:** `api-gateway/src/api/service/external-policy.ts`, `getExternalPolicies()`:

   ```ts
   const owner = new EntityOwner(user);
   if (owner) { ... } else { return res.header('X-Total-Count', 0).send([]); }
   ```

   The api-gateway's `EntityOwner` subclass (`api-gateway/src/helpers/entity-owner.ts`) throws
   `HttpException('User is not registered.', 422)` for any authenticated user without a `did` —
   **before** the handler's own `if (owner)` fallback is ever evaluated.

3. **Why the user has no `did`:** a fresh Standard Registry account lands on `/config` before the
   wizard's DID step; the user row's `did` is still `null` until that step generates one.
   `IAuthUser.did` is optional, so the auth middleware happily builds the user object without it.

So the handler's intent — "a user without a DID simply has no external policies, answer an empty
page" — is exactly the case the `EntityOwner` constructor turns into a 422, and the `else` branch
that implements the intent is unreachable dead code (an unauthenticated request is already 401 at
the guard, and a user without a `did` never reaches the branch).

## Family

The same `new EntityOwner(user)`-throws-without-`did` pattern is what the ~20 token endpoints in
`api-gateway/src/api/service/tokens.ts` (and `organization.ts:918`) use for their own 422s — there
it is deliberate and documented in the Swagger examples. The external-policies list is the odd one
out: it wants the *opposite* behaviour (silently empty) for the same condition, but the shared
constructor decides for it. Any other endpoint that builds an `EntityOwner` from the request user
without a `did` check will misbehave the same way for a mid-wizard account.

## Suggested fix

In `getExternalPolicies()` (and any other endpoint that wants "no DID means empty result"):

```ts
const owner = user?.did ? new EntityOwner(user) : null;
```

or make the `EntityOwner` subclass non-throwing and let callers decide. Do not "fix" this on the
test side by filtering the toast — the toast is the only symptom and it is harmless; the 422 is the
wrong answer for a valid, logged-in session.

## Test impact

None, once the toasts are dismissed: `pages/configPage.js` exports `dismissStickyToasts()` and the
00 specs call it around the wizard steps. The wizard's own calls (`GET /accounts/session`,
`POST /demo/push/random-key`, the task/WS progress) never touch `EntityOwner`, which is why the
flow works despite the toasts.
