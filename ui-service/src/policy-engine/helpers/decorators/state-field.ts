import {STATE_KEY} from '@policy-engine/helpers/constants';

export function StateField() {
    return function (target: any, propertyKey: string) {
        if (!target[STATE_KEY]) {
            target[STATE_KEY] = {}
        }

        let value: any;

        const getter = function() {
            return value;
        }

        const setter = function(v: any) {
            value = v;
            target[STATE_KEY][propertyKey] = value;
            console.log('set state', this.uuid, propertyKey, value);
        }

        const isEnumerable = target.propertyIsEnumerable(propertyKey);

        if (delete target[propertyKey]) {
            Object.defineProperty(target, propertyKey, {
                get: getter,
                set: setter,
                enumerable: isEnumerable,
                configurable: true
            })
        }
    }
}
