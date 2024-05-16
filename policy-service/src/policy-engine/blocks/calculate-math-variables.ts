import { CalculateAddon } from '../helpers/decorators/index.js';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { IPolicyCalculateAddon } from '../policy-engine.interface.js';
import { ChildrenType, ControlType, PropertyType } from '../interfaces/block-about.js';
import { PolicyUtils } from '../helpers/utils.js';
import { BlockActionError } from '../errors/index.js';
import { PolicyUser } from '../policy-user.js';
import { ExternalEvent, ExternalEventType } from '../interfaces/external-event.js';

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
            name: 'sourceSchema',
            label: 'Source schema',
            title: 'Source schema',
            type: PropertyType.Schemas
        }, {
            name: 'onlyOwnDocuments',
            label: 'Owned by User',
            title: 'Owned by User',
            type: PropertyType.Checkbox
        }, {
            name: 'onlyOwnByGroupDocuments',
            label: 'Owned by Group',
            title: 'Owned by Group',
            type: PropertyType.Checkbox
        }, {
            name: 'onlyAssignDocuments',
            label: 'Assigned to User',
            title: 'Assigned to User',
            type: PropertyType.Checkbox
        }, {
            name: 'onlyAssignByGroupDocuments',
            label: 'Assigned to Group',
            title: 'Assigned to Group',
            type: PropertyType.Checkbox
        }, {
            name: 'selectors',
            label: 'Selectors',
            title: 'Selectors',
            type: PropertyType.Array,
            items: {
                label: 'Selector',
                value: '@sourceField @selectorType @comparisonValue',
                properties: [{
                    name: 'sourceField',
                    label: 'Source field',
                    title: 'Source field',
                    type: PropertyType.Path
                }, {
                    name: 'selectorType',
                    label: 'Selector type',
                    title: 'Selector type',
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
                    name: 'comparisonValue',
                    label: 'Comparison value',
                    title: 'Comparison value',
                    type: PropertyType.Input
                }, {
                    name: 'comparisonValueType',
                    label: 'Comparison value type',
                    title: 'Comparison value type',
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
                value: 'var @variableName = @variablePath',
                properties: [{
                    name: 'variableName',
                    label: 'Variable name',
                    title: 'Variable name',
                    type: PropertyType.Input
                }, {
                    name: 'variablePath',
                    label: 'Variable Path',
                    title: 'Variable Path',
                    type: PropertyType.Path
                }]
            }
        }]
    },
    variables: []
})
export class CalculateMathVariables {
    /**
     * Run logic
     * @param scope
     */
    public getFilterValue(scope: any, type: string, value: string): any {
        if (type === 'var') {
            return scope[value];
        } else {
            return value;
        }
    }

    /**
     * Run logic
     * @param scope
     */
    public async run(scope: any, user: PolicyUser): Promise<any> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyCalculateAddon>(this);

        const filters: any = {};
        if (ref.options.onlyOwnDocuments) {
            filters.owner = user.did;
        }
        if (ref.options.onlyOwnByGroupDocuments) {
            filters.group = user.group;
        }
        if (ref.options.onlyAssignDocuments) {
            filters.assignedTo = user.did;
        }
        if (ref.options.onlyAssignByGroupDocuments) {
            filters.assignedToGroup = user.group;
        }
        if (ref.options.sourceSchema) {
            filters.schema = ref.options.sourceSchema;
        }
        if (Array.isArray(ref.options.selectors)) {
            for (const selector of ref.options.selectors) {
                const expr = filters[selector.sourceField] || {};
                switch (selector.selectorType) {
                    case 'equal':
                        Object.assign(expr, {
                            $eq: this.getFilterValue(scope, selector.comparisonValueType, selector.comparisonValue)
                        })
                        break;

                    case 'not_equal':
                        Object.assign(expr, {
                            $ne: this.getFilterValue(scope, selector.comparisonValueType, selector.comparisonValue)
                        });
                        break;

                    case 'in':
                        Object.assign(expr, {
                            $in: selector.comparisonValue.split(',').map((v: string) => {
                                return this.getFilterValue(scope, selector.comparisonValueType, v);
                            })
                        });
                        break;

                    case 'not_in':
                        Object.assign(expr, {
                            $nin: selector.comparisonValue.split(',').map((v: string) => {
                                return this.getFilterValue(scope, selector.comparisonValueType, v);
                            })
                        });
                        break;

                    default:
                        throw new BlockActionError(`Unknown filter type: ${selector.selectorType}`, ref.blockType, ref.uuid);
                }
                filters[selector.sourceField] = expr;
            }
        }
        filters.policyId = ref.policyId;

        const data = await ref.databaseServer.getVcDocument(filters);

        if (data) {
            for (const variable of ref.options.variables) {
                scope[variable.variableName] = PolicyUtils.getObjectValue(data, variable.variablePath);
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
        if (ref.options.variables) {
            for (const variable of ref.options.variables) {
                variables[variable.variableName] = variable.variablePath;
            }
        }
        return variables;
    }
}
