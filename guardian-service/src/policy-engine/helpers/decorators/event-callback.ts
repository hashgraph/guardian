import { PolicyEventType } from '@policy-engine/interfaces/policy-event-type';

export function ActionCallback(config: {
    type: PolicyEventType
}) {
    return (target: any, propertyKey: string, descriptor: TypedPropertyDescriptor<Function>) => {
        if (!Array.isArray(target.actions)) {
            target.actions = [];
        }
        target.actions.push([config.type, descriptor.value]);
    }
}
