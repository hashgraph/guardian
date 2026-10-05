import assert from 'node:assert/strict';
import {
    analyzeConditionFieldPlacements,
    buildFieldChangeDetails,
    classifyArrayDependenciesAgainstSource,
    buildLinkContentChangeDetails,
    buildSchemaTemplateUpdatePreviewFromContext,
    buildTemplateSchemasSnapshot,
    conditionTriggerSignature,
    createTemplateStateHash,
    findFieldConditionMembership,
    findMatchingConditionIndex,
    getPolicySchemaByTemplateId,
    getRuntimeCustomFields,
    mergeCustomFieldsIntoDocument,
    normalizeTemplateConfigKeys,
    normalizeFieldForDiff,
    preparePolicySchemaUpdate,
} from '../../dist/api/schema-template.service.js';
import { SchemaHelper } from '../../../interfaces/dist/helpers/schema-helper.js';
import { Schema as InterfaceSchema } from '../../../interfaces/dist/models/schema.js';

const baseDocument = (uuid, version, title, properties) => ({
    $id: `#${uuid}&${version}`,
    $comment: JSON.stringify({
        term: `${uuid}&${version}`,
        '@id': `schema:${uuid}`
    }),
    title,
    description: title,
    type: 'object',
    properties,
    required: [],
    additionalProperties: false,
    $defs: {}
});

const templateSchema = ({
    id,
    templateSchemaId,
    uuid,
    version,
    name,
    properties
}) => ({
    id,
    templateSchemaId,
    uuid,
    version,
    iri: `#${uuid}&${version}`,
    name,
    description: `${name} description`,
    entity: 'NONE',
    document: baseDocument(uuid, version, name, properties)
});

describe('schema template snapshot helpers', () => {
    it('stores sub-schema fields by template schema id without duplicating nested fields', () => {
        const child = templateSchema({
            id: 'schema-child',
            templateSchemaId: 'template-schema-child',
            uuid: 'child-uuid',
            version: '1.0.0',
            name: 'Child',
            properties: {
                childName: {
                    type: 'string',
                    title: 'Child name',
                    description: 'Child name',
                    templateFieldId: 'template-field-child-name'
                }
            }
        });
        const root = templateSchema({
            id: 'schema-root',
            templateSchemaId: 'template-schema-root',
            uuid: 'root-uuid',
            version: '1.0.0',
            name: 'Root',
            properties: {
                child: {
                    $ref: child.iri,
                    title: 'Child',
                    description: 'Child',
                    templateFieldId: 'template-field-child',
                    $comment: JSON.stringify({
                        term: 'child',
                        '@id': `schema:root-uuid${child.iri}`,
                        customType: 'subSchema'
                    })
                }
            }
        });

        const snapshot = buildTemplateSchemasSnapshot([root, child]);
        const childField = snapshot.schemas['template-schema-root'].fields[0];

        assert.equal(childField.refTemplateSchemaId, 'template-schema-child');
        assert.equal(childField.fields, undefined);
        assert.equal(snapshot.schemas['template-schema-child'].fields.length, 1);
    });

    it('produces different hashes for different content', () => {
        const config = { schemas: { a: { customFieldsLocked: true } } };
        const schemasA = { schemas: { a: { templateSchemaId: 'a', name: 'A', fields: [] } } };
        const schemasB = { schemas: { a: { templateSchemaId: 'a', name: 'B', fields: [] } } };

        assert.notEqual(
            createTemplateStateHash(config, schemasA),
            createTemplateStateHash(config, schemasB)
        );
    });

    it('hashes template state deterministically regardless of object key order', () => {
        const leftConfig = {
            schemas: {
                a: { customFieldsLocked: true, fields: { f: { locked: false } } },
                b: { schemaSettingsLocked: true }
            }
        };
        const rightConfig = {
            schemas: {
                b: { schemaSettingsLocked: true },
                a: { fields: { f: { locked: false } }, customFieldsLocked: true }
            }
        };
        const schemas = {
            schemas: {
                a: {
                    templateSchemaId: 'a',
                    name: 'A',
                    fields: []
                }
            }
        };

        assert.equal(
            createTemplateStateHash(leftConfig, schemas),
            createTemplateStateHash(rightConfig, schemas)
        );
    });
});

describe('schema template update diff helpers', () => {
    it('normalizes sub-schema fields by template schema id instead of concrete iri/version', () => {
        const previous = {
            name: 'location',
            templateFieldId: 'template-field-location',
            title: 'Location',
            description: 'Location',
            type: '#old-child-uuid&1.0.0',
            isRef: true,
            refTemplateSchemaId: 'template-schema-location',
            fields: [{ name: 'nested-runtime-copy', type: 'string' }],
            comment: JSON.stringify({
                term: 'location',
                '@id': 'schema:old-root#old-child-uuid&1.0.0',
                customType: 'subSchema'
            })
        };
        const next = {
            name: 'location',
            templateFieldId: 'template-field-location',
            title: 'Location',
            description: 'Location',
            type: '#new-child-uuid&1.1.0',
            isRef: true,
            refTemplateSchemaId: 'template-schema-location',
            fields: [{ name: 'other-runtime-copy', type: 'number' }],
            comment: JSON.stringify({
                term: 'location',
                '@id': 'schema:new-root#new-child-uuid&1.1.0',
                customType: 'subSchema'
            })
        };

        assert.equal(
            SchemaHelper.stableStringify(normalizeFieldForDiff(previous)),
            SchemaHelper.stableStringify(normalizeFieldForDiff(next))
        );
    });

    it('formats boolean field properties as Yes/No', () => {
        const base = {
            name: 'field_1',
            description: 'Label',
            type: 'string',
            comment: JSON.stringify({ term: 'field_1', '@id': 'schema:s#field_1' })
        };

        const details = buildFieldChangeDetails(
            { ...base, isArray: false, readOnly: false, hidden: false, autocalculate: false },
            { ...base, isArray: true, readOnly: true, hidden: true, autocalculate: true }
        );

        const byLabel = Object.fromEntries(details.map((d) => [d.label, d]));
        assert.deepEqual(byLabel['Array'],        { label: 'Array',        before: 'No', after: 'Yes' });
        assert.deepEqual(byLabel['Read only'],    { label: 'Read only',    before: 'No', after: 'Yes' });
        assert.deepEqual(byLabel['Hidden'],       { label: 'Hidden',       before: 'No', after: 'Yes' });
        assert.deepEqual(byLabel['Autocalculate'],{ label: 'Autocalculate',before: 'No', after: 'Yes' });
    });

    it('reports concrete field setting changes without N/A placeholders', () => {
        const details = buildFieldChangeDetails(
            {
                name: 'field_1',
                description: 'Old label',
                type: 'string',
                required: false,
                comment: JSON.stringify({
                    term: 'field_1',
                    '@id': 'schema:old#field_1',
                    orderPosition: 0
                })
            },
            {
                name: 'field_1',
                description: 'New label',
                type: 'number',
                required: true,
                comment: JSON.stringify({
                    term: 'field_1',
                    '@id': 'schema:new#field_1',
                    orderPosition: 1
                })
            }
        );

        assert.deepEqual(details, [
            { label: 'Field Name', before: 'Old label', after: 'New label' },
            { label: 'Type', before: 'string', after: 'number' },
            { label: 'Semantic ID', before: 'schema:old#field_1', after: 'schema:new#field_1' },
            { label: 'Order', before: '0', after: '1' },
            { label: 'Required', before: 'No', after: 'Yes' }
        ]);
    });
});

/*
 * Preserved custom fields silently lost their required flag.
 *
 * preparePolicySchemaUpdate replaces target.document with a fresh clone of the
 * template document, so the `required` list becomes the template's, and then asks
 * mergeCustomFieldsIntoDocument to put the SR's own fields back. It re-inserted
 * them into `properties` only - and `required` lives on the parent, not on the
 * property - so a required custom field survived a template update as optional
 * and VCs missing it started validating.
 */
describe('mergeCustomFieldsIntoDocument — required flag', () => {
    const sourceDocument = () => ({
        $id: '#Policy',
        properties: {
            keep: { type: 'string', title: 'Keep' },
            optionalCustom: { type: 'string', title: 'Optional' },
            nested: {
                type: 'object',
                properties: {
                    innerCustom: { type: 'string', title: 'Inner' },
                },
                required: ['innerCustom'],
            },
        },
        required: ['keep'],
    });

    // the fresh template clone: no trace of the custom fields
    const templateDocument = () => ({
        $id: '#Policy',
        properties: {
            fromTemplate: { type: 'string' },
            nested: { type: 'object', properties: {}, required: [] },
        },
        required: ['fromTemplate'],
    });

    it('re-adds a preserved required field to the parent required list', () => {
        const source = sourceDocument();
        source.required.push('optionalCustom');
        const target = templateDocument();

        mergeCustomFieldsIntoDocument(target, source, [{ path: 'optionalCustom' }]);

        assert.ok(target.properties.optionalCustom, 'the field is restored');
        assert.ok(target.required.includes('optionalCustom'),
            'a required custom field must stay required across a template update');
        assert.ok(target.required.includes('fromTemplate'),
            'the template requirements are untouched');
    });

    it('leaves an optional preserved field optional', () => {
        const target = templateDocument();

        mergeCustomFieldsIntoDocument(target, sourceDocument(), [{ path: 'optionalCustom' }]);

        assert.ok(target.properties.optionalCustom);
        assert.equal(target.required.includes('optionalCustom'), false,
            'an optional field must not become required');
    });

    it('carries the required flag for a nested field to its own parent', () => {
        const target = templateDocument();

        mergeCustomFieldsIntoDocument(target, sourceDocument(), [{ path: 'nested.innerCustom' }]);

        assert.ok(target.properties.nested.properties.innerCustom);
        assert.ok(target.properties.nested.required.includes('innerCustom'),
            'required is tracked on the owning object, not the root');
        assert.equal(target.required.includes('innerCustom'), false,
            'and must not leak to the root required list');
    });

    it('does not duplicate an entry that is already required', () => {
        const source = sourceDocument();
        source.required.push('optionalCustom');
        const target = templateDocument();
        target.required.push('optionalCustom');
        target.properties.other = { type: 'string' };

        mergeCustomFieldsIntoDocument(target, source, [{ path: 'optionalCustom' }]);

        const occurrences = target.required.filter((name) => name === 'optionalCustom').length;
        assert.equal(occurrences, 1);
    });
});

/*
 * The required flag is read from the source DOCUMENT, not from the parsed field.
 *
 * SchemaHelper.parseField sets `required || !!conditionRequired`, so a field that is
 * required only by a condition branch reports required === true on the parsed object
 * while the document's own `required` array correctly omits it. Copying the parsed
 * flag across would promote a branch-scoped requirement into an unconditional one -
 * exactly what the $comment marking in this change exists to prevent, since JSON
 * Schema cannot tell "answered differently" from "never asked".
 */
describe('mergeCustomFieldsIntoDocument - condition-required fields', () => {
    it('does not promote a branch-required field to unconditionally required', () => {
        const source = {
            $id: '#Policy',
            properties: {
                branchOnly: {
                    type: 'string',
                    title: 'Branch only',
                    // marked required by a condition branch, not by the schema
                    $comment: JSON.stringify({ term: 'branchOnly', conditionRequired: true }),
                },
            },
            required: [],
        };
        const target = { $id: '#Policy', properties: {}, required: [] };

        mergeCustomFieldsIntoDocument(target, source, [{ path: 'branchOnly' }]);

        assert.ok(target.properties.branchOnly, 'the field is still preserved');
        assert.equal(target.required.includes('branchOnly'), false,
            'a condition branch requirement must not become an unconditional one');
    });

    it('still carries a genuinely required field across', () => {
        const source = {
            $id: '#Policy',
            properties: { always: { type: 'string', title: 'Always' } },
            required: ['always'],
        };
        const target = { $id: '#Policy', properties: {}, required: [] };

        mergeCustomFieldsIntoDocument(target, source, [{ path: 'always' }]);

        assert.equal(target.required.includes('always'), true);
    });
});

/*
 * Issue #6711, step 10. templateSchemaId is deliberately stable across template
 * versions and forks, so two lineage-sharing templates applied to the same policy
 * can carry policy schemas with the same templateSchemaId. Before this fix,
 * getPolicySchemaByTemplateId indexed every policy schema in the topic by that id
 * with no regard for which template it belonged to, so a schema one binding was
 * about to add could resolve to a sibling template's schema instead and be
 * overwritten.
 */
describe('getPolicySchemaByTemplateId scopes to one binding', () => {
    const policySchema = (id, templateId, templateSchemaId) => ({
        id,
        templateId,
        templateSchemaId,
        name: `schema-${id}`,
    });

    it('does not resolve a sibling template schema sharing the same templateSchemaId', () => {
        // template-1 has no schema of its own for this id yet - it is what an update
        // is about to add - so it must not be found via template-2's schema instead.
        const templateTwoSchema = policySchema('ps-2', 'template-2', 'tsid-shared');

        const result = getPolicySchemaByTemplateId(
            [templateTwoSchema],
            {},
            'template-1'
        );

        assert.equal(result.has('tsid-shared'), false);
    });

    it('still resolves the binding\'s own schema for that same shared id', () => {
        const templateOneSchema = policySchema('ps-1', 'template-1', 'tsid-shared');
        const templateTwoSchema = policySchema('ps-2', 'template-2', 'tsid-shared');

        const result = getPolicySchemaByTemplateId(
            [templateOneSchema, templateTwoSchema],
            {},
            'template-1'
        );

        assert.equal(result.get('tsid-shared')?.id, 'ps-1');
    });

    it('still resolves through schemaMap for schemas already applied by this binding', () => {
        const templateOneSchema = policySchema('ps-1', 'template-1', 'tsid-old-name');

        const result = getPolicySchemaByTemplateId(
            [templateOneSchema],
            { 'tsid-old-name': 'ps-1' },
            'template-1'
        );

        assert.equal(result.get('tsid-old-name')?.id, 'ps-1');
    });
});

/*
 * Issue #6921. getRuntimeCustomFields parses via InterfaceSchema, whose
 * linkConditionFields (interfaces/src/models/schema.ts) already folds a branch-only
 * field into the parsed schema's top-level `fields` list before this function ever
 * reads it - the field is the same object reference, not a second copy. A tempting
 * "fix" for the suspected detection gap would have been to also flatten
 * conditions[].thenFields/elseFields separately, but that would double-count every
 * such field instead of finding a gap that doesn't exist.
 */
