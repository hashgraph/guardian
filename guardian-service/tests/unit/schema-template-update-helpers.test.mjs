import assert from 'node:assert/strict';
import {
    buildFieldChangeDetails,
    buildTemplateSchemasSnapshot,
    createTemplateStateHash,
    mergeCustomFieldsIntoDocument,
    normalizeFieldForDiff,
} from '../../dist/api/schema-template.service.js';
import { SchemaHelper } from '../../../interfaces/dist/helpers/schema-helper.js';

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
