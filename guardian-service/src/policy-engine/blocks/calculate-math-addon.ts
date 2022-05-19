import { CalculateAddon } from '@policy-engine/helpers/decorators';
import { PolicyValidationResultsContainer } from '@policy-engine/policy-validation-results-container';
import { PolicyComponentsUtils } from '../policy-components-utils';
import { IPolicyCalculateAddon } from '@policy-engine/policy-engine.interface';
import { ChildrenType, ControlType } from '@policy-engine/interfaces/block-about';

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

    public async run(scope: any): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyCalculateAddon>(this);
        if (ref.options.equations) {
            for (let index = 0; index < ref.options.equations.length; index++) {
                const equation = ref.options.equations[index];
                scope[equation.variable] = ref.evaluate(equation.formula, scope);
            }
        }
        return scope;
    }

    public getVariables(variables: any): any {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyCalculateAddon>(this);
        if (ref.options.equations) {
            for (let index = 0; index < ref.options.equations.length; index++) {
                const equation = ref.options.equations[index];
                variables[equation.variable] = equation.formula;
            }
        }
        return variables;
    }

    public async validate(resultsContainer: PolicyValidationResultsContainer): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyCalculateAddon>(this);
        try {
            if (ref.options.equations) {
                for (let index = 0; index < ref.options.equations.length; index++) {
                    const equation = ref.options.equations[index];
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
