import { CalculateAddon } from '@policy-engine/helpers/decorators';
import { PolicyValidationResultsContainer } from '@policy-engine/policy-validation-results-container';
import { PolicyComponentsUtils } from '@policy-engine/policy-components-utils';
import { IPolicyCalculateAddon } from '@policy-engine/policy-engine.interface';
import { ChildrenType, ControlType, PropertyType } from '@policy-engine/interfaces/block-about';
import { PolicyUtils } from '@policy-engine/helpers/utils';
import { BlockActionError } from '@policy-engine/errors';
import { IPolicyUser } from '@policy-engine/policy-user';

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
    }
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
    public async run(scope: any, user: IPolicyUser): Promise<any> {
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

    /**
     * Validate block options
     * @param resultsContainer
     */
    public async validate(resultsContainer: PolicyValidationResultsContainer): Promise<void> {
        const ref = PolicyComponentsUtils.GetBlockRef<IPolicyCalculateAddon>(this);
        try {
            if (ref.options.selectors) {
                for (const filter of ref.options.selectors) {
                    if (!filter.sourceField) {
                        resultsContainer.addBlockError(ref.uuid, `Incorrect Source Field: ${filter.sourceField}`);
                        return;
                    }
                    if (!filter.comparisonValue) {
                        resultsContainer.addBlockError(ref.uuid, `Incorrect filter: ${filter.comparisonValue}`);
                        return;
                    }
                }
            }
            if (ref.options.variables) {
                for (const variable of ref.options.variables) {
                    if (!variable.variablePath) {
                        resultsContainer.addBlockError(ref.uuid, `Incorrect Variable Path: ${variable.variablePath}`);
                        return;
                    }
                }
            }
            if (ref.options.sourceSchema) {
                if (typeof ref.options.sourceSchema !== 'string') {
                    resultsContainer.addBlockError(ref.uuid, 'Option "sourceSchema" must be a string');
                    return;
                }
                const sourceSchema = await ref.databaseServer.getSchemaByIRI(ref.options.sourceSchema, ref.topicId);
                if (!sourceSchema) {
                    resultsContainer.addBlockError(ref.uuid, `Schema with id "${ref.options.sourceSchema}" does not exist`);
                    return;
                }
            }
        } catch (error) {
            resultsContainer.addBlockError(ref.uuid, `Unhandled exception ${PolicyUtils.getErrorMessage(error)}`);
        }
    }
}
