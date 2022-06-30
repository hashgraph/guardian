import { PrivateKey } from '@hashgraph/sdk';

export function timeout(timeoutValue: number) {
    return (target: any, propertyKey: string, descriptor: TypedPropertyDescriptor<(...params: any[]) => Promise<any>>) => {
        let oldFunc = descriptor.value;
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

export class HederaUtils {
    public static randomKey(): string {
        const privateKey = PrivateKey.generate();
        return this.encode(privateKey.toBytes());
    }

    public static encode(data: Uint8Array): string {
        return Buffer.from(data).toString();
    }

    public static decode(text: string): Uint8Array {
        return new Uint8Array(Buffer.from(text));
    }
}
