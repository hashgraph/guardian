# Application Events Module

The Application Events Module is a standalone service that bridges Guardian's internal NATS event bus and external HTTP-based systems. It removes the need for external integrators to operate their own NATS client by providing:

- A **webhook registry** — register HTTP endpoints that receive event payloads via POST.
- A **streaming endpoint** — consume all events as a chunked JSON stream over HTTP.
- A **REST API** — manage webhook subscriptions and enumerate available event subjects.

The service runs on port `3012` by default. Interactive Swagger documentation is available at `http://localhost:3012/api-docs`.

---

## Architecture

```
Guardian Services
      │
      │ publishes events to
      ▼
   NATS Broker
      │
      │ subscribed by
      ▼
Application Events Module (port 3012)
      │
      ├──► Registered Webhooks (HTTP POST to your URLs)
      │
      └──► GET /api/events/subscribe (chunked JSON stream)
```

On startup the module:

1. Connects to MongoDB to load persisted webhook registrations.
2. Connects to the NATS broker and subscribes to all exposed event subjects.
3. For each received message, delivers the payload to all matching registered webhooks.

---

## Quickstart: Subscribe via Streaming Endpoint

The simplest way to consume events is the streaming endpoint. It returns a chunked JSON array that stays open as long as the connection is alive. Each element is a JSON object with the event subject and payload.

```bash
curl -N http://localhost:3012/api/events/subscribe
```

Example stream output:

```json
[
{"subject":"external-events.token_minted","payload":{"tokenId":"0.0.1554488","tokenValue":10}},
{"subject":"external-events.ipfs_added_file","payload":{"cid":"QmPs2ufs5VQPYGGX1ewEjKSR8zuEmeuWK4GBKFHZjXTCAQ","url":"ipfs://QmPs2ufs5VQPYGGX1ewEjKSR8zuEmeuWK4GBKFHZjXTCAQ"}},
```

The stream remains open. When the NATS connection closes, the array is terminated with `{"connection":"closed"}]`.

---

## Quickstart: Register a Webhook

**Step 1 — Retrieve the list of available event subjects:**

```bash
curl http://localhost:3012/api/events
```

Returns a JSON array of all event subject strings the module is currently forwarding, for example:

```json
[
  "external-events.token_minted",
  "external-events.token_mint_complete",
  "external-events.error_logs",
  "external-events.block_event",
  "external-events.ipfs_added_file",
  "policy-event-policy-ready",
  "policy-engine-event-publish-policies",
  ...
]
```

**Step 2 — Register a webhook for one or more event subjects:**

```bash
curl -X POST http://localhost:3012/api/webhooks \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-system.example.com/guardian-events",
    "events": [
      "external-events.token_minted",
      "external-events.block_event"
    ]
  }'
```

**Response `201 Created`:**

```json
{
  "id": "63e3e5e8a01b3c001234abcd"
}
```

**Step 3 — Receive events at your endpoint:**

When Guardian mints a token, your endpoint will receive an HTTP POST:

```json
{
  "tokenId": "0.0.1554488",
  "tokenValue": 10,
  "memo": "policy-mint"
}
```

---

## REST API Reference

### List Available Event Subjects

**`GET /api/events`**

Returns the complete list of NATS event subjects the module is currently subscribed to and will forward to webhooks or the streaming endpoint.

**Status:** `200 OK`

```json
[
  "external-events.token_minted",
  "external-events.token_mint_complete",
  "external-events.error_logs",
  "external-events.block_event",
  "external-events.ipfs_added_file",
  "policy-event-generate-policy",
  "policy-event-policy-ready",
  "..."
]
```

---

### Subscribe to Event Stream

**`GET /api/events/subscribe`**

Opens a persistent chunked HTTP response. Each chunk is a JSON object:

```json
{"subject": "<event-subject>", "payload": <event-payload>}
```

The response uses `Transfer-Encoding: chunked` and `Content-Type: application/json`. The stream starts with `[` and each element is separated by `,\n`. The array is closed when the NATS connection terminates.

**Status:** `200 OK` (streaming)

---

### Register a Webhook

**`POST /api/webhooks`**

Persists a new webhook registration. The module will HTTP POST the event payload to `url` whenever an event matching one of the registered `events` subjects is received.

**Request Body:**

