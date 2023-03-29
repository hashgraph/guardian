import { ErrorCode, NatsError } from 'nats';
import util from 'util';
import { gzip, unzip } from 'zlib';

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

                return await util.promisify(gzip)(JSON.stringify(d));
            } catch (error) {
                throw NatsError.errorForCode(ErrorCode.BadJson, error);
            }
        },
        async decode(a) {
            try {
                const decompressed = await util.promisify(unzip)(a);
                return JSON.parse(decompressed.toString())
            } catch (error) {
                console.log('error string', a.toString());
                return a.toString();
                // throw NatsError.errorForCode(ErrorCode.BadJson, error);
            }
        }
    }
}