describe('getRuntimeCustomFields — fields inside a condition branch', () => {
    const field = (name, over = {}) => ({
        name,
        title: name,
        description: name,
        type: 'string',
        required: false,
        isArray: false,
        isRef: false,
        readOnly: false,
        ...over,
    });

    const baseSchema = () => ({ uuid: 'u-1', version: '1.0.0', name: 'N', description: 'D', contextURL: 'ctx:' });

    it('detects a field declared only inside a then branch exactly once, not twice', () => {
        const trigger = field('trigger');
        const branchCustom = field('branchCustom');
        // Build with branchCustom in both places (the real invariant the frontend and
        // linkConditionFields maintain), then delete its root declaration to simulate
        // the branch-only edge case linkConditionFields exists to repair - a field that
        // lives only inside allOf[].then, e.g. because it got renamed while the root and
        // branch copies were unshared.
        const document = SchemaHelper.buildDocument(
            baseSchema(),
            [trigger, branchCustom],
            [{ ifCondition: { field: trigger, fieldValue: 'yes' }, thenFields: [branchCustom], elseFields: [] }]
        );
        // buildDocument adds the VC-envelope fields (@context/type/id); strip them so
        // the assertion below is only about the condition-branch field under test.
        delete document.properties['@context'];
        delete document.properties.type;
        delete document.properties.id;
        document.properties.trigger.templateFieldId = 'tpl-trigger-1';
        delete document.properties.branchCustom;

        const custom = getRuntimeCustomFields({ document });

        assert.equal(custom.length, 1, 'must be detected exactly once, not zero or twice');
        assert.equal(custom[0].name, 'branchCustom');
    });

    it('does not report a template-declared branch-only field as custom', () => {
        const trigger = field('trigger');
        const branchField = field('branchField');
        const document = SchemaHelper.buildDocument(
            baseSchema(),
            [trigger, branchField],
            [{ ifCondition: { field: trigger, fieldValue: 'yes' }, thenFields: [branchField], elseFields: [] }]
        );
        delete document.properties['@context'];
        delete document.properties.type;
        delete document.properties.id;
        document.properties.trigger.templateFieldId = 'tpl-trigger-1';
        document.allOf[0].then.properties.branchField.templateFieldId = 'tpl-branch-1';
        delete document.properties.branchField;

        const custom = getRuntimeCustomFields({ document });

        assert.equal(custom.length, 0);
    });
});

/*
 * Issue #6921, step 7. A custom field inside a condition branch already survived a
 * template update as a field (the root-properties merge below was already correct,
 * unmodified) - the actual gap was that nothing re-added it to the matching condition's
 * branch in the new document, so it silently became an unconditional root field,
 * detached from the condition that used to gate it.
 */
describe('condition-branch identity helpers', () => {
    const field = (name, over = {}) => ({
        name,
        title: name,
        description: name,
        type: 'string',
        required: false,
        isArray: false,
        isRef: false,
        readOnly: false,
        ...over,
    });

    it('reads a single-predicate trigger signature', () => {
        const cond = { ifCondition: { field: field('a', { templateFieldId: 't-a' }), fieldValue: 'x' } };
        assert.deepEqual(conditionTriggerSignature(cond), ['SINGLE', 't-a:"x"']);
    });

    it('returns null when the trigger field has no templateFieldId', () => {
        const cond = { ifCondition: { field: field('a'), fieldValue: 'x' } };
        assert.equal(conditionTriggerSignature(cond), null);
    });

    it('returns null for an AND condition if any predicate is missing an id', () => {
        const cond = {
            ifCondition: {
                AND: [
                    { field: field('a', { templateFieldId: 't-a' }), fieldValue: 1 },
                    { field: field('b'), fieldValue: 2 },
                ],
            },
        };
        assert.equal(conditionTriggerSignature(cond), null);
    });

    it('sorts multi-predicate signature parts so order does not affect matching', () => {
        const cond = {
            ifCondition: {
                AND: [
                    { field: field('b', { templateFieldId: 't-b' }), fieldValue: 2 },
                    { field: field('a', { templateFieldId: 't-a' }), fieldValue: 1 },
                ],
            },
        };
        assert.deepEqual(conditionTriggerSignature(cond), ['AND', 't-a:1', 't-b:2']);
    });

    it('distinguishes two conditions sharing the same trigger field but different values', () => {
        // A regression case: templateFieldId alone is not a safe match key when one
        // field drives more than one condition (e.g. one branch per enum option).
        const conditionA = { ifCondition: { field: field('status', { templateFieldId: 't-status' }), fieldValue: 'A' } };
        const conditionB = { ifCondition: { field: field('status', { templateFieldId: 't-status' }), fieldValue: 'B' } };
        assert.notDeepEqual(conditionTriggerSignature(conditionA), conditionTriggerSignature(conditionB));
    });

    it('distinguishes AND from OR over the same predicates', () => {
        // A regression case: the same two predicates combined either way must not
        // collapse to the same signature.
        const predicates = [
            { field: field('a', { templateFieldId: 't-a' }), fieldValue: 1 },
            { field: field('b', { templateFieldId: 't-b' }), fieldValue: 2 },
        ];
        const andCond = { ifCondition: { AND: predicates } };
        const orCond = { ifCondition: { OR: predicates } };
        assert.notDeepEqual(conditionTriggerSignature(andCond), conditionTriggerSignature(orCond));
    });

    it('findMatchingConditionIndex finds the condition with the same trigger signature', () => {
        const conditions = [
            { ifCondition: { field: field('x', { templateFieldId: 't-x' }), fieldValue: 1 } },
            { ifCondition: { field: field('renamed', { templateFieldId: 't-y' }), fieldValue: 2 } },
        ];
        assert.equal(findMatchingConditionIndex(conditions, ['SINGLE', 't-y:2']), 1);
        assert.equal(findMatchingConditionIndex(conditions, ['SINGLE', 't-z:2']), -1);
    });

    it('findFieldConditionMembership finds a field by name in either branch', () => {
        const conditions = [
            { thenFields: [field('a')], elseFields: [field('b')] },
        ];
        assert.deepEqual(findFieldConditionMembership(conditions, 'a'), { conditionIndex: 0, branch: 'thenFields' });
        assert.deepEqual(findFieldConditionMembership(conditions, 'b'), { conditionIndex: 0, branch: 'elseFields' });
        assert.equal(findFieldConditionMembership(conditions, 'c'), null);
    });

    it('analyzeConditionFieldPlacements matches, orphans, and passes through wholly-custom conditions', () => {
        const matched = field('matchedField');
        const orphaned = field('orphanedField');
        const wholesale = field('wholesaleField');
        const previousConditions = [
            { ifCondition: { field: field('t1', { templateFieldId: 'tpl-1' }), fieldValue: 'a' }, thenFields: [matched], elseFields: [] },
            { ifCondition: { field: field('t2', { templateFieldId: 'tpl-2' }), fieldValue: 'b' }, thenFields: [orphaned], elseFields: [] },
            { ifCondition: { field: field('t3'), fieldValue: 'c' }, thenFields: [wholesale], elseFields: [] },
        ];
        const sourceConditions = [
            { ifCondition: { field: field('t1-renamed', { templateFieldId: 'tpl-1' }), fieldValue: 'a' }, thenFields: [], elseFields: [] },
        ];

        const placements = analyzeConditionFieldPlacements(previousConditions, sourceConditions, [matched, orphaned, wholesale]);

        const byName = Object.fromEntries(placements.map((p) => [p.field.name, p]));
        assert.equal(byName.matchedField.matchedIndex, 0);
        assert.equal(byName.orphanedField.matchedIndex, -1);
        assert.notEqual(byName.orphanedField.triggerIds, null);
        assert.equal(byName.wholesaleField.triggerIds, null);
    });
});

