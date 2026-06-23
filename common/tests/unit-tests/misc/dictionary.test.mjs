import { assert } from 'chai';
import { Dictionary, FieldTypes } from '../../../dist/xlsx/models/dictionary.js';

describe('Dictionary enum (xlsx column labels)', () => {
    it('exposes the canonical column labels', () => {
        assert.equal(Dictionary.REQUIRED_FIELD, 'Required Field');
        assert.equal(Dictionary.FIELD_TYPE, 'Field Type');
        assert.equal(Dictionary.PARAMETER, 'Parameter');
        assert.equal(Dictionary.QUESTION, 'Question');
        assert.equal(Dictionary.ANSWER, 'Answer');
        assert.equal(Dictionary.SCHEMA_NAME, 'Schema');
        assert.equal(Dictionary.SCHEMA_TOOL_ID, 'Tool Id');
        assert.equal(Dictionary.ENUM_IPFS, 'Loaded to IPFS');
    });

    it('all values are non-empty strings', () => {
        for (const v of Object.values(Dictionary)) {
            assert.equal(typeof v, 'string');
            assert.isAbove(v.length, 0);
        }
    });

    it('all values are unique', () => {
        const values = Object.values(Dictionary);
        assert.equal(new Set(values).size, values.length);
    });
});

describe('FieldTypes.default', () => {
    it('exposes a non-empty list of registered field types', () => {
        assert.isArray(FieldTypes.default);
        assert.isAbove(FieldTypes.default.length, 0);
    });

    it('includes the standard scalar types: Number, Integer, String', () => {
        const names = FieldTypes.default.map((f) => f.name);
        assert.include(names, 'Number');
        assert.include(names, 'Integer');
        assert.include(names, 'String');
    });

    it('all entries expose a name and a type', () => {
        for (const f of FieldTypes.default) {
            assert.isString(f.name);
            assert.isString(f.type);
        }
    });

    it('Number.pars parses numeric strings, returns "" for NaN', () => {
        const number = FieldTypes.default.find((f) => f.name === 'Number');
        assert.equal(number.pars('42.5'), 42.5);
        assert.equal(number.pars(7), 7);
        assert.equal(number.pars('not-a-number'), '');
    });

    it('Integer.pars accepts integers, rejects fractional values with ""', () => {
        const integer = FieldTypes.default.find((f) => f.name === 'Integer');
        assert.equal(integer.pars('10'), 10);
        assert.equal(integer.pars(7), 7);
        assert.equal(integer.pars('1.5'), '');
        assert.equal(integer.pars('abc'), '');
    });

    it('String.pars coerces any input to a string', () => {
        const str = FieldTypes.default.find((f) => f.name === 'String');
        assert.equal(str.pars(123), '123');
        assert.equal(str.pars(true), 'true');
        assert.equal(str.pars(null), 'null');
    });
});
