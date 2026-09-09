import assert from 'node:assert/strict';
import { SchemaHelper } from '../dist/helpers/schema-helper.js';

const documentWithTemplateIds = () => ({
    type: 'object',
    properties: {
        first: {
            type: 'string',
            templateFieldId: 'field-first'
        },
        nested: {
            type: 'object',
            templateFieldId: 'field-nested',
            properties: {
                child: {
                    type: 'number',
                    templateFieldId: 'field-child'
                }
            }
        },
        list: {
            type: 'array',
            templateFieldId: 'field-list',
            items: {
                type: 'object',
                properties: {
                    item: {
                        type: 'boolean',
                        templateFieldId: 'field-list-item'
                    }
                }
            }
        }
    }
});

describe('SchemaHelper template metadata', () => {
    it('collects template field ids by nested path', () => {
        const result = SchemaHelper.collectTemplateFieldIds(documentWithTemplateIds());

        assert.equal(result.byPath.get('first'), 'field-first');
        assert.equal(result.byPath.get('nested.child'), 'field-child');
        assert.equal(result.byPath.get('list.item'), 'field-list-item');
        assert.equal(result.ids.has('field-nested'), true);
    });

    it('preserves previous template field ids by path and removes new policy-only ids', () => {
        const previous = documentWithTemplateIds();
        const next = {
            type: 'object',
            properties: {
                first: { type: 'string' },
                nested: {
                    type: 'object',
                    properties: {
                        child: { type: 'number' }
                    }
                },
                custom: {
                    type: 'string',
                    templateFieldId: 'incoming-custom'
                }
            }
        };

        SchemaHelper.preserveTemplateFieldIds(next, previous);

        assert.equal(next.properties.first.templateFieldId, 'field-first');
        assert.equal(next.properties.nested.templateFieldId, 'field-nested');
        assert.equal(next.properties.nested.properties.child.templateFieldId, 'field-child');
        assert.equal(next.properties.custom.templateFieldId, undefined);
    });

    it('removes all template field ids from a detached schema document', () => {
        const document = documentWithTemplateIds();

        SchemaHelper.removeTemplateFieldIds(document);

        assert.deepEqual([...SchemaHelper.collectTemplateFieldIds(document).ids], []);
    });
});

describe('SchemaHelper stable runtime values', () => {
    it('drops runtime-only field keys but preserves persistent settings', () => {
        const source = {
            name: 'field_1',
            templateFieldId: 'template-field-1',
            type: 'string',
            path: 'field_1',
            fullPath: '#schema/field_1',
            fullType: 'string',
            arrayLvl: 0,
            errors: ['runtime'],
            fields: [
                {
                    name: 'child',
                    type: 'number',
                    path: 'field_1.child'
                }
            ]
        };

        const cloned = SchemaHelper.cloneSchemaRuntimeValue(source);

        assert.deepEqual(cloned, {
            name: 'field_1',
            templateFieldId: 'template-field-1',
            type: 'string',
            fields: [
                {
                    name: 'child',
                    type: 'number'
                }
            ]
        });
    });

    it('stableStringify is independent from object key insertion order', () => {
        const left = { b: 2, a: { d: 4, c: 3 } };
        const right = { a: { c: 3, d: 4 }, b: 2 };

        assert.equal(SchemaHelper.stableStringify(left), SchemaHelper.stableStringify(right));
    });
});
