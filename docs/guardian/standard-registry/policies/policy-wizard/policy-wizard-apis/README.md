# Policy Wizard APIs

Endpoints for creating and previewing Guardian policies using the guided policy wizard workflow.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** Standard Registry role required.

---

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/v1/wizard/policy` | Creates a new policy using the wizard configuration | Yes |
| `GET` | `/api/v1/wizard/{policyId}/config` | Returns the wizard configuration for an existing policy | Yes |

## Endpoints

- [Creating New Policy](creating-new-policy.md)
- [Getting Policy Configuration](getting-policy-configuration.md)
