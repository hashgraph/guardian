import { Singleton } from '../decorators/singleton.js';

/**
 * Common variables
 */
@Singleton
export class CommonVariables {

    /**
     * Variables container
     */
    private readonly container = new Map<string, any>();

    /**
     * Set variable
     * @param name
     * @param value
     */
    public setVariable(name: string, value: any): void {
        this.container.set(name, value);
    }

    /**
     * Get variable
     */
    public getVariable(name: string): any {
        const result = this.container.get(name);
        return result;
    }
}
