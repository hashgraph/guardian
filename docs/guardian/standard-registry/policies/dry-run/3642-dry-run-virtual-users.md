---
tags:
  - new
---

# Dry Run Virtual Users

### feat/3642-dry-run-virtual-user

#### Get virtual user by DID

`GET /api/v1/policies/:policyId/dry-run/user/:did`

* Returns a single virtual user by DID in Dry Run mode
* Requires `POLICIES_POLICY_UPDATE`

#### Create virtual user v2

`POST /api/v1/policies/:policyId/dry-run/user` with header `Api-Version: 2`

* Creates a virtual user and returns only the created user object:

{ "username": "Virtual User 3", "did": "did:...", "hederaAccountId": "0.0.123", "active": false }

* More efficient than v1 — there is no need to re-fetch the full user list after creation

#### Deprecations

**Create virtual user v1**

`POST /api/v1/policies/:policyId/dry-run/user`

* Deprecated. Scheduled for removal: 2026-07-24 (4 months per API Deprecation Policy)
* v1 creates a virtual user and returns the full list of all virtual users (array)
* Migration: add header `Api-Version: 2` to receive only the created user object
* Frontend has already been migrated to v2

#### Internal Changes

* Added CREATE\_VIRTUAL\_USER\_V2 NATS event in PolicyEngineEvents
* Added GET\_VIRTUAL\_USER NATS event in PolicyEngineEvents
* Added countVirtualUsers() and getVirtualUser(did) methods to DatabaseServer
* Username generation optimized: uses countVirtualUsers() instead of loading all users

## Related Issues

* [https://github.com/hashgraph/guardian/issues/3642](https://github.com/hashgraph/guardian/issues/1987)
