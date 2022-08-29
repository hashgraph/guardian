import { PrivateKey } from '@hashgraph/sdk';

/**
 * Timeout decorator
 * @param timeoutValue
 */
export function timeout(timeoutValue: number) {
    return (target: any, propertyKey: string, descriptor: TypedPropertyDescriptor<(...params: any[]) => Promise<any>>) => {
        const oldFunc = descriptor.value;
        descriptor.value = async function () {
            const timeoutPromise = new Promise((resolve, reject) => {
                setTimeout(() => {
                    reject(new Error('Transaction timeout exceeded'));
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
}
