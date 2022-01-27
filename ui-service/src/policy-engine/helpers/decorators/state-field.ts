export function StateField() {
    return function (target: any, propertyKey: string) {
        let value: any;

        const getter = function() {
            return value;
        }

        const setter = function(v: any) {
            value = v;
            console.log('set state', this.uuid, propertyKey, value);
        }

        Object.defineProperty(target, propertyKey, {
            get: getter,
            set: setter
        })
    }
}