describe('preparePolicySchemaUpdate — condition-branch membership', () => {
    const field = (name, over = {}) => ({
        name,
        title: name,
        description: name,
        type: 'string',
        required: false,
        isArray: false,
        isRef: false,
        readOnly: false,
        ...over,
    });

    const baseSchema = () => ({ uuid: 'u-1', version: '1.0.0', name: 'N', description: 'D', contextURL: 'ctx:' });

    const stripEnvelope = (document) => {
        delete document.properties['@context'];
        delete document.properties.type;
        delete document.properties.id;
    };

    const asSchema = (document, over = {}) => ({
        document,
        name: 'N',
        description: 'D',
        entity: 'NONE',
        version: '1.0.0',
        templateSchemaId: 'tsid-1',
        ...over,
    });

    it('restores a custom field into its matched condition branch, not just root', () => {
        const trigger = field('trigger', { templateFieldId: 'tpl-trigger-1' });
        const branchCustom = field('branchCustom');
        const targetDocument = SchemaHelper.buildDocument(
            baseSchema(),
            [trigger, branchCustom],
            [{ ifCondition: { field: trigger, fieldValue: 'yes' }, thenFields: [branchCustom], elseFields: [] }]
        );
        stripEnvelope(targetDocument);

        const sourceTrigger = field('trigger', { templateFieldId: 'tpl-trigger-1' });
        const sourceThenField = field('sourceOnlyField', { templateFieldId: 'tpl-then-1' });
        const sourceDocument = SchemaHelper.buildDocument(
            baseSchema(),
            [sourceTrigger, sourceThenField],
            [{ ifCondition: { field: sourceTrigger, fieldValue: 'yes' }, thenFields: [sourceThenField], elseFields: [] }]
        );

        const target = asSchema(targetDocument);
        const source = asSchema(sourceDocument);

        preparePolicySchemaUpdate(target, source, 'template-1', { customFieldsLocked: false, schemaSettingsLocked: false });

        assert.ok(target.document.allOf[0].then.properties.branchCustom,
            'the custom field must be restored inside the matched condition branch');
        assert.ok(target.document.allOf[0].then.properties.sourceOnlyField,
            'the template-driven then field must still be present, untouched');
        assert.ok(target.document.properties.branchCustom,
            'the pre-existing root restoration must still happen too');
    });

    it('reverts an edited condition back to the template version when the edit broke its match (ProjectId==2 -> ProjectTitle==3)', () => {
        const projectId = field('ProjectId', { templateFieldId: 'tpl-project-id' });
        const projectTitle = field('ProjectTitle', { templateFieldId: 'tpl-project-title' });
        const revealed = field('revealed', { templateFieldId: 'tpl-revealed-1' });

        // Policy author edited the condition away from the template - trigger field AND value
        // both changed, so its signature no longer matches anything in the template.
        const targetDocument = SchemaHelper.buildDocument(
            baseSchema(),
            [projectId, projectTitle, revealed],
            [{ ifCondition: { field: projectTitle, fieldValue: 3 }, thenFields: [revealed], elseFields: [] }]
        );
        stripEnvelope(targetDocument);

        // Template's own version never changed - still triggers on ProjectId == 2.
        const sourceDocument = SchemaHelper.buildDocument(
            baseSchema(),
            [projectId, projectTitle, revealed],
            [{ ifCondition: { field: projectId, fieldValue: 2 }, thenFields: [revealed], elseFields: [] }]
        );

        const target = asSchema(targetDocument);
        const source = asSchema(sourceDocument);

        preparePolicySchemaUpdate(target, source, 'template-1', { customFieldsLocked: false, schemaSettingsLocked: false, conditionsLocked: false });

        assert.deepEqual(
            target.document.allOf[0].if,
            sourceDocument.allOf[0].if,
            'nothing policy-authored was at risk (revealed is a template field, not custom), so the edited-away condition must revert to the template\'s own ProjectId == 2 condition, not stay on the policy\'s edited ProjectTitle == 3'
        );
    });

    it('matches the condition by trigger id even when the trigger field was renamed', () => {
        const trigger = field('trigger', { templateFieldId: 'tpl-trigger-1' });
        const branchCustom = field('branchCustom');
        const targetDocument = SchemaHelper.buildDocument(
            baseSchema(),
            [trigger, branchCustom],
            [{ ifCondition: { field: trigger, fieldValue: 'yes' }, thenFields: [branchCustom], elseFields: [] }]
        );
        stripEnvelope(targetDocument);

        // Same templateFieldId and same trigger value, different name - a rename, not a
        // new condition (the value must stay the same: two conditions sharing one trigger
        // field with different values are legitimately different conditions, not a rename).
        const sourceTrigger = field('triggerRenamed', { templateFieldId: 'tpl-trigger-1' });
        const sourcePlaceholder = field('placeholder', { templateFieldId: 'tpl-placeholder-1' });
        const sourceDocument = SchemaHelper.buildDocument(
            baseSchema(),
            [sourceTrigger, sourcePlaceholder],
            [{ ifCondition: { field: sourceTrigger, fieldValue: 'yes' }, thenFields: [sourcePlaceholder], elseFields: [] }]
        );

        const target = asSchema(targetDocument);
        const source = asSchema(sourceDocument);

        preparePolicySchemaUpdate(target, source, 'template-1', { customFieldsLocked: false, schemaSettingsLocked: false });

        assert.ok(target.document.allOf[0].then.properties.branchCustom,
            'name-based matching would have failed here; id-based matching must not');
    });

    it('does not conflate two conditions sharing the same trigger field but different values', () => {
        const trigger = field('status', { templateFieldId: 'tpl-status' });
        const branchA = field('branchA');
        const branchB = field('branchB');
        const targetDocument = SchemaHelper.buildDocument(
            baseSchema(),
            [trigger, branchA, branchB],
            [
                { ifCondition: { field: trigger, fieldValue: 'A' }, thenFields: [branchA], elseFields: [] },
                { ifCondition: { field: trigger, fieldValue: 'B' }, thenFields: [branchB], elseFields: [] },
            ]
        );
        stripEnvelope(targetDocument);

        // The new template still has the 'A' condition, but not 'B' - a genuine removal,
        // not a rename, even though both conditions share the same trigger field.
        const sourceTrigger = field('status', { templateFieldId: 'tpl-status' });
        const sourcePlaceholder = field('placeholder', { templateFieldId: 'tpl-placeholder' });
        const sourceDocument = SchemaHelper.buildDocument(
            baseSchema(),
            [sourceTrigger, sourcePlaceholder],
            [{ ifCondition: { field: sourceTrigger, fieldValue: 'A' }, thenFields: [sourcePlaceholder], elseFields: [] }]
        );

        const target = asSchema(targetDocument);
        const source = asSchema(sourceDocument);

        preparePolicySchemaUpdate(target, source, 'template-1', { customFieldsLocked: false, schemaSettingsLocked: false });

        assert.ok(target.document.allOf[0].then.properties.branchA,
            'branchA belongs to the matched status===A condition');
        assert.equal(target.document.allOf[0].then.properties.branchB, undefined,
            'branchB must not leak into the status===A condition just because it shares the trigger field');
        assert.equal(target.document.allOf.length, 1,
            'branchB\'s condition (status===B) was genuinely removed and not kept, so it must not be carried over either');
    });

    it('drops a custom field entirely when its condition was removed and no resolution keeps it', () => {
        const trigger = field('trigger', { templateFieldId: 'tpl-trigger-1' });
        const branchCustom = field('branchCustom');
        const targetDocument = SchemaHelper.buildDocument(
            baseSchema(),
            [trigger, branchCustom],
            [{ ifCondition: { field: trigger, fieldValue: 'yes' }, thenFields: [branchCustom], elseFields: [] }]
        );
        stripEnvelope(targetDocument);

        // The new template version has no condition at all - it was removed.
        const sourceDocument = SchemaHelper.buildDocument(baseSchema(), [], []);

        const target = asSchema(targetDocument);
        const source = asSchema(sourceDocument);

        preparePolicySchemaUpdate(target, source, 'template-1', { customFieldsLocked: false, schemaSettingsLocked: false });

        assert.equal(target.document.properties.branchCustom, undefined,
            'must be dropped, not left behind as a detached unconditional root field');
        assert.equal(target.document.allOf, undefined);
    });

    it('keeps a removed condition wholesale when the conflict is resolved as KEEP_AS_CUSTOM_CONDITION', () => {
        const trigger = field('trigger', { templateFieldId: 'tpl-trigger-1' });
        const branchCustom = field('branchCustom');
        const targetDocument = SchemaHelper.buildDocument(
            baseSchema(),
            [trigger, branchCustom],
            [{ ifCondition: { field: trigger, fieldValue: 'yes' }, thenFields: [branchCustom], elseFields: [] }]
        );
        stripEnvelope(targetDocument);

        const sourceDocument = SchemaHelper.buildDocument(baseSchema(), [], []);

        const target = asSchema(targetDocument);
        const source = asSchema(sourceDocument);

        const conflicts = [{ id: 'conflict-1', type: 'CONDITION_REMOVED_WITH_POLICY_USAGE', templateFieldId: 'SINGLE,tpl-trigger-1:"yes"' }];
        const resolutions = new Map([['conflict-1', 'KEEP_AS_CUSTOM_CONDITION']]);

        preparePolicySchemaUpdate(
            target, source, 'template-1',
            { customFieldsLocked: false, schemaSettingsLocked: false },
            conflicts, resolutions
        );

        assert.equal(target.document.allOf.length, 1, 'the whole removed condition must be carried over');
        assert.ok(target.document.allOf[0].then.properties.branchCustom);
        assert.deepEqual(target.document.allOf[0].if.properties.trigger, { const: 'yes' },
            'the trigger/if node must be preserved exactly as it was');
    });

    it('carries a wholly policy-authored condition over automatically, no conflict needed', () => {
        // The trigger field itself has no templateFieldId - this condition was never
        // derived from a template condition at all.
        const trigger = field('customTrigger');
        const branchCustom = field('customBranchField');
        const targetDocument = SchemaHelper.buildDocument(
            baseSchema(),
            [trigger, branchCustom],
            [{ ifCondition: { field: trigger, fieldValue: 'yes' }, thenFields: [branchCustom], elseFields: [] }]
        );
        stripEnvelope(targetDocument);

        const sourceDocument = SchemaHelper.buildDocument(baseSchema(), [], []);

        const target = asSchema(targetDocument);
        const source = asSchema(sourceDocument);

        preparePolicySchemaUpdate(target, source, 'template-1', { customFieldsLocked: false, schemaSettingsLocked: false });

        assert.equal(target.document.allOf.length, 1);
        assert.ok(target.document.allOf[0].then.properties.customBranchField);
    });

    it('drops a wholly policy-authored condition when conditionsLocked', () => {
        const trigger = field('customTrigger');
        const branchCustom = field('customBranchField');
        const targetDocument = SchemaHelper.buildDocument(
            baseSchema(),
            [trigger, branchCustom],
            [{ ifCondition: { field: trigger, fieldValue: 'yes' }, thenFields: [branchCustom], elseFields: [] }]
        );
        stripEnvelope(targetDocument);

        const sourceDocument = SchemaHelper.buildDocument(baseSchema(), [], []);

        const target = asSchema(targetDocument);
        const source = asSchema(sourceDocument);

        preparePolicySchemaUpdate(target, source, 'template-1', { customFieldsLocked: false, conditionsLocked: true, schemaSettingsLocked: false });

        assert.equal(target.document.allOf, undefined);
        assert.equal(target.document.properties.customTrigger, undefined);
        assert.equal(target.document.properties.customBranchField, undefined);
    });

    it('does not restore branch membership at all when customFieldsLocked', () => {
        const trigger = field('trigger', { templateFieldId: 'tpl-trigger-1' });
        const branchCustom = field('branchCustom');
        const targetDocument = SchemaHelper.buildDocument(
            baseSchema(),
            [trigger, branchCustom],
            [{ ifCondition: { field: trigger, fieldValue: 'yes' }, thenFields: [branchCustom], elseFields: [] }]
        );
        stripEnvelope(targetDocument);

        const sourceTrigger = field('trigger', { templateFieldId: 'tpl-trigger-1' });
        const sourceThenField = field('sourceOnlyField', { templateFieldId: 'tpl-then-1' });
        const sourceDocument = SchemaHelper.buildDocument(
            baseSchema(),
            [sourceTrigger, sourceThenField],
            [{ ifCondition: { field: sourceTrigger, fieldValue: 'yes' }, thenFields: [sourceThenField], elseFields: [] }]
        );

        const target = asSchema(targetDocument);
        const source = asSchema(sourceDocument);

        preparePolicySchemaUpdate(target, source, 'template-1', { customFieldsLocked: true, schemaSettingsLocked: false });

        assert.equal(target.document.properties.branchCustom, undefined);
        assert.equal(target.document.allOf[0].then.properties.branchCustom, undefined);
    });

    it('removes condition custom fields but keeps root custom fields when conditionsLocked', () => {
        const trigger = field('trigger', { templateFieldId: 'tpl-trigger-1' });
        const branchCustom = field('branchCustom');
        const rootCustom = field('rootCustom');
        const targetDocument = SchemaHelper.buildDocument(
            baseSchema(),
            [trigger, branchCustom, rootCustom],
            [{ ifCondition: { field: trigger, fieldValue: 'yes' }, thenFields: [branchCustom], elseFields: [] }]
        );
        stripEnvelope(targetDocument);

        const sourceTrigger = field('trigger', { templateFieldId: 'tpl-trigger-1' });
        const sourceThenField = field('sourceOnlyField', { templateFieldId: 'tpl-then-1' });
        const sourceDocument = SchemaHelper.buildDocument(
            baseSchema(),
            [sourceTrigger, sourceThenField],
            [{ ifCondition: { field: sourceTrigger, fieldValue: 'yes' }, thenFields: [sourceThenField], elseFields: [] }]
        );

        const target = asSchema(targetDocument);
        const source = asSchema(sourceDocument);

        preparePolicySchemaUpdate(target, source, 'template-1', { customFieldsLocked: false, conditionsLocked: true, schemaSettingsLocked: false });

        assert.equal(target.document.properties.branchCustom, undefined,
            'custom fields owned by locked conditions must be removed, not moved to the root');
        assert.equal(target.document.allOf[0].then.properties.branchCustom, undefined);
        assert.ok(target.document.properties.rootCustom,
            'unrelated root custom fields must still be preserved while customFieldsLocked is false');
    });

    it('restores a policy-added cross-schema target into its matched condition', () => {
        // Cross-schema targets (addThenTarget/addElseTarget) have no independent presence
        // in this schema's own fields at all - a required one serializes to a `required`
        // entry in the required branch AND a forbidden marker in the opposite branch.
        const trigger = field('trigger', { templateFieldId: 'tpl-trigger-1' });
        const requiredChild = field('childField', { required: true });
        const targetDocument = SchemaHelper.buildDocument(
            baseSchema(),
            [trigger],
            [{
                ifCondition: { field: trigger, fieldValue: 'yes' },
                thenFields: [],
                elseFields: [],
                thenTargets: [{ field: requiredChild, fieldPath: ['parentRef', 'childField'] }],
            }]
        );
        stripEnvelope(targetDocument);

        const sourceTrigger = field('trigger', { templateFieldId: 'tpl-trigger-1' });
        const sourcePlaceholder = field('placeholder', { templateFieldId: 'tpl-placeholder' });
        const sourceDocument = SchemaHelper.buildDocument(
            baseSchema(),
            [sourceTrigger, sourcePlaceholder],
            [{ ifCondition: { field: sourceTrigger, fieldValue: 'yes' }, thenFields: [sourcePlaceholder], elseFields: [] }]
        );

        const target = asSchema(targetDocument);
        const source = asSchema(sourceDocument);

        preparePolicySchemaUpdate(target, source, 'template-1', { customFieldsLocked: false, schemaSettingsLocked: false });

        assert.deepEqual(target.document.allOf[0].then.properties.parentRef, { required: ['childField'] },
            'the required-side wrapper must be restored');
        assert.deepEqual(target.document.allOf[0].else.properties.parentRef, { properties: { childField: false } },
            'the forbidden-side wrapper must be restored too');
        assert.ok(target.document.allOf[0].then.properties.placeholder,
            'the template-driven then field must still be present, untouched');
    });

    it('does not restore a cross-schema target that came from the previous template snapshot', () => {
        const trigger = field('status', { templateFieldId: 'tpl-status' });
        const zip = field('zip', { required: true });
        const targetDocument = SchemaHelper.buildDocument(
            baseSchema(),
            [trigger],
            [{
                ifCondition: { field: trigger, fieldValue: 'solar' },
                thenFields: [],
                elseFields: [],
                thenTargets: [{ field: zip, fieldPath: ['address', 'zip'] }],
            }]
        );
        stripEnvelope(targetDocument);

        const sourceTrigger = field('status', { templateFieldId: 'tpl-status' });
        const sourcePlaceholder = field('placeholder', { templateFieldId: 'tpl-placeholder' });
        const sourceDocument = SchemaHelper.buildDocument(
            baseSchema(),
            [sourceTrigger, sourcePlaceholder],
            [{ ifCondition: { field: sourceTrigger, fieldValue: 'solar' }, thenFields: [sourcePlaceholder], elseFields: [] }]
        );

        const previousSnapshotSchema = {
            templateSchemaId: 'tsid-1',
            name: 'N',
            description: 'D',
            version: '1.0.0',
            fields: [trigger],
            conditions: [{
                ifCondition: { field: trigger, fieldValue: 'solar' },
                thenFields: [],
                elseFields: [],
                thenTargets: [{ field: zip, fieldPath: ['address', 'zip'] }],
            }],
        };

        const target = asSchema(targetDocument);
        const source = asSchema(sourceDocument);

        preparePolicySchemaUpdate(
            target,
            source,
            'template-1',
            { customFieldsLocked: false, schemaSettingsLocked: false },
            [],
            new Map(),
            previousSnapshotSchema
        );

        assert.equal(target.document.allOf[0].then.properties.address, undefined,
            'a target removed from the template must not be restored from the old policy document');
        assert.equal(target.document.allOf[0].else?.properties?.address, undefined);
        assert.ok(target.document.allOf[0].then.properties.placeholder);
    });

    it('restores only policy-added cross-schema targets when snapshot also had targets', () => {
        const trigger = field('status', { templateFieldId: 'tpl-status' });
        const zip = field('zip', { required: true });
        const city = field('city', { required: true });
        const targetDocument = SchemaHelper.buildDocument(
            baseSchema(),
            [trigger],
            [{
                ifCondition: { field: trigger, fieldValue: 'solar' },
                thenFields: [],
                elseFields: [],
                thenTargets: [
                    { field: zip, fieldPath: ['address', 'zip'] },
                    { field: city, fieldPath: ['address', 'city'] },
                ],
            }]
        );
        stripEnvelope(targetDocument);

        const sourceTrigger = field('status', { templateFieldId: 'tpl-status' });
        const sourcePlaceholder = field('placeholder', { templateFieldId: 'tpl-placeholder' });
        const sourceDocument = SchemaHelper.buildDocument(
            baseSchema(),
            [sourceTrigger, sourcePlaceholder],
            [{ ifCondition: { field: sourceTrigger, fieldValue: 'solar' }, thenFields: [sourcePlaceholder], elseFields: [] }]
        );

        const previousSnapshotSchema = {
            templateSchemaId: 'tsid-1',
            name: 'N',
            description: 'D',
            version: '1.0.0',
            fields: [trigger],
            conditions: [{
                ifCondition: { field: trigger, fieldValue: 'solar' },
                thenFields: [],
                elseFields: [],
                thenTargets: [{ field: zip, fieldPath: ['address', 'zip'] }],
            }],
        };

        const target = asSchema(targetDocument);
        const source = asSchema(sourceDocument);

        preparePolicySchemaUpdate(
            target,
            source,
            'template-1',
            { customFieldsLocked: false, schemaSettingsLocked: false },
            [],
            new Map(),
            previousSnapshotSchema
        );

        assert.deepEqual(target.document.allOf[0].then.properties.address, { required: ['city'] },
            'only the policy-added required target should be restored');
        assert.deepEqual(target.document.allOf[0].else.properties.address, { properties: { city: false } },
            'only the policy-added forbidden marker should be restored');
    });

    it('drops a condition held only by a cross-schema target when its condition is removed and not kept', () => {
        const trigger = field('trigger', { templateFieldId: 'tpl-trigger-1' });
        const requiredChild = field('childField', { required: true });
        const targetDocument = SchemaHelper.buildDocument(
            baseSchema(),
            [trigger],
            [{
                ifCondition: { field: trigger, fieldValue: 'yes' },
                thenFields: [],
                elseFields: [],
                thenTargets: [{ field: requiredChild, fieldPath: ['parentRef', 'childField'] }],
            }]
        );
        stripEnvelope(targetDocument);

        const sourceDocument = SchemaHelper.buildDocument(baseSchema(), [], []);

        const target = asSchema(targetDocument);
        const source = asSchema(sourceDocument);

        preparePolicySchemaUpdate(target, source, 'template-1', { customFieldsLocked: false, schemaSettingsLocked: false });

        assert.equal(target.document.allOf, undefined,
            'no custom field to anchor a field-driven placement, but the target-only condition must still be dropped, not left behind');
    });

    it('keeps a condition held only by a cross-schema target when resolved as KEEP_AS_CUSTOM_CONDITION', () => {
        const trigger = field('trigger', { templateFieldId: 'tpl-trigger-1' });
        const requiredChild = field('childField', { required: true });
        const targetDocument = SchemaHelper.buildDocument(
            baseSchema(),
            [trigger],
            [{
                ifCondition: { field: trigger, fieldValue: 'yes' },
                thenFields: [],
                elseFields: [],
                thenTargets: [{ field: requiredChild, fieldPath: ['parentRef', 'childField'] }],
            }]
        );
        stripEnvelope(targetDocument);

        const sourceDocument = SchemaHelper.buildDocument(baseSchema(), [], []);

        const target = asSchema(targetDocument);
        const source = asSchema(sourceDocument);

        const conflicts = [{ id: 'conflict-1', type: 'CONDITION_REMOVED_WITH_POLICY_USAGE', templateFieldId: 'SINGLE,tpl-trigger-1:"yes"' }];
        const resolutions = new Map([['conflict-1', 'KEEP_AS_CUSTOM_CONDITION']]);

        preparePolicySchemaUpdate(
            target, source, 'template-1',
            { customFieldsLocked: false, schemaSettingsLocked: false },
            conflicts, resolutions
        );

        assert.equal(target.document.allOf.length, 1);
        assert.deepEqual(target.document.allOf[0].then.properties.parentRef, { required: ['childField'] });
    });

    it('does not restore a cross-schema target when customFieldsLocked', () => {
        const trigger = field('trigger', { templateFieldId: 'tpl-trigger-1' });
        const requiredChild = field('childField', { required: true });
        const targetDocument = SchemaHelper.buildDocument(
            baseSchema(),
            [trigger],
            [{
                ifCondition: { field: trigger, fieldValue: 'yes' },
                thenFields: [],
                elseFields: [],
                thenTargets: [{ field: requiredChild, fieldPath: ['parentRef', 'childField'] }],
            }]
        );
        stripEnvelope(targetDocument);

        const sourceTrigger = field('trigger', { templateFieldId: 'tpl-trigger-1' });
        const sourcePlaceholder = field('placeholder', { templateFieldId: 'tpl-placeholder' });
        const sourceDocument = SchemaHelper.buildDocument(
            baseSchema(),
            [sourceTrigger, sourcePlaceholder],
            [{ ifCondition: { field: sourceTrigger, fieldValue: 'yes' }, thenFields: [sourcePlaceholder], elseFields: [] }]
        );

        const target = asSchema(targetDocument);
        const source = asSchema(sourceDocument);

        preparePolicySchemaUpdate(target, source, 'template-1', { customFieldsLocked: true, schemaSettingsLocked: false });

        assert.equal(target.document.allOf[0].then.properties.parentRef, undefined);
    });

    it('does not restore a policy-added cross-schema target when conditionsLocked', () => {
        const trigger = field('trigger', { templateFieldId: 'tpl-trigger-1' });
        const requiredChild = field('childField', { required: true });
        const targetDocument = SchemaHelper.buildDocument(
            baseSchema(),
            [trigger],
            [{
                ifCondition: { field: trigger, fieldValue: 'yes' },
                thenFields: [],
                elseFields: [],
                thenTargets: [{ field: requiredChild, fieldPath: ['parentRef', 'childField'] }],
            }]
        );
        stripEnvelope(targetDocument);

        const sourceTrigger = field('trigger', { templateFieldId: 'tpl-trigger-1' });
        const sourcePlaceholder = field('placeholder', { templateFieldId: 'tpl-placeholder' });
        const sourceDocument = SchemaHelper.buildDocument(
            baseSchema(),
            [sourceTrigger, sourcePlaceholder],
            [{ ifCondition: { field: sourceTrigger, fieldValue: 'yes' }, thenFields: [sourcePlaceholder], elseFields: [] }]
        );

        const target = asSchema(targetDocument);
        const source = asSchema(sourceDocument);

        preparePolicySchemaUpdate(target, source, 'template-1', { customFieldsLocked: false, conditionsLocked: true, schemaSettingsLocked: false });

        assert.equal(target.document.allOf[0].then.properties.parentRef, undefined);
        assert.equal(target.document.allOf[0].else?.properties?.parentRef, undefined);
        assert.ok(target.document.allOf[0].then.properties.placeholder);
    });

    it('does not crash and preserves an existing forbid marker when a cross-target wrapper collides with it', () => {
        // Regression: mergeCrossTargetWrapper used to recurse into an existing `false`
        // (a real forbid marker, not an absent slot) and crash trying to read
        // `.properties` off a primitive. The old document's deep wrapper and the new
        // document's shallow `false` at the same key must not be merged - the
        // template's explicit forbid wins.
        const previousDocument = {
            $id: '#S', title: 'S', description: 'S', type: 'object', additionalProperties: false,
            properties: { trigger: field('trigger', { templateFieldId: 'tpl-trigger-1' }) },
            required: [],
            allOf: [{
                if: { properties: { trigger: { const: 'yes' } }, required: ['trigger'] },
                then: { properties: { parentRef: { properties: { child: false } } } },
            }],
        };
        const sourceDocument = {
            $id: '#S', title: 'S', description: 'S', type: 'object', additionalProperties: false,
            properties: {
                trigger: field('trigger', { templateFieldId: 'tpl-trigger-1' }),
                parentRef: field('parentRef', { templateFieldId: 'tpl-parentref-1' }),
            },
            required: [],
            allOf: [{
                if: { properties: { trigger: { const: 'yes' } }, required: ['trigger'] },
                then: { properties: { parentRef: false } },
                else: { properties: { parentRef: field('parentRef', { templateFieldId: 'tpl-parentref-1' }) } },
            }],
        };

        const target = asSchema(previousDocument);
        const source = asSchema(sourceDocument);

        assert.doesNotThrow(() =>
            preparePolicySchemaUpdate(target, source, 'template-1', { customFieldsLocked: false, schemaSettingsLocked: false })
        );
        assert.equal(target.document.allOf[0].then.properties.parentRef, false,
            'the template\'s explicit forbid marker must survive, not be overwritten by the old wrapper');
    });
});

