import assert from 'node:assert/strict';
import {
    FieldTypesDictionary,
    DefaultFieldDictionary,
} from '../dist/helpers/field-types-dictionary.js';

describe('FieldTypesDictionary.FieldTypes (catalogue)', () => {
    it('contains the basic primitive types', () => {
        const names = FieldTypesDictionary.FieldTypes.map((t) => t.name);
        for (const required of ['Number', 'Integer', 'String', 'Boolean']) {
            assert.ok(names.includes(required), `${required} missing from FieldTypes`);
        }
    });

    it('marks scalar primitives (Number/Integer/String/Boolean) as isRef=false', () => {
        const scalars = ['Number', 'Integer', 'String', 'Boolean'];
        for (const t of FieldTypesDictionary.FieldTypes) {
            if (scalars.includes(t.name)) {
                assert.equal(t.isRef, false, `${t.name} should not be a reference`);
            }
        }
    });

    it('marks complex reference types (GeoJSON, SentinelHUB) as isRef=true', () => {
        const refs = ['GeoJSON', 'SentinelHUB'];
        for (const t of FieldTypesDictionary.FieldTypes) {
            if (refs.includes(t.name)) {
                assert.equal(t.isRef, true, `${t.name} should be a reference`);
            }
        }
    });

    it('uses string+date format for the Date entry', () => {
        const date = FieldTypesDictionary.FieldTypes.find((t) => t.name === 'Date');
        assert.equal(date.type, 'string');
        assert.equal(date.format, 'date');
    });
});

describe('FieldTypesDictionary.equal', () => {
    it('returns true when type/format/pattern/isRef/customType all match', () => {
        const field = { type: 'string', format: 'date', pattern: undefined, isRef: false, customType: undefined };
        const type  = { type: 'string', format: 'date', pattern: undefined, isRef: false, customType: undefined };
        assert.equal(FieldTypesDictionary.equal(field, type), true);
    });

    it('returns false when format differs', () => {
        const field = { type: 'string', format: 'date', pattern: undefined, isRef: false, customType: undefined };
        const type  = { type: 'string', format: 'time', pattern: undefined, isRef: false, customType: undefined };
        assert.equal(FieldTypesDictionary.equal(field, type), false);
    });

    it('returns false when isRef differs', () => {
        const field = { type: 'string', format: undefined, pattern: undefined, isRef: false, customType: undefined };
        const type  = { type: 'string', format: undefined, pattern: undefined, isRef: true,  customType: undefined };
        assert.equal(FieldTypesDictionary.equal(field, type), false);
    });
});

describe('DefaultFieldDictionary.getDefaultFields', () => {
    it('returns vcDefaultFields for VC and EVC entities', () => {
        const vc  = DefaultFieldDictionary.getDefaultFields('VC');
        const evc = DefaultFieldDictionary.getDefaultFields('EVC');
        assert.equal(vc.length, DefaultFieldDictionary.vcDefaultFields.length);
        assert.equal(evc.length, DefaultFieldDictionary.vcDefaultFields.length);
    });

    it('returns a deep copy (mutation does not affect catalogue)', () => {
        const a = DefaultFieldDictionary.getDefaultFields('VC');
        a[0].name = 'mutated';
        const b = DefaultFieldDictionary.getDefaultFields('VC');
        assert.equal(b[0].name, 'policyId');
    });

    it('returns [] for non-VC entities', () => {
        assert.deepEqual(DefaultFieldDictionary.getDefaultFields('NONE'), []);
        assert.deepEqual(DefaultFieldDictionary.getDefaultFields('USER'), []);
    });
});
