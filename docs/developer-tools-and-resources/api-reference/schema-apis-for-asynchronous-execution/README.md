# Schema APIs for Asynchronous Execution

Asynchronous variants of schema operations that return a task ID immediately and complete in the background. Poll `GET /api/v1/tasks/{taskId}` to retrieve results.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

---

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/v1/schemas/push` | Creates a new schema asynchronously | Yes |
| `POST` | `/api/v1/schemas/push/copy` | Copies a schema asynchronously | Yes |
| `DELETE` | `/api/v1/schemas/push/{schemaId}` | Deletes a schema asynchronously | Yes |
| `PUT` | `/api/v1/schemas/push/{schemaId}/publish` | Publishes a schema asynchronously | Yes |
| `POST` | `/api/v1/schemas/push/import/message` | Imports a schema from IPFS asynchronously | Yes |
| `POST` | `/api/v1/schemas/push/import/file` | Imports a schema from a ZIP file asynchronously | Yes |
| `POST` | `/api/v1/schemas/push/import/message/preview` | Previews a schema from IPFS asynchronously | Yes |

## Endpoints

- [Creation of Schema (Async)](creation-of-schema.md)
- [Copy Schema](copy-schema.md)
- [Deletes the Schema with the Provided Schema ID](deletes-the-schema-with-the-provided-schema-id.md)
- [Publishing Schema](publishing-schema.md)
- [Importing Schema from IPFS](importing-schema-from-ipfs.md)
- [Importing Schema from ZIP](importing-schema-from-.zip.md)
- [Previews the Schema from IPFS](previews-the-schema-from-ipfs.md)