```json
{
  "url": "https://your-system.example.com/events",
  "events": [
    "external-events.token_minted",
    "external-events.block_event"
  ]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `url` | string | Yes | Publicly reachable HTTPS URL that accepts POST requests |
| `events` | string[] | No | List of event subjects to subscribe to; omit or pass `[]` to receive all events |

**Status:** `201 Created`

```json
{
  "id": "63e3e5e8a01b3c001234abcd"
}
```

| Field | Description |
|---|---|
| `id` | MongoDB ObjectId of the created webhook registration |

**Error Responses:**

| Status | Description |
|---|---|
| `400 Bad Request` | Request body failed schema validation |
| `500 Internal Server Error` | Database write failed |

---

### List Registered Webhooks

**`GET /api/webhooks`**

Returns all persisted webhook registrations.

**Status:** `200 OK`

```json
[
  {
    "_id": "63e3e5e8a01b3c001234abcd",
    "url": "https://your-system.example.com/events",
    "events": ["external-events.token_minted"],
    "createdAt": "2026-04-06T08:00:00.000Z"
  }
]
```

---

### Retrieve a Webhook

**`GET /api/webhooks/{id}`**

Returns a single webhook registration by its MongoDB ObjectId.

**Path Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | string | Yes | MongoDB ObjectId of the webhook |

**Status:** `200 OK`

```json
{
  "_id": "63e3e5e8a01b3c001234abcd",
  "url": "https://your-system.example.com/events",
  "events": ["external-events.token_minted"],
  "createdAt": "2026-04-06T08:00:00.000Z"
}
```

**Error Responses:**

| Status | Description |
|---|---|
| `404 Not Found` | No webhook exists with the given `id` |

---

### Update a Webhook

**`PUT /api/webhooks/{id}`**

Replaces the `url` and `events` fields of an existing webhook registration.

**Path Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | string | Yes | MongoDB ObjectId of the webhook |

**Request Body:**

```json
{
  "url": "https://your-system.example.com/new-endpoint",
  "events": [
    "external-events.token_minted",
    "external-events.token_mint_complete"
  ]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `url` | string | Yes | Updated destination URL |
| `events` | string[] | Yes | Updated list of event subjects |

**Status:** `204 No Content`

**Error Responses:**

| Status | Description |
|---|---|
| `400 Bad Request` | Request body failed schema validation |
| `404 Not Found` | No webhook exists with the given `id` |

---

### Delete a Webhook

**`DELETE /api/webhooks/{id}`**

Removes a webhook registration. The module will immediately stop forwarding events to the associated URL.

**Path Parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `id` | string | Yes | MongoDB ObjectId of the webhook to delete |

**Status:** `204 No Content`

---

## Available Event Subjects

The module exposes all events from three sources, minus internal request/reply hooks that are not suitable for HTTP delivery. Use `GET /api/events` to retrieve the live list. The categories are:

### Core External Events

| Subject | Description |
|---|---|
| `external-events.token_minted` | Token successfully minted |
| `external-events.token_mint_complete` | Mint batch complete |
| `external-events.error_logs` | Error written to Guardian logger |
| `external-events.block_event` | Policy block execution event |
| `external-events.ipfs_added_file` | File pinned to IPFS |

> The following subjects are **excluded** from webhook/stream delivery because they are request/reply hooks requiring a synchronous NATS response:
> `external-events.ipfs_before_upload_content`, `external-events.ipfs_after_read_content`, `external-events.ipfs_loaded_file`

### Policy Coordination Events (selected)

| Subject | Description |
|---|---|
| `policy-event-generate-policy` | Policy instance generation started |
| `policy-event-policy-ready` | Policy instance is ready to serve requests |
| `policy-event-policy-start-error` | Policy failed to start |
| `policy-event-delete-policy` | Policy instance deleted |
| `policy-event-block-update-broadcast` | A block's state changed and UI should refresh |
| `policy-event-mrv-data` | MRV (measurement, reporting, verification) data received |
| `policy-event-record-update-broadcast` | Recording state changed |

### Policy Engine Events (selected)

| Subject | Description |
|---|---|
| `policy-engine-event-create-policies` | New policy created |
| `policy-engine-event-publish-policies` | Policy published to Hedera |
| `policy-engine-event-dry-run-policies` | Policy entered dry-run mode |
| `policy-engine-event-draft-policies` | Policy reverted to draft |
| `policy-engine-event-delete-policy-async` | Async policy deletion started |
| `policy-engine-event-migrate-data` | Policy data migration started |
| `policy-engine-event-receive-external-data` | External data submitted to a running policy |

The full enumeration of all policy coordination and engine event subjects is defined in:
- [`interfaces/src/type/messages/policy-events.ts`](https://github.com/hashgraph/guardian/blob/main/interfaces/src/type/messages/policy-events.ts)
- [`interfaces/src/type/messages/policy-engine-events.ts`](https://github.com/hashgraph/guardian/blob/main/interfaces/src/type/messages/policy-engine-events.ts)

---

## Webhook Delivery

When an event is received on a subscribed NATS subject, the module iterates over all registered webhooks whose `events` array includes that subject and performs an HTTP POST to each registered URL.

- **Method:** `POST`
- **Content-Type:** `application/json`
- **Body:** The raw event payload (the object published on NATS)

Delivery is best-effort. If a webhook URL returns an error or times out, the failure is logged and the module moves on. There is no built-in retry mechanism — design your endpoint to be idempotent and implement your own retry handling if required.

---

## Configuration

The module is configured via environment variables. The key variables are:

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3012` | HTTP port the service binds to |
| `MONGODB_URI` | — | MongoDB connection string for webhook persistence |
| `MQ_ADDRESS` | — | NATS broker address (e.g., `nats://localhost:4222`) |

Refer to the `application-events/.env.example` file in the repository for the complete list.
