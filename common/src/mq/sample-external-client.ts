import { ExternalMessageEvents } from '@guardian/interfaces';
import { connect, headers, JSONCodec, StringCodec } from 'nats';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import { JwtServicesValidator } from '../security/index.js';

const ENABLE_IPFS_ENCRYPTION = false;
/**
 * The sample client implementation how to handle guardian events outside guardian code base
 * ts-node ./src/sample-external-client.ts
 */

const algorithm = 'aes-256-ctr';
let key = 'MySuperSecretKey';
key = crypto.createHash('sha256').update(String(key)).digest('base64').substr(0, 32);

const encrypt = (buffer: Buffer) => {
    console.log('Encrypting content')
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    const result = Buffer.concat([iv, cipher.update(buffer), cipher.final()]);
    return result;
};

const decrypt = (encrypted: Buffer) => {
    console.log('Decrypting content')
    const iv = encrypted.slice(0, 16);
    encrypted = encrypted.slice(16);
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    const result = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return result;
};

(async () => {

    const nc = await connect({ servers: 'localhost:4222', timeout: 1200 * 1000 });

    const c = JSONCodec();

    const subscribeEvent = (type: string, cb: (data: any) => void) => {
        const sub = nc.subscribe(type);
        console.log('√ subscribe to nat event: %s', type);
        (async () => {
            for await (const m of sub) {
                const payload = c.decode(m.data)
                console.log(`[${sub.getProcessed()} - ${m.subject}]`, payload);
                if(cb) {
                    await cb(payload);
                }
            }
            console.log('subscription closed');
        })();
    };

    const responseToIpfsEvent = (type: string, cb: (data: Buffer) => Buffer) => {
        const sub = nc.subscribe(type);
        console.log('√ Listening to IPFS event: %s', type);
        (async () => {
            for await (const m of sub) {
                let token = '';
                const head = headers();

                try {
                    token = await JwtServicesValidator.sign(m.subject);
                } catch (err) {
                    console.error(`Error when sign message ${m.subject}`, err);
                }
                head.append('serviceToken', token);

                console.log(`[${sub.getProcessed()} - ${m.subject}]`);
                try {
                    const payload = c.decode(m.data) as any;
                    const body = cb(Buffer.from(payload.content, 'base64'));
                    const responseMessage = { body: body.toString('base64') }
                    const archResponse = zlib.deflateSync(JSON.stringify(responseMessage)).toString('binary');
                    m.respond(StringCodec().encode(archResponse), { headers: head });
                } catch (e) {
                    // It is important that you should handle the content to make sure that is your encrypted/decrypted, skip if that is system ipds file
                    const archResponse = zlib.deflateSync(JSON.stringify({ error: e.message })).toString('binary');
                    m.respond(StringCodec().encode(archResponse), { headers: head });
                }

            }
            console.log('subscription closed');
        })();
    };

    const responseNone = (type: string) => {
        const sub = nc.subscribe(type);
        (async () => {
            for await (const m of sub) {
                let token = '';
                const head = headers();

                try {
                    token = await JwtServicesValidator.sign(m.subject);
                } catch (err) {
                    console.error(`Error when sign message ${m.subject}`, err);
                }
                head.append('serviceToken', token);

                m.respond(undefined, { headers: head });
            }
        })();
    }

    // subscribeEvent(ExternalMessageEvents.IPFS_ADDED_FILE, async (msg) => {
    //     console.log('IPFS file uploaded: ', msg);
    //     const data = await nc.request('ipfs-client.ipfs-get-file',
    //         StringCodec().encode(JSON.stringify({ ...msg, responseType: 'str' })), { timeout: 60000 })
    //     const unpackedString = zlib.inflateSync(Buffer.from(StringCodec().decode(data.data), 'binary')).toString();
    //     const res = JSON.parse(unpackedString);
    //     console.log('Response file content: ', res.body)
    // });
    subscribeEvent(ExternalMessageEvents.TOKEN_MINTED, null);
    subscribeEvent(ExternalMessageEvents.ERROR_LOG, null);
    subscribeEvent(ExternalMessageEvents.BLOCK_EVENTS, null);

    if (ENABLE_IPFS_ENCRYPTION) {
        responseToIpfsEvent(ExternalMessageEvents.IPFS_BEFORE_UPLOAD_CONTENT, encrypt)
        responseToIpfsEvent(ExternalMessageEvents.IPFS_AFTER_READ_CONTENT, decrypt)
    } else {
        responseNone(ExternalMessageEvents.IPFS_BEFORE_UPLOAD_CONTENT);
        responseNone(ExternalMessageEvents.IPFS_AFTER_READ_CONTENT);
    }
})()
