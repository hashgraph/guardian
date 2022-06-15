import * as crypto from 'crypto';
import bs58 from 'bs58';
import { Base64 } from 'js-base64';

export class Hashing {
    public static readonly base58 = {
        encode: function (data: Uint8Array): string {
            return bs58.encode(data);
        },
        decode: function (data: string): Uint8Array {
            return bs58.decode(data);
        }
    }
    public static readonly sha256 = {
        digest: function (data: Uint8Array | string): Uint8Array {
            const sha256 = crypto
                .createHash('sha256') // may need to change in the future.
                .update(data)
                .digest();
            return sha256;
        }
    }

    public static readonly base64 = {
        decode: function (encodedString: string): string {
            return Base64.fromBase64(encodedString);;
        },
        encode: function (decodedBytes: string): string {
            return Base64.toBase64(decodedBytes);
        }
    }
}
