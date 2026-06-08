# Adding Wipe Manager

**`POST /api/v1/contracts/wipe/{contractId}/manager/{hederaId}`**

Adds a wipe contract manager for the specified Hedera account. Only Standard Registry users are allowed to make this request.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.CONTRACTS_WIPE_MANAGER_CREATE`

---

## Request

### Path Parameters

| Parameter    | Type   | Required | Description                                  |
|--------------|--------|----------|----------------------------------------------|
| `contractId` | string | Yes      | Contract identifier                          |
| `hederaId`   | string | Yes      | Hedera account ID to grant manager rights to |

---

## Response

### Success Response

**Status:** `200 OK`

```json
true
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
