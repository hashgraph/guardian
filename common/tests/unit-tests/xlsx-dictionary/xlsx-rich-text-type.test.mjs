import assert from 'node:assert/strict';
import { FieldTypes } from '../../../dist/xlsx/models/dictionary.js';

const richTextField = {
    type: 'string',
    format: undefined,
    pattern: undefined,
    isRef: false,
    unit: undefined,
    unitSystem: undefined,
    customType: 'richText',
};

const plainStringField = {
    ...richTextField,
    customType: undefined,
};

describe('FieldTypes — Rich Text', () => {
    it('is registered by name as a plain string with customType richText', () => {
        const type = FieldTypes.findByName('Rich Text');
        assert.ok(type, 'Rich Text missing from the Excel field types');
        assert.equal(type.type, 'string');
        assert.equal(type.isRef, false);
        assert.equal(type.customType, 'richText');
        assert.equal(type.hidden, false);
    });

    it('exports a value as a string', () => {
        const type = FieldTypes.findByName('Rich Text');
        assert.equal(type.pars('<p>x</p>'), '<p>x</p>');
    });

    it('resolves a rich text field to the Rich Text type, not to String', () => {
        assert.equal(FieldTypes.findByValue(richTextField).name, 'Rich Text');
    });

    it('still resolves a plain string field to String', () => {
        assert.equal(FieldTypes.findByValue(plainStringField).name, 'String');
    });
});
