# Schema Preview from IPFS

**`POST /schemas/import/message/preview`**

Previews the schema from IPFS without loading it into the local DB. Only users with the Standard Registry role are allowed to make the request.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.SCHEMAS_SCHEMA_CREATE`

---

## Request

### Request Body

An object containing the identifier of the Hedera message which contains the IPFS CID of the schema.

```json
{
  "messageId": "1700000000.000000001"
}
```

---

## Response

### Success Response

**Status:** `200 OK`

Returns a preview array of schema objects.

```json
[
  {
    "id": "f3b2a9c1e4d5678901234567",
    "uuid": "f3b2a9c1e4d5678901234567",
    "name": "Schema name",
    "status": "PUBLISHED",
    "version": "1.0.0"
  }
]
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
