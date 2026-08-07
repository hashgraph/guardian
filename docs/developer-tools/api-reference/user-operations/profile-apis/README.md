# Profile APIs

Endpoints for viewing and updating user profile credentials and account information in Guardian.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

---

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/profiles/{username}` | Returns the DID document and Hedera account information for the user | Yes |
| `PUT` | `/api/v1/profiles/{username}` | Sets Hedera credentials and creates a DID for the user | Yes |
| `PUT` | `/api/v1/profiles/push/{username}` | Sets Hedera credentials asynchronously | Yes |
| `GET` | `/api/v1/profiles/{username}/balance` | Returns the Hedera account balance for the user | Yes |

## Endpoints

- [User Account Information](user-account-information.md)
- [Setting User Credentials](setting-user-credentials.md)
- [Setting User Credentials Asynchronously](setting-user-credentials-asynchronously.md)
- [User Account Balance](user-account-balance.md)
