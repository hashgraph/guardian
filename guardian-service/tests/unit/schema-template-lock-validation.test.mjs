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
});
