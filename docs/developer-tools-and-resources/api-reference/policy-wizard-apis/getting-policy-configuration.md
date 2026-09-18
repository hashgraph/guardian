# Getting Policy Configuration

**`POST /api/v1/wizard/{policyId}/config`**

Retrieves a policy configuration preview using the wizard settings for the specified policy. Only Standard Registry users are allowed to make this request.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.POLICIES_POLICY_CREATE`

---

## Request

### Path Parameters

| Parameter  | Type   | Required | Description                     |
|------------|--------|----------|---------------------------------|
| `policyId` | string | Yes      | The ID of the policy to preview |

### Request Body

```json
{
  "wizardConfig": {
    "policy": {
      "name": "Example Policy",
      "description": "Policy description",
      "topicDescription": "Topic description",
      "policyTag": "ExampleTag"
    },
    "roles": ["OWNER"],
    "schemas": [],
    "trustChain": []
  }
}
```

| Field          | Type   | Required | Description                           |
|----------------|--------|----------|---------------------------------------|
| `wizardConfig` | object | Yes      | Wizard configuration object to preview |

---

## Response

### Success Response

**Status:** `200 OK`

```json
{
  "policyConfig": {
    "id": "63e3e5e8a01b3c001234abcd",
    "name": "Example Policy",
    "version": "1.0.0",
    "config": {}
  },
  "wizardConfig": {}
}
```

| Field          | Type   | Description                                      |
|----------------|--------|--------------------------------------------------|
| `policyConfig` | object | The resulting policy configuration object        |
| `wizardConfig` | object | The wizard configuration used to generate it     |

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `404 Not Found` | Policy not found |
| `500 Internal Server Error` | Unexpected server failure |
