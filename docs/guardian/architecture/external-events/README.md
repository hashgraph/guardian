# External Events

Guardian processes tasks asynchronously. As operations complete, it publishes events to an internal NATS message broker. External systems can subscribe to these events to build reliable, event-driven integrations without polling.

There are two ways to consume Guardian events:

- **Direct NATS subscription** — connect your own NATS client to the same broker and subscribe to subjects directly.
- **Application Events Module** — a standalone HTTP service (port 3012) that subscribes to NATS on your behalf and forwards events to registered webhooks or a streaming endpoint. See [Application Events Module](monitoring-tools/application-events-module.md).

---

## Subscription Patterns

Guardian events use two NATS interaction patterns.

### Publish / Subscribe

Events with pattern type `publish` follow the standard pub/sub model. The same message is delivered to every active subscriber. If multiple subscribers are running, ensure your application handles potential duplicate delivery.

```js
import { connect, JSONCodec } from "nats";

(async () => {
  const nc = await connect({ servers: "localhost:4222" });
  const c = JSONCodec();

  const sub = nc.subscribe("external-events.token_minted");

  (async () => {
    for await (const m of sub) {
      console.log(`[${sub.getProcessed()}]`, c.decode(m.data));
    }
    console.log("subscription closed");
  })();
})();
```

