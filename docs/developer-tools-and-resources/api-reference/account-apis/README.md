# Account APIs

The Account APIs handle user registration, authentication, session management, and account queries within the Guardian system.

**Base URL:** `/api/v1/accounts`

> **Note:** `POST /accounts/register`, `POST /accounts/login`, and `POST /accounts/access-token` do not require a Bearer token. All other endpoints require `Authorization: Bearer <token>`.

---

For the current endpoint list and schemas, see the [Accounts reference](https://guardian.hedera.com/api-reference-guardian/identity-and-access/accounts).
