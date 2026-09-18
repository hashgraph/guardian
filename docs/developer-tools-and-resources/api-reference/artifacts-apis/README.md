# Artifacts APIs

Endpoints for uploading, retrieving, and deleting policy artifacts — files (schemas, configurations, evidence) attached to Guardian policies.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

**Permission:** Standard Registry role required.

---

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/artifacts` | Returns all artifacts | Yes |
| `POST` | `/api/v1/artifacts/{policyId}` | Uploads new artifacts for the specified policy | Yes |
| `DELETE` | `/api/v1/artifacts/{artifactId}` | Deletes the specified artifact | Yes |

## Endpoints

- [Returns All Artifacts](returns-all-artifacts.md)
- [Upload Artifacts](upload-artifacts.md)
- [Delete Artifact](delete-artifact.md)
