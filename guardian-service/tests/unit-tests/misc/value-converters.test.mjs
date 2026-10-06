import { assert } from 'chai';
import {
    entityToXlsx,
    xlsxToEntity,
    xlsxToUnit,
    xlsxToFont,
    xlsxToPresetArray,
    xlsxToPresetValue,
} from '../../../dist/xlsx/models/value-converters.js';
import { SchemaEntity } from '@guardian/interfaces';

describe('entityToXlsx', () => {
    it('maps SchemaEntity.VC to "Verifiable Credentials"', () => {
        assert.equal(entityToXlsx(SchemaEntity.VC), 'Verifiable Credentials');
    });

    it('maps SchemaEntity.EVC to "Encrypted Verifiable Credential"', () => {
        assert.equal(entityToXlsx(SchemaEntity.EVC), 'Encrypted Verifiable Credential');
    });

    it('falls back to "Sub-Schema" for any other entity', () => {
        assert.equal(entityToXlsx(SchemaEntity.NONE), 'Sub-Schema');
        assert.equal(entityToXlsx('UnknownEntity'), 'Sub-Schema');
    });
});

describe('xlsxToEntity', () => {
    it('accepts both "VC" and the long form', () => {
        assert.equal(xlsxToEntity('VC'), SchemaEntity.VC);
        assert.equal(xlsxToEntity('Verifiable Credentials'), SchemaEntity.VC);
    });

    it('accepts both "EVC" and the long form', () => {
        assert.equal(xlsxToEntity('EVC'), SchemaEntity.EVC);
        assert.equal(xlsxToEntity('Encrypted Verifiable Credential'), SchemaEntity.EVC);
    });

    it('returns NONE for unrecognised input', () => {
        assert.equal(xlsxToEntity('something else'), SchemaEntity.NONE);
        assert.equal(xlsxToEntity(''), SchemaEntity.NONE);
    });
});

describe('xlsxToUnit', () => {
    it('extracts the unit-bearing token from a number-format string', () => {
        // Strips the digits/format glyphs and keeps the alphanumeric token
        assert.equal(xlsxToUnit('#,##0.00 USD'), 'USD');
        assert.equal(xlsxToUnit('0.00 kg'), 'kg');
    });
});

describe('xlsxToFont', () => {
    it('parses a JSON string into the matching object', () => {
        assert.deepEqual(xlsxToFont('{"bold":true,"size":"12px"}'), { bold: true, size: '12px' });
    });

    it('returns {} for malformed JSON strings (try/catch)', () => {
        assert.deepEqual(xlsxToFont('not-json'), {});
    });

    it('returns {} for null/undefined input (no `value` branch hits)', () => {
        assert.deepEqual(xlsxToFont(null), {});
        assert.deepEqual(xlsxToFont(undefined), {});
    });
});

describe('xlsxToPresetValue', () => {
    it('returns "" for null/undefined/empty-string values', () => {
        assert.equal(xlsxToPresetValue({ type: 'string' }, null), '');
        assert.equal(xlsxToPresetValue({ type: 'string' }, undefined), '');
        assert.equal(xlsxToPresetValue({ type: 'string' }, ''), '');
    });

    it('passes through non-ref values unchanged', () => {
        assert.equal(xlsxToPresetValue({ type: 'string' }, 'plain'), 'plain');
        assert.equal(xlsxToPresetValue({ type: 'integer' }, 42), 42);
    });

    it('parses a ref field as JSON', () => {
        const out = xlsxToPresetValue({ type: 'ref', isRef: true }, '{"a":1}');
        assert.deepEqual(out, { a: 1 });
    });

    it('returns "" when a ref field cannot be parsed as JSON', () => {
        assert.equal(xlsxToPresetValue({ type: 'ref', isRef: true }, 'not-json'), '');
    });
});

describe('xlsxToPresetArray', () => {
    it('returns null for null/undefined input', () => {
        assert.isNull(xlsxToPresetArray({ type: 'string' }, null));
        assert.isNull(xlsxToPresetArray({ type: 'string' }, undefined));
    });

    it('splits a CSV-style value into its parts', () => {
        const arr = xlsxToPresetArray({ type: 'string' }, 'a,b,c');
        assert.deepEqual(arr, ['a', 'b', 'c']);
    });

    it('preserves quoted segments containing commas', () => {
        const arr = xlsxToPresetArray({ type: 'string' }, '"a,b","c"');
        assert.deepEqual(arr, ['a,b', 'c']);
    });
});
