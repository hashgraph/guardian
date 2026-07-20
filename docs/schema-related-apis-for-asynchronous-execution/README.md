# Schema APIs — Asynchronous Execution

**Base URL:** `/api/v1/schemas/push`

Provides asynchronous endpoints for creating, publishing, and importing schemas. All endpoints return `{ taskId, expectation }` with status 202 Accepted. Poll `GET /tasks/{taskId}` for the result.

**Authentication:** All endpoints require a valid JWT Bearer token (`Authorization: Bearer <token>`). Obtain a token via `POST /accounts/login`.

---

## Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/schemas/push/{topicId}` | Creates a new schema within the specified topic (async). Poll `GET /tasks/{taskId}` for result. | Yes |
| PUT | `/schemas/push/{schemaId}/publish` | Publishes a schema to IPFS (async). Poll `GET /tasks/{taskId}` for result. | Yes |
| POST | `/schemas/push/{topicId}/import/file` | Imports a schema from a zip file (async). Poll `GET /tasks/{taskId}` for result. | Yes |
| POST | `/schemas/push/{topicId}/import/message` | Imports a schema from IPFS via Hedera message ID (async). Poll `GET /tasks/{taskId}` for result. | Yes |
| POST | `/schemas/push/import/message/preview` | Previews a schema from IPFS without importing (async). Poll `GET /tasks/{taskId}` for result. | Yes |

---

## Endpoint Details

* [Creation of Schema](creation-of-schema.md) — `POST /schemas/push/{topicId}`
* [Publishing Schema](publishing-schema.md) — `PUT /schemas/push/{schemaId}/publish`
* [Importing Schema from .zip](importing-schema-from-.zip.md) — `POST /schemas/push/{topicId}/import/file`
* [Importing Schema from IPFS](importing-schema-from-ipfs.md) — `POST /schemas/push/{topicId}/import/message`
* [Previews the Schema from IPFS](previews-the-schema-from-ipfs.md) — `POST /schemas/push/import/message/preview`
