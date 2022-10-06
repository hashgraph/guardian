import { CalculateAddon } from '@policy-engine/helpers/decorators';
import { PolicyValidationResultsContainer } from '@policy-engine/policy-validation-results-container';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { IPolicyCalculateAddon } from '@policy-engine/policy-engine.interface';
import { ChildrenType, ControlType, PropertyType } from '@policy-engine/interfaces/block-about';
import { PolicyUtils } from '@policy-engine/helpers/utils';

/**
 * Calculate math Variables
 */
@CalculateAddon({
    blockType: 'calculateMathVariables',
    commonBlock: true,
    about: {
        label: 'Math Variables',
        title: `Add 'Math' Variables`,
        post: false,
        get: false,
        children: ChildrenType.None,
        control: ControlType.Special,
        input: null,
        output: null,
        defaultEvent: false,
        properties: [{
            name: 'schema',
            label: 'Schema',
            title: 'Schema',
            type: PropertyType.Schemas
        }, {
            name: 'filters',
            label: 'Filters',
            title: 'Filters',
            type: PropertyType.Array,
            items: {
                label: 'Filter',
                value: '@field @type @value',
                properties: [{
                    name: 'field',
                    label: 'Field',
                    title: 'Field',
                    type: PropertyType.Path
                }, {
                    name: 'type',
                    label: 'Type',
                    title: 'Type',
                    type: PropertyType.Select,
                    items: [{
                        label: 'Equal',
                        value: 'equal'
                    }, {
                        label: 'Not Equal',
                        value: 'not_equal'
                    }, {
                        label: 'In',
                        value: 'in'
                    }, {
                        label: 'Not In',
                        value: 'not_in'
                    }],
                    default: 'equal'
                }, {
                    name: 'value',
                    label: 'Value',
                    title: 'Value',
                    type: PropertyType.Input
                }, {
                    name: 'valueType',
                    label: 'Value Type',
                    title: 'Value Type',
                    type: PropertyType.Select,
                    items: [{
                        label: 'Constanta',
                        value: 'const'
                    }, {
                        label: 'Variable',
                        value: 'var'
                    }],
                    default: 'const'
                }]
            }
        }, {
            name: 'variables',
            label: 'Variables',
            title: 'Variables',
            type: PropertyType.Array,
            items: {
                label: 'Variable',
                value: 'var @name = @value',
                properties: [{
                    name: 'name',
                    label: 'Variable name',
                    title: 'Variable name',
                    type: PropertyType.Input
                }, {
                    name: 'value',
                    label: 'Variable Path',
                    title: 'Variable Path',
                    type: PropertyType.Path
                }]
            }
        }]
    }
})
export class CalculateMathVariables {
    /**
     * Run logic
     * @param scope
     */
    public async run(scope: any): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyCalculateAddon>(this);


        // if (ref.options.equations) {
        //     for (const equation of ref.options.equations) {
        //         scope[equation.variable] = ref.evaluate(equation.formula, scope);
        //     }
        // }

        return scope;
    }

    /**
     * Get variables
     * @param variables
     */
    public getVariables(variables: any): any {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyCalculateAddon>(this);

        // if (ref.options.equations) {
        //     for (const equation of ref.options.equations) {
        //         variables[equation.variable] = equation.formula;
        //     }
        // }

        return variables;
    }

    /**
     * Validate block options
     * @param resultsContainer
     */
    public async validate(resultsContainer: PolicyValidationResultsContainer): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyCalculateAddon>(this);
        try {

        } catch (error) {
            resultsContainer.addBlockError(ref.uuid, `Unhandled exception ${PolicyUtils.getErrorMessage(error)}`);
        }
    }
}
