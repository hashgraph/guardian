import { BlockValidator, IBlockProp } from '../../block-validators/index.js';
import { CommonBlock } from './common.js';

/**
 * Calculate math addon
 */
export class CalculateMathAddon {
    /**
     * Block type
     */
    public static readonly blockType: string = 'calculateMathAddon';

    /**
     * Validate block options
     * @param validator
     * @param config
     */
    public static async validate(validator: BlockValidator, ref: IBlockProp): Promise<void> {
        try {
            await CommonBlock.validate(validator, ref);
            if (ref.options.equations) {
                for (const equation of ref.options.equations) {
                    if (!validator.validateFormula(equation.formula)) {
                        validator.addError(`Incorrect formula: ${equation.formula}`);
                        return;
                    }
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
        if (ref.options.equations) {
            for (const equation of ref.options.equations) {
                variables[equation.variable] = equation.formula;
            }
        }
        return variables;
    }
}