describe('buildSchemaTemplateUpdatePreviewFromContext - policy-side field edits', () => {
    const field = (name, over = {}) => ({
        name, title: name, description: name, type: 'string', required: false,
        isArray: false, isRef: false, readOnly: false, templateFieldId: `tpl-${name}`, ...over,
    });
    const baseSchema = () => ({ uuid: 'u-1', version: '1.0.0', name: 'N', description: 'D', contextURL: 'ctx:' });

    // templateField is what the template (previous and next) holds; policyField is what the policy holds.
    const buildContext = (rawTemplateField, policyField) => {
        // Real snapshots come from parsing a document, which fills in defaults (semantic id, term,
        // hidden, autocalculate...) - parse the template side the same way so the fixture has no
        // representation noise against the policy side.
        const templateDocument = SchemaHelper.buildDocument(baseSchema(), [rawTemplateField], []);
        const templateField = new InterfaceSchema(
            { document: templateDocument, name: 'N', description: 'D', entity: 'NONE', contextURL: 'ctx:' }, true
        ).fields.find((f) => f.name === rawTemplateField.name);
        const policyDocument = SchemaHelper.buildDocument(baseSchema(), [policyField], []);
        delete policyDocument.properties['@context'];
        delete policyDocument.properties.type;
        delete policyDocument.properties.id;
        const snapshotSchema = (version) => ({
            templateSchemaId: 'tsid-1', name: 'N', description: 'D', entity: 'NONE', version, fields: [templateField], conditions: [],
        });
        return {
            policy: { id: 'policy-1' },
            binding: { templateId: 'template-1', templateName: 'T', templateVersion: '1.0.0' },
            snapshot: { schemas: { schemas: { 'tsid-1': snapshotSchema('1.0.0') } }, config: { schemas: {} } },
            nextSchemas: { schemas: { 'tsid-1': snapshotSchema('1.0.1') } },
            template: { id: 'template-1', name: 'T', version: '1.0.1', config: { schemas: {} } },
            templateSchemas: [],
            policySchemaByTemplateId: new Map([['tsid-1', {
                document: policyDocument, name: 'N', description: 'D', entity: 'NONE', version: '1.0.0',
                templateSchemaId: 'tsid-1', id: 'policy-schema-1',
            }]]),
        };
    };

    it('reports type, required, array and autocalculate edits made only in the policy as reverted', () => {
        const templateField = field('a');
        const policyField = field('a', { type: 'number', required: true, isArray: true, autocalculate: true });
        const preview = buildSchemaTemplateUpdatePreviewFromContext(buildContext(templateField, policyField));

        const change = preview.changes.find((c) => c.type === 'FIELD_UPDATE');
        assert.ok(change, 'a policy-only edit that the update reverts must be visible');
        const byLabel = Object.fromEntries(change.details.map((d) => [d.label, d]));
        assert.deepEqual([byLabel.Type.before, byLabel.Type.after], ['number', 'string']);
        assert.deepEqual([byLabel.Required.before, byLabel.Required.after], ['Yes', 'No']);
        assert.deepEqual([byLabel.Array.before, byLabel.Array.after], ['Yes', 'No']);
        assert.equal(byLabel.Autocalculate.before, 'Yes');
    });

    it('reports nothing for a field the policy left identical to the template', () => {
        const templateField = field('a');
        const preview = buildSchemaTemplateUpdatePreviewFromContext(buildContext(templateField, field('a')));

        assert.ok(!preview.changes.some((c) => c.type === 'FIELD_UPDATE'),
            'an untouched policy field and an unchanged template must produce no field update');
    });
});

