import assert from 'node:assert/strict';
import { Dictionary, FieldTypes } from '../../../dist/xlsx/models/dictionary.js';

describe('Dictionary enum', () => {
    it('exposes the documented header labels', () => {
        assert.equal(Dictionary.REQUIRED_FIELD, 'Required Field');
        assert.equal(Dictionary.FIELD_TYPE, 'Field Type');
        assert.equal(Dictionary.QUESTION, 'Question');
        assert.equal(Dictionary.ANSWER, 'Answer');
        assert.equal(Dictionary.SCHEMA_NAME, 'Schema');
        assert.equal(Dictionary.SCHEMA_TOOL, 'Tool');
        assert.equal(Dictionary.AUTO_CALCULATE, 'Auto-Calculate');
        assert.equal(Dictionary.SUB_SCHEMA, 'Sub-Schema');
    });
});

describe('FieldTypes.findByName', () => {
    it('returns the canonical Number type', () => {
        const t = FieldTypes.findByName('Number');
        assert.equal(t.type, 'number');
        assert.equal(t.format, undefined);
        assert.equal(t.isRef, false);
    });

    it('returns the canonical Date type with format=date', () => {
        const t = FieldTypes.findByName('Date');
        assert.equal(t.type, 'string');
        assert.equal(t.format, 'date');
    });

    it('returns the GeoJSON type with isRef=true and customType=geo', () => {
        const t = FieldTypes.findByName('GeoJSON');
        assert.equal(t.isRef, true);
        assert.equal(t.customType, 'geo');
    });

    it('returns the HederaAccount type with the documented pattern', () => {
        const t = FieldTypes.findByName('HederaAccount');
        assert.equal(t.customType, 'hederaAccount');
        assert.equal(t.pattern, '^\\d+\\.\\d+\\.\\d+$');
    });

    it('returns null for an unknown name', () => {
        assert.equal(FieldTypes.findByName('Unknown-Field-Type'), null);
    });
});

describe('FieldTypes parsers', () => {
    it('Number parser returns a finite number, "" for non-finite', () => {
        const t = FieldTypes.findByName('Number');
        assert.equal(t.pars('42'), 42);
        assert.equal(t.pars('3.14'), 3.14);
        assert.equal(t.pars('not-a-number'), '');
    });

    it('Integer parser keeps integers, "" for fractional/non-numeric', () => {
        const t = FieldTypes.findByName('Integer');
        assert.equal(t.pars('5'), 5);
        assert.equal(t.pars('5.5'), '');
        assert.equal(t.pars('abc'), '');
    });

    it('String parser coerces via String()', () => {
        const t = FieldTypes.findByName('String');
        assert.equal(t.pars(123), '123');
        assert.equal(t.pars(null), 'null');
    });

    it('Boolean parser handles strings and truthy values', () => {
        const t = FieldTypes.findByName('Boolean');
        assert.equal(t.pars('true'), true);
        assert.equal(t.pars('TRUE'), true);
        assert.equal(t.pars('false'), false);
        assert.equal(t.pars('anything-else'), false);
        assert.equal(t.pars(1), true);
        assert.equal(t.pars(0), false);
    });

    it('Postfix and Prefix carry the unitSystem hint', () => {
        const postfix = FieldTypes.findByName('Postfix');
        const prefix = FieldTypes.findByName('Prefix');
        assert.equal(postfix.unitSystem, 'postfix');
        assert.equal(prefix.unitSystem, 'prefix');
    });
});

describe('FieldTypes.findByValue', () => {
    it('matches Number by shape', () => {
        const f = FieldTypes.findByValue({ type: 'number', isRef: false });
        assert.equal(f.name, 'Number');
    });

    it('matches String by shape', () => {
        const f = FieldTypes.findByValue({ type: 'string', isRef: false });
        assert.equal(f.name, 'String');
    });

    it('matches GeoJSON by isRef + customType', () => {
        const f = FieldTypes.findByValue({
            type: '#GeoJSON',
            isRef: true,
            customType: 'geo',
        });
        assert.equal(f.name, 'GeoJSON');
    });

    it('returns null when nothing matches', () => {
        const f = FieldTypes.findByValue({ type: 'never-was-a-type', isRef: false });
        assert.equal(f, null);
    });

    it('matches a Pattern field when the pattern flag is truthy', () => {
        const f = FieldTypes.findByValue({
            type: 'string',
            isRef: false,
            pattern: '^abc$',
        });
        assert.equal(f.name, 'Pattern');
    });
});

describe('FieldTypes.equal', () => {
    it('treats undefined === null as equal (loose nullish helper)', () => {
        const eq = FieldTypes.equal(
            { type: 'number', isRef: false },
            { type: 'number', isRef: undefined },
        );
        assert.equal(eq, true);
    });

    it('returns false when types differ', () => {
        const eq = FieldTypes.equal(
            { type: 'number', isRef: false },
            { type: 'string', isRef: false },
        );
        assert.equal(eq, false);
    });
});
