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
            name: 'schema',
            label: 'Schema',
            title: 'Schema',
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
        if (ref.options.schema) {
            filters.schema = ref.options.schema;
        }
        if (Array.isArray(ref.options.filters)) {
            for (const filter of ref.options.filters) {
                const expr = filters[filter.field] || {};
                switch (filter.type) {
                    case 'equal':
                        Object.assign(expr, {
                            $eq: this.getFilterValue(scope, filter.valueType, filter.value)
                        })
                        break;

                    case 'not_equal':
                        Object.assign(expr, {
                            $ne: this.getFilterValue(scope, filter.valueType, filter.value)
                        });
                        break;

                    case 'in':
                        Object.assign(expr, {
                            $in: filter.value.split(',').map((v: string) => {
                                return this.getFilterValue(scope, filter.valueType, v);
                            })
                        });
                        break;

                    case 'not_in':
                        Object.assign(expr, {
                            $nin: filter.value.split(',').map((v: string) => {
                                return this.getFilterValue(scope, filter.valueType, v);
                            })
                        });
                        break;

                    default:
                        throw new BlockActionError(`Unknown filter type: ${filter.type}`, ref.blockType, ref.uuid);
                }
                filters[filter.field] = expr;
            }
        }
        filters.policyId = ref.policyId;

        const data = await ref.databaseServer.getVcDocument(filters);

        if (data) {
            for (const variable of ref.options.variables) {
                scope[variable.name] = PolicyUtils.getObjectValue(data, variable.value);
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
                variables[variable.name] = variable.value;
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
            if (ref.options.filters) {
                for (const filter of ref.options.filters) {
                    if (!filter.field) {
                        resultsContainer.addBlockError(ref.uuid, `Incorrect field: ${filter.field}`);
                        return;
                    }
                    if (!filter.value) {
                        resultsContainer.addBlockError(ref.uuid, `Incorrect filter: ${filter.value}`);
                        return;
                    }
                }
            }
            if (ref.options.variables) {
                for (const variable of ref.options.variables) {
                    if (!variable.value) {
                        resultsContainer.addBlockError(ref.uuid, `Incorrect value: ${variable.value}`);
                        return;
                    }
                }
            }
            if (ref.options.schema) {
                if (typeof ref.options.schema !== 'string') {
                    resultsContainer.addBlockError(ref.uuid, 'Option "schema" must be a string');
                    return;
                }
                const schema = await ref.databaseServer.getSchemaByIRI(ref.options.schema, ref.topicId);
                if (!schema) {
                    resultsContainer.addBlockError(ref.uuid, `Schema with id "${ref.options.schema}" does not exist`);
                    return;
                }
            }
        } catch (error) {
            resultsContainer.addBlockError(ref.uuid, `Unhandled exception ${PolicyUtils.getErrorMessage(error)}`);
        }
    }
}