describe('buildSchemaTemplateUpdatePreviewFromContext — condition removal', () => {
    const field = (name, over = {}) => ({
        name,
        title: name,
        description: name,
        type: 'string',
        required: false,
        isArray: false,
        isRef: false,
        readOnly: false,
        ...over,
    });

    const baseSchema = () => ({ uuid: 'u-1', version: '1.0.0', name: 'N', description: 'D', contextURL: 'ctx:' });

    // Constructed by hand instead of through loadSchemaTemplateUpdateContext (which needs a
    // live DB) - the preview builder only ever reads these specific properties off context.
    const buildContext = (nextConditions, previousConditions, policyDocument) => {
        const policySchema = {
            document: policyDocument,
            name: 'N', description: 'D', entity: 'NONE', version: '1.0.0',
            templateSchemaId: 'tsid-1', id: 'policy-schema-1',
        };
        return {
            policy: { id: 'policy-1' },
            binding: { templateId: 'template-1', templateName: 'T', templateVersion: '1.0.0' },
            snapshot: {
                schemas: { schemas: { 'tsid-1': { templateSchemaId: 'tsid-1', name: 'N', description: 'D', entity: 'NONE', version: '1.0.0', fields: [], conditions: previousConditions } } },
                config: { schemas: {} },
            },
            nextSchemas: {
                schemas: { 'tsid-1': { templateSchemaId: 'tsid-1', name: 'N', description: 'D', entity: 'NONE', version: '1.0.1', fields: [], conditions: nextConditions } },
            },
            template: { id: 'template-1', name: 'T', version: '1.0.1', config: { schemas: {} } },
            templateSchemas: [],
            policySchemaByTemplateId: new Map([['tsid-1', policySchema]]),
        };
    };

    it('raises a blocking conflict when the template removes a condition holding custom work', () => {
        const trigger = field('trigger', { templateFieldId: 'tpl-trigger-1' });
        const branchCustom = field('branchCustom');
        const policyDocument = SchemaHelper.buildDocument(
            baseSchema(),
            [trigger, branchCustom],
            [{ ifCondition: { field: trigger, fieldValue: 'yes' }, thenFields: [branchCustom], elseFields: [] }]
        );
        delete policyDocument.properties['@context'];
        delete policyDocument.properties.type;
        delete policyDocument.properties.id;

        const previousConditions = [{ ifCondition: { field: trigger, fieldValue: 'yes' }, thenFields: [branchCustom], elseFields: [] }];
        const context = buildContext([], previousConditions, policyDocument);

        const preview = buildSchemaTemplateUpdatePreviewFromContext(context);

        assert.equal(preview.canApply, false, 'a blocking conflict must prevent applying without a resolution');
        const conflict = preview.conflicts.find((c) => c.type === 'CONDITION_REMOVED_WITH_POLICY_USAGE');
        assert.ok(conflict, 'must raise the new conflict type');
        assert.equal(conflict.templateFieldId, 'SINGLE,tpl-trigger-1:"yes"');
        assert.equal(conflict.fieldName, 'branchCustom');
        assert.deepEqual(conflict.allowedActions, ['KEEP_AS_CUSTOM_CONDITION', 'REMOVE_FROM_POLICY']);
        assert.ok(preview.changes.some((c) => c.type === 'CONDITION_REMOVE'));
    });

    it('raises no conflict when the condition still has a match in the new template', () => {
        const trigger = field('trigger', { templateFieldId: 'tpl-trigger-1' });
        const branchCustom = field('branchCustom');
        const policyDocument = SchemaHelper.buildDocument(
            baseSchema(),
            [trigger, branchCustom],
            [{ ifCondition: { field: trigger, fieldValue: 'yes' }, thenFields: [branchCustom], elseFields: [] }]
        );
        delete policyDocument.properties['@context'];
        delete policyDocument.properties.type;
        delete policyDocument.properties.id;

        const previousConditions = [{ ifCondition: { field: trigger, fieldValue: 'yes' }, thenFields: [branchCustom], elseFields: [] }];
        const nextConditions = [{ ifCondition: { field: trigger, fieldValue: 'yes' }, thenFields: [], elseFields: [] }];
        const context = buildContext(nextConditions, previousConditions, policyDocument);

        const preview = buildSchemaTemplateUpdatePreviewFromContext(context);

        assert.equal(preview.canApply, true);
        assert.equal(preview.conflicts.length, 0);
        assert.ok(!preview.changes.some((c) => c.type === 'CONDITION_ADD'), 'an already-matched condition must not also be reported as newly added');
    });

    it('reports a CONDITION_ADD change when the template introduces a brand new condition', () => {
        const trigger1 = field('trigger1', { templateFieldId: 'tpl-trigger-1' });
        const trigger2 = field('trigger2', { templateFieldId: 'tpl-trigger-2' });
        const revealed = field('revealed', { templateFieldId: 'tpl-revealed-1' });
        // An empty thenFields/elseFields condition doesn't survive the document round-trip
        // (new InterfaceSchema(...).conditions drops it) - give it a branch field so
        // policySnapshot.conditions actually sees trigger1's condition as matchable.
        const policyDocument = SchemaHelper.buildDocument(
            baseSchema(),
            [trigger1, revealed],
            [{ ifCondition: { field: trigger1, fieldValue: 'yes' }, thenFields: [revealed], elseFields: [] }]
        );
        delete policyDocument.properties['@context'];
        delete policyDocument.properties.type;
        delete policyDocument.properties.id;

        const previousConditions = [{ ifCondition: { field: trigger1, fieldValue: 'yes' }, thenFields: [revealed], elseFields: [] }];
        const nextConditions = [
            { ifCondition: { field: trigger1, fieldValue: 'yes' }, thenFields: [revealed], elseFields: [] },
            { ifCondition: { field: trigger2, fieldValue: 'no' }, thenFields: [], elseFields: [] },
        ];
        const context = buildContext(nextConditions, previousConditions, policyDocument);

        const preview = buildSchemaTemplateUpdatePreviewFromContext(context);

        const addChange = preview.changes.find((c) => c.type === 'CONDITION_ADD');
        assert.ok(addChange, 'a brand new template condition must be reported as added');
        assert.equal(addChange.fieldName, 'trigger2 = no');
        assert.ok(!preview.changes.some((c) => c.type === 'CONDITION_ADD' && c.fieldName === 'trigger1 = yes'),
            'the already-matched condition must not also be reported as added');
    });

    it('reports CONDITION_REMOVE but raises no conflict for an orphaned condition with no custom content attached', () => {
        const trigger = field('trigger', { templateFieldId: 'tpl-trigger-1' });
        const revealed = field('revealed', { templateFieldId: 'tpl-revealed-1' });
        const policyDocument = SchemaHelper.buildDocument(
            baseSchema(),
            [trigger, revealed],
            [{ ifCondition: { field: trigger, fieldValue: 'yes' }, thenFields: [revealed], elseFields: [] }]
        );
        delete policyDocument.properties['@context'];
        delete policyDocument.properties.type;
        delete policyDocument.properties.id;

        const previousConditions = [{ ifCondition: { field: trigger, fieldValue: 'yes' }, thenFields: [revealed], elseFields: [] }];
        // Next template version no longer has a matching trigger - same ambiguity as a policy
        // author editing the trigger away: the system can't tell which happened, only that
        // nothing policy-authored (no custom field, no cross target) is at risk either way.
        const context = buildContext([], previousConditions, policyDocument);

        const preview = buildSchemaTemplateUpdatePreviewFromContext(context);

        const change = preview.changes.find((c) => c.type === 'CONDITION_REMOVE');
        assert.ok(change, 'an orphaned condition must always be reported, even with no custom content');
        assert.equal(preview.conflicts.length, 0, 'nothing policy-authored is at risk, so no resolution should be required');
        assert.equal(preview.canApply, true);
    });

    it('reports both a REMOVE and an ADD when the policy re-points an unlocked condition away from the template-unchanged original', () => {
        const triggerA = field('triggerA', { templateFieldId: 'tpl-trigger-a' });
        const triggerB = field('triggerB', { templateFieldId: 'tpl-trigger-b' });
        const revealed = field('revealed', { templateFieldId: 'tpl-revealed-1' });
        // Policy author edited the condition's own trigger from A to B (allowed - unlocked).
        const policyDocument = SchemaHelper.buildDocument(
            baseSchema(),
            [triggerA, triggerB, revealed],
            [{ ifCondition: { field: triggerB, fieldValue: 'yes' }, thenFields: [revealed], elseFields: [] }]
        );
        delete policyDocument.properties['@context'];
        delete policyDocument.properties.type;
        delete policyDocument.properties.id;

        const previousConditions = [{ ifCondition: { field: triggerB, fieldValue: 'yes' }, thenFields: [revealed], elseFields: [] }];
        // Template's own version of this condition is untouched - still keyed on trigger A.
        const nextConditions = [{ ifCondition: { field: triggerA, fieldValue: 'yes' }, thenFields: [revealed], elseFields: [] }];
        const context = buildContext(nextConditions, previousConditions, policyDocument);

        const preview = buildSchemaTemplateUpdatePreviewFromContext(context);

        assert.ok(preview.changes.some((c) => c.type === 'CONDITION_REMOVE'),
            'the policy-edited condition no longer matches anything in the template, so it must be reported as removed');
        assert.ok(preview.changes.some((c) => c.type === 'CONDITION_ADD'),
            'the template\'s own unchanged condition has no match among the policy\'s edited conditions, so it must be reported as added');
    });

    it('still reports REMOVE and ADD when the template swaps a condition trigger field and conditionsLocked is on', () => {
        const triggerA = field('triggerA', { templateFieldId: 'tpl-trigger-a' });
        const triggerB = field('triggerB', { templateFieldId: 'tpl-trigger-b' });
        const revealed = field('revealed', { templateFieldId: 'tpl-revealed-1' });
        const policyDocument = SchemaHelper.buildDocument(
            baseSchema(),
            [triggerA, triggerB, revealed],
            [{ ifCondition: { field: triggerA, fieldValue: 'yes' }, thenFields: [revealed], elseFields: [] }]
        );
        delete policyDocument.properties['@context'];
        delete policyDocument.properties.type;
        delete policyDocument.properties.id;

        const previousConditions = [{ ifCondition: { field: triggerA, fieldValue: 'yes' }, thenFields: [revealed], elseFields: [] }];
        const nextConditions = [{ ifCondition: { field: triggerB, fieldValue: 'yes' }, thenFields: [revealed], elseFields: [] }];
        const context = buildContext(nextConditions, previousConditions, policyDocument);
        context.template.config = { schemas: { 'tsid-1': { conditionsLocked: true } } };

        const preview = buildSchemaTemplateUpdatePreviewFromContext(context);

        assert.ok(preview.changes.some((c) => c.type === 'CONDITION_REMOVE'),
            'the replaced condition must be reported as removed even when conditions are locked');
        assert.ok(preview.changes.some((c) => c.type === 'CONDITION_ADD'));
        assert.equal(preview.conflicts.length, 0, 'locked conditions leave nothing for the user to resolve');
    });

    it('raises no conflict when customFieldsLocked already removes the field unconditionally', () => {
        const trigger = field('trigger', { templateFieldId: 'tpl-trigger-1' });
        const branchCustom = field('branchCustom');
        const policyDocument = SchemaHelper.buildDocument(
            baseSchema(),
            [trigger, branchCustom],
            [{ ifCondition: { field: trigger, fieldValue: 'yes' }, thenFields: [branchCustom], elseFields: [] }]
        );
        delete policyDocument.properties['@context'];
        delete policyDocument.properties.type;
        delete policyDocument.properties.id;

        const previousConditions = [{ ifCondition: { field: trigger, fieldValue: 'yes' }, thenFields: [branchCustom], elseFields: [] }];
        const context = buildContext([], previousConditions, policyDocument);
        context.template.config = { schemas: { 'tsid-1': { customFieldsLocked: true } } };

        const preview = buildSchemaTemplateUpdatePreviewFromContext(context);

        assert.equal(preview.conflicts.length, 0, 'nothing left to resolve when the field is being removed unconditionally anyway');
        assert.ok(preview.changes.some((c) => c.type === 'CUSTOM_FIELD_REMOVE'));
    });

    it('removes condition custom fields without a keep offer when conditionsLocked', () => {
        const trigger = field('trigger', { templateFieldId: 'tpl-trigger-1' });
        const branchCustom = field('branchCustom');
        const rootCustom = field('rootCustom');
        const policyDocument = SchemaHelper.buildDocument(
            baseSchema(),
            [trigger, branchCustom, rootCustom],
            [{ ifCondition: { field: trigger, fieldValue: 'yes' }, thenFields: [branchCustom], elseFields: [] }]
        );
        delete policyDocument.properties['@context'];
        delete policyDocument.properties.type;
        delete policyDocument.properties.id;

        const previousConditions = [{ ifCondition: { field: trigger, fieldValue: 'yes' }, thenFields: [branchCustom], elseFields: [] }];
        const nextConditions = [{ ifCondition: { field: trigger, fieldValue: 'yes' }, thenFields: [], elseFields: [] }];
        const context = buildContext(nextConditions, previousConditions, policyDocument);
        context.template.config = { schemas: { 'tsid-1': { customFieldsLocked: false, conditionsLocked: true } } };

        const preview = buildSchemaTemplateUpdatePreviewFromContext(context);

        assert.equal(preview.canApply, true);
        assert.equal(preview.conflicts.length, 0,
            'conditionsLocked means policy condition additions are removed automatically, not kept by resolution');
        assert.ok(preview.changes.some((c) => c.type === 'CUSTOM_FIELD_REMOVE' && c.fieldName === 'branchCustom'));
        assert.ok(preview.changes.some((c) => c.type === 'CUSTOM_FIELD_PRESERVE' && c.fieldName === 'rootCustom'));
    });

    it('lists policy-added cross-schema targets as removals when conditionsLocked', () => {
        const trigger = field('trigger', { templateFieldId: 'tpl-trigger-1' });
        const requiredChild = field('childField', { required: true });
        const policyDocument = SchemaHelper.buildDocument(
            baseSchema(),
            [trigger],
            [{
                ifCondition: { field: trigger, fieldValue: 'yes' },
                thenFields: [],
                elseFields: [],
                thenTargets: [{ field: requiredChild, fieldPath: ['parentRef', 'childField'] }],
            }]
        );
        delete policyDocument.properties['@context'];
        delete policyDocument.properties.type;
        delete policyDocument.properties.id;

        const previousConditions = [{ ifCondition: { field: trigger, fieldValue: 'yes' }, thenFields: [], elseFields: [] }];
        const nextConditions = [{ ifCondition: { field: trigger, fieldValue: 'yes' }, thenFields: [], elseFields: [] }];
        const context = buildContext(nextConditions, previousConditions, policyDocument);
        context.template.config = { schemas: { 'tsid-1': { customFieldsLocked: false, conditionsLocked: true } } };

        const preview = buildSchemaTemplateUpdatePreviewFromContext(context);

        assert.equal(preview.canApply, true);
        assert.equal(preview.conflicts.length, 0);
        assert.ok(preview.changes.some((c) =>
            c.type === 'CONDITION_REMOVE' &&
            c.fieldName === '(cross-schema target)' &&
            c.after === 'Removed'
        ));
    });

    it('raises a conflict for an orphaned condition held only by a cross-schema target, no custom field at all', () => {
        const trigger = field('trigger', { templateFieldId: 'tpl-trigger-1' });
        const requiredChild = field('childField', { required: true });
        const policyDocument = SchemaHelper.buildDocument(
            baseSchema(),
            [trigger],
            [{
                ifCondition: { field: trigger, fieldValue: 'yes' },
                thenFields: [],
                elseFields: [],
                thenTargets: [{ field: requiredChild, fieldPath: ['parentRef', 'childField'] }],
            }]
        );
        delete policyDocument.properties['@context'];
        delete policyDocument.properties.type;
        delete policyDocument.properties.id;

        const previousConditions = [{
            ifCondition: { field: trigger, fieldValue: 'yes' },
            thenFields: [],
            elseFields: [],
            thenTargets: [{ field: requiredChild, fieldPath: ['parentRef', 'childField'] }],
        }];
        const context = buildContext([], previousConditions, policyDocument);

        const preview = buildSchemaTemplateUpdatePreviewFromContext(context);

        assert.equal(preview.canApply, false);
        const conflict = preview.conflicts.find((c) => c.type === 'CONDITION_REMOVED_WITH_POLICY_USAGE');
        assert.ok(conflict, 'a cross-schema target has no templateFieldId of its own to filter on - the condition-level check must still catch it');
    });

    it('reports a lock toggle change even when nothing else about the schema changed', () => {
        const trigger = field('trigger', { templateFieldId: 'tpl-trigger-1' });
        const policyDocument = SchemaHelper.buildDocument(baseSchema(), [trigger], []);
        delete policyDocument.properties['@context'];
        delete policyDocument.properties.type;
        delete policyDocument.properties.id;

        // Same conditions on both sides (empty here) - only the config toggles differ.
        const context = buildContext([], [], policyDocument);
        context.snapshot.config = { schemas: { 'tsid-1': {} } };
        context.template.config = { schemas: { 'tsid-1': { customFieldsLocked: true, conditionsLocked: true } } };

        const preview = buildSchemaTemplateUpdatePreviewFromContext(context);

        const change = preview.changes.find((c) => c.type === 'SCHEMA_UPDATE');
        assert.ok(change, 'a toggle-only change must still be reported as a change');
        const labels = (change.details || []).map((d) => d.label);
        assert.ok(labels.includes('Custom fields locked'));
        assert.ok(labels.includes('Conditions locked'));
        const conditionsDetail = change.details.find((d) => d.label === 'Conditions locked');
        // formatDiffValue's existing convention: an absent config key formats as '-',
        // not 'No' - the same rule every other detail row in this diff already follows.
        assert.equal(conditionsDetail.before, '-');
        assert.equal(conditionsDetail.after, 'Yes');
    });

    it('reports a per-field lock toggle change even when the field itself did not change', () => {
        const snapshotField = { ...field('trigger', { templateFieldId: 'tpl-trigger-1' }) };
        const policyDocument = SchemaHelper.buildDocument(baseSchema(), [field('trigger', { templateFieldId: 'tpl-trigger-1' })], []);
        delete policyDocument.properties['@context'];
        delete policyDocument.properties.type;
        delete policyDocument.properties.id;

        const policySchema = {
            document: policyDocument,
            name: 'N', description: 'D', entity: 'NONE', version: '1.0.0',
            templateSchemaId: 'tsid-1', id: 'policy-schema-1',
        };
        const context = {
            policy: { id: 'policy-1' },
            binding: { templateId: 'template-1', templateName: 'T', templateVersion: '1.0.0' },
            snapshot: {
                schemas: { schemas: { 'tsid-1': { templateSchemaId: 'tsid-1', name: 'N', description: 'D', entity: 'NONE', version: '1.0.0', fields: [snapshotField], conditions: [] } } },
                config: { schemas: { 'tsid-1': { fields: { 'tpl-trigger-1': { locked: false } } } } },
            },
            nextSchemas: {
                schemas: { 'tsid-1': { templateSchemaId: 'tsid-1', name: 'N', description: 'D', entity: 'NONE', version: '1.0.1', fields: [snapshotField], conditions: [] } },
            },
            template: {
                id: 'template-1', name: 'T', version: '1.0.1',
                config: { schemas: { 'tsid-1': { fields: { 'tpl-trigger-1': { locked: true } } } } },
            },
            templateSchemas: [],
            policySchemaByTemplateId: new Map([['tsid-1', policySchema]]),
        };

        const preview = buildSchemaTemplateUpdatePreviewFromContext(context);

        const change = preview.changes.find((c) => c.type === 'FIELD_UPDATE');
        assert.ok(change, 'a per-field lock toggle must be reported even when the field content is unchanged');
        const lockedDetail = (change.details || []).find((d) => d.label === 'Locked');
        assert.ok(lockedDetail, 'the field-level lock change must appear as a detail row');
        assert.equal(lockedDetail.before, 'No');
        assert.equal(lockedDetail.after, 'Yes');
    });

    it('reports a per-condition lock toggle change even when the condition itself did not change', () => {
        const trigger = field('trigger', { templateFieldId: 'tpl-trigger-1' });
        const revealed = field('revealed');
        const condition = { ifCondition: { field: trigger, fieldValue: 'yes' }, thenFields: [revealed], elseFields: [] };
        const policyDocument = SchemaHelper.buildDocument(baseSchema(), [trigger, revealed], [condition]);
        delete policyDocument.properties['@context'];
        delete policyDocument.properties.type;
        delete policyDocument.properties.id;

        const signatureKey = 'SINGLE,tpl-trigger-1:"yes"';
        const policySchema = {
            document: policyDocument,
            name: 'N', description: 'D', entity: 'NONE', version: '1.0.0',
            templateSchemaId: 'tsid-1', id: 'policy-schema-1',
        };
        const context = {
            policy: { id: 'policy-1' },
            binding: { templateId: 'template-1', templateName: 'T', templateVersion: '1.0.0' },
            snapshot: {
                schemas: { schemas: { 'tsid-1': { templateSchemaId: 'tsid-1', name: 'N', description: 'D', entity: 'NONE', version: '1.0.0', fields: [trigger], conditions: [condition] } } },
                config: { schemas: { 'tsid-1': { conditions: { [signatureKey]: { locked: false } } } } },
            },
            nextSchemas: {
                schemas: { 'tsid-1': { templateSchemaId: 'tsid-1', name: 'N', description: 'D', entity: 'NONE', version: '1.0.1', fields: [trigger], conditions: [condition] } },
            },
            template: {
                id: 'template-1', name: 'T', version: '1.0.1',
                config: { schemas: { 'tsid-1': { conditions: { [signatureKey]: { locked: true } } } } },
            },
            templateSchemas: [],
            policySchemaByTemplateId: new Map([['tsid-1', policySchema]]),
        };

        const preview = buildSchemaTemplateUpdatePreviewFromContext(context);

        const change = preview.changes.find((c) => c.type === 'CONDITION_UPDATE');
        assert.ok(change, 'a per-condition lock toggle must be reported even when the condition is unchanged');
        const lockedDetail = (change.details || []).find((d) => d.label === 'Locked');
        assert.ok(lockedDetail, 'the condition-level lock change must appear as a detail row');
        assert.equal(lockedDetail.before, 'No');
        assert.equal(lockedDetail.after, 'Yes');
    });

    it('reports a single CONDITION_UPDATE (not remove+add) when only the trigger value changed (A==2 -> A==3)', () => {
        const trigger = field('A', { templateFieldId: 'tpl-a' });
        const revealed = field('revealed', { templateFieldId: 'tpl-revealed-1' });
        // Policy author edited the value only - same field, same combinator.
        const policyDocument = SchemaHelper.buildDocument(
            baseSchema(),
            [trigger, revealed],
            [{ ifCondition: { field: trigger, fieldValue: 3 }, thenFields: [revealed], elseFields: [] }]
        );
        delete policyDocument.properties['@context'];
        delete policyDocument.properties.type;
        delete policyDocument.properties.id;

        const previousConditions = [{ ifCondition: { field: trigger, fieldValue: 3 }, thenFields: [revealed], elseFields: [] }];
        // Template's own version never changed - still triggers on A == 2.
        const nextConditions = [{ ifCondition: { field: trigger, fieldValue: 2 }, thenFields: [revealed], elseFields: [] }];
        const context = buildContext(nextConditions, previousConditions, policyDocument);

        const preview = buildSchemaTemplateUpdatePreviewFromContext(context);

        assert.ok(!preview.changes.some((c) => c.type === 'CONDITION_ADD'),
            'an unambiguous value-only change must not also be reported as a brand new condition');
        assert.ok(!preview.changes.some((c) => c.type === 'CONDITION_REMOVE'),
            'an unambiguous value-only change must not also be reported as a removed condition');
        const change = preview.changes.find((c) => c.type === 'CONDITION_UPDATE');
        assert.ok(change, 'a value-only change on the same trigger field must be reported as a single update');
        const detail = (change.details || []).find((d) => d.label === 'Condition');
        assert.ok(detail, 'the condition summary row must show the value change');
        assert.ok(detail.before.includes('3'), `expected before to mention 3, got: ${detail.before}`);
        assert.ok(detail.after.includes('2'), `expected after to mention 2, got: ${detail.after}`);
    });

    const predicate = (f, v) => ({ field: f, fieldValue: v });
    const combinatorCases = [
        {
            label: 'IF -> IF ALL',
            prevIf: (a) => predicate(a, 'x'),
            nextIf: (a) => ({ AND: [predicate(a, 'x')] }),
            before: 'IF: ',
            after: 'IF ALL: ',
        },
        {
            label: 'IF ALL -> IF ANY',
            prevIf: (a, b) => ({ AND: [predicate(a, 'x'), predicate(b, 'y')] }),
            nextIf: (a, b) => ({ OR: [predicate(a, 'x'), predicate(b, 'y')] }),
            before: 'IF ALL: ',
            after: 'IF ANY: ',
        },
    ];
    for (const { label, prevIf, nextIf, before, after } of combinatorCases) {
        it(`reports a single CONDITION_UPDATE when only the combinator changes (${label})`, () => {
            const a = field('a', { templateFieldId: 'tpl-a' });
            const b = field('b', { templateFieldId: 'tpl-b' });
            const revealed = field('revealed', { templateFieldId: 'tpl-revealed-1' });
            const previousIf = prevIf(a, b);
            const policyDocument = SchemaHelper.buildDocument(
                baseSchema(), [a, b, revealed], [{ ifCondition: previousIf, thenFields: [revealed], elseFields: [] }]
            );
            delete policyDocument.properties['@context'];
            delete policyDocument.properties.type;
            delete policyDocument.properties.id;

            const context = buildContext(
                [{ ifCondition: nextIf(a, b), thenFields: [revealed], elseFields: [] }],
                [{ ifCondition: previousIf, thenFields: [revealed], elseFields: [] }],
                policyDocument
            );
            const preview = buildSchemaTemplateUpdatePreviewFromContext(context);

            assert.ok(!preview.changes.some((c) => c.type === 'CONDITION_ADD' || c.type === 'CONDITION_REMOVE'),
                'a combinator-only change must not be split into a remove + add');
            const change = preview.changes.find((c) => c.type === 'CONDITION_UPDATE');
            assert.ok(change, 'a combinator-only change must be reported as an update');
            const detail = change.details.find((d) => d.label === 'Condition');
            assert.ok(detail.before.startsWith(before), `before: ${detail.before}`);
            assert.ok(detail.after.startsWith(after), `after: ${detail.after}`);
        });
    }

    it('raises the keep-or-remove conflict when a changed condition value leaves policy custom fields under the old one', () => {
        const trigger = field('A', { templateFieldId: 'tpl-a' });
        const revealed = field('revealed', { templateFieldId: 'tpl-revealed-1' });
        const custom = field('custom', { templateFieldId: undefined });
        const policyDocument = SchemaHelper.buildDocument(
            baseSchema(),
            [trigger, revealed, custom],
            [{ ifCondition: { field: trigger, fieldValue: 1 }, thenFields: [revealed, custom], elseFields: [] }]
        );
        delete policyDocument.properties['@context'];
        delete policyDocument.properties.type;
        delete policyDocument.properties.id;

        const previousConditions = [{ ifCondition: { field: trigger, fieldValue: 1 }, thenFields: [revealed], elseFields: [] }];
        const nextConditions = [{ ifCondition: { field: trigger, fieldValue: 2 }, thenFields: [revealed], elseFields: [] }];
        const preview = buildSchemaTemplateUpdatePreviewFromContext(buildContext(nextConditions, previousConditions, policyDocument));

        assert.ok(preview.changes.some((c) => c.type === 'CONDITION_UPDATE'), 'still reported as one update');
        assert.ok(!preview.changes.some((c) => c.type === 'CONDITION_REMOVE'), 'no separate remove entry');
        const conflict = preview.conflicts.find((c) => c.type === 'CONDITION_REMOVED_WITH_POLICY_USAGE');
        assert.ok(conflict, 'apply drops the custom field unless the user keeps it, so the user must be asked');
        assert.equal(preview.canApply, false);
    });

    it('does not report a false lock change when a locked condition value changes and the lock moved with it', () => {
        const trigger = field('A', { templateFieldId: 'tpl-a' });
        const revealed = field('revealed', { templateFieldId: 'tpl-revealed-1' });
        const policyDocument = SchemaHelper.buildDocument(
            baseSchema(),
            [trigger, revealed],
            [{ ifCondition: { field: trigger, fieldValue: 1 }, thenFields: [revealed], elseFields: [] }]
        );
        delete policyDocument.properties['@context'];
        delete policyDocument.properties.type;
        delete policyDocument.properties.id;

        const previousConditions = [{ ifCondition: { field: trigger, fieldValue: 1 }, thenFields: [revealed], elseFields: [] }];
        const nextConditions = [{ ifCondition: { field: trigger, fieldValue: 2 }, thenFields: [revealed], elseFields: [] }];
        const context = buildContext(nextConditions, previousConditions, policyDocument);
        // Locked before under the old signature, and still locked after under the new one.
        context.snapshot.config = { schemas: { 'tsid-1': { conditions: { 'SINGLE,tpl-a:1': { locked: true } } } } };
        context.template.config = { schemas: { 'tsid-1': { conditions: { 'SINGLE,tpl-a:2': { locked: true } } } } };

        const change = buildSchemaTemplateUpdatePreviewFromContext(context).changes.find((c) => c.type === 'CONDITION_UPDATE');

        assert.ok(change);
        assert.ok(!change.details.some((d) => d.label === 'Locked'), 'the lock is unchanged, only the value moved');
        assert.ok(change.details.some((d) => d.label === 'Condition'));
    });

    it('reports a CONDITION_UPDATE with content details when only the comparator changes', () => {
        const trigger = field('trigger', { templateFieldId: 'tpl-trigger-1' });
        const revealed = field('revealed', { templateFieldId: 'tpl-revealed-1' });
        const policyDocument = SchemaHelper.buildDocument(
            baseSchema(),
            [trigger, revealed],
            [{ ifCondition: { field: trigger, fieldValue: 'yes' }, thenFields: [revealed], elseFields: [] }]
        );
        delete policyDocument.properties['@context'];
        delete policyDocument.properties.type;
        delete policyDocument.properties.id;

        const previousConditions = [{ ifCondition: { field: trigger, fieldValue: 'yes' }, thenFields: [revealed], elseFields: [] }];
        // Same field, same value, same combinator (still matches by trigger signature) -
        // only the comparator differs, which signature matching alone doesn't cover.
        const nextConditions = [{ ifCondition: { field: trigger, fieldValue: 'yes', comparator: 'contains' }, thenFields: [revealed], elseFields: [] }];
        const context = buildContext(nextConditions, previousConditions, policyDocument);

        const preview = buildSchemaTemplateUpdatePreviewFromContext(context);

        const change = preview.changes.find((c) => c.type === 'CONDITION_UPDATE');
        assert.ok(change, 'a comparator-only change on an otherwise-matched condition must still be reported');
        const detail = (change.details || []).find((d) => d.label === 'Condition');
        assert.ok(detail, 'the condition summary row must show the comparator change');
        assert.ok(detail.before.includes('equals'));
        assert.ok(detail.after.includes('contains'));
    });

    it('reports a per-link lock toggle change even when the link itself did not change', () => {
        const parent = field('parent', { templateFieldId: 'tpl-parent', isArray: true });
        const child = field('child', { templateFieldId: 'tpl-child', isArray: true });
        const dependency = { field: ['child'], on: ['parent'], kind: 'array' };
        // This block's own baseSchema() takes no arrayDependencies param (unlike the one in the
        // repeatable-link-removal block below) - add arrayDependencies on top of it here instead.
        const policyDocument = SchemaHelper.buildDocument({ ...baseSchema(), arrayDependencies: [dependency] }, [parent, child], []);
        delete policyDocument.properties['@context'];
        delete policyDocument.properties.type;
        delete policyDocument.properties.id;

        const policySchema = {
            document: policyDocument,
            name: 'N', description: 'D', entity: 'NONE', version: '1.0.0',
            templateSchemaId: 'tsid-1', id: 'policy-schema-1',
        };
        const context = {
            policy: { id: 'policy-1' },
            binding: { templateId: 'template-1', templateName: 'T', templateVersion: '1.0.0' },
            snapshot: {
                schemas: { schemas: { 'tsid-1': { templateSchemaId: 'tsid-1', name: 'N', description: 'D', entity: 'NONE', version: '1.0.0', fields: [parent, child], conditions: [], arrayDependencies: [dependency] } } },
                config: { schemas: { 'tsid-1': { repeatableLinks: { 'tpl-child': { locked: false } } } } },
            },
            nextSchemas: {
                schemas: { 'tsid-1': { templateSchemaId: 'tsid-1', name: 'N', description: 'D', entity: 'NONE', version: '1.0.1', fields: [parent, child], conditions: [], arrayDependencies: [dependency] } },
            },
            template: {
                id: 'template-1', name: 'T', version: '1.0.1',
                config: { schemas: { 'tsid-1': { repeatableLinks: { 'tpl-child': { locked: true } } } } },
            },
            templateSchemas: [],
            policySchemaByTemplateId: new Map([['tsid-1', policySchema]]),
        };

        const preview = buildSchemaTemplateUpdatePreviewFromContext(context);

        const change = preview.changes.find((c) => c.type === 'REPEATABLE_LINK_UPDATE');
        assert.ok(change, 'a per-link lock toggle must be reported even when the link is unchanged');
        const lockedDetail = (change.details || []).find((d) => d.label === 'Locked');
        assert.ok(lockedDetail, 'the link-level lock change must appear as a detail row');
        assert.equal(lockedDetail.before, 'No');
        assert.equal(lockedDetail.after, 'Yes');
    });

    it('reports a REPEATABLE_LINK_UPDATE with content details when a matched link is re-pointed to a different source array', () => {
        const parent = field('parent', { templateFieldId: 'tpl-parent', isArray: true });
        const grandparent = field('grandparent', { templateFieldId: 'tpl-grandparent', isArray: true });
        const child = field('child', { templateFieldId: 'tpl-child', isArray: true });
        const previousDependency = { field: ['child'], on: ['parent'], kind: 'array' };
        const policyDocument = SchemaHelper.buildDocument(
            { ...baseSchema(), arrayDependencies: [previousDependency] },
            [parent, grandparent, child],
            []
        );
        delete policyDocument.properties['@context'];
        delete policyDocument.properties.type;
        delete policyDocument.properties.id;

        const policySchema = {
            document: policyDocument,
            name: 'N', description: 'D', entity: 'NONE', version: '1.0.0',
            templateSchemaId: 'tsid-1', id: 'policy-schema-1',
        };
        // Template's next version still links the same dependent field ('child' - matched by
        // templateFieldId), but its source array changed from 'parent' to 'grandparent'.
        const nextDependency = { field: ['child'], on: ['grandparent'], kind: 'array' };
        const context = {
            policy: { id: 'policy-1' },
            binding: { templateId: 'template-1', templateName: 'T', templateVersion: '1.0.0' },
            snapshot: {
                schemas: { schemas: { 'tsid-1': { templateSchemaId: 'tsid-1', name: 'N', description: 'D', entity: 'NONE', version: '1.0.0', fields: [parent, grandparent, child], conditions: [], arrayDependencies: [previousDependency] } } },
                config: { schemas: {} },
            },
            nextSchemas: {
                schemas: { 'tsid-1': { templateSchemaId: 'tsid-1', name: 'N', description: 'D', entity: 'NONE', version: '1.0.1', fields: [parent, grandparent, child], conditions: [], arrayDependencies: [nextDependency] } },
            },
            template: { id: 'template-1', name: 'T', version: '1.0.1', config: { schemas: {} } },
            templateSchemas: [],
            policySchemaByTemplateId: new Map([['tsid-1', policySchema]]),
        };

        const preview = buildSchemaTemplateUpdatePreviewFromContext(context);

        const change = preview.changes.find((c) => c.type === 'REPEATABLE_LINK_UPDATE');
        assert.ok(change, 'a re-pointed source array on an otherwise-matched link must still be reported');
        const detail = (change.details || []).find((d) => d.label === 'Source array');
        assert.ok(detail, 'the source-array row must show the change');
        assert.equal(detail.before, 'parent');
        assert.equal(detail.after, 'grandparent');
    });

    const buildLinkContext = (previousLinks, nextLinks, policyLinks = previousLinks) => {
        const parent = field('parent', { templateFieldId: 'tpl-parent', isArray: true });
        const child = field('child', { templateFieldId: 'tpl-child', isArray: true });
        const policyDocument = SchemaHelper.buildDocument(
            { ...baseSchema(), arrayDependencies: policyLinks }, [parent, child], []
        );
        delete policyDocument.properties['@context'];
        delete policyDocument.properties.type;
        delete policyDocument.properties.id;
        const snapshotSchema = (version, arrayDependencies) => ({
            templateSchemaId: 'tsid-1', name: 'N', description: 'D', entity: 'NONE', version,
            fields: [parent, child], conditions: [], arrayDependencies,
        });
        return {
            policy: { id: 'policy-1' },
            binding: { templateId: 'template-1', templateName: 'T', templateVersion: '1.0.0' },
            snapshot: { schemas: { schemas: { 'tsid-1': snapshotSchema('1.0.0', previousLinks) } }, config: { schemas: {} } },
            nextSchemas: { schemas: { 'tsid-1': snapshotSchema('1.0.1', nextLinks) } },
            template: { id: 'template-1', name: 'T', version: '1.0.1', config: { schemas: {} } },
            templateSchemas: [],
            policySchemaByTemplateId: new Map([['tsid-1', {
                document: policyDocument, name: 'N', description: 'D', entity: 'NONE', version: '1.0.0',
                templateSchemaId: 'tsid-1', id: 'policy-schema-1',
            }]]),
        };
    };

    it('reports display name and copied value pair changes on an otherwise-matched link', () => {
        const previous = { field: ['child'], on: ['parent'], kind: 'array', title: ['name'], valueMappings: [{ source: ['code'], target: ['label'] }] };
        const next = { field: ['child'], on: ['parent'], kind: 'array', title: ['code'], valueMappings: [{ source: ['code'], target: ['label2'] }] };
        const preview = buildSchemaTemplateUpdatePreviewFromContext(buildLinkContext([previous], [next]));

        const change = preview.changes.find((c) => c.type === 'REPEATABLE_LINK_UPDATE');
        assert.ok(change, 'display name / copied value changes on a matched link must be reported');
        const byLabel = Object.fromEntries(change.details.map((d) => [d.label, d]));
        assert.deepEqual([byLabel['Display name'].before, byLabel['Display name'].after], ['name', 'code']);
        assert.deepEqual(
            [byLabel['Copied value pairs'].before, byLabel['Copied value pairs'].after],
            ['code -> label', 'code -> label2']
        );
        assert.ok(!byLabel['Source array'] && !byLabel['Dependent array'], 'unchanged rows are not listed');
    });

    describe('link content details when only one side can resolve nested fields', () => {
        // Policy snapshots keep a sub-schema array's nested fields; template snapshots drop them,
        // so a path like ['field_1'] resolves to "field 1" on the policy side and not on the template side.
        const entry = [
            { name: 'field_1', title: 'field 1', description: 'field 1' },
            { name: 'field_2', title: 'field 2', description: 'field 2' },
        ];
        const policyFields = [
            { name: 'parent', isArray: true, fields: entry },
            { name: 'child', isArray: true, fields: entry },
        ];
        const templateFields = [
            { name: 'parent', isArray: true, refTemplateSchemaId: 'sub-parent' },
            { name: 'child', isArray: true, refTemplateSchemaId: 'sub-child' },
        ];
        const link = { field: ['child'], on: ['parent'], kind: 'array', title: ['field_1'], valueMappings: [{ source: ['field_1'], target: ['field_2'] }] };

        it('reports nothing for an identical link (no field 1 vs field_1 false difference)', () => {
            assert.deepEqual(buildLinkContentChangeDetails(policyFields, link, templateFields, { ...link }), []);
        });

        it('shows the same display names on both sides of a real change', () => {
            const next = { ...link, title: ['field_2'], valueMappings: [{ source: ['field_2'], target: ['field_1'] }] };
            const rows = Object.fromEntries(buildLinkContentChangeDetails(policyFields, link, templateFields, next).map((d) => [d.label, d]));

            assert.deepEqual([rows['Display name'].before, rows['Display name'].after], ['field 1', 'field 2']);
            assert.deepEqual(
                [rows['Copied value pairs'].before, rows['Copied value pairs'].after],
                ['field 1 -> field 2', 'field 2 -> field 1']
            );
        });
    });

    it('does not report a pure reorder of copied value pairs', () => {
        const pairs = [{ source: ['a'], target: ['x'] }, { source: ['b'], target: ['y'] }];
        const previous = { field: ['child'], on: ['parent'], kind: 'array', valueMappings: pairs };
        const next = { ...previous, valueMappings: [...pairs].reverse() };
        const preview = buildSchemaTemplateUpdatePreviewFromContext(buildLinkContext([previous], [next]));

        assert.ok(!preview.changes.some((c) => c.type === 'REPEATABLE_LINK_UPDATE'));
    });

    it('describes source, dependent, display name and copied values on an added link', () => {
        const next = { field: ['child'], on: ['parent'], kind: 'array', title: ['name'], valueMappings: [{ source: ['code'], target: ['label'] }] };
        const preview = buildSchemaTemplateUpdatePreviewFromContext(buildLinkContext([], [next]));

        const change = preview.changes.find((c) => c.type === 'REPEATABLE_LINK_ADD');
        assert.ok(change);
        for (const part of ['Dependent array: child', 'Source array: parent', 'Display name: name', 'Copied values: code -> label']) {
            assert.ok(change.after.includes(part), `expected "${part}" in: ${change.after}`);
        }
    });

    it('reports a whole-schema repeatableLinksLocked toggle change even when nothing else changed', () => {
        const trigger = field('trigger', { templateFieldId: 'tpl-trigger-1' });
        const policyDocument = SchemaHelper.buildDocument(baseSchema(), [trigger], []);
        delete policyDocument.properties['@context'];
        delete policyDocument.properties.type;
        delete policyDocument.properties.id;

        const context = buildContextForLockDiff(policyDocument, trigger);
        context.snapshot.config = { schemas: { 'tsid-1': {} } };
        context.template.config = { schemas: { 'tsid-1': { repeatableLinksLocked: true } } };

        const preview = buildSchemaTemplateUpdatePreviewFromContext(context);

        const change = preview.changes.find((c) => c.type === 'SCHEMA_UPDATE');
        assert.ok(change, 'a repeatableLinksLocked toggle-only change must still be reported as a change');
        const labels = (change.details || []).map((d) => d.label);
        assert.ok(labels.includes('Repeatable links locked'));
    });
});

