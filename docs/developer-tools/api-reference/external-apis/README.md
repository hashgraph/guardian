# External APIs

**Base URL:** `/api/v1/external`

These endpoints allow external systems to push Verifiable Credential (VC) documents into running Guardian policy workflows, either by specifying a target block via URL path parameters or by resolving the policy from fields within the request body.

**Authentication:** No authentication is required for any endpoint in this group.

---

## Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/external/{policyId}/{blockTag}` | Send data from an external source to a specific policy block | No |
| POST | `/external` | Send data from an external source (policy resolved from request body) | No |
| POST | `/external/{policyId}/{blockTag}/sync-events` | Send data to a specific block with synchronous event response | No |
| POST | `/external/sync-events` | Send data with synchronous event response (policy resolved from request body) | No |

---

## Endpoint Details

* [Sends Data from External Source (Specific Block)](sends-data-from-external-source.md)
* [Sends Data from External Source (Generic)](sends-data-from-external-source-generic.md)
* [Sends Data with Sync Events (Specific Block)](sends-data-with-sync-events.md)
* [Sends Data with Sync Events (Generic)](sends-data-with-sync-events-generic.md)
