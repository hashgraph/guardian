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