function buildContextForLockDiff(policyDocument, trigger) {
    const policySchema = {
        document: policyDocument,
        name: 'N', description: 'D', entity: 'NONE', version: '1.0.0',
        templateSchemaId: 'tsid-1', id: 'policy-schema-1',
    };
    return {
        policy: { id: 'policy-1' },
        binding: { templateId: 'template-1', templateName: 'T', templateVersion: '1.0.0' },
        snapshot: {
            schemas: { schemas: { 'tsid-1': { templateSchemaId: 'tsid-1', name: 'N', description: 'D', entity: 'NONE', version: '1.0.0', fields: [trigger], conditions: [] } } },
            config: { schemas: {} },
        },
        nextSchemas: {
            schemas: { 'tsid-1': { templateSchemaId: 'tsid-1', name: 'N', description: 'D', entity: 'NONE', version: '1.0.1', fields: [trigger], conditions: [] } },
        },
        template: { id: 'template-1', name: 'T', version: '1.0.1', config: { schemas: {} } },
        templateSchemas: [],
        policySchemaByTemplateId: new Map([['tsid-1', policySchema]]),
    };
}

// `preparePolicySchemaUpdate` clones `source.document` wholesale, including `$comment` where
// arrayDependencies live (interfaces/src/models/schema.ts:288-291). Classification mirrors
// conditions: a link is "wholly custom" when its dependent field (ISchemaArrayDependency.field,
// the terminal path segment) has no templateFieldId - carries over automatically, no conflict.
// A link whose dependent field has a templateFieldId but no match in the new template's own
// arrayDependencies is "orphaned" (the system cannot tell "template removed this" from "policy
// added this on a template field") - dropped by default, kept via KEEP_AS_CUSTOM_LINK.
describe('preparePolicySchemaUpdate — repeatable link membership', () => {
    const field = (name, over = {}) => ({
        name,
        title: name,
        description: name,
        type: 'string',
        required: false,
        isArray: false,
        isRef: false,
        readOnly: false,
        ...over,
    });

    const baseSchema = (arrayDependencies = []) => ({
        uuid: 'u-1', version: '1.0.0', name: 'N', description: 'D', contextURL: 'ctx:', arrayDependencies,
    });

    const asSchema = (document, over = {}) => ({
        document,
        name: 'N',
        description: 'D',
        entity: 'NONE',
        version: '1.0.0',
        templateSchemaId: 'tsid-1',
        ...over,
    });

    const stripEnvelope = (document) => {
        delete document.properties['@context'];
        delete document.properties.type;
        delete document.properties.id;
    };

    const readLinks = (document) => SchemaHelper.parseSchemaComment(document.$comment).arrayDependencies || [];

    it('preserves a wholly policy-authored repeatable link across a template update (the real pre-existing bug)', () => {
        // Both the dependent field and the link itself are purely policy-authored - the
        // template never defined either, in any version. No ambiguity, no conflict needed:
        // this must always survive, exactly like a wholly-custom condition always does.
        const parent = field('parent', { templateFieldId: 'tpl-parent', isArray: true });
        const customChild = field('customChild', { isArray: true }); // no templateFieldId
        const dependency = { field: ['customChild'], on: ['parent'], kind: 'array' };
        const targetDocument = SchemaHelper.buildDocument(baseSchema([dependency]), [parent, customChild], []);
        stripEnvelope(targetDocument);
        const sourceDocument = SchemaHelper.buildDocument(baseSchema([]), [parent], []);

        const target = asSchema(targetDocument);
        const source = asSchema(sourceDocument);

        preparePolicySchemaUpdate(target, source, 'template-1', { customFieldsLocked: false, conditionsLocked: false, schemaSettingsLocked: false });

        assert.deepEqual(readLinks(target.document), [dependency],
            'a wholly policy-authored repeatable link must survive a template update, not be silently wiped');
    });

    it('does not duplicate a link the new template still defines itself (matched case)', () => {
        const parent = field('parent', { templateFieldId: 'tpl-parent', isArray: true });
        const child = field('child', { templateFieldId: 'tpl-child', isArray: true });
        const dependency = { field: ['child'], on: ['parent'], kind: 'array' };
        const targetDocument = SchemaHelper.buildDocument(baseSchema([dependency]), [parent, child], []);
        stripEnvelope(targetDocument);
        // The new template version still defines this exact link itself.
        const sourceDocument = SchemaHelper.buildDocument(baseSchema([dependency]), [parent, child], []);

        const target = asSchema(targetDocument);
        const source = asSchema(sourceDocument);

        preparePolicySchemaUpdate(target, source, 'template-1', { customFieldsLocked: false, conditionsLocked: false, schemaSettingsLocked: false });

        assert.deepEqual(readLinks(target.document), [dependency]);
    });

    it('drops all repeatable links when repeatableLinksLocked is true', () => {
        const parent = field('parent', { templateFieldId: 'tpl-parent', isArray: true });
        const customChild = field('customChild', { isArray: true });
        const dependency = { field: ['customChild'], on: ['parent'], kind: 'array' };
        const targetDocument = SchemaHelper.buildDocument(baseSchema([dependency]), [parent, customChild], []);
        stripEnvelope(targetDocument);
        const sourceDocument = SchemaHelper.buildDocument(baseSchema([]), [parent], []);

        const target = asSchema(targetDocument);
        const source = asSchema(sourceDocument);

        preparePolicySchemaUpdate(target, source, 'template-1', { customFieldsLocked: false, repeatableLinksLocked: true, schemaSettingsLocked: false });

        assert.deepEqual(readLinks(target.document), [],
            'repeatableLinksLocked must drop every repeatable link unconditionally, same as customFieldsLocked does for fields');
    });

    it('drops an orphaned repeatable link (template unlinked two still-existing fields) when no resolution is given', () => {
        const parent = field('parent', { templateFieldId: 'tpl-parent', isArray: true });
        const child = field('child', { templateFieldId: 'tpl-child', isArray: true });
        const dependency = { field: ['child'], on: ['parent'], kind: 'array' };
        const targetDocument = SchemaHelper.buildDocument(baseSchema([dependency]), [parent, child], []);
        stripEnvelope(targetDocument);
        // Both arrays still exist in the new template (same templateFieldIds) - the template
        // author just removed the pairing between them, not either field.
        const sourceDocument = SchemaHelper.buildDocument(baseSchema([]), [parent, child], []);

        const target = asSchema(targetDocument);
        const source = asSchema(sourceDocument);

        preparePolicySchemaUpdate(
            target, source, 'template-1',
            { customFieldsLocked: false, conditionsLocked: false, schemaSettingsLocked: false },
            [], new Map()
        );

        assert.deepEqual(readLinks(target.document), [],
            'an orphaned link with no explicit keep-resolution must be dropped, not silently restored');
    });

    it('restores an orphaned repeatable link verbatim via KEEP_AS_CUSTOM_LINK', () => {
        const parent = field('parent', { templateFieldId: 'tpl-parent', isArray: true });
        const child = field('child', { templateFieldId: 'tpl-child', isArray: true });
        const dependency = { field: ['child'], on: ['parent'], kind: 'array' };
        const targetDocument = SchemaHelper.buildDocument(baseSchema([dependency]), [parent, child], []);
        stripEnvelope(targetDocument);
        const sourceDocument = SchemaHelper.buildDocument(baseSchema([]), [parent, child], []);

        const target = asSchema(targetDocument);
        const source = asSchema(sourceDocument);

        // Same conflict/resolution parameters conditions use (positions 5 and 6) - generic
        // ISchemaTemplateUpdateConflict[]/Map<string, action> collections, filtered by `.type`.
        preparePolicySchemaUpdate(
            target, source, 'template-1',
            { customFieldsLocked: false, conditionsLocked: false, schemaSettingsLocked: false },
            [{
                id: 'conflict-link-1',
                type: 'REPEATABLE_LINK_REMOVED_WITH_POLICY_USAGE',
                templateFieldId: 'tpl-child',
                allowedActions: ['KEEP_AS_CUSTOM_LINK', 'REMOVE_FROM_POLICY'],
            }],
            new Map([['conflict-link-1', 'KEEP_AS_CUSTOM_LINK']])
        );

        assert.deepEqual(readLinks(target.document), [dependency],
            'KEEP_AS_CUSTOM_LINK must carry the orphaned link over verbatim');
    });
});

