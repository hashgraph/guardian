# Account APIs

The Account APIs handle user registration, authentication, session management, and account queries within the Guardian system.

**Base URL:** `/api/v1/accounts`

> **Note:** `POST /accounts/register`, `POST /accounts/login`, and `POST /accounts/access-token` do not require a Bearer token. All other endpoints require `Authorization: Bearer <token>`.

---

## Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| **`POST`** | `/accounts/register` | Register a new user account | No |
| **`POST`** | `/accounts/login` | Log in and receive JWT tokens | No |
| **`POST`** | `/accounts/change-password` | Change the authenticated user's password | Yes |
| **`POST`** | `/accounts/access-token` | Refresh access token using a refresh token | No |
| **`GET`** | `/accounts/session` | Return current session information | Yes |
| **`GET`** | `/accounts/` | List users (excluding Standard Registry and Auditor) | Yes |
| **`GET`** | `/accounts/standard-registries` | Return all Standard Registry accounts | Yes |
| **`GET`** | `/accounts/standard-registries/aggregated` | Return Standard Registries with policies and VCs | Yes |
| **`GET`** | `/accounts/balance` | Return the authenticated user's Hedera balance | Yes |

---

## Endpoint Details

* [Registering a New Account](registering-new-account.md)
* [User Login](user-login.md)
* [Change Password](change-password.md)
* [Refresh Access Token](refresh-access-token.md)
* [User Session](user-session.md)
* [User Listing (Excluding Standard Registry and Auditor)](user-listing-except-root-authority-and-auditor.md)
* [Returns All Standard Registries](returns-all-root-authorities.md)
* [Standard Registries Aggregated](standard-registries-aggregated.md)
* [User Balance](user-balance.md)
