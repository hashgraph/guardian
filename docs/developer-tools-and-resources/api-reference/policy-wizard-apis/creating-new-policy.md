# Creating a New Policy via Wizard

**`POST /api/v1/wizard/policy`**

Creates a new policy using the wizard configuration. Only Standard Registry users are allowed to make this request.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.POLICIES_POLICY_CREATE`

---

## Request

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
    "schemas": [
      {
        "name": "Example Schema",
        "iri": "#ExampleSchema",
        "isApproveEnable": false,
        "isMintSchema": false,
        "mintOptions": {},
        "dependencySchemaIri": null,
        "relationshipsSchemaIri": null,
        "initialRolesFor": [],
        "rolesConfig": [
          {
            "role": "OWNER",
            "isApprover": true,
            "isCreator": true,
            "fields": [],
            "gridColumns": []
          }
        ]
      }
    ],
    "trustChain": [
      {
        "role": "OWNER",
        "mintSchemaIri": "#ExampleSchema",
        "viewOnlyOwnDocuments": true
      }
    ]
  }
}
```

| Field                       | Type    | Required | Description                                          |
|-----------------------------|---------|----------|------------------------------------------------------|
| `wizardConfig`              | object  | Yes      | Wizard configuration object                          |
| `wizardConfig.policy`       | object  | Yes      | Policy metadata (name, description, tag, etc.)       |
| `wizardConfig.roles`        | array   | No       | List of roles in the policy                          |
| `wizardConfig.schemas`      | array   | No       | Schema configurations to include                     |
| `wizardConfig.trustChain`   | array   | No       | Trust chain configuration per role                   |

---

## Response

### Success Response

**Status:** `201 Created`

```json
{
  "policyId": "63e3e5e8a01b3c001234abcd",
  "wizardConfig": {}
}
```

| Field          | Type   | Description                               |
|----------------|--------|-------------------------------------------|
| `policyId`     | string | The ID of the newly created policy        |
| `wizardConfig` | object | The wizard configuration that was applied |

### Error Responses

| Status | Description |
|--------|-------------|
| `401 Unauthorized` | Missing or invalid token |
| `403 Forbidden` | Insufficient permissions |
| `500 Internal Server Error` | Unexpected server failure |

---

## Async Variant

**`POST /api/v1/wizard/push/policy`**

Asynchronous version of policy creation via wizard. Returns immediately with a task identifier.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** `Permissions.POLICIES_POLICY_CREATE`

**Status:** `202 Accepted`

```json
{
  "taskId": "63e3e5e8a01b3c001234abcd",
  "expectation": "Create policy"
}
```

Poll `GET /tasks/{taskId}` to retrieve the result.
