import assert from 'node:assert/strict';
import { FieldTypesDictionary } from '../dist/helpers/field-types-dictionary.js';
import { DocumentGenerator } from '../dist/helpers/generate-document.js';
import { SchemaToJson } from '../dist/helpers/schema-json.js';

const markdownField = (overrides = {}) => ({
    name: 'note',
    title: 'Note',
    description: 'd',
    type: 'string',
    format: undefined,
    pattern: undefined,
    isRef: false,
    isArray: false,
    examples: null,
    default: null,
    customType: 'markdown',
    ...overrides,
});

describe('FieldTypesDictionary — Markdown entry', () => {
    it('declares Markdown as a plain string carrying customType markdown', () => {
        const entry = FieldTypesDictionary.CustomFieldTypes.find((t) => t.name === 'Markdown');
        assert.ok(entry, 'Markdown missing from CustomFieldTypes');
        assert.equal(entry.type, 'string');
        assert.equal(entry.format, undefined);
        assert.equal(entry.pattern, undefined);
        assert.equal(entry.isRef, false);
        assert.equal(entry.customType, 'markdown');
    });

    it('is a separate entry from Rich Text', () => {
        const markdown = FieldTypesDictionary.CustomFieldTypes.find((t) => t.name === 'Markdown');
        const rich = FieldTypesDictionary.CustomFieldTypes.find((t) => t.name === 'Rich Text');
        assert.ok(markdown && rich);
        assert.notEqual(markdown.customType, rich.customType);
        assert.equal(FieldTypesDictionary.equal(markdown, rich), false);
    });

    it('does not match a plain String field', () => {
        const markdown = FieldTypesDictionary.CustomFieldTypes.find((t) => t.name === 'Markdown');
        const plain = FieldTypesDictionary.FieldTypes.find((t) => t.name === 'String');
        assert.ok(markdown && plain);
        assert.equal(FieldTypesDictionary.equal(markdown, plain), false);
    });
});

describe('SchemaToJson — Markdown type name', () => {
    it('keeps the Markdown name on export instead of falling back to String', () => {
        assert.equal(SchemaToJson.getType(markdownField()), 'Markdown');
    });

    it('still reports Rich Text for a rich text field', () => {
        assert.equal(SchemaToJson.getType(markdownField({ customType: 'richText' })), 'Rich Text');
    });

    it('still reports String for a field with no custom type', () => {
        assert.equal(SchemaToJson.getType(markdownField({ customType: null })), 'String');
    });
});

describe('DocumentGenerator — Markdown example value', () => {
    it('returns a markdown sample for a markdown field', () => {
        const value = DocumentGenerator.generateExample(markdownField());
        assert.equal(typeof value, 'string');
        assert.ok(value.includes('#'), 'expected a heading in the example value');
        assert.ok(value.includes('**'), 'expected bold syntax in the example value');
        assert.ok(!value.includes('<'), 'the markdown example must not contain markup');
    });
});
