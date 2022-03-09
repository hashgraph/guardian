import { CalculateAddon } from '@policy-engine/helpers/decorators';
import { PolicyValidationResultsContainer } from '@policy-engine/policy-validation-results-container';
import { PolicyComponentsUtils } from '../policy-components-utils';
import { IPolicyCalculateAddon } from '@policy-engine/policy-engine.interface';

@CalculateAddon({
    blockType: 'calculateMathAddon',
    commonBlock: true
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
        if (ref.options.equations) {
            for (let index = 0; index < ref.options.equations.length; index++) {
                const equation = ref.options.equations[index];
                if(!ref.parse(equation.formula)) {
                    resultsContainer.addBlockError(ref.uuid, `Incorrect formula: ${equation.formula}`);
                    return;
                }
            }
        }
    }
}
