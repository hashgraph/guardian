# Returning Logs

**`POST /logs/`**

Returns a paginated list of system logs filtered by the provided criteria. For Standard Registry users only.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.LOG_LOG_READ`

---

## Request

### Request Body

```json
{
  "type": "INFO",
  "startDate": "2024-01-01T00:00:00.000Z",
  "endDate": "2024-12-31T23:59:59.999Z",
  "attributes": ["API_GATEWAY"],
  "message": "policy",
  "pageIndex": 0,
  "pageSize": 20,
  "sortDirection": "DESC"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | No | Log level filter: `INFO`, `WARN`, `ERROR` |
| `startDate` | string (ISO 8601) | No | Filter logs after this date |
| `endDate` | string (ISO 8601) | No | Filter logs before this date |
| `attributes` | string[] | No | Filter by log source attributes (e.g. `["API_GATEWAY"]`) |
| `message` | string | No | Case-insensitive substring search within log messages |
| `pageIndex` | number | No | Zero-based page index (default: `0`) |
| `pageSize` | number | No | Items per page |
| `sortDirection` | string | No | Sort order: `ASC` or `DESC` |

---

## Response

### Success Response

**Status:** `200 OK`

```json
{
  "totalCount": 142,
  "logs": [
    {
      "type": "INFO",
      "datetime": "2024-06-01T12:34:56.789Z",
      "message": "Policy published successfully",
      "attributes": ["API_GATEWAY"]
    }
  ]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `totalCount` | number | Total number of matching log entries |
| `logs` | array | Array of log entries |
| `logs[].type` | string | Log level |
| `logs[].datetime` | string | Timestamp of the log entry |
| `logs[].message` | string | Log message text |
| `logs[].attributes` | string[] | Source attributes |

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |
