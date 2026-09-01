# System Schemas APIs

The System Schemas APIs provide endpoints for managing Guardian built-in system schemas, such as Standard Registry, User, Policy, and Token schemas that underpin the platform's own data structures.

**Base URL:** `/api/v1/schemas/system`

---

## Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| **`POST`** | `/schemas/system/{username}` | Creates a new system schema | Yes |
| **`GET`** | `/schemas/system/{username}` | Returns system schemas by username | Yes |
| **`PUT`** | `/schemas/system/{schemaId}` | Updates the specified system schema | Yes |
| **`PUT`** | `/schemas/system/{schemaId}/active` | Makes the schema active (publishes it) | Yes |
| **`DELETE`** | `/schemas/system/{schemaId}` | Deletes the specified system schema (async) | Yes |
| **`GET`** | `/schemas/system/entity/{schemaEntity}` | Returns the active schema for the given entity type | Yes |
| **`GET`** | `/schemas/type/{schemaType}` | Returns schema by JSON document type string | Yes |

---

## Endpoint Details

* [Creates New System Schema](creates-new-system-schema.md)
* [Returns Schema by Username](returns-schema-by-username.md)
* [Updates the Schema](updates-the-schema.md)
* [Publishes the Schema (Make Active)](publishes-the-schema.md)
* [Delete System Schema](delete-system-schema.md)
* [Returns Schema by Entity Type](schema-type.md)
* [Returns Schema by Schema Type](returns-schema-by-type.md)
