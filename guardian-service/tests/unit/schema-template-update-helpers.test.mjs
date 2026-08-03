import assert from 'node:assert/strict';
import {
    buildFieldChangeDetails,
    buildTemplateSchemasSnapshot,
    createTemplateStateHash,
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