For more details see the [NATS.js publish/subscribe documentation](https://github.com/nats-io/nats.js#publish-and-subscribe).

### Request / Reply

Events with pattern type `request` require the subscriber to reply. Guardian waits for your response before proceeding. If no listener is registered, or the listener responds with an error, Guardian continues with the original content unmodified.

This pattern is used for IPFS content interception hooks (e.g., encryption/decryption of content before upload or after read).

```js
import { connect, JSONCodec, StringCodec } from "nats";
import * as zlib from "zlib";

(async () => {
  const nc = await connect({ servers: "localhost:4222" });
  const c = JSONCodec();

  const interceptContent = (type, transformFn) => {
    const sub = nc.subscribe(type);
    console.log("Listening to IPFS event:", type);

    (async () => {
      for await (const m of sub) {
        try {
          const payload = c.decode(m.data);
          const transformed = transformFn(Buffer.from(payload.content, "base64"));
          const responseMessage = { body: transformed.toString("base64") };
          const compressed = zlib.deflateSync(JSON.stringify(responseMessage)).toString("binary");
          m.respond(StringCodec().encode(compressed));
        } catch (e) {
          // Respond with error to signal Guardian to skip interception for this message
          const compressed = zlib.deflateSync(JSON.stringify({ error: e.message })).toString("binary");
          m.respond(StringCodec().encode(compressed));
        }
      }
    })();
  };

  // Example: intercept IPFS uploads with a custom transform
  interceptContent("external-events.ipfs_before_upload_content", (buf) => {
    // encrypt or transform buf here, return Buffer
    return buf;
  });
})();
```

---

## Event Reference

### Core External Events

These events are published by Guardian's core services and represent the primary integration surface for external systems.

| Event Subject | Pattern | Description |
|---|---|---|
| `external-events.token_minted` | publish | A Hedera token was successfully minted |
| `external-events.token_mint_complete` | publish | All token minting operations for a batch are complete |
| `external-events.error_logs` | publish | An error was written to the Guardian logger service |
| `external-events.block_event` | publish | A policy block execution event occurred |
| `external-events.block_complete` | publish | Full async execution chain for a block data call has settled |
| `external-events.ipfs_added_file` | publish | A file was successfully added to IPFS |
| `external-events.ipfs_before_upload_content` | request | Hook: intercept and optionally transform content before IPFS upload |
| `external-events.ipfs_after_read_content` | request | Hook: intercept and optionally transform content after reading from IPFS |
| `external-events.ipfs_loaded_file` | subscribe | A file load from IPFS has completed |

---

### `external-events.token_minted`

**Pattern:** publish

**Trigger:** Guardian successfully mints a Hedera token during policy execution.

**Payload:**

```json
{
  "tokenId": "0.0.1554488",
  "tokenValue": 10,
  "memo": "policy-mint-batch-1"
}
```

| Field | Type | Description |
|---|---|---|
| `tokenId` | string | Hedera token identifier (`shard.realm.num`) |
| `tokenValue` | number | Number of tokens minted in this operation |
| `memo` | string | Optional memo string associated with the mint transaction |

---

### `external-events.token_mint_complete`

**Pattern:** publish

**Trigger:** All pending token minting operations in a batch have completed.

**Payload:**

```json
{
  "tokenValue": 10
}
```

| Field | Type | Description |
|---|---|---|
| `tokenValue` | number | Total number of tokens that were minted in the completed batch |

---

### `external-events.error_logs`

**Pattern:** publish

**Trigger:** An error is written to the Guardian logger service by any internal service.

**Payload:**

```json
{
  "message": "failed store/add invocation",
  "type": "error",
  "attributes": {
    "service": "guardian-service",
    "code": "IPFS_UPLOAD_FAILED"
  }
}
```

| Field | Type | Description |
|---|---|---|
| `message` | string | Human-readable error description |
| `type` | string | Severity or error category |
| `attributes` | object | Additional contextual attributes from the originating service |

---

### `external-events.block_event`

**Pattern:** publish

**Trigger:** A policy block executes an action that produces an external event (e.g., a user submits a form, a document is set, a timer fires).

**Payload:**

```json
[
  {
    "type": "Set",
    "blockUUID": "37c1b465-5261-4626-8972-f367301974a1",
    "blockType": "requestVcDocumentBlock",
    "blockTag": "applicant_form",
    "userId": "did:hedera:testnet:zHcDLGFNymFAJiMBKnpbHDgjvTn6yZnwkPPeFhtJBECH_0.0.4532001",
    "data": {
      "documents": []
    }
  }
]
```

The payload is an array of block event objects. Each object has:

| Field | Type | Description |
|---|---|---|
| `type` | string | Event type — one of `Run`, `Set`, `TickAggregate`, `TickCron`, `DeleteMember`, `StartCron`, `StopCron`, `SignatureQuorumReachedEvent`, `SignatureSetInsufficientEvent`, `Step`, `Chunk` |
| `blockUUID` | string | Unique identifier of the block that produced this event |
| `blockType` | string | The block's type name (e.g., `requestVcDocumentBlock`, `mintDocumentBlock`) |
| `blockTag` | string | The human-readable tag assigned to the block in the policy editor |
| `userId` | string | Hedera DID of the user who triggered the block action |
| `data` | object | Block-specific payload; structure varies by block type |

---

### `external-events.block_complete`

**Pattern:** publish

**Trigger:** Triggered when the full async execution chain (downstream blocks, IPFS uploads, Hedera message submissions) for a `SET_BLOCK_DATA` / `SET_BLOCK_DATA_BY_TAG` call has settled — success or failure. The `trackingId` field matches the value returned in the API response, so external systems can correlate the event with their request without polling.

**Payload:**

```json
{
  "trackingId": "550e8400-e29b-41d4-a716-446655440000",
  "blockType": "requestVcDocumentBlock",
  "blockTag": "request_vc",
  "blockId": "3f2504e0-4f89-11d3-9a0c-0305e82c3301",
  "policyId": "6475a9e0-5f27-4ce3-b2f1-123456789abc",
  "userId": "did:hedera:testnet:z6MkHmF...",
  "status": "success",
  "timestamp": 1745123456789
}
```

| Field | Type | Description |
|---|---|---|
| `trackingId` | string | UUID correlating this event to the originating API call |
| `blockType` | string | The block's type name |
| `blockTag` | string | The human-readable tag assigned to the block in the policy editor |
| `blockId` | string | Unique identifier of the block |
| `policyId` | string | Identifier of the policy containing the block |
| `userId` | string | Hedera DID of the user whose action triggered the chain |
| `status` | string | `success` or `failure` |
| `timestamp` | number | Unix epoch milliseconds when the chain settled |

---

### `external-events.ipfs_added_file`

**Pattern:** publish

**Trigger:** A file (document, schema, artifact) is successfully pinned to IPFS.

**Payload:**

```json
{
  "cid": "QmPs2ufs5VQPYGGX1ewEjKSR8zuEmeuWK4GBKFHZjXTCAQ",
  "url": "ipfs://QmPs2ufs5VQPYGGX1ewEjKSR8zuEmeuWK4GBKFHZjXTCAQ"
}
```

| Field | Type | Description |
|---|---|---|
| `cid` | string | IPFS content identifier (CIDv0) |
| `url` | string | IPFS URI in `ipfs://` scheme |

---

### `external-events.ipfs_before_upload_content`

**Pattern:** request/reply

**Trigger:** Guardian is about to upload content to IPFS. The content is delivered as a base64-encoded buffer.

**Payload received:**

```json
{
  "content": "<base64-encoded file content>"
}
```

**Expected reply:**

Return a zlib-deflated JSON object with the (optionally transformed) content:

```json
{
  "body": "<base64-encoded transformed content>"
}
```

To skip transformation and signal an error, respond with:

```json
{
  "error": "reason for skipping"
}
```

If no listener is registered, or the listener responds with an error, Guardian uploads the original content unchanged.

> **Note:** This event is a request/reply hook. It is not forwarded by the Application Events Module. Subscribe directly via NATS.

---

### `external-events.ipfs_after_read_content`

**Pattern:** request/reply

**Trigger:** Guardian has just read content from IPFS. Use this hook to decrypt or post-process content before Guardian consumes it.

**Payload received:**

```json
{
  "content": "<base64-encoded file content>"
}
```

**Expected reply:** Same structure as `ipfs_before_upload_content`. Return the transformed content or an error object.

> **Note:** This event is a request/reply hook. It is not forwarded by the Application Events Module. Subscribe directly via NATS.

---

### `external-events.ipfs_loaded_file`

**Pattern:** subscribe

**Trigger:** An asynchronous IPFS file load has completed (either successfully or with an error).

**Payload:**

```json
{
  "taskId": "be1c8bc2-c100-47c5-af48-46c10b5fde55",
  "fileContent": "<base64-encoded file content>",
  "error": null
}
```

| Field | Type | Description |
|---|---|---|
| `taskId` | string | UUID correlating this result to the original load request |
| `fileContent` | string | Base64-encoded file content; present on success |
| `error` | string \| null | Error message if the load failed; `null` on success |

> **Note:** This event is not forwarded by the Application Events Module. Subscribe directly via NATS.

---

## Policy Engine Events

In addition to the core external events above, the Application Events Module also surfaces Guardian's internal policy coordination events. These are emitted on NATS subjects from the `PolicyEvents` and `PolicyEngineEvents` enumerations (e.g., `policy-event-policy-ready`, `policy-engine-event-publish-policies`).

These events are intended for advanced integrations that need to react to specific policy lifecycle transitions. They are available through the Application Events Module's streaming endpoint and webhook registration. Use **`GET /api/events`** on the Application Events Module to retrieve the complete list of exposed event subjects at runtime.

---

## Reference Implementation

A complete Node.js reference client demonstrating publish/subscribe and request/reply patterns (including IPFS content encryption) is available at:

[`common/src/mq/sample-external-client.ts`](https://github.com/hashgraph/guardian/blob/main/common/src/mq/sample-external-client.ts)
