import { BlockValidator, IBlockProp } from '@policy-engine/block-validators';

/**
 * Calculate math addon
 */
export class CalculateMathAddon {
    public static readonly blockType: string = 'calculateMathAddon';

    /**
     * Validate block options
     * @param validator
     * @param config
     */
    public static async validate(validator: BlockValidator, ref: IBlockProp): Promise<void> {
        try {
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
