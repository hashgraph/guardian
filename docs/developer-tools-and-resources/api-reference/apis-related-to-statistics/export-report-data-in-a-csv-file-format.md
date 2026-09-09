# Export Statistic Definition as ZIP File

**`GET /api/v1/policy-statistics/{definitionId}/export/file`**

Returns a zip file containing the full statistic definition configuration for backup or transfer.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.STATISTICS_STATISTIC_READ`

---

## Request

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `definitionId` | string | Yes | Statistic definition identifier |

---

## Response

### Success Response

**Status:** `200 OK`

The response is a binary zip archive. The `Content-Type` is `application/zip` and the `Content-Disposition` header indicates the filename.

```
Content-Disposition: attachment; filename=theme_1704067200000
Content-Type: application/zip
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `422 Unprocessable Entity` | Invalid or missing `definitionId` |
| `500 Internal Server Error` | Unexpected server failure |
