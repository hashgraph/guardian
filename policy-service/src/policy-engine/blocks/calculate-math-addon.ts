import { CalculateAddon } from '@policy-engine/helpers/decorators';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { IPolicyCalculateAddon } from '@policy-engine/policy-engine.interface';
import { ChildrenType, ControlType } from '@policy-engine/interfaces/block-about';
import { IPolicyUser } from '@policy-engine/policy-user';
import { ExternalEvent, ExternalEventType } from '@policy-engine/interfaces/external-event';

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
    },
    variables: []
})
export class CalculateMathAddon {
    /**
     * Run logic
     * @param scope
     */
    public async run(scope: any, user: IPolicyUser): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyCalculateAddon>(this);
        if (ref.options.equations) {
            for (const equation of ref.options.equations) {
                scope[equation.variable] = ref.evaluate(equation.formula, scope);
            }
        }
        PolicyComponentsUtils.ExternalEventFn(new ExternalEvent(ExternalEventType.Run, ref, user, {
            scope
        }));
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
}
