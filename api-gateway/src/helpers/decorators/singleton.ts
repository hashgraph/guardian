const SINGLETON_KEY = Symbol();

type Singleton<T extends new (...args: any[]) => any> = T & {
    [SINGLETON_KEY]: T extends new (...args: any[]) => infer I ? I : never
};

/**
 * Sungleton class decorator
 * @param constructor
 */
export const Singleton = <T extends new (...args: any[]) => any>(constructor: T) =>
    new Proxy(constructor, {
        construct(target: Singleton<T>, argsList, newTarget) {
            if (target.prototype !== newTarget.prototype) {
                return Reflect.construct(target, argsList, newTarget);
            }
            if (!target[SINGLETON_KEY]) {
                target[SINGLETON_KEY] = Reflect.construct(target, argsList, newTarget);
            }
            return target[SINGLETON_KEY];
        }
    });
