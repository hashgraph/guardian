import { BlockValidator, IBlockProp } from '@policy-engine/block-validators';

/**
 * Calculate math Variables
 */
export class CalculateMathVariables {
    /**
     * Block type
     */
    public static readonly blockType: string = 'calculateMathVariables';

    /**
     * Validate block options
     * @param validator
     * @param config
     */
    public static async validate(validator: BlockValidator, ref: IBlockProp): Promise<void> {
        try {
            if (ref.options.selectors) {
                for (const filter of ref.options.selectors) {
                    if (!filter.sourceField) {
                        validator.addError(`Incorrect Source Field: ${filter.sourceField}`);
                        return;
                    }
                    if (!filter.comparisonValue) {
                        validator.addError(`Incorrect filter: ${filter.comparisonValue}`);
                        return;
                    }
                }
            }
            if (ref.options.variables) {
                for (const variable of ref.options.variables) {
                    if (!variable.variablePath) {
                        validator.addError(`Incorrect Variable Path: ${variable.variablePath}`);
                        return;
                    }
                }
            }
            if (ref.options.sourceSchema) {
                if (typeof ref.options.sourceSchema !== 'string') {
                    validator.addError('Option "sourceSchema" must be a string');
                    return;
                }
                if (await validator.schemaNotExist(ref.options.sourceSchema)) {
                    validator.addError(`Schema with id "${ref.options.sourceSchema}" does not exist`);
                    return;
                }
            }
        } catch (error) {
            validator.addError(`Unhandled exception ${validator.getErrorMessage(error)}`);
        }
    }

    /**
     * Get variables
     * @param ref
     * @param variables
     */
    public static getVariables(ref: IBlockProp, variables: any): any {
        if (ref.options.variables) {
            for (const variable of ref.options.variables) {
                variables[variable.variableName] = variable.variablePath;
            }
        }
        return variables;
    }
}
