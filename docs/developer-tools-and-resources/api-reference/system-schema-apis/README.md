# System Schema APIs

Endpoints for managing Guardian system schemas — predefined schema types used internally by the platform.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

---

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/schemas/system/{username}` | Returns system schemas for the specified user | Yes |
| `POST` | `/api/v1/schemas/system/{username}` | Creates a new system schema | Yes |
| `DELETE` | `/api/v1/schemas/system/{schemaId}` | Deletes a system schema | Yes |
| `PUT` | `/api/v1/schemas/system/{schemaId}` | Updates a system schema | Yes |
| `PUT` | `/api/v1/schemas/system/{schemaId}/active` | Publishes (activates) a system schema | Yes |
| `GET` | `/api/v1/schemas/system/entity/{schemaType}` | Returns a system schema by type | Yes |

## Endpoints

- [Returns Schema by Username](returns-schema-by-username.md)
- [Creates New System Schema](creates-new-system-schema.md)
- [Delete System Schema](delete-system-schema.md)
- [Updates the Schema](updates-the-schema.md)
- [Publishes the Schema](publishes-the-schema.md)
- [Returns Schema by Type](returns-schema-by-type.md)
- [Schema Type](schema-type.md)
- [Returns Map API Key](returns-map-api-key.md)
