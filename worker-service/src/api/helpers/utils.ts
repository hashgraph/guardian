import { TimeoutError } from '@guardian/interfaces';
import { PrivateKey } from '@hiero-ledger/sdk';

/**
 * Timeout decorator
 * @param timeoutValue
 * @param messageError
 */
export function timeout(timeoutValue: number, messageError?: string) {
    return (target: any, propertyKey: string, descriptor: TypedPropertyDescriptor<(...params: any[]) => Promise<any>>) => {
        const oldFunc = descriptor.value;
        descriptor.value = async function () {
            const timeoutPromise = new Promise((resolve, reject) => {
                setTimeout(() => {
                    reject(new TimeoutError(messageError || 'Transaction timeout exceeded'));
                }, timeoutValue);
            })
            return Promise.race([oldFunc.apply(this, arguments), timeoutPromise]);
        }
    }
}

/**
 * Hedera utils class
 */
export class HederaUtils {
    /**
     * Generate random key
     */
    public static randomKey(): string {
        const privateKey = PrivateKey.generate();
        return HederaUtils.encode(privateKey.toBytes());
    }

    /**
     * Encode
     * @param data
     */
    public static encode(data: Uint8Array): string {
        return Buffer.from(data).toString();
    }

    /**
     * Decode
     * @param text
     */
    public static decode(text: string): Uint8Array {
        return new Uint8Array(Buffer.from(text));
    }

    /**
     * Pars random key
     * @param key
     * @param notNull
     */
    public static parsPrivateKey(
        key: string | PrivateKey,
        notNull = true,
        keyName: string = 'Private Key'
    ): PrivateKey {
        if (key) {
            try {
                if (typeof key === 'string') {
                    return PrivateKey.fromString(key);
                } else {
                    return key;
                }
            } catch (error) {
                throw new Error(`Invalid ${keyName}`);
            }
        } else if (notNull) {
            throw new Error(`${keyName} is not set`);
        } else {
            return null;
        }
    }
}
