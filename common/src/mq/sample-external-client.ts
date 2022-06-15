import { ExternalMessageEvents } from "@guardian/interfaces";
import { connect, JSONCodec } from "nats";
/**
 * The sample client implementation how to handle guardian events outside guardian code base
 * ts-node ./src/sample-external-client.ts
 */
(async () => {

    const nc = await connect({ servers: "localhost:4222" });

    const c = JSONCodec();

    const subscribeEvent = (type: string, cb: (data: any) => void) => {
        const sub = nc.subscribe(type);
        console.log("√ subscribe to nat event: %s", type);
        (async () => {
            for await (const m of sub) {
                const payload = c.decode(m.data)
                console.log(`[${sub.getProcessed()} - ${m.subject}]`, payload);
                cb(payload)
            }
            console.log("subscription closed");
        })();
    };
    subscribeEvent(ExternalMessageEvents.IPFS_ADDED_FILE, console.log);
    subscribeEvent(ExternalMessageEvents.TOKEN_MINTED, console.log);
    subscribeEvent(ExternalMessageEvents.ERROR_LOG, console.log);
    subscribeEvent(ExternalMessageEvents.BLOCK_RUN_EVENTS, console.log);
})()
