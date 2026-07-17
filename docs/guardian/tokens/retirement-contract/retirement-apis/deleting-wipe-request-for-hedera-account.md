# Deleting Wipe Requests for Hedera Account

**`DELETE /api/v1/contracts/wipe/{contractId}/requests/{hederaId}`**

Clears all wipe requests for a specific Hedera account within a contract. Only Standard Registry users are allowed to make this request.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.CONTRACTS_WIPE_REQUEST_DELETE`

---

## Request

### Path Parameters

| Parameter    | Type   | Required | Description                                            |
|--------------|--------|----------|--------------------------------------------------------|
| `contractId` | string | Yes      | Contract identifier                                    |
| `hederaId`   | string | Yes      | Hedera account ID whose wipe requests will be cleared  |

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
