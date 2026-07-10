# Logs APIs

**Base URL:** `/api/v1/logs`

These endpoints provide access to Guardian system logs for operational monitoring and debugging, including filtered log retrieval and attribute discovery.

**Authentication:** All endpoints require a valid JWT Bearer token (`Authorization: Bearer <token>`). Obtain a token via `POST /accounts/login`. Permission `LOG_LOG_READ` is required for all endpoints.

---

## Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/logs` | Return a filtered, paginated list of system logs | Yes |
| GET | `/logs/attributes` | Return a list of known log attribute values | Yes |
| GET | `/logs/seq` | Return the URL of the Seq log aggregation server | Yes |

---

## Endpoint Details

* [Returning Logs](returning-logs.md)
* [Returning Log Attributes](returning-log-attributes.md)
* [Returns Seq URL](returns-seq-url.md)
