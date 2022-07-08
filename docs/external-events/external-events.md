# Listen to external event published by guardian

### Introduction

Guardian will publish number of events to Nats server so that you can hooks into those event when it happen to extend the function that suitable for your solution

### Hooks to external event

To hooks into guardian events, you need to have a client that connect to same NATS instance with guardian and implement the response function for a specific event. Below are sample to use nodejs, if you are using other language please refer to Nats.io for document

#### publish/subscribe events

The events with type=`publish` is publish/subscribe pattern so the same message can be received by multiple clients. If you have multiple clients make sure you handle duplicated message processing.

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

Please read more at [https://github.com/nats-io/nats.js#publish-and-subscribe](https://github.com/nats-io/nats.js#publish-and-subscribe)

#### request/reply events

Some event has type=`request` you have to subscribe and respond to the event. see example below.

For the before/after ipfs event, if the listener respond error ipfs service will skip and upload/response the actual content. this also happen same when we have no listerner to the event. For example we can use this to encrypt/decrypt ipfs content file

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

| event                                      | type    |                  payload                  | notes                                                                                                                             |
| ------------------------------------------ | ------- | :---------------------------------------: | --------------------------------------------------------------------------------------------------------------------------------- |
| externals-events.ipfs_added_file           | publish |                {cid, url}                 | Event published when ipfs filf is added                                                                                           |
| external-events.token_minted               | publish |       { tokenId, tokenValue, memo }       | When token minted successfully                                                                                                    |
| external-events.error_logs                 | publish |        {message, type, attributes}        | when any error send to logger service                                                                                             |
| external-events.block_run_action_event     | publish | {blockType, blockTag, uuid ,data, result} | event emit for these block `aggregateDocumentBlock` `mintDocumentBlock` `sendToGuardianBlock` `timerBlock` after runAction finish |
| external-events.ipfs_before_upload_content | request |                 {content}                 | the base64 of the content (buffer) to be hooks and modify                                                                         |
| external-events.ipfs_after_read_content    | request |                 {content}                 | the base64 of the content (buffer) to be modify/process                                                                           |

### Example

Please refer to [https://github.com/hashgraph/guardian/blob/main/common/src/mq/sample-external-client.ts](https://github.com/hashgraph/guardian/blob/main/common/src/mq/sample-external-client.ts)

In the example we implement the simple encrypt/descrypt ipfs content
