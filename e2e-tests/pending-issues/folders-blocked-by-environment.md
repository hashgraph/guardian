# Folders that cannot run against a plain local environment

**Status:** open. Since 5 Nov 2026 every spec in the three folders is `context.skip`, with a comment pointing here. Remove the `.skip` (and this note, once all three run) when the environment a folder needs is available.

These three folders are not idempotence problems: they fail on the first run, on any run, because
they address services that the local e2e stack does not provide.

Re-checked on 5 Nov 2026 with the local stack in the dev container: the four `017_indexer` specs failed with `connect ECONNREFUSED 127.0.0.1:59123`, and the three `026_remote_policy` specs and the two `028_MGS_analytics_indexer` specs failed on `POST https://dev.guardianservice.app/api/v1/accounts/login/` with 422 (`username should not be empty`), because `MGSAdmin` is not set locally.

Skipping `026_remote_policy` also removes it from the scheduled CI run (`api-all policy-all`), which selected it; the `CYPRESS_MGSAdmin` and `CYPRESS_MGSIndexerAPIToken` secrets are injected in `.github/workflows/e2e-run.yml` (called by `e2e-tests.yml`). `028_MGS_analytics_indexer` is not in `specPattern` (`cypress.config.js`), so it only runs when passed with `--spec`.

## `017_indexer` — needs the Indexer service

Every spec calls `http://localhost:59123/api/v1/entities/...` (`portIndexer` in `cypress.env.json`)
and fails with `RequestError: AggregateError` — nothing is listening. The local e2e stack
(`e2e-tests/scripts/local-guardian.sh`, in use since `537be6f9e`) runs a Solo Hiero network, four
infra containers (Valkey, NATS, MongoDB, Kubo) and the Guardian services as native Node processes,
and none of that is the indexer. `configs/` has no `.env.quickstart.indexer.system` or
`.env.localnode.indexer.system`, so `docker-compose-indexer.yml` cannot be started for these
environments as-is.

The specs are tagged `['indexer', 'firstPool']`, so no CI tag scope (`all`, `smoke`) selects them;
the block applies to local runs only.

To run this folder, start the indexer and point `portIndexer` (or `CYPRESS_apiIndexer`) at it.

## `026_remote_policy` and `028_MGS_analytics_indexer` — need the shared remote environment

Both authenticate against `https://dev.guardianservice.app/api/v1/accounts/login/`, which answered
**422 Unprocessable Entity** with the credentials in the fixtures (observed 6 Sep 2026; the code
path is unchanged, the live behaviour was not re-checked). `API.ApiMGS` is still hardcoded to that
host in `cypress/support/ApiUrls.js`, so there is no local override:

```js
ApiMGS: `https://dev.guardianservice.app/api/v1/`,
```

`026` additionally exercises the remote-policy flow, which by design needs a *second* Guardian
deployment to talk to, so it cannot be made self-sufficient on a single local instance.

Since `537be6f9e` these specs are tagged `all`, so the scheduled CI e2e run (`api-all policy-all`) selects them and
`.github/workflows/e2e-run.yml` injects real credentials (`CYPRESS_MGSAdmin` and `CYPRESS_MGSIndexerAPIToken`). The blocker applies to local runs, where the README lists both
variables as mandatory for MGS/remote-policy tests.

If these are meant to be runnable locally, `ApiMGS` needs the same override treatment the other
origins now have (`resolveOrigin('apiMGS', ...)`), plus working credentials for the target
environment.
