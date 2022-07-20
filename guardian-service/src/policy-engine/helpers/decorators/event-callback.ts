import { PolicyInputEventType, PolicyOutputEventType } from '@policy-engine/interfaces/policy-event-type';

/**
 * Action callback decorator
 * @param config
 * @constructor
 */
export function ActionCallback(config: {
    /**
     * Event input type
     */
    type?: PolicyInputEventType,
    /**
     * Event output types
     */
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
            target.actions.push([
                config.type,
                new Proxy(target[propertyKey], {
                    async apply(_target: any, thisArg: any, argArray: any[]): Promise<any> {
                        descriptor.value.apply(thisArg, argArray);
                    }
                })
            ]);
        }
        if (config.output) {
            if (Array.isArray(config.output)) {
                for (const output of config.output) {
                    if (target.outputActions.indexOf(output) === -1) {
                        target.outputActions.push(output);
                    }
                }
            } else if (target.outputActions.indexOf(config.output) === -1) {
                target.outputActions.push(config.output);
            }
        }
    }
}
