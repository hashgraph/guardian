## Introduction

Guardian will publish number of events to Nats server so that you can hooks into those event when it happen to extend the function that suiteable for your solution

## Hooks to external event

To hooks into guardian events, you need to have a client that connect to same NATS instance with guardian and implement the response function for a specific event. Below are sample to use nodejs, if you are using other language please refer to Nats.io for document

Guardian uses publish/subscribe pattern so the same message can be received by multiple clients. If you have multiple clients make sure you handle duplicated message processing.

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

## External events list

| event                                  |                  payload                  | notes                                                                                                                             |
| -------------------------------------- | :---------------------------------------: | --------------------------------------------------------------------------------------------------------------------------------- |
| externals-events.ipfs_added_file       |                {cid, url}                 | Event published when ipfs filf is added                                                                                           |
| external-events.token_minted           |       { tokenId, tokenValue, memo }       | When token minted successfully                                                                                                    |
| external-events.error_logs             |        {message, type, attributes}        | when any error send to logger service                                                                                             |
| external-events.block_run_action_event | {blockType, blockTag, uuid ,data, result} | event emit for these block `aggregateDocumentBlock` `mintDocumentBlock` `sendToGuardianBlock` `timerBlock` after runAction finish |
