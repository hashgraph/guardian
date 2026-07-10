# Import Statistic Definition from ZIP File

**`POST /api/v1/policy-statistics/{policyId}/import/file`**

Imports a new statistic definition from the provided zip file and associates it with the specified policy.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.STATISTICS_STATISTIC_CREATE`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `policyId` | string | Yes | Policy identifier to associate with the imported definition |

### Request Body

The request body must be a binary zip file previously exported via `GET /policy-statistics/{definitionId}/export/file`.

```
Content-Type: application/zip
```

---

## Response

### Success Response

**Status:** `201 Created`

```json
{
  "id": "63e3e5e8a01b3c001234abcd",
  "name": "Imported Statistics Definition",
  "description": "Imported from zip file",
  "status": "DRAFT",
  "policyId": "63e3e5e8a01b3c001234aaaa",
  "owner": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001",
  "createDate": "2026-04-07T09:00:00.000Z",
  "updateDate": "2026-04-07T09:00:00.000Z"
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `422 Unprocessable Entity` | Invalid or missing `policyId` |
| `500 Internal Server Error` | Unexpected server failure |
