# Following a mirror-node `links.next` loses the port of the mirror URL

**Status:** open — found on 11 Nov 2026 while verifying the contract specs; reproduced on a Solo 0.97.0 stack.
**Component:** `worker-service` — `src/api/helpers/hedera-sdk-helper.ts` (`getNFTTokenSerials` `:2018`, the paginated read at `:1237`, the page cursor at `:2548`)
**Severity:** medium locally (any account with more than 100 NFTs breaks the calls that list them), none on a mirror node served on the default port
**Found by:** `e2e-tests/cypress/e2e/api-tests/013_contracts` (the `Mint token` hook of `Disable wipe contract requests`, and everything after it)

## What was observed

After the full `all` run the `Registrant` account (`0.0.1022`) holds more than 100 NFTs, so the mirror node answers `GET /api/v1/accounts/0.0.1022/nfts?limit=100` with `links.next = /api/v1/accounts/0.0.1022/nfts?limit=100&token.id=lte:0.0.1319&serialnumber=lt:656`. The `get-user-nfts-serials` worker task then fails with `connect ECONNREFUSED 192.168.65.254:80` (the address of `host.docker.internal`, port 80), `GET /tokens/` answers `400 {"message":"connect ECONNREFUSED 192.168.65.254:80"}`, and `013_contracts` fails with 2 of 14 specs (the mint balance wait times out after 120 s, the retire pools are never read). The same failure occurs on the unmodified code three times in a row; the folder had passed 149/149 earlier the same day, before the NFT count crossed 100.

## Where it comes from

The next-page URL is built as `${res.request.protocol}//${res.request.host}${links.next}`. In Node `ClientRequest.host` is the hostname without the port, so with the local mirror node at `host.docker.internal:38081` the follow-up request goes to port 80. A mirror node on the default port (testnet, mainnet) is not affected.

## Suggested fix

Resolve the relative link against the URL of the request that returned it (`new URL(links.next, url).toString()`) at the three places, with a worker-service unit test that serves two pages from a mirror on a non-default port.

## Test impact

On a used local workspace `013_contracts` cannot pass once an account holds more than 100 NFTs, and the removal of the retry in `Contracts.setRetirePool` cannot be verified there (see `set-retire-pool-fails-on-a-freshly-created-token.md`).
