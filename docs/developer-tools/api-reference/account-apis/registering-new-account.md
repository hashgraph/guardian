# Registering a New Account

**`POST /accounts/register`**

Registers a new user account with a username, password, and optional role.

**Authentication:** Bearer token required for non-demo mode (`Authorization: Bearer <token>`). Only a Standard Registry user may register new accounts outside of demo mode.

---

## Request

### Request Body

```json
{
  "username": "example_user",
  "password": "examplePassword123",
  "role": "USER"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `username` | string | Yes | The new account username |
| `password` | string | Yes | The account password |
| `role` | string | No | User role: `STANDARD_REGISTRY`, `USER`, or `AUDITOR`. Defaults to `USER` |

---

## Response

### Success Response

**Status:** `201 Created`

```json
{
  "username": "example_user",
  "role": "USER",
  "did": null,
  "hederaAccountId": null
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Caller is not authenticated (non-demo mode) |
| `403 Forbidden` | Caller does not have Standard Registry role |
| `409 Conflict` | Username already exists |
| `500 Internal Server Error` | Unexpected server failure |
