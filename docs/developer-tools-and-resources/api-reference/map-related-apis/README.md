# Map Related APIs

Endpoints for retrieving external API keys used by Guardian's map and geospatial features.

**Authentication:** Bearer token required (`Authorization: Bearer <token>`)

---

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/map/key` | Returns the map service API key | Yes |
| `GET` | `/api/v1/map/sh` | Returns the Sentinel Hub API key for satellite imagery | Yes |

## Endpoints

- [Returning Map API Key](returning-map-api-key.md)
- [Returning Sentinel API Key](returning-sentinel-api-key.md)
