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

    it('allows editing an existing condition\'s trigger value when conditionsLocked is true (whole-category lock only blocks adding new conditions)', () => {
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
            conditionsLocked: true,
        }));
    });

    it('rejects adding a brand-new condition when conditionsLocked is true', () => {
        const withConditions = (count) => schema({
            document: {
                ...schemaDocument({
                    field_1: {
                        title: 'Field 1',
                        description: 'Field 1',
                        type: 'string',
                        templateFieldId: 'template-field-1',
                    },
                    field_2: {
                        title: 'Field 2',
                        description: 'Field 2',
                        type: 'string',
                        templateFieldId: 'template-field-2',
                    },
                }),
                allOf: [
                    { if: { properties: { field_1: { const: 'a' } }, required: ['field_1'] }, then: { properties: { revealed: { title: 'Revealed', description: 'Revealed', type: 'string' } } } },
                    ...(count > 1 ? [{ if: { properties: { field_2: { const: 'x' } }, required: ['field_2'] }, then: { properties: { revealed2: { title: 'Revealed2', description: 'Revealed2', type: 'string' } } } }] : []),
                ],
            },
        });

        assert.throws(
            () => validateTemplateSchemaUpdateByConfig(withConditions(1), withConditions(2), {
                conditionsLocked: true,
            }),
            /does not allow new conditions/
        );
    });

    it('allows adding a brand-new condition when conditionsLocked is false', () => {
        const withConditions = (count) => schema({
            document: {
                ...schemaDocument({
                    field_1: {
                        title: 'Field 1',
                        description: 'Field 1',
                        type: 'string',
                        templateFieldId: 'template-field-1',
                    },
                    field_2: {
                        title: 'Field 2',
                        description: 'Field 2',
                        type: 'string',
                        templateFieldId: 'template-field-2',
                    },
                }),
                allOf: [
                    { if: { properties: { field_1: { const: 'a' } }, required: ['field_1'] }, then: { properties: { revealed: { title: 'Revealed', description: 'Revealed', type: 'string' } } } },
                    ...(count > 1 ? [{ if: { properties: { field_2: { const: 'x' } }, required: ['field_2'] }, then: { properties: { revealed2: { title: 'Revealed2', description: 'Revealed2', type: 'string' } } } }] : []),
                ],
            },
        });

        assert.doesNotThrow(() => validateTemplateSchemaUpdateByConfig(withConditions(1), withConditions(2), {
            conditionsLocked: false,
        }));
    });

    it('allows an operator change on an individually-unlocked condition even when conditionsLocked is true', () => {
        // Count stays at 1 - this is an edit to the one existing condition, not an addition,
        // even though changing SINGLE->AND also changes its trigger field set.
        const singleVariant = schema({
            document: {
                ...schemaDocument({
                    field_1: {
                        title: 'Field 1',
                        description: 'Field 1',
                        type: 'string',
                        templateFieldId: 'template-field-1',
                    },
                    field_2: {
                        title: 'Field 2',
                        description: 'Field 2',
                        type: 'string',
                        templateFieldId: 'template-field-2',
                    },
                }),
                allOf: [{
                    if: { properties: { field_1: { const: 'a' } }, required: ['field_1'] },
                    then: { properties: { revealed: { title: 'Revealed', description: 'Revealed', type: 'string' } } },
                }],
            },
        });
        const andVariant = schema({
            document: {
                ...schemaDocument({
                    field_1: {
                        title: 'Field 1',
                        description: 'Field 1',
                        type: 'string',
                        templateFieldId: 'template-field-1',
                    },
                    field_2: {
                        title: 'Field 2',
                        description: 'Field 2',
                        type: 'string',
                        templateFieldId: 'template-field-2',
                    },
                }),
                allOf: [{
                    if: {
                        allOf: [
                            { properties: { field_1: { const: 'a' } }, required: ['field_1'] },
                            { properties: { field_2: { const: 'x' } }, required: ['field_2'] },
                        ],
                    },
                    then: { properties: { revealed: { title: 'Revealed', description: 'Revealed', type: 'string' } } },
                }],
            },
        });

        assert.doesNotThrow(() => validateTemplateSchemaUpdateByConfig(singleVariant, andVariant, {
            conditionsLocked: true,
            conditions: { 'SINGLE,template-field-1:"a"': { locked: false } },
        }));
    });

    it('allows removing an existing condition entirely when conditionsLocked is true (add-only, not a removal lock)', () => {
        const withCondition = (present) => schema({
            document: {
                ...schemaDocument({
                    field_1: {
                        title: 'Field 1',
                        description: 'Field 1',
                        type: 'string',
                        templateFieldId: 'template-field-1',
                    },
                }),
                allOf: present ? [{
                    if: { properties: { field_1: { const: 'a' } }, required: ['field_1'] },
                    then: { properties: { revealed: { title: 'Revealed', description: 'Revealed', type: 'string' } } },
                }] : [],
            },
        });

        assert.doesNotThrow(() => validateTemplateSchemaUpdateByConfig(withCondition(true), withCondition(false), {
            conditionsLocked: true,
        }));
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

    it('allows a new branch field when conditionsLocked is true but customFieldsLocked is false (branch fields are governed by customFieldsLocked, not conditionsLocked)', () => {
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

        assert.doesNotThrow(() => validateTemplateSchemaUpdateByConfig(
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
        ));
    });

    it('rejects a new branch field when customFieldsLocked is true, regardless of conditionsLocked', () => {
        // `other` must be absent from the root `properties` in `previous` entirely - present
        // in both (even only inside `then`) would make it already-known to
        // customFieldsLocked's path-based "already existed" check, which defeats the point of
        // this test (it would stop exercising field *addition* and silently start exercising
        // branch-membership-visibility instead, a different, unrelated concern).
        const withCondition = (includeOther) => schema({
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
                    ...(includeOther ? {
                        other: {
                            title: 'Other',
                            description: 'Other',
                            type: 'string',
                        },
                    } : {}),
                }),
                allOf: [{
                    if: { properties: { field_1: { const: 'a' } }, required: ['field_1'] },
                    then: {
                        properties: {
                            revealed: { title: 'Revealed', description: 'Revealed', type: 'string' },
                            ...(includeOther ? { other: { title: 'Other', description: 'Other', type: 'string' } } : {}),
                        },
                    },
                }],
            },
        });

        assert.throws(
            () => validateTemplateSchemaUpdateByConfig(
                withCondition(false),
                withCondition(true),
                {
                    conditionsLocked: false,
                    customFieldsLocked: true,
                    fields: {
                        'template-field-1': {
                            locked: false,
                        },
                    },
                }
            ),
            /does not allow custom fields/
        );
    });

});

