# 🏜 External Events

### Introduction

Guardian will publish number of events to NATS server to hook into those events , which extends the function that is suitable to the solution.

### Hooks to external event

To hooks into Guardian events, we need to have a client, that is connected to same NATS instance with Guardian and implement the response function for a specific event.&#x20;

Below is the sample for .NodeJs and in case of other language please refer to [Nats.io](https://nats.io/) for complete documentation.

#### publish/subscribe events

The events with type=`publish` is publish/subscribe pattern so that the same message can be received by multiple clients. If there are multiple clients make sure it is handled by duplicate message processing.

```js
import { connect, JSONCodec } from "nats";

(async () => {
  const nc = await connect({ servers: "localhost:4222" });

  const c = JSONCodec();
  const sub = nc.subscribe("externals-events.ipfs_added_file");

  (async () => {
    for await (const m of sub) {
      console.log(`[${sub.getProcessed()}]`, c.decode(m.data));
    }
    console.log("subscription closed");
  })();
})();
```

To get more information please click [https://github.com/nats-io/nats.js#publish-and-subscribe](https://github.com/nats-io/nats.js#publish-and-subscribe)

#### request/reply events

Some event has type=`request` for which we need to subscribe and respond to the event.&#x20;

#### Example:

For the before/after IPFS event, if the listener responds an error then IPFS service will be skipped and upload/response the actual content. This same scenario also happens when we do not have listener to an event. For example we can use this to encrypt/decrypt IPFS content file

```js
const responseToIpfsEvent = (type: string, cb: (data: Buffer) => Buffer) => {
        const sub = nc.subscribe(type);
        console.log("√ Listening to IPFS event: %s", type);
        (async () => {
            for await (const m of sub) {
                console.log(`[${sub.getProcessed()} - ${m.subject}]`);
                try {
                    const payload = c.decode(m.data) as any;
                    const body = cb(Buffer.from(payload.content, 'base64'));
                    const responseMessage = { body: body.toString('base64') }
                    const archResponse = zlib.deflateSync(JSON.stringify(responseMessage)).toString('binary');
                    m.respond(StringCodec().encode(archResponse));
                } catch (e) {
                    // It is important that you should handle the content to make sure that is your encrypted/decrypted, skip if that is system ipds file
                    const archResponse = zlib.deflateSync(JSON.stringify({ error: e.message })).toString('binary');
                    m.respond(StringCodec().encode(archResponse));
                }

            }
            console.log("Subscription closed");
        })();
    };
```

### External events list

| event                                         | type    |                  payload                  | notes                                                                                                                                                                                                                                                              |
| --------------------------------------------- | ------- | :---------------------------------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| externals-events.ipfs\_added\_file            | publish |                 {cid, url}                | Event is published when an IPFS file is added                                                                                                                                                                                                                      |
| external-events.token\_minted                 | publish |       { tokenId, tokenValue, memo }       | When token is minted successfully                                                                                                                                                                                                                                  |
| external-events.error\_logs                   | publish |        {message, type, attributes}        | When an error is sent to logger service                                                                                                                                                                                                                            |
| external-events.block\_run\_action\_event     | publish | {blockType, blockTag, uuid ,data, result} | <p>After runAction is finished, events are called by these blocks:</p><ol><li><code>aggregateDocumentBlock</code></li><li><code>mintDocumentBlock</code></li><li><code>sendToGuardianBlock</code></li><li><code>timerBlock</code> after runAction finish</li></ol> |
| external-events.ipfs\_before\_upload\_content | request |                 {content}                 | The base64 of the content (buffer) to be hooked and modified                                                                                                                                                                                                       |
| external-events.ipfs\_after\_read\_content    | request |                 {content}                 | The base64 of the content (buffer) to be modified/processed                                                                                                                                                                                                        |

### Example

This example demonstrates implementation of encryption / decryption of simple IPFS content.

Please refer to [https://github.com/hashgraph/guardian/blob/main/common/src/mq/sample-external-client.ts](https://github.com/hashgraph/guardian/blob/main/common/src/mq/sample-external-client.ts)
