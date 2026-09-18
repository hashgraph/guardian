# Account APIs

Endpoints for user registration, authentication, and account management in Guardian.

**Authentication:** Bearer token required for protected endpoints (`Authorization: Bearer <token>`). Registration and login endpoints are unauthenticated.

---

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/v1/accounts/register` | Register a new user account | No |
| `POST` | `/api/v1/accounts/login` | Login and obtain a Bearer token | No |
| `GET` | `/api/v1/accounts/session` | Returns the current authenticated user session | Yes |
| `GET` | `/api/v1/accounts` | Returns all users except Standard Registries and Auditors | Yes |
| `GET` | `/api/v1/accounts/standard-registries` | Returns all Standard Registry accounts | Yes |
| `GET` | `/api/v1/accounts/balance` | Returns balance for the current user | Yes |

## Endpoints

- [Authentication Process](authentication-process.md)
- [Registering New Account](registering-new-account.md)
- [User Login](user-login.md)
- [User Session](user-session.md)
- [User Listing](user-listing-except-root-authority-and-auditor.md)
- [Returns All Root Authorities](returns-all-root-authorities.md)
- [User Balance](user-balance.md)
- [Returns Access Token](returns-access-token.md)
