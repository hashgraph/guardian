# Folders that cannot run against a plain local environment

**Status:** re-verified 31 Oct 2026 — still open

These three folders are not idempotence problems: they fail on the first run, on any run, because
they address services that the local e2e stack does not provide. They were left untouched.

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

Since `537be6f9e` these specs are tagged `all`, so the scheduled CI e2e run selects them and
injects real credentials (`CYPRESS_MGSAdmin` and `CYPRESS_MGSIndexerAPIToken` in
`.github/workflows/e2e-tests.yml`). The blocker applies to local runs, where the README lists both
variables as mandatory for MGS/remote-policy tests.

If these are meant to be runnable locally, `ApiMGS` needs the same override treatment the other
origins now have (`resolveOrigin('apiMGS', ...)`), plus working credentials for the target
environment.
