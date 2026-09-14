# Folders that cannot run against a plain local quickstart

These three folders are not idempotence problems: they fail on the first run, on any run, because
they address services that the local quickstart stack does not provide. They were left untouched.

## `017_indexer` — needs the Indexer service

Every spec calls `http://localhost:59123/api/v1/entities/...` (`portIndexer` in `cypress.env.json`)
and fails with `RequestError: AggregateError` — nothing is listening. The running stack has 15
containers (`web-proxy`, `api-gateway`, `guardian-service`, `policy-service`, `worker-service`,
`topic-listener-service`, `auth-service`, `queue-service`, `logger-service`,
`notification-service`, `mongo`, `ipfs-node`, `topic-viewer`, `cache`, `message-broker`) and none of
them is the indexer.

To run this folder, start the indexer and point `portIndexer` (or `CYPRESS_apiIndexer`) at it.

## `026_remote_policy` and `028_MGS_analytics_indexer` — need the shared remote environment

Both authenticate against `https://dev.guardianservice.app/api/v1/accounts/login/`, which answers
**422 Unprocessable Entity** with the credentials in the fixtures. `API.ApiMGS` is hardcoded to that
host in `cypress/support/ApiUrls.js`, so there is no local override:

```js
ApiMGS: `https://dev.guardianservice.app/api/v1/`,
```

`026` additionally exercises the remote-policy flow, which by design needs a *second* Guardian
deployment to talk to, so it cannot be made self-sufficient on a single local instance.

If these are meant to be runnable locally, `ApiMGS` needs the same override treatment the other
origins now have (`resolveOrigin('apiMGS', ...)`), plus working credentials for the target
environment.
