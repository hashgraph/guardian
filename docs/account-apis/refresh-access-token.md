# Refresh Access Token

**`POST /accounts/access-token`**

Returns a new access token using a valid refresh token.

---

## Request

### Request Body

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `refreshToken` | string | Yes | A valid refresh token obtained from login |

---

## Response

### Success Response

**Status:** `200 OK`

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Invalid or expired refresh token |
