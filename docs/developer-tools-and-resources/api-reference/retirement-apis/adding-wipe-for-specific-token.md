# Adding Wipe Wiper for Specific Token

**`POST /api/v1/contracts/wipe/{contractId}/wiper/{hederaId}/{tokenId}`**

Adds a wipe wiper for a specific token within a wipe contract. Only Standard Registry users are allowed to make this request.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.CONTRACTS_WIPER_CREATE`

---

## Request

### Path Parameters

| Parameter    | Type   | Required | Description                                          |
|--------------|--------|----------|------------------------------------------------------|
| `contractId` | string | Yes      | Contract identifier                                  |
| `hederaId`   | string | Yes      | Hedera account ID to grant wiper rights to           |
| `tokenId`    | string | Yes      | Hedera token identifier the wiper rights apply to    |

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
