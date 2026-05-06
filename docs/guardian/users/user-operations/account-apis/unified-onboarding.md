# Unified User Onboarding

**`POST /accounts/push/onboard`**

Registers a new user account and fully sets up their Hedera account, DID, and cryptographic keys in a single async call. Returns a `taskId` immediately — poll `GET /tasks/onboard/{taskId}` for progress.

**Authentication:** Bearer token required for non-demo mode (`Authorization: Bearer <token>`). Only a Standard Registry user may onboard new accounts outside of demo mode.

---

## Request

### Request Body

```json
{
  "username": "example_user",
  "password": "examplePassword123",
  "password_confirmation": "examplePassword123",
  "role": "USER",
  "parent": "example_registry"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `username` | string | Yes | Username for the new account |
| `password` | string | Yes | Account password |
| `password_confirmation` | string | Yes | Must match `password` |
| `role` | string | Yes | `STANDARD_REGISTRY` or `USER` |
| `parent` | string | Required for `USER` role | Standard Registry username. Links the `USER` account to their registry |
| `hederaAccountId` | string | No | Hedera account ID (e.g. `0.0.4532001`). Auto-generated if omitted |
| `hederaAccountKey` | string | No | Hedera account private key (DER encoded). Required when `hederaAccountId` is provided |
| `vcDocument` | object | No | VC credential subject to publish during setup |
| `didDocument` | object | No | Custom DID document. Auto-generated if omitted |
| `didKeys` | array | No | Private keys for the custom DID document methods |
| `useFireblocksSigning` | boolean | No | Use Fireblocks instead of local key signing |
| `fireblocksConfig` | object | No | Fireblocks configuration. Required when `useFireblocksSigning` is `true` |

---

## Response

### Success Response

**Status:** `202 Accepted`

```json
{
  "taskId": "63e3e5e8-a01b-3c00-1234-abcd5678ef90",
  "expectation": 11,
  "action": "Onboard user"
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `400 Bad Request` | Passwords don't match, missing required fields, or `parent` not found for `USER` role |
| `401 Unauthorized` | Caller is not authenticated (non-demo mode) |
| `403 Forbidden` | Caller does not have Standard Registry role |
| `409 Conflict` | Username already exists |
| `422 Unprocessable Entity` | `hederaAccountId` provided without `hederaAccountKey` |
| `500 Internal Server Error` | Unexpected server failure |

---

# Polling Onboarding Task Status

**`GET /tasks/onboard/{taskId}`**

Returns the current status of an onboarding task. No authentication required. Restricted to tasks started by `POST /accounts/push/onboard` — any other task type returns `401 Unauthorized`.

**Authentication:** None

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `taskId` | string | Yes | Task ID returned by `POST /accounts/push/onboard` |

---

## Response

### Success Response

**Status:** `200 OK`

```json
{
  "taskId": "63e3e5e8-a01b-3c00-1234-abcd5678ef90",
  "action": "Onboard user",
  "expectation": 11,
  "completed": false,
  "failed": false,
  "error": null
}
```

| Field | Description |
|-------|-------------|
| `completed` | `true` when the task has finished successfully |
| `failed` | `true` when the task has failed |
| `error` | Error message object when `failed` is `true`, otherwise `null` |

> Sensitive credentials (`publicKey`, `hederaAccountId`, `did`) are never returned by this endpoint. Once `completed` is `true`, the new user must log in and call `GET /tasks/{taskId}` with their own Bearer token to retrieve their full credentials.

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | `taskId` belongs to a non-onboarding task |
| `500 Internal Server Error` | Unexpected server failure |
