import {Guardians} from '../guardians.js';
import {Users} from '../users.js';
import {Wallet} from '../wallet.js';

/**
 * Service injector
 */
export function Inject(): any {
    return (target: any, key: string, value) => {
        const _RegisteredInjections = [Wallet, Users, Guardians];

        const injClass = _RegisteredInjections.find(item => {
            return new item() instanceof Reflect.getMetadata('design:type', target, key);
        });

        if (delete target[key]) {
            Object.defineProperty(target, key, {
                get: () => {
                    return new injClass();
                },
                enumerable: true,
                configurable: true
            });
        }
    }
}
