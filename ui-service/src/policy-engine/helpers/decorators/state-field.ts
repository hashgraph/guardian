import {STATE_KEY} from '@policy-engine/helpers/constants';

export function StateField() {
    return function (target: any, propertyKey: string) {
        const isEnumerable = target.propertyIsEnumerable(propertyKey);

        if (delete target[propertyKey]) {
            Object.defineProperty(target, propertyKey, {
                get: function() {
                    if (!this[STATE_KEY]) {
                        this[STATE_KEY] = {}
                    }
                    return this[STATE_KEY][propertyKey];
                },
                set: function(v: any) {
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
