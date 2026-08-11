# Monitoring Tools

Guardian's monitoring tools provide infrastructure for external systems to observe and react to Guardian's internal event stream without requiring a direct NATS connection.

## Application Events Module

The [Application Events Module](application-events-module.md) is a standalone HTTP service (port `3012`) that:

- Subscribes to all Guardian NATS event subjects on startup
- Exposes a REST API for registering and managing webhooks
- Delivers events to registered webhook URLs via HTTP POST
- Provides a streaming JSON endpoint for real-time event consumption

| Capability | Endpoint |
|---|---|
| Register a webhook | `POST /api/webhooks` |
| List registered webhooks | `GET /api/webhooks` |
| Retrieve a single webhook | `GET /api/webhooks/{id}` |
| Update a webhook | `PUT /api/webhooks/{id}` |
| Delete a webhook | `DELETE /api/webhooks/{id}` |
| List all available event subjects | `GET /api/events` |
| Subscribe to live event stream | `GET /api/events/subscribe` |
| Interactive API documentation | `GET /api-docs` |

For full details see [Application Events Module](application-events-module.md).
