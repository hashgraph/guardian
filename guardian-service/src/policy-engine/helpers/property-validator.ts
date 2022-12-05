/**
 * Property Validator
 */
export class PropertyValidator {
    /**
     * Select Type Validator
     * @param name
     * @param value
     * @param requirements
     */
    public static selectValidator(name: string, value: string, requirements: any[]): string {
        if (!requirements.find(item => item === value)) {
            return `Option "${name}" must be one of ${requirements.join(',')}`;
        }
        return null;
    }

    /**
     * Select Type Validator
     * @param name
     * @param value
     * @param type
     */
    public static inputValidator(name: string, value: string, type?: string): string {
        if (!value) {
            return `Option "${name}" does not set`;
        }
        if (type && typeof value !== 'string') {
            return `Option "${name}" must be a ${type}`;
        }
        return null;
    }
}