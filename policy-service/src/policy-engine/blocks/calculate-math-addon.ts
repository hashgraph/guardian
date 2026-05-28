import { CalculateAddon } from '../helpers/decorators/index.js';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { IPolicyCalculateAddon } from '../policy-engine.interface.js';
import { ChildrenType, ControlType, PropertyType } from '../interfaces/block-about.js';
import { PolicyUser } from '../policy-user.js';
import { ExternalEvent, ExternalEventType } from '../interfaces/external-event.js';
import { LocationType } from '@guardian/interfaces';

/**
 * Calculate math addon
 */
@CalculateAddon({
    blockType: 'calculateMathAddon',
    commonBlock: true,
    actionType: LocationType.LOCAL,
    canMock: false,
    about: {
        label: 'Math Addon',
        title: `Add 'Math' Addon`,
        post: false,
        get: false,
        children: ChildrenType.None,
        control: ControlType.Special,
        input: null,
        output: null,
        defaultEvent: false,
        properties: [{
            name: 'equations',
            label: 'Equations',
            title: 'Equations',
            type: PropertyType.Array,
            editable: true,
            items: {
                label: 'Field',
                value: '@variable = @formula',
                properties: [{
                    name: 'variable',
                    label: 'Variable',
                    title: 'Variable',
                    type: PropertyType.Input,
                    editable: true
                }, {
                    name: 'formula',
                    label: 'Formula',
                    title: 'Formula',
                    type: PropertyType.Input,
                    editable: true
                }]
            }
        }]
    },
    variables: []
})
export class CalculateMathAddon {
    /**
     * Run logic
     * @param scope
     */
    public async run(scope: any, user: PolicyUser): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyCalculateAddon>(this);
        const options = await ref.getOptions(user);

        if (options.equations) {
            for (const equation of options.equations) {
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
