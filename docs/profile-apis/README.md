# Profile APIs

The Profile APIs allow users to manage their Hedera account credentials, DID documents, and policy keys.

**Base URL:** `/api/v1/profiles`

**Authentication:** All endpoints require a valid JWT Bearer token (`Authorization: Bearer <token>`). Obtain a token via `POST /accounts/login`.

---

## Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| **`GET`** | `/profiles/{username}/` | Returns user account info | Yes |
| **`PUT`** | `/profiles/{username}` | Sets Hedera credentials for a user (synchronous) | Yes |
| **`PUT`** | `/profiles/push/{username}` | Sets Hedera credentials for a user (asynchronous) | Yes |
| **`GET`** | `/profiles/{username}/balance` | Returns the Hedera account balance for the specified user | Yes |
| **`PUT`** | `/profiles/restore/{username}` | Restores user data (policy, DID/VC documents) from Hedera topics | Yes |
| **`PUT`** | `/profiles/restore/topics/{username}` | Returns list of available recovery topics for a user's Hedera account | Yes |
| **`POST`** | `/profiles/did-document/validate` | Validates the format and structure of a DID document | Yes |
| **`POST`** | `/profiles/did-keys/validate` | Validates the keys within a DID document | Yes |
| **`GET`** | `/profiles/keys` | Returns a paginated list of existing policy signing keys | Yes |
| **`POST`** | `/profiles/keys` | Creates a new policy signing key | Yes |
| **`DELETE`** | `/profiles/keys/{id}` | Deletes a signing key by ID | Yes |

---

## Endpoint Details

* [User Account Information](user-account-information.md) — **`GET`** `/profiles/{username}/`
* [Setting User Credentials](setting-user-credentials.md) — **`PUT`** `/profiles/{username}`
* [Setting User Credentials Asynchronously](setting-user-credentials-asynchronously.md) — **`PUT`** `/profiles/push/{username}`
* [User Account Balance](user-account-balance.md) — **`GET`** `/profiles/{username}/balance`
* [Restoring User Profile](restoring-user-profile.md) — **`PUT`** `/profiles/restore/{username}`
* [List Recovery Topics](list-recovery-topics.md) — **`PUT`** `/profiles/restore/topics/{username}`
* [Validate DID Document](validate-did-document.md) — **`POST`** `/profiles/did-document/validate`
* [Validate DID Keys](validate-did-keys.md) — **`POST`** `/profiles/did-keys/validate`
* [Returns List of Keys](returns-list-of-keys.md) — **`GET`** `/profiles/keys`
* [Creates a Key](creates-a-key.md) — **`POST`** `/profiles/keys`
* [Deletes a Key](deletes-a-key.md) — **`DELETE`** `/profiles/keys/{id}`
