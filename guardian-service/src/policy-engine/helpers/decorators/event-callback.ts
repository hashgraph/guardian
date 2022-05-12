import { PolicyEventType } from '@policy-engine/interfaces/policy-event-type';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';

export function ActionCallback(config: {
    type: PolicyEventType
}) {
    return (target: any, propertyKey: string, descriptor: TypedPropertyDescriptor<Function>) => {
        const func = descriptor.value as any;
        PolicyComponentsUtils.RegisterAction(target, config.type, func);
    }
}




