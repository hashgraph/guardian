import { STATE_KEY } from '@policy-engine/helpers/constants';

/**
 * State field decorator
 * @constructor
 */
export function StateField() {
    // tslint:disable-next-line:only-arrow-functions
    return function (target: any, propertyKey: string) {
        const isEnumerable = target.propertyIsEnumerable(propertyKey);

        if (delete target[propertyKey]) {
            Object.defineProperty(target, propertyKey, {
                get () {
                    if (!this[STATE_KEY]) {
                        this[STATE_KEY] = {}
                    }
                    return this[STATE_KEY][propertyKey];
                },
                set (v: any) {
                    if (!this[STATE_KEY]) {
                        this[STATE_KEY] = {}
                    }
                    this[STATE_KEY][propertyKey] = v;
                },
                enumerable: isEnumerable,
                configurable: true
            })
        }
    }
}
