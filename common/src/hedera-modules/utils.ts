import { PrivateKey, PublicKey } from '@hashgraph/sdk';

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

export function checkHederaKey(privateKey: string, publicKey: string): boolean {
    try {
        const _privateKey = PrivateKey.fromStringDer(privateKey);
        const _publicKey = _privateKey.publicKey;
        const _infoKey = PublicKey.fromString(publicKey);
        return _publicKey.equals(_infoKey);
    } catch (error) {
        return false;
    }
}
