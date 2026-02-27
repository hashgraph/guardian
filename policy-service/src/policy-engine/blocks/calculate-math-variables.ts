import { CalculateAddon } from '../helpers/decorators/index.js';
import { PolicyComponentsUtils } from '../policy-components-utils.js';
import { IPolicyCalculateAddon } from '../policy-engine.interface.js';
import { ChildrenType, ControlType, PropertyType } from '../interfaces/block-about.js';
import { PolicyUtils } from '../helpers/utils.js';
import { BlockActionError } from '../errors/index.js';
import { PolicyUser } from '../policy-user.js';
import { ExternalEvent, ExternalEventType } from '../interfaces/external-event.js';
import { LocationType } from '@guardian/interfaces';

/**
 * Calculate math Variables
 */
@CalculateAddon({
    blockType: 'calculateMathVariables',
    commonBlock: true,
    actionType: LocationType.LOCAL,
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
            type: PropertyType.Schemas,
            editable: false
        }, {
            name: 'onlyOwnDocuments',
            label: 'Owned by User',
            title: 'Owned by User',
            type: PropertyType.Checkbox,
            editable: true
        }, {
            name: 'onlyOwnByGroupDocuments',
            label: 'Owned by Group',
            title: 'Owned by Group',
            type: PropertyType.Checkbox,
            editable: true
        }, {
            name: 'onlyAssignDocuments',
            label: 'Assigned to User',
            title: 'Assigned to User',
            type: PropertyType.Checkbox,
            editable: true
        }, {
            name: 'onlyAssignByGroupDocuments',
            label: 'Assigned to Group',
            title: 'Assigned to Group',
            type: PropertyType.Checkbox,
            editable: true
        }, {
            name: 'selectors',
            label: 'Selectors',
            title: 'Selectors',
            type: PropertyType.Array,
            editable: true,
            items: {
                label: 'Selector',
                value: '@sourceField @selectorType @comparisonValue',
                properties: [{
                    name: 'sourceField',
                    label: 'Source field',
                    title: 'Source field',
                    type: PropertyType.Path,
                    editable: true
                }, {
                    name: 'selectorType',
                    label: 'Selector type',
                    title: 'Selector type',
                    type: PropertyType.Select,
                    editable: true,
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
                    type: PropertyType.Input,
                    editable: true
                }, {
                    name: 'comparisonValueType',
                    label: 'Comparison value type',
                    title: 'Comparison value type',
                    type: PropertyType.Select,
                    editable: true,
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
            editable: true,
            items: {
                label: 'Variable',
                value: 'var @variableName = @variablePath',
                properties: [{
                    name: 'variableName',
                    label: 'Variable name',
                    title: 'Variable name',
                    type: PropertyType.Input,
                    editable: true
                }, {
                    name: 'variablePath',
                    label: 'Variable Path',
                    title: 'Variable Path',
                    type: PropertyType.Path,
                    editable: true
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
        const options = ref.getOptions(user);
        
        const filters: any = {};
        if (options.onlyOwnDocuments) {
            filters.owner = user.did;
        }
        if (options.onlyOwnByGroupDocuments) {
            filters.group = user.group;
        }
        if (options.onlyAssignDocuments) {
            filters.assignedTo = user.did;
        }
        if (options.onlyAssignByGroupDocuments) {
            filters.assignedToGroup = user.group;
        }
        if (options.sourceSchema) {
            filters.schema = options.sourceSchema;
        }
        if (Array.isArray(options.selectors)) {
            for (const selector of options.selectors) {
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
            for (const variable of options.variables) {
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
    public options(variables: any): any {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyCalculateAddon>(this);
        const options = ref.getOptions();

        if (options.variables) {
            for (const variable of options.variables) {
                variables[variable.variableName] = variable.variablePath;
            }
        }
        return variables;
    }
}
