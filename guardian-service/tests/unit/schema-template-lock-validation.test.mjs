import assert from 'node:assert/strict';
import { validateTemplateSchemaUpdateByConfig } from '../../dist/api/schema.service.js';

const schemaDocument = (properties) => ({
    $id: '#schema-1&1.0.0',
    title: 'Schema',
    description: 'Schema',
    type: 'object',
    properties,
    required: [],
    additionalProperties: false,
});

const schema = (overrides = {}) => ({
    name: 'Project',
    description: 'Project schema',
    entity: 'NONE',
    document: schemaDocument({
        field_1: {
            title: 'Field 1',
            description: 'Field 1',
            type: 'string',
            templateFieldId: 'template-field-1',
        },
    }),
    ...overrides,
});

describe('validateTemplateSchemaUpdateByConfig', () => {
    it('rejects schema settings changes when schema settings are locked', () => {
        assert.throws(
            () => validateTemplateSchemaUpdateByConfig(
                schema(),
                schema({ name: 'Changed name' }),
                { schemaSettingsLocked: true }
            ),
            /Schema settings.*locked/
        );
    });

    it('allows schema settings changes when schema settings are not locked', () => {
        assert.doesNotThrow(() => validateTemplateSchemaUpdateByConfig(
            schema(),
            schema({ name: 'Changed name' }),
            { schemaSettingsLocked: false }
        ));
    });

    it('rejects editing a locked template field', () => {
        const next = schema({
            document: schemaDocument({
                field_1: {
                    title: 'Field 1',
                    description: 'Changed',
                    type: 'string',
                    templateFieldId: 'template-field-1',
                },
            }),
        });

        assert.throws(
            () => validateTemplateSchemaUpdateByConfig(schema(), next, {
                fields: {
                    'template-field-1': {
                        locked: true,
                    },
                },
            }),
            /locked by schema template and cannot be edited/
        );
    });

    it('allows editing a template field explicitly unlocked by config', () => {
        const next = schema({
            document: schemaDocument({
                field_1: {
                    title: 'Field 1',
                    description: 'Changed',
                    type: 'string',
                    templateFieldId: 'template-field-1',
                },
            }),
        });

        assert.doesNotThrow(() => validateTemplateSchemaUpdateByConfig(schema(), next, {
            fields: {
                'template-field-1': {
                    locked: false,
                },
            },
        }));
    });

    it('rejects adding a new custom field when custom fields are locked', () => {
        const next = schema({
            document: schemaDocument({
                field_1: {
                    title: 'Field 1',
                    description: 'Field 1',
                    type: 'string',
                    templateFieldId: 'template-field-1',
                },
                custom_field: {
                    title: 'Custom',
                    description: 'Custom',
                    type: 'string',
                },
            }),
        });

        assert.throws(
            () => validateTemplateSchemaUpdateByConfig(schema(), next, {
                customFieldsLocked: true,
            }),
            /does not allow custom fields/
        );
    });

    it('locks a template field when no config entry exists (default-locked)', () => {
        const next = schema({
            document: schemaDocument({
                field_1: {
                    title: 'Field 1',
                    description: 'Changed',
                    type: 'string',
                    templateFieldId: 'template-field-1',
                },
            }),
        });

        assert.throws(
            () => validateTemplateSchemaUpdateByConfig(schema(), next, {}),
            /locked by schema template and cannot be edited/
        );
    });

    it('rejects removing a locked template field', () => {
        const next = schema({
            document: schemaDocument({}),
        });

        assert.throws(
            () => validateTemplateSchemaUpdateByConfig(schema(), next, {
                fields: {
                    'template-field-1': {
                        locked: true,
                    },
                },
            }),
            /locked by schema template and cannot be (edited|removed)/
        );
    });

    it('allows editing an existing custom field even when new custom fields are locked', () => {
        const previous = schema({
            document: schemaDocument({
                field_1: {
                    title: 'Field 1',
                    description: 'Field 1',
                    type: 'string',
                    templateFieldId: 'template-field-1',
                },
                custom_field: {
                    title: 'Custom',
                    description: 'Custom',
                    type: 'string',
                },
            }),
        });
        const next = schema({
            document: schemaDocument({
                field_1: {
                    title: 'Field 1',
                    description: 'Field 1',
                    type: 'string',
                    templateFieldId: 'template-field-1',
                },
                custom_field: {
                    title: 'Custom',
                    description: 'Changed custom',
                    type: 'string',
                },
            }),
        });

        assert.doesNotThrow(() => validateTemplateSchemaUpdateByConfig(previous, next, {
            customFieldsLocked: true,
        }));
    });

    it('rejects condition changes when conditions are locked', () => {
        const withCondition = (trigger) => schema({
            document: {
                ...schemaDocument({
                    field_1: {
                        title: 'Field 1',
                        description: 'Field 1',
                        type: 'string',
                        templateFieldId: 'template-field-1',
                    },
                }),
                allOf: [{
                    if: { properties: { field_1: { const: trigger } }, required: ['field_1'] },
                    then: { properties: { revealed: { title: 'Revealed', description: 'Revealed', type: 'string' } } },
                }],
            },
        });

        assert.throws(
            () => validateTemplateSchemaUpdateByConfig(withCondition('a'), withCondition('b'), {
                conditionsLocked: true,
            }),
            /Conditions.*locked/
        );
    });

    it('allows condition changes when conditions are not locked', () => {
        const withCondition = (trigger) => schema({
            document: {
                ...schemaDocument({
                    field_1: {
                        title: 'Field 1',
                        description: 'Field 1',
                        type: 'string',
                        templateFieldId: 'template-field-1',
                    },
                }),
                allOf: [{
                    if: { properties: { field_1: { const: trigger } }, required: ['field_1'] },
                    then: { properties: { revealed: { title: 'Revealed', description: 'Revealed', type: 'string' } } },
                }],
            },
        });

        assert.doesNotThrow(() => validateTemplateSchemaUpdateByConfig(withCondition('a'), withCondition('b'), {
            conditionsLocked: false,
        }));
    });

    it('allows an unrelated schema settings edit when conditions are locked but conditions themselves are unchanged', () => {
        const document = {
            ...schemaDocument({
                field_1: {
                    title: 'Field 1',
                    description: 'Field 1',
                    type: 'string',
                    templateFieldId: 'template-field-1',
                },
            }),
            allOf: [{
                if: { properties: { field_1: { const: 'a' } }, required: ['field_1'] },
                then: { properties: { revealed: { title: 'Revealed', description: 'Revealed', type: 'string' } } },
            }],
        };

        assert.doesNotThrow(() => validateTemplateSchemaUpdateByConfig(
            schema({ document }),
            schema({ document, name: 'Renamed' }),
            { conditionsLocked: true }
        ));
    });

    it('allows editing an unlocked trigger field when conditions are locked', () => {
        const withCondition = (fieldDescription) => schema({
            document: {
                ...schemaDocument({
                    field_1: {
                        title: 'Field 1',
                        description: fieldDescription,
                        type: 'string',
                        templateFieldId: 'template-field-1',
                    },
                }),
                allOf: [{
                    if: { properties: { field_1: { const: 'a' } }, required: ['field_1'] },
                    then: { properties: { revealed: { title: 'Revealed', description: 'Revealed', type: 'string' } } },
                }],
            },
        });

        assert.doesNotThrow(() => validateTemplateSchemaUpdateByConfig(
            withCondition('Field 1'),
            withCondition('Changed field metadata'),
            {
                conditionsLocked: true,
                fields: {
                    'template-field-1': {
                        locked: false,
                    },
                },
            }
        ));
    });

    it('allows editing a custom branch field when conditions are locked', () => {
        const withCondition = (branchDescription) => schema({
            document: {
                ...schemaDocument({
                    field_1: {
                        title: 'Field 1',
                        description: 'Field 1',
                        type: 'string',
                        templateFieldId: 'template-field-1',
                    },
                    revealed: {
                        title: 'Revealed',
                        description: branchDescription,
                        type: 'string',
                    },
                }),
                allOf: [{
                    if: { properties: { field_1: { const: 'a' } }, required: ['field_1'] },
                    then: { properties: { revealed: { title: 'Revealed', description: branchDescription, type: 'string' } } },
                }],
            },
        });

        assert.doesNotThrow(() => validateTemplateSchemaUpdateByConfig(
            withCondition('Revealed'),
            withCondition('Changed custom field metadata'),
            {
                conditionsLocked: true,
                customFieldsLocked: false,
                fields: {
                    'template-field-1': {
                        locked: false,
                    },
                },
            }
        ));
    });

    it('rejects branch membership changes when conditions are locked', () => {
        const withCondition = (thenProperties) => schema({
            document: {
                ...schemaDocument({
                    field_1: {
                        title: 'Field 1',
                        description: 'Field 1',
                        type: 'string',
                        templateFieldId: 'template-field-1',
                    },
                    revealed: {
                        title: 'Revealed',
                        description: 'Revealed',
                        type: 'string',
                    },
                    other: {
                        title: 'Other',
                        description: 'Other',
                        type: 'string',
                    },
                }),
                allOf: [{
                    if: { properties: { field_1: { const: 'a' } }, required: ['field_1'] },
                    then: { properties: thenProperties },
                }],
            },
        });

        assert.throws(
            () => validateTemplateSchemaUpdateByConfig(
                withCondition({ revealed: { title: 'Revealed', description: 'Revealed', type: 'string' } }),
                withCondition({
                    revealed: { title: 'Revealed', description: 'Revealed', type: 'string' },
                    other: { title: 'Other', description: 'Other', type: 'string' },
                }),
                {
                    conditionsLocked: true,
                    customFieldsLocked: false,
                    fields: {
                        'template-field-1': {
                            locked: false,
                        },
                    },
                }
            ),
            /Conditions.*locked/
        );
    });

});