// Mirrors `buildSchemaTemplateUpdatePreviewFromContext — condition removal`, for repeatable
// links. `arrayDependencies` is set directly on the snapshot/next schema objects, paralleling
// `.conditions` there.
describe('buildSchemaTemplateUpdatePreviewFromContext — repeatable link removal', () => {
    const field = (name, over = {}) => ({
        name,
        title: name,
        description: name,
        type: 'string',
        required: false,
        isArray: false,
        isRef: false,
        readOnly: false,
        ...over,
    });

    const baseSchema = (arrayDependencies = []) => ({
        uuid: 'u-1', version: '1.0.0', name: 'N', description: 'D', contextURL: 'ctx:', arrayDependencies,
    });

    const buildContext = (nextLinks, previousLinks, policyDocument, nextFields = [], previousFields = []) => {
        const policySchema = {
            document: policyDocument,
            name: 'N', description: 'D', entity: 'NONE', version: '1.0.0',
            templateSchemaId: 'tsid-1', id: 'policy-schema-1',
        };
        return {
            policy: { id: 'policy-1' },
            binding: { templateId: 'template-1', templateName: 'T', templateVersion: '1.0.0' },
            snapshot: {
                schemas: { schemas: { 'tsid-1': { templateSchemaId: 'tsid-1', name: 'N', description: 'D', entity: 'NONE', version: '1.0.0', fields: previousFields, conditions: [], arrayDependencies: previousLinks } } },
                config: { schemas: {} },
            },
            nextSchemas: {
                schemas: { 'tsid-1': { templateSchemaId: 'tsid-1', name: 'N', description: 'D', entity: 'NONE', version: '1.0.1', fields: nextFields, conditions: [], arrayDependencies: nextLinks } },
            },
            template: { id: 'template-1', name: 'T', version: '1.0.1', config: { schemas: {} } },
            templateSchemas: [],
            policySchemaByTemplateId: new Map([['tsid-1', policySchema]]),
        };
    };

    it('raises a blocking conflict when the template removes a repeatable link holding policy usage', () => {
        const parent = field('parent', { templateFieldId: 'tpl-parent', isArray: true });
        const child = field('child', { templateFieldId: 'tpl-child', isArray: true });
        const dependency = { field: ['child'], on: ['parent'], kind: 'array' };
        const policyDocument = SchemaHelper.buildDocument(baseSchema([dependency]), [parent, child], []);
        delete policyDocument.properties['@context'];
        delete policyDocument.properties.type;
        delete policyDocument.properties.id;

        const context = buildContext([], [dependency], policyDocument, [], [parent, child]);

        const preview = buildSchemaTemplateUpdatePreviewFromContext(context);

        assert.equal(preview.canApply, false, 'a blocking conflict must prevent applying without a resolution');
        const conflict = preview.conflicts.find((c) => c.type === 'REPEATABLE_LINK_REMOVED_WITH_POLICY_USAGE');
        assert.ok(conflict, 'must raise the new conflict type');
        assert.equal(conflict.templateFieldId, 'tpl-child');
        assert.deepEqual(conflict.allowedActions, ['KEEP_AS_CUSTOM_LINK', 'REMOVE_FROM_POLICY']);
        assert.ok(preview.changes.some((c) => c.type === 'REPEATABLE_LINK_REMOVE'));
    });

    it('raises no conflict when the repeatable link still matches in the new template', () => {
        const parent = field('parent', { templateFieldId: 'tpl-parent', isArray: true });
        const child = field('child', { templateFieldId: 'tpl-child', isArray: true });
        const dependency = { field: ['child'], on: ['parent'], kind: 'array' };
        const policyDocument = SchemaHelper.buildDocument(baseSchema([dependency]), [parent, child], []);
        delete policyDocument.properties['@context'];
        delete policyDocument.properties.type;
        delete policyDocument.properties.id;

        const context = buildContext([dependency], [dependency], policyDocument, [parent, child]);

        const preview = buildSchemaTemplateUpdatePreviewFromContext(context);

        assert.equal(preview.canApply, true);
        assert.equal(preview.conflicts.length, 0);
        assert.ok(!preview.changes.some((c) => c.type === 'REPEATABLE_LINK_ADD'), 'an already-matched link must not also be reported as newly added');
    });

    it('reports a REPEATABLE_LINK_ADD change when the template introduces a brand new link', () => {
        const parent = field('parent', { templateFieldId: 'tpl-parent', isArray: true });
        const child = field('child', { templateFieldId: 'tpl-child', isArray: true });
        const dependency = { field: ['child'], on: ['parent'], kind: 'array' };
        const policyDocument = SchemaHelper.buildDocument(baseSchema([]), [parent, child], []);
        delete policyDocument.properties['@context'];
        delete policyDocument.properties.type;
        delete policyDocument.properties.id;

        const context = buildContext([dependency], [], policyDocument, [parent, child]);

        const preview = buildSchemaTemplateUpdatePreviewFromContext(context);

        const addChange = preview.changes.find((c) => c.type === 'REPEATABLE_LINK_ADD');
        assert.ok(addChange, 'a brand new template link must be reported as added');
        assert.equal(addChange.fieldName, 'child');
    });

    it('raises no conflict when repeatableLinksLocked already removes every link unconditionally', () => {
        const parent = field('parent', { templateFieldId: 'tpl-parent', isArray: true });
        const child = field('child', { templateFieldId: 'tpl-child', isArray: true });
        const dependency = { field: ['child'], on: ['parent'], kind: 'array' };
        const policyDocument = SchemaHelper.buildDocument(baseSchema([dependency]), [parent, child], []);
        delete policyDocument.properties['@context'];
        delete policyDocument.properties.type;
        delete policyDocument.properties.id;

        const context = buildContext([], [dependency], policyDocument);
        context.template.config = { schemas: { 'tsid-1': { repeatableLinksLocked: true } } };

        const preview = buildSchemaTemplateUpdatePreviewFromContext(context);

        assert.equal(preview.conflicts.length, 0,
            'nothing left to resolve when every link is removed unconditionally anyway');
    });

    it('treats a link the policy added on a template array field as policy-authored, not as removed from the template', () => {
        const parent = field('parent', { templateFieldId: 'tpl-parent', isArray: true });
        const child = field('child', { templateFieldId: 'tpl-child', isArray: true });
        const dependency = { field: ['child'], on: ['parent'], kind: 'array' };
        const policyDocument = SchemaHelper.buildDocument(baseSchema([dependency]), [parent, child], []);
        delete policyDocument.properties['@context'];
        delete policyDocument.properties.type;
        delete policyDocument.properties.id;

        // The template never had this link - neither its previous nor its next version.
        const context = buildContext([], [], policyDocument, [parent, child], [parent, child]);
        const preview = buildSchemaTemplateUpdatePreviewFromContext(context);

        assert.ok(!preview.changes.some((c) => c.type === 'REPEATABLE_LINK_REMOVE'),
            'a policy-added link was never in the template, so it cannot have been removed from it');
        assert.ok(!preview.conflicts.some((c) => c.type === 'REPEATABLE_LINK_REMOVED_WITH_POLICY_USAGE'));
    });

    it('still raises the removal conflict when the previous template version did have the link', () => {
        const parent = field('parent', { templateFieldId: 'tpl-parent', isArray: true });
        const child = field('child', { templateFieldId: 'tpl-child', isArray: true });
        const dependency = { field: ['child'], on: ['parent'], kind: 'array' };
        const policyDocument = SchemaHelper.buildDocument(baseSchema([dependency]), [parent, child], []);
        delete policyDocument.properties['@context'];
        delete policyDocument.properties.type;
        delete policyDocument.properties.id;

        const context = buildContext([], [dependency], policyDocument, [parent, child], [parent, child]);
        const preview = buildSchemaTemplateUpdatePreviewFromContext(context);

        assert.ok(preview.conflicts.some((c) => c.type === 'REPEATABLE_LINK_REMOVED_WITH_POLICY_USAGE'));
    });

    it('matches a link whose dependent path runs through a sub-schema array the template snapshot cannot resolve', () => {
        const entry = [field('inner', { templateFieldId: 'tpl-inner' })];
        // Policy side keeps the nested fields; the template snapshot drops them for a sub-schema ref.
        const policyFields = [field('outer', { templateFieldId: 'tpl-outer', isArray: true, fields: entry })];
        const templateFields = [field('outer', { templateFieldId: 'tpl-outer', isArray: true, refTemplateSchemaId: 'sub-outer' })];
        const nestedLink = { field: ['outer', 'inner'], on: ['outer', 'inner'], kind: 'array' };

        const classification = classifyArrayDependenciesAgainstSource(
            [nestedLink], policyFields, [nestedLink], templateFields,
            { links: [nestedLink], fields: templateFields }
        );

        assert.deepEqual([...classification.matchedIndexByOldIndex], [[0, 0]], 'the same link must match itself');
        assert.equal(classification.orphanedIndices.size, 0);
    });

    it('does not borrow the policy identity for a top-level link field the template really removed', () => {
        const policyFields = [field('gone', { templateFieldId: 'tpl-gone', isArray: true })];
        const link = { field: ['gone'], on: ['gone'], kind: 'array' };

        const classification = classifyArrayDependenciesAgainstSource(
            [link], policyFields, [], [], { links: [link], fields: policyFields }
        );

        assert.equal(classification.matchedIndexByOldIndex.size, 0);
        assert.deepEqual([...classification.orphanedIndices], [0], 'a removed template link is still an orphan');
    });
});


