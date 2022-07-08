import { CalculateAddon } from '@policy-engine/helpers/decorators';
import { PolicyValidationResultsContainer } from '@policy-engine/policy-validation-results-container';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { IPolicyCalculateAddon } from '@policy-engine/policy-engine.interface';
import { ChildrenType, ControlType } from '@policy-engine/interfaces/block-about';

/**
 * Calculate math addon
 */
@CalculateAddon({
    blockType: 'calculateMathAddon',
    commonBlock: true,
    about: {
        label: 'Math Addon',
        title: `Add 'Math' Addon`,
        post: false,
        get: false,
        children: ChildrenType.None,
        control: ControlType.Special,
        input: null,
        output: null,
        defaultEvent: false
    }
})
export class CalculateMathAddon {

    /**
     * Run logic
     * @param scope
     */
    public async run(scope: any): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyCalculateAddon>(this);
        if (ref.options.equations) {
            for (const equation of ref.options.equations) {
                scope[equation.variable] = ref.evaluate(equation.formula, scope);
            }
        }
        return scope;
    }

    /**
     * Get variables
     * @param variables
     */
    public getVariables(variables: any): any {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyCalculateAddon>(this);
        if (ref.options.equations) {
            for (const equation of ref.options.equations) {
                variables[equation.variable] = equation.formula;
            }
        }
        return variables;
    }

    /**
     * Validate block options
     * @param resultsContainer
     */
    public async validate(resultsContainer: PolicyValidationResultsContainer): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyCalculateAddon>(this);
        try {
            if (ref.options.equations) {
                for (const equation of ref.options.equations.length) {
                    if (!ref.parse(equation.formula)) {
                        resultsContainer.addBlockError(ref.uuid, `Incorrect formula: ${equation.formula}`);
                        return;
                    }
                }
            }
        } catch (error) {
            resultsContainer.addBlockError(ref.uuid, `Unhandled exception ${error.message}`);
        }
    }
}
