/**
 * State update callback method decorator
 */
export function DependenciesUpdateHandler() {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        if (typeof target.updateHandlers === 'undefined') {
            const updateHandlers = [];
            target.__defineGetter__('updateHandlers', () => {
                return updateHandlers;
            });
        }
        target.updateHandlers.push(descriptor.value);
    }


}