// Per-condition lock, independent of the whole-tab `conditionsLocked` toggle. Keyed by
// `SchemaHelper.getConditionTriggerSignature(condition).join(',')`. Scope is structure only:
// trigger field(s), operator, and the condition's own existence - not its then/else branch
// fields, which keep using the existing per-field lock.
describe('validateTemplateSchemaUpdateByConfig — per-condition lock', () => {
    const withConditions = (conditions) => schema({
        document: {
            ...schemaDocument({
                field_1: {
                    title: 'Field 1',
                    description: 'Field 1',
                    type: 'string',
                    templateFieldId: 'template-field-1',
                },
                field_2: {
                    title: 'Field 2',
                    description: 'Field 2',
                    type: 'string',
                    templateFieldId: 'template-field-2',
                },
            }),
            allOf: conditions,
        },
    });

    const singleCondition = (trigger, value) => ({
        if: { properties: { [trigger]: { const: value } }, required: [trigger] },
        then: { properties: { revealed: { title: 'Revealed', description: 'Revealed', type: 'string' } } },
    });

    // Signature for { field_1 const 'a' }: ['SINGLE', 'template-field-1:"a"'].join(',')
    const lockedSignature = 'SINGLE,template-field-1:"a"';

    it('rejects a locked condition\'s trigger value changing (the condition no longer matches by signature)', () => {
        const previous = withConditions([singleCondition('field_1', 'a')]);
        const next = withConditions([singleCondition('field_1', 'b')]);

        assert.throws(
            () => validateTemplateSchemaUpdateByConfig(previous, next, {
                conditionsLocked: false,
                conditions: { [lockedSignature]: { locked: true } },
            }),
            /[Cc]ondition.*locked/
        );
    });

    it('rejects a locked condition\'s operator changing from SINGLE to AND', () => {
        const previous = withConditions([singleCondition('field_1', 'a')]);
        const next = withConditions([{
            if: {
                allOf: [
                    { properties: { field_1: { const: 'a' } }, required: ['field_1'] },
                    { properties: { field_2: { const: 'x' } }, required: ['field_2'] },
                ],
            },
            then: { properties: { revealed: { title: 'Revealed', description: 'Revealed', type: 'string' } } },
        }]);

        assert.throws(
            () => validateTemplateSchemaUpdateByConfig(previous, next, {
                conditionsLocked: false,
                conditions: { [lockedSignature]: { locked: true } },
            }),
            /[Cc]ondition.*locked/
        );
    });

    it('rejects removing a locked condition entirely', () => {
        const previous = withConditions([singleCondition('field_1', 'a')]);
        const next = withConditions([]);

        assert.throws(
            () => validateTemplateSchemaUpdateByConfig(previous, next, {
                conditionsLocked: false,
                conditions: { [lockedSignature]: { locked: true } },
            }),
            /[Cc]ondition.*locked/
        );
    });

    it('allows editing a different, unlocked condition even when another condition in the same schema is individually locked', () => {
        const previous = withConditions([
            singleCondition('field_1', 'a'),
            singleCondition('field_2', 'x'),
        ]);
        const next = withConditions([
            singleCondition('field_1', 'a'),
            singleCondition('field_2', 'y'),
        ]);

        assert.doesNotThrow(() => validateTemplateSchemaUpdateByConfig(previous, next, {
            conditionsLocked: false,
            conditions: { [lockedSignature]: { locked: true } },
        }));
    });

    it('allows unrelated schema edits when a condition is individually locked but that condition is unchanged', () => {
        const document = {
            ...schemaDocument({
                field_1: {
                    title: 'Field 1',
                    description: 'Field 1',
                    type: 'string',
                    templateFieldId: 'template-field-1',
                },
            }),
            allOf: [singleCondition('field_1', 'a')],
        };

        assert.doesNotThrow(() => validateTemplateSchemaUpdateByConfig(
            schema({ document }),
            schema({ document, name: 'Renamed' }),
            {
                conditionsLocked: false,
                conditions: { [lockedSignature]: { locked: true } },
            }
        ));
    });

    // The trigger signature ignores `comparator` ('equals' vs 'contains' - two conditions
    // with the same field+value can mean different things), so a comparator-only change must
    // be caught by the structural hash instead.
    it('rejects a locked condition\'s comparator changing with its field/value unchanged', () => {
        const arrayTrigger = (comparator) => schema({
            document: {
                ...schemaDocument({
                    field_1: {
                        title: 'Field 1',
                        description: 'Field 1',
                        type: 'array',
                        items: { type: 'string' },
                        templateFieldId: 'template-field-1',
                    },
                }),
                allOf: [{
                    if: {
                        properties: {
                            field_1: comparator === 'contains' ? { contains: { const: 'a' } } : { items: { const: 'a' }, minItems: 1 },
                        },
                        required: ['field_1'],
                    },
                    then: { properties: { revealed: { title: 'Revealed', description: 'Revealed', type: 'string' } } },
                }],
            },
        });

        assert.throws(
            () => validateTemplateSchemaUpdateByConfig(
                arrayTrigger('equals'),
                arrayTrigger('contains'),
                {
                    conditionsLocked: false,
                    conditions: { [lockedSignature]: { locked: true } },
                }
            ),
            /[Cc]ondition.*locked/
        );
    });

    it('allows a comparator-only change under the whole-tab conditionsLocked check (add-only, not an edit lock)', () => {
        const arrayTrigger = (comparator) => schema({
            document: {
                ...schemaDocument({
                    field_1: {
                        title: 'Field 1',
                        description: 'Field 1',
                        type: 'array',
                        items: { type: 'string' },
                        templateFieldId: 'template-field-1',
                    },
                }),
                allOf: [{
                    if: {
                        properties: {
                            field_1: comparator === 'contains' ? { contains: { const: 'a' } } : { items: { const: 'a' }, minItems: 1 },
                        },
                        required: ['field_1'],
                    },
                    then: { properties: { revealed: { title: 'Revealed', description: 'Revealed', type: 'string' } } },
                }],
            },
        });

        assert.doesNotThrow(() => validateTemplateSchemaUpdateByConfig(arrayTrigger('equals'), arrayTrigger('contains'), {
            conditionsLocked: true,
        }));
    });
});

