# Search for Labels and Statistics for Importing into Label Configuration

**`POST /api/v1/policy-labels/components`**

Returns a list of available labels and statistics components that can be imported into a label configuration.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.STATISTICS_LABEL_CREATE`

---

## Request

### Request Body

```json
{
  "policyId": "63e3e5e8a01b3c001234abcd",
  "policyInstanceTopicId": "0.0.4532001"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `policyId` | string | No | Filter by policy ID |
| `policyInstanceTopicId` | string | No | Filter by policy instance topic ID |

---

## Response

### Success Response

**Status:** `200 OK`

```json
{
  "labels": [
    {
      "id": "63e3e5e8a01b3c001234abcd",
      "name": "Carbon Credit Label",
      "status": "PUBLISHED"
    }
  ],
  "statistics": [
    {
      "id": "63e3e5e8a01b3c001234abce",
      "name": "Emissions Statistic",
      "status": "PUBLISHED"
    }
  ]
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
