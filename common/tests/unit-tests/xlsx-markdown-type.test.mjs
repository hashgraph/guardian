import assert from 'node:assert/strict';
import { FieldTypes } from '../../dist/xlsx/models/dictionary.js';

const markdownField = {
    type: 'string',
    format: undefined,
    pattern: undefined,
    isRef: false,
    unit: undefined,
    unitSystem: undefined,
    customType: 'markdown',
};

describe('FieldTypes — Markdown', () => {
    it('is registered by name as a plain string with customType markdown', () => {
        const type = FieldTypes.findByName('Markdown');
        assert.ok(type, 'Markdown missing from the Excel field types');
        assert.equal(type.type, 'string');
        assert.equal(type.isRef, false);
        assert.equal(type.customType, 'markdown');
        assert.equal(type.hidden, false);
    });

    it('resolves back from a field definition', () => {
        const type = FieldTypes.findByValue(markdownField);
        assert.ok(type, 'Markdown not resolved from a field definition');
        assert.equal(type.name, 'Markdown');
    });

    it('is not confused with Rich Text', () => {
        const markdown = FieldTypes.findByValue(markdownField);
        const rich = FieldTypes.findByValue({ ...markdownField, customType: 'richText' });
        assert.equal(markdown.name, 'Markdown');
        assert.equal(rich.name, 'Rich Text');
    });

    it('exports a value as a string', () => {
        const type = FieldTypes.findByName('Markdown');
        assert.equal(type.pars('# Title'), '# Title');
    });
});
