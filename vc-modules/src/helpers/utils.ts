import { PrivateKey } from '@hashgraph/sdk';

export class Utils {
    public static randomUUID(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

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

export function timeout(timeoutValue: number) {
    return (target: any, propertyKey: string, descriptor: TypedPropertyDescriptor<(...params: any[]) => Promise<any>>) => {
        let oldFunc = descriptor.value;
        descriptor.value = async function () {
            const timeoutPromise = new Promise((resolve, reject) => {
                setTimeout(() => {
                    reject('Transaction timeout exceeded');
                }, timeoutValue);
            })
            return Promise.race([oldFunc.apply(this, arguments), timeoutPromise]);
        }
    }
}