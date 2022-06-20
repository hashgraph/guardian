import { PolicyInputEventType, PolicyOutputEventType } from '@policy-engine/interfaces/policy-event-type';

export function ActionCallback(config: {
    type?: PolicyInputEventType,
    output?: PolicyOutputEventType | PolicyOutputEventType[]
}) {
    return (target: any, propertyKey: string, descriptor: TypedPropertyDescriptor<Function>) => {
        if (!Array.isArray(target.actions)) {
            target.actions = [];
        }
        if (!Array.isArray(target.outputActions)) {
            target.outputActions = [];
        }
        if (config.type) {
            target.actions.push([config.type, descriptor.value.bind(target)]);
        }
        if (config.output) {
            if (Array.isArray(config.output)) {
                for (let i = 0; i < config.output.length; i++) {
                    const output = config.output[i];
                    if (target.outputActions.indexOf(output) == -1) {
                        target.outputActions.push(output);
                    }
                }
            } else if (target.outputActions.indexOf(config.output) == -1) {
                target.outputActions.push(config.output);
            }
        }
    }
}
