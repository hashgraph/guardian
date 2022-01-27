import {IPolicyBlock} from '@policy-engine/policy-engine.interface';

export function StateField() {
    return function (target: IPolicyBlock, propertyKey: string) {
        let value: any;

        const getter = function() {
            return value;
        }

        const setter = function(v: any) {
            value = v;
            console.log('set state', target.uuid, propertyKey, value);
        }

        Object.defineProperty(target, propertyKey, {
            get: getter
        })
    }
}
