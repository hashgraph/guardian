# Settings APIs

**Base URL:** `/api/v1/settings`

These endpoints allow retrieval and configuration of Guardian system settings, including Hedera operator credentials, environment information, and package version details.

**Authentication:** All endpoints require a valid JWT Bearer token (`Authorization: Bearer <token>`). Obtain a token via `POST /accounts/login`.

---

## Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/settings` | Set Guardian system settings | Yes |
| GET | `/settings` | Return current Guardian system settings | Yes |
| GET | `/settings/environment` | Return the current Hedera network environment name | Yes |
| GET | `/settings/about` | Return Guardian package version information | Yes |

---

## Endpoint Details

* [Adding Settings](adding-settings.md)
* [Displaying Current Settings](displaying-current-settings.md)
* [Returns Environment Name](returns-environment-name.md)
* [Returns Package Version](returns-package-version.md)
