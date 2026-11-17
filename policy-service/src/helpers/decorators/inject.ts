import { Users } from '@guardian/common/helpers/users';
import { Wallet } from '@guardian/common/helpers/wallet';
import { VcHelper } from '@guardian/hedera/vc-helper';

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
