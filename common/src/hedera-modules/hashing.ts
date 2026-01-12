import * as crypto from 'node:crypto';
import bs58 from 'bs58';
import { Base64 } from 'js-base64';

/**
 * Hashing class
 */
export class Hashing {
    /**
     * Base58
     */
    public static readonly base58 = {
        encode: (data: Uint8Array): string => {
            return bs58.encode(data);
        },
        decode: (data: string): Buffer => {
            return Buffer.from(bs58.decode(data));
        }
    }
    /**
     * Sha256
     */
    public static readonly sha256 = {
        digest: (data: Uint8Array | string): Uint8Array => {
            const sha256 = crypto
                .createHash('sha256') // may need to change in the future.
                .update(data)
                .digest();
            return sha256;
        }
    }
    /**
     * Base64
     */
    public static readonly base64 = {
        decode: (encodedString: string): string => {
            return Base64.fromBase64(encodedString);;
        },
        encode: (decodedBytes: string): string => {
            return Base64.toBase64(decodedBytes);
        }
    }
}
