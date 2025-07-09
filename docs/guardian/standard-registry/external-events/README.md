# External Events

### Introduction

Guardian will publish number of events to NATS server to hook into those events , which extends the function that is suitable to the solution.

### Hooks to external event

To hooks into Guardian events, we need to have a client, that is connected to same NATS instance with Guardian and implement the response function for a specific event.

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

Some event has type=`request` for which we need to subscribe and respond to the event.

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

<table><thead><tr><th>event</th><th width="103.12890625">type</th><th align="center">payload</th><th>notes</th><th>Example</th></tr></thead><tbody><tr><td>external-events.token_minted</td><td>publish</td><td align="center">{ tokenId, tokenValue, memo }</td><td>Triggered when a token is successfully minted.</td><td>{<br>tokenId: '0.0.1554488',<br>tokenValue: 10<br>}</td></tr><tr><td>external-events.token_mint_complete</td><td>publish</td><td align="center">{ tokenValue }</td><td>Triggered when all tokens have been minted.</td><td>{<br>tokenValue: 10<br>}</td></tr><tr><td>external-events.error_logs</td><td>publish</td><td align="center">{ message, type, attributes }</td><td>Triggered when an error is sent to the logger service.</td><td>{<br>id: '9b9d1cd0-cff4-467b-a3bc-8866fa1cfd18',<br>error: 'failed store/add invocation'<br>}</td></tr><tr><td>external-events.block_event</td><td>publish</td><td align="center">&#x3C;blockEventData></td><td>Represents a block external event.</td><td>[<br>{<br>type: 'Set',<br>blockUUID: '37c1b465-5261-4626-8972-f367301974a1',<br>blockType: 'requestVcDocumentBlock',<br>blockTag: 'bad_token_form',<br>userId: 'did:hedera:testnet:FF7nFWaMCkHjEfJLtcUQTLRQao9yCCj6mc4MRvgDjStW_0.0.5277702',<br>data: { documents: [Array] }<br>}<br>]</td></tr><tr><td>external-events.ipfs_added_file</td><td>publish</td><td align="center">{ cid, url }</td><td>Triggered when a file is added to IPFS.</td><td><p>{ cid: 'QmPs2ufs5VQPYGGX1ewEjKSR8zuEmeuWK4GBKFHZjXTCAQ',</p><p>url: '<a href="ipfs://QmPs2ufs5VQPYGGX1ewEjKSR8zuEmeuWK4GBKFHZjXTCAQ">ipfs://QmPs2ufs5VQPYGGX1ewEjKSR8zuEmeuWK4GBKFHZjXTCAQ</a>' }</p></td></tr><tr><td>external-events.ipfs_before_upload_content </td><td>request</td><td align="center">{content}</td><td>The base64-encoded content (buffer) to be hooked and modified before uploading to IPFS.</td><td>{<br>content: 'eyJAY29udGV4dCI6eyJAdmVyc2lvbiI6MS4xLCJAdm9jYWIiOiJodHRwczovL3czaWQub3JnL3RyYWNlYWJpbGl0eS8jdW5kZWZpbmVkVGVybSIsImlkIjoiQGlkIiwidHlwZSI6IkB0eXBlIiwiYTkwYWU1OWEtNjhhMS00YmY3LWFmNDgtNTRhNzhiNWQwYzI5JjEiOnsiQGlkIjoic2NoZW1hOmE5MGFlNTlhLTY4YTEtNGJmNy1hZjQ4LTU0YTc4YjVkMGMyOSNhOTBhZTU5YS02OGExLTRiZjctYWY0OC01NGE3OGI1ZDBjMjkmMSIsIkBjb250ZXh0Ijp7InBvbGljeUlkIjp7IkB0eXBlIjoiaHR0cHM6Ly93d3cuc2NoZW1hLm9yZy90ZXh0In0sInJlZiI6eyJAdHlwZSI6Imh0dHBzOi8vd3d3LnNjaGVtYS5vcmcvdGV4dCJ9fX19fQ=='<br>}</td></tr><tr><td>external-events.ipfs_after_read_content </td><td>request</td><td align="center">{content}</td><td>The base64-encoded content (buffer) to be modified or processed after reading from IPFS.</td><td>QmPs2ufs5VQPYGGX1ewEjKSR8zuEmeuWK4GBKFHZjXTCAQ</td></tr><tr><td>external-events.ipfs_loaded_file</td><td>subscription</td><td align="center">{ taskId, fileContent, error }</td><td>Receives an event when a file load is complete.</td><td>{<br>taskId: 'be1c8bc2-c100-47c5-af48-46c10b5fde55',<br>fileContent: 'eyJAY29udGV4dCI6eyJAdmVyc2lvbiI6MS4xLCJAdm9jYWIiOiJodHRwczovL3czaWQub3JnL3RyYWNlYWJpbGl0eS8jdW5kZWZpbmVkVGVybSIsImlkIjoiQGlkIiwidHlwZSI6IkB0eXBlIiwiYTkwYWU1OWEtNjhhMS00YmY3LWFmNDgtNTRhNzhiNWQwYzI5JjEiOnsiQGlkIjoic2NoZW1hOmE5MGFlNTlhLTY4YTEtNGJmNy1hZjQ4LTU0YTc4YjVkMGMyOSNhOTBhZTU5YS02OGExLTRiZjctYWY0OC01NGE3OGI1ZDBjMjkmMSIsIkBjb250ZXh0Ijp7InBvbGljeUlkIjp7IkB0eXBlIjoiaHR0cHM6Ly93d3cuc2NoZW1hLm9yZy90ZXh0In0sInJlZiI6eyJAdHlwZSI6Imh0dHBzOi8vd3d3LnNjaGVtYS5vcmcvdGV4dCJ9fX19fQ',<br>error: undefined<br>}</td></tr></tbody></table>

### Example

This example demonstrates implementation of encryption / decryption of simple IPFS content.

Please refer to [https://github.com/hashgraph/guardian/blob/main/common/src/mq/sample-external-client.ts](https://github.com/hashgraph/guardian/blob/main/common/src/mq/sample-external-client.ts)
