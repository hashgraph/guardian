import { Singleton } from '@guardian/common';

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
        return this.container.get(name);
    }
}
