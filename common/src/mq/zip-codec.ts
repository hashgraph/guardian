import { ErrorCode, JSONCodec, NatsError } from 'nats';
import { LargePayloadContainer } from './large-payload-container.js';
import axios from 'axios';
import https from 'node:https';

/**
 * Zip Codec
 * @constructor
 */
export function ZipCodec() {
    return {
        async encode(d) {
            try {
                if (d === undefined) {
                    d = null;
                }

                const zipped =  JSONCodec().encode(d);
                const maxPayload = parseInt(process.env.MQ_MAX_PAYLOAD, 10);

                //Add some space reserved for headers
                const headerReserved = 32 * 1024;

                if (Number.isInteger(maxPayload) && maxPayload <= (zipped.length + headerReserved)) {
                    const directLink = new LargePayloadContainer().addObject(Buffer.from(zipped));
                    return JSONCodec().encode({
                        directLink
                    })
                } else {
                    return zipped;
                }

            } catch (error) {
                throw NatsError.errorForCode(ErrorCode.BadJson, error);
            }
        },
        async decode(a) {
            try {
                const parsed = JSONCodec().decode(a) as any;
                if (parsed?.hasOwnProperty('directLink')) {
                    const directLink = parsed.directLink;
                    if (process.env.TLS_CERT && process.env.TLS_KEY) {
                        const httpsAgent = new https.Agent({
                            cert: process.env.TLS_CERT,
                            key: process.env.TLS_KEY,
                            ca: process.env.TLS_CA
                        });
                        axios.defaults.httpsAgent = httpsAgent;
                    }
                    const response = await axios.get(directLink, {
                        responseType: 'arraybuffer'
                    });
                    const compressedData = response.data;
                    const _decompressed = compressedData;
                    return JSON.parse(_decompressed.toString());
                }
                return parsed;
            } catch (error) {
                throw NatsError.errorForCode(ErrorCode.BadJson, error);
            }
        }
    }
}
