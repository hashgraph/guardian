import { PrivateKey, PublicKey } from '@hiero-ledger/sdk';

/**
 * Timeout decorator
 * @param timeoutValue
 */
export function timeout(timeoutValue: number) {
    return (target: any, propertyKey: string, descriptor: TypedPropertyDescriptor<(...params: any[]) => Promise<any>>) => {
        const oldFunc = descriptor.value;
        descriptor.value = async function () {
            let timer: ReturnType<typeof setTimeout>;
            const timeoutPromise = new Promise((resolve, reject) => {
                timer = setTimeout(() => {
                    reject(new Error('Transaction timeout exceeded'));
                }, timeoutValue);
            })
            try {
                return await Promise.race([oldFunc.apply(this, arguments), timeoutPromise]);
            } finally {
                // Clear the timer once the race settles so a completed call does not
                // keep a live timeout (and the captured this/arguments) until it fires.
                clearTimeout(timer);
            }
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
