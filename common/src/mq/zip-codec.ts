import { ErrorCode, NatsError } from 'nats';
import util from 'util';
import { gzip, unzip } from 'zlib';
import { LargePayloadContainer } from './large-payload-container';
import axios from 'axios';

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

                const zipped =  await util.promisify(gzip)(JSON.stringify(d));
                const maxPayload = parseInt(process.env.MQ_MAX_PAYLOAD, 10);
                if (Number.isInteger(maxPayload) && maxPayload <= zipped.length) {
                    const directLink = new LargePayloadContainer().addObject(zipped);
                    console.log(directLink.toString(), zipped.length);
                    return  await util.promisify(gzip)(JSON.stringify({
                        directLink
                    }))
                } else {
                    return zipped;
                }

            } catch (error) {
                throw NatsError.errorForCode(ErrorCode.BadJson, error);
            }
        },
        async decode(a) {
            try {
                const decompressed = await util.promisify(unzip)(a);
                const parsed = JSON.parse(decompressed.toString());
                if (parsed?.hasOwnProperty('directLink')) {
                    const directLink = parsed.directLink;
                    const response = await axios.get(directLink, {
                        responseType: 'arraybuffer'
                    });
                    const compressedData = response.data.buffer;
                    const _decompressed = await util.promisify(unzip)(compressedData)
                    console.log(directLink, JSON.parse(_decompressed.toString()));
                    return JSON.parse(_decompressed.toString());
                }
                return parsed;
            } catch (error) {
                console.log(error);
                throw NatsError.errorForCode(ErrorCode.BadJson, error);
            }
        }
    }
}