describe('preparePolicySchemaUpdate - value-changed condition with policy custom fields', () => {
    const field = (name, over = {}) => ({
        name, title: name, description: name, type: 'string', required: false,
        isArray: false, isRef: false, readOnly: false, templateFieldId: `tpl-${name}`, ...over,
    });
    const base = { uuid: 'u-1', version: '1.0.0', name: 'N', description: 'D', contextURL: 'ctx:' };
    const trigger = field('A');
    const revealed = field('revealed');
    const custom = field('custom', { templateFieldId: undefined });
    const makeSchema = (fields, conditions) => ({
        document: SchemaHelper.buildDocument(base, fields, conditions),
        name: 'N', description: 'D', entity: 'NONE', version: '1.0.0', contextURL: 'ctx:', templateSchemaId: 'tsid-1',
    });
    const run = (resolution) => {
        const target = makeSchema(
            [trigger, revealed, custom],
            [{ ifCondition: { field: trigger, fieldValue: '1' }, thenFields: [revealed, custom], elseFields: [] }]
        );
        const source = makeSchema(
            [trigger, revealed],
            [{ ifCondition: { field: trigger, fieldValue: '2' }, thenFields: [revealed], elseFields: [] }]
        );
        const conflicts = [{ id: 'c-1', type: 'CONDITION_REMOVED_WITH_POLICY_USAGE', templateFieldId: 'SINGLE,tpl-A:"1"' }];
        preparePolicySchemaUpdate(target, source, 'template-1', {}, conflicts, new Map(resolution ? [['c-1', resolution]] : []));
        return JSON.stringify(target.document);
    };

    it('drops the custom field when the user chooses to remove it', () => {
        assert.ok(!run('REMOVE_FROM_POLICY').includes('"custom"'));
    });

    it('keeps the custom field when the user chooses to keep the old condition as custom', () => {
        assert.ok(run('KEEP_AS_CUSTOM_CONDITION').includes('"custom"'));
    });
});


describe('policy-authored repeatable links when their fields or the link category are removed', () => {
    const field = (name, over = {}) => ({
        name, title: name, description: name, type: 'string', required: false,
        isArray: true, isRef: false, readOnly: false, ...over,
    });
    const base = { uuid: 'u-1', version: '1.0.0', name: 'N', description: 'D', contextURL: 'ctx:' };
    const templateField = field('t1', { templateFieldId: 'tpl-t1' });
    const x = field('x');
    const y = field('y');
    const link = { field: ['y'], on: ['x'], kind: 'array' };
    const makeSchema = (fields, links) => ({
        document: SchemaHelper.buildDocument({ ...base, arrayDependencies: links }, fields, []),
        name: 'N', description: 'D', entity: 'NONE', version: '1.0.0', contextURL: 'ctx:', templateSchemaId: 'tsid-1',
    });
    const linksAfterApply = (config) => {
        const target = makeSchema([templateField, x, y], [link]);
        preparePolicySchemaUpdate(target, makeSchema([templateField], []), 'template-1', config, [], new Map());
        return new InterfaceSchema(target, true).arrayDependencies || [];
    };
    const previewFor = (config) => {
        const policy = makeSchema([templateField, x, y], [link]);
        const snapshot = (version) => ({
            templateSchemaId: 'tsid-1', name: 'N', description: 'D', entity: 'NONE', version,
            fields: [templateField], conditions: [], arrayDependencies: [],
        });
        return buildSchemaTemplateUpdatePreviewFromContext({
            policy: { id: 'policy-1' },
            binding: { templateId: 'template-1', templateName: 'T', templateVersion: '1.0.0' },
            snapshot: { schemas: { schemas: { 'tsid-1': snapshot('1.0.0') } }, config: { schemas: {} } },
            nextSchemas: { schemas: { 'tsid-1': snapshot('1.0.1') } },
            template: { id: 'template-1', name: 'T', version: '1.0.1', config: { schemas: { 'tsid-1': config } } },
            templateSchemas: [],
            policySchemaByTemplateId: new Map([['tsid-1', { ...policy, id: 'policy-schema-1' }]]),
        });
    };

    it('does not carry a link over when customFieldsLocked removes the fields it points at', () => {
        assert.deepEqual(linksAfterApply({ customFieldsLocked: true }), []);
    });

    it('still carries the link over when its fields survive', () => {
        assert.equal(linksAfterApply({}).length, 1);
    });

    it('reports a REPEATABLE_LINK_REMOVE for a policy link dropped by repeatableLinksLocked', () => {
        const change = previewFor({ repeatableLinksLocked: true }).changes.find((c) => c.type === 'REPEATABLE_LINK_REMOVE');
        assert.ok(change, 'the silent loss must be visible');
        assert.ok(change.message.includes('locked'), change.message);
    });

    it('reports a REPEATABLE_LINK_REMOVE for a policy link whose fields are removed by customFieldsLocked', () => {
        const change = previewFor({ customFieldsLocked: true }).changes.find((c) => c.type === 'REPEATABLE_LINK_REMOVE');
        assert.ok(change);
        assert.ok(change.message.includes('removed'), change.message);
    });

    it('reports nothing for a surviving policy link', () => {
        assert.ok(!previewFor({}).changes.some((c) => c.type === 'REPEATABLE_LINK_REMOVE'));
    });
});

describe('condition lock keys follow an edited condition', () => {
    const field = (name, id) => ({
        name, title: name, description: name, type: 'string', required: false,
        isArray: false, isRef: false, readOnly: false, templateFieldId: id,
    });
    const a = field('a', 'tpl-a');
    const b = field('b', 'tpl-b');
    const revealed = field('revealed', 'tpl-r');
    const base = { uuid: 'u-1', version: '1.0.0', name: 'N', description: 'D', contextURL: 'ctx:' };
    const schemaWith = (conditions) => ({
        document: SchemaHelper.buildDocument(base, [a, b, revealed], conditions),
        name: 'N', description: 'D', entity: 'NONE', version: '1.0.0', contextURL: 'ctx:',
        templateSchemaId: 'tsid-1', id: 'db-1',
    });
    const cond = (ifCondition) => ({ ifCondition, thenFields: [revealed], elseFields: [] });
    const keys = (config) => Object.keys(config.schemas['tsid-1'].conditions);

    it('moves a lock onto the same condition after its value changes', () => {
        const config = { schemas: { 'tsid-1': { conditions: { 'SINGLE,tpl-a:"1"': { locked: true } } } } };
        const result = normalizeTemplateConfigKeys(config, [schemaWith([cond({ field: a, fieldValue: '2' })])]);

        assert.deepEqual(keys(result), ['SINGLE,tpl-a:"2"']);
        assert.equal(result.schemas['tsid-1'].conditions['SINGLE,tpl-a:"2"'].locked, true);
    });

    it('moves a lock onto the same condition after IF ALL becomes IF ANY', () => {
        const config = { schemas: { 'tsid-1': { conditions: { 'AND,tpl-a:"1",tpl-b:"2"': { locked: true } } } } };
        const result = normalizeTemplateConfigKeys(config, [
            schemaWith([cond({ OR: [{ field: a, fieldValue: '1' }, { field: b, fieldValue: '2' }] })]),
        ]);

        assert.deepEqual(keys(result), ['OR,tpl-a:"1",tpl-b:"2"']);
        assert.equal(result.schemas['tsid-1'].conditions['OR,tpl-a:"1",tpl-b:"2"'].locked, true);
    });

    it('leaves a lock alone when its condition still matches', () => {
        const config = { schemas: { 'tsid-1': { conditions: { 'SINGLE,tpl-a:"1"': { locked: true } } } } };
        const result = normalizeTemplateConfigKeys(config, [schemaWith([cond({ field: a, fieldValue: '1' })])]);

        assert.deepEqual(keys(result), ['SINGLE,tpl-a:"1"']);
    });

    it('does not move a lock onto a condition on a different trigger field', () => {
        const config = { schemas: { 'tsid-1': { conditions: { 'SINGLE,tpl-a:"1"': { locked: true } } } } };
        const result = normalizeTemplateConfigKeys(config, [schemaWith([cond({ field: b, fieldValue: '1' })])]);

        assert.deepEqual(keys(result), ['SINGLE,tpl-a:"1"'], 'a different trigger field is a different condition');
    });

    it('does not guess when two edited conditions share the trigger field', () => {
        const config = {
            schemas: { 'tsid-1': { conditions: { 'SINGLE,tpl-a:"1"': { locked: true }, 'SINGLE,tpl-a:"2"': { locked: true } } } },
        };
        const result = normalizeTemplateConfigKeys(config, [
            schemaWith([cond({ field: a, fieldValue: '8' }), cond({ field: a, fieldValue: '9' })]),
        ]);

        assert.deepEqual(keys(result).sort(), ['SINGLE,tpl-a:"1"', 'SINGLE,tpl-a:"2"']);
    });
});
