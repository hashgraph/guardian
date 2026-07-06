# Policy APIs — Asynchronous Execution

**Base URL:** `/api/v1/policies`

Provides asynchronous endpoints for creating, publishing, and importing policies. All async endpoints return `{ taskId, expectation }` with status 202 Accepted. Poll `GET /tasks/{taskId}` for the result.

**Authentication:** All endpoints require a valid JWT Bearer token (`Authorization: Bearer <token>`). Obtain a token via `POST /accounts/login`.

---

## Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/policies/push` | Creates a new policy (async). Poll `GET /tasks/{taskId}` for result. | Yes |
| PUT | `/policies/push/{policyId}/publish` | Publishes a policy (async). Poll `GET /tasks/{taskId}` for result. | Yes |
| POST | `/policies/push/import/file` | Imports a policy from a zip file (async). Poll `GET /tasks/{taskId}` for result. | Yes |
| POST | `/policies/push/import/message` | Imports a policy from IPFS via Hedera message ID (async). Poll `GET /tasks/{taskId}` for result. | Yes |
| POST | `/policies/push/import/message/preview` | Previews a policy from IPFS (async) | Yes |

---

## Endpoint Details

* [Creates New Policy](creates-new-policy.md) — `POST /policies/push`
* [Publishing a Policy](publishing-a-policy.md) — `PUT /policies/push/{policyId}/publish`
* [Importing a Policy from File](importing-a-policy-from-file.md) — `POST /policies/push/import/file`
* [Importing a Policy from IPFS](importing-a-policy-from-ipfs.md) — `POST /policies/push/import/message`
* [Policy Review](policy-review.md) — `POST /policies/push/import/message/preview`
