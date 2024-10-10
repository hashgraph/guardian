import { Users, VcHelper, Wallet } from '@guardian/common';

/**
 * Service injector
 */
export function Inject(): any {
    return (target: any, key: string, value) => {
        const _RegisteredInjections = [Wallet, Users, VcHelper];
        const injClass = _RegisteredInjections.find((item) => {
            return (
                new item() instanceof
                Reflect.getMetadata('design:type', target, key)
            );
        });

        if (delete target[key]) {
            Object.defineProperty(target, key, {
                get: () => {
                    return new injClass();
                },
                enumerable: true,
                configurable: true,
            });
        }
    };
}
