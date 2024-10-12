import { BlockValidator, IBlockProp } from '../../block-validators/index.js';
import { CommonBlock } from './common.js';

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
            await CommonBlock.validate(validator, ref);
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
            validator.checkBlockError(
                validator.validateSchemaVariable('sourceSchema', ref.options.sourceSchema, false)
            );
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