// Repeatable-link locking, two tiers: whole-tab `repeatableLinksLocked` blocks adding new
// links only (mirrors customFieldsLocked/conditionsLocked); per-individual-link uses a
// `repeatableLinks` record keyed by the dependent field's `templateFieldId`, mirroring the
// existing per-field `fields` record. Repeatable links live in `document.$comment`
// (SchemaHelper.parseSchemaComment/buildSchemaComment), not `properties`/`allOf`.
describe('validateTemplateSchemaUpdateByConfig — repeatable links', () => {
    const commentWithLinks = (arrayDependencies) => JSON.stringify({
        '@id': '#schema-1&1.0.0',
        term: 'schema-1&1.0.0',
        arrayDependencies,
    });

    const withLinks = (arrayDependencies) => schema({
        document: {
            ...schemaDocument({
                parent: {
                    title: 'Parent',
                    description: 'Parent',
                    type: 'array',
                    items: { type: 'object' },
                    templateFieldId: 'template-field-parent',
                },
                child: {
                    title: 'Child',
                    description: 'Child',
                    type: 'array',
                    items: { type: 'object' },
                    templateFieldId: 'template-field-child',
                },
                other: {
                    title: 'Other',
                    description: 'Other',
                    type: 'array',
                    items: { type: 'object' },
                    templateFieldId: 'template-field-other',
                },
            }),
            $comment: commentWithLinks(arrayDependencies),
        },
    });

    const link = (titleOverride) => ([{
        field: ['child'],
        on: ['parent'],
        kind: 'array',
        ...(titleOverride ? { title: titleOverride } : {}),
    }]);

    it('allows editing an existing repeatable link\'s title when repeatableLinksLocked is true (add-only, not an edit lock)', () => {
        assert.doesNotThrow(() => validateTemplateSchemaUpdateByConfig(
            withLinks(link()),
            withLinks(link(['titleField'])),
            { repeatableLinksLocked: true }
        ));
    });

    it('rejects adding a brand-new repeatable link when repeatableLinksLocked is true', () => {
        const withExtraLink = (includeExtra) => withLinks([
            ...link(),
            ...(includeExtra ? [{ field: ['child'], on: ['child'], kind: 'array', title: ['other'] }] : []),
        ]);

        assert.throws(
            () => validateTemplateSchemaUpdateByConfig(
                withExtraLink(false),
                withExtraLink(true),
                { repeatableLinksLocked: true }
            ),
            /does not allow new repeatable links/
        );
    });

    it('allows re-pointing an individually-unlocked link\'s source array even when repeatableLinksLocked is true', () => {
        // Count stays at 1 - this is an edit to the one existing link, not an addition, even
        // though re-pointing `on` from 'parent' to 'other' changes the field/on pair that would
        // otherwise identify it.
        assert.doesNotThrow(() => validateTemplateSchemaUpdateByConfig(
            withLinks([{ field: ['child'], on: ['parent'], kind: 'array' }]),
            withLinks([{ field: ['child'], on: ['other'], kind: 'array' }]),
            {
                repeatableLinksLocked: true,
                repeatableLinks: { 'template-field-child': { locked: false } },
            }
        ));
    });

    it('allows adding a brand-new repeatable link when repeatableLinksLocked is false', () => {
        const withExtraLink = (includeExtra) => withLinks([
            ...link(),
            ...(includeExtra ? [{ field: ['child'], on: ['child'], kind: 'array', title: ['other'] }] : []),
        ]);

        assert.doesNotThrow(() => validateTemplateSchemaUpdateByConfig(
            withExtraLink(false),
            withExtraLink(true),
            { repeatableLinksLocked: false }
        ));
    });

    it('allows removing an existing repeatable link entirely when repeatableLinksLocked is true (add-only, not a removal lock)', () => {
        assert.doesNotThrow(() => validateTemplateSchemaUpdateByConfig(
            withLinks(link()),
            withLinks([]),
            { repeatableLinksLocked: true }
        ));
    });

    it('rejects a change to a specifically-locked repeatable link', () => {
        assert.throws(
            () => validateTemplateSchemaUpdateByConfig(
                withLinks(link()),
                withLinks(link(['titleField'])),
                {
                    repeatableLinks: { 'template-field-child': { locked: true } },
                }
            ),
            /[Ll]ink.*locked/
        );
    });

    it('allows a change to an explicitly-unlocked repeatable link', () => {
        assert.doesNotThrow(() => validateTemplateSchemaUpdateByConfig(
            withLinks(link()),
            withLinks(link(['titleField'])),
            {
                repeatableLinks: { 'template-field-child': { locked: false } },
            }
        ));
    });

    it('rejects removing a specifically-locked repeatable link entirely', () => {
        assert.throws(
            () => validateTemplateSchemaUpdateByConfig(
                withLinks(link()),
                withLinks([]),
                {
                    repeatableLinks: { 'template-field-child': { locked: true } },
                }
            ),
            /[Ll]ink.*locked/
        );
    });
});
