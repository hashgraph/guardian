/**
 * Run function async
 * @param func
 * @param onErrorFunc
 */
export function RunFunctionAsync<T extends Error>(func: (...args: any[]) => Promise<any>, onErrorFunc?: (error: T) => Promise<void>): void {
    const runner = async () => {
        try {
            await func();
        } catch (error) {
            if (typeof onErrorFunc === 'function') {
                await onErrorFunc(error);
            } else {
                console.error(error.message);
            }
        }
    }
    runner().then();
}
