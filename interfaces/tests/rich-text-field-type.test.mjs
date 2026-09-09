import assert from 'node:assert/strict';
import { FieldTypesDictionary } from '../dist/helpers/field-types-dictionary.js';
import { DocumentGenerator } from '../dist/helpers/generate-document.js';
import { SchemaToJson } from '../dist/helpers/schema-json.js';

const richTextField = (overrides = {}) => ({
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
    customType: 'richText',
    ...overrides,
});

const plainStringField = (overrides = {}) => ({
    ...richTextField(),
    name: 'text',
    customType: null,
    ...overrides,
});

describe('FieldTypesDictionary — Rich Text entry', () => {
    it('declares Rich Text as a plain string carrying customType richText', () => {
        const entry = FieldTypesDictionary.CustomFieldTypes.find((t) => t.name === 'Rich Text');
        assert.ok(entry, 'Rich Text missing from CustomFieldTypes');
        assert.equal(entry.type, 'string');
        assert.equal(entry.format, undefined);
        assert.equal(entry.pattern, undefined);
        assert.equal(entry.isRef, false);
        assert.equal(entry.customType, 'richText');
    });

    it('does not match a plain String field, and String does not match it', () => {
        const rich = FieldTypesDictionary.CustomFieldTypes.find((t) => t.name === 'Rich Text');
        const plain = FieldTypesDictionary.FieldTypes.find((t) => t.name === 'String');
        assert.equal(FieldTypesDictionary.equal(plainStringField(), rich), false);
        assert.equal(FieldTypesDictionary.equal(richTextField(), plain), false);
    });

    it('matches a field that carries customType richText', () => {
        const rich = FieldTypesDictionary.CustomFieldTypes.find((t) => t.name === 'Rich Text');
        assert.equal(FieldTypesDictionary.equal(richTextField(), rich), true);
    });

    it('is the only formatted text type — Markdown is no longer registered', () => {
        assert.equal(
            FieldTypesDictionary.CustomFieldTypes.find((t) => t.name === 'Markdown'),
            undefined
        );
        assert.equal(
            FieldTypesDictionary.CustomFieldTypes.find((t) => t.customType === 'markdown'),
            undefined
        );
    });
});

describe('DocumentGenerator — Rich Text example', () => {
    it('generates a markdown sample for a rich text field', () => {
        const value = DocumentGenerator.generateExample(richTextField());
        assert.equal(typeof value, 'string');
        assert.ok(value.includes('#'), 'expected a heading in the example value');
        assert.ok(value.includes('**'), 'expected bold syntax in the example value');
        assert.ok(!value.includes('<'), 'the example must be markdown, not markup');
    });

    it('leaves a plain string field on its own example', () => {
        assert.equal(DocumentGenerator.generateExample(plainStringField()), 'example');
    });
});

describe('SchemaToJson — Rich Text type name', () => {
    it('exports a rich text field as the Rich Text type', () => {
        assert.equal(SchemaToJson.fieldToJson(richTextField(), 0).type, 'Rich Text');
    });

    it('still exports a plain string field as String', () => {
        assert.equal(SchemaToJson.fieldToJson(plainStringField(), 0).type, 'String');
    });

    it('no longer resolves a markdown custom type to its own name', () => {
        assert.equal(SchemaToJson.getType(richTextField({ customType: 'markdown' })), 'String');
    });
});
