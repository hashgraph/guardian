# Export message IDs of Schema

**`GET /schemas/{schemaId}/export/message`**

Returns Hedera message IDs of the published schemas. These messages contain IPFS CIDs of the schema files. Only users with the Standard Registry role are allowed to make the request.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.SCHEMAS_SCHEMA_READ`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `schemaId` | String | Yes | Selected schema ID |

---

## Response

### Success Response

**Status:** `200 OK`

```json
{
  "id": "f3b2a9c1e4d5678901234567",
  "messageId": "1700000000.000000001",
  "cid": "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco"
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
