import assert from 'node:assert/strict';
import {
    FieldTypesDictionary,
    DefaultFieldDictionary,
} from '../dist/helpers/field-types-dictionary.js';

const byName = (name) => FieldTypesDictionary.FieldTypes.find((t) => t.name === name);

describe('FieldTypesDictionary.FieldTypes — string-formatted entries', () => {
    const cases = [
        ['Time', 'time'],
        ['DateTime', 'date-time'],
        ['Duration', 'duration'],
        ['URL', 'url'],
        ['URI', 'uri'],
        ['Email', 'email'],
    ];
    for (const [name, format] of cases) {
        it(`${name} is a string with format ${format}`, () => {
            const entry = byName(name);
            assert.equal(entry.type, 'string');
            assert.equal(entry.format, format);
            assert.equal(entry.isRef, false);
        });
    }

    it('Image uses an ipfs pattern and no format', () => {
        const entry = byName('Image');
        assert.equal(entry.type, 'string');
        assert.equal(entry.format, undefined);
        assert.equal(entry.pattern, '^ipfs://.+');
    });

    it('File carries customType=file with an ipfs pattern', () => {
        const entry = byName('File');
        assert.equal(entry.customType, 'file');
        assert.equal(entry.pattern, '^ipfs://.+');
    });

    it('Enum carries customType=enum', () => {
        assert.equal(byName('Enum').customType, 'enum');
    });

    it('Help Text is of type null', () => {
        assert.equal(byName('Help Text').type, 'null');
    });

    it('Table carries customType=table', () => {
        assert.equal(byName('Table').customType, 'table');
    });

    it('GeoJSON ref uses #GeoJSON type and customType=geo', () => {
        const entry = byName('GeoJSON');
        assert.equal(entry.type, '#GeoJSON');
        assert.equal(entry.customType, 'geo');
        assert.equal(entry.isRef, true);
    });

    it('SentinelHUB ref uses #SentinelHUB type and customType=sentinel', () => {
        const entry = byName('SentinelHUB');
        assert.equal(entry.type, '#SentinelHUB');
        assert.equal(entry.customType, 'sentinel');
        assert.equal(entry.isRef, true);
    });

    it('Number / Integer map to numeric JSON types', () => {
        assert.equal(byName('Number').type, 'number');
        assert.equal(byName('Integer').type, 'integer');
    });
});

describe('FieldTypesDictionary.CustomFieldTypes', () => {
    it('contains a hederaAccount entry with the dotted pattern', () => {
        const acc = FieldTypesDictionary.CustomFieldTypes.find((t) => t.name === 'hederaAccount');
        assert.equal(acc.type, 'string');
        assert.equal(acc.customType, 'hederaAccount');
        assert.equal(acc.pattern, '^\\d+\\.\\d+\\.\\d+$');
    });

    it('contains two unit-system entries typed as number', () => {
        const units = FieldTypesDictionary.CustomFieldTypes.filter((t) => t.unitSystem);
        assert.equal(units.length, 2);
        for (const u of units) {
            assert.equal(u.type, 'number');
            assert.equal(u.unit, '');
        }
    });
});

describe('FieldTypesDictionary.SystemFieldTypes / MeasureFieldTypes', () => {
    it('SystemFieldTypes are GeoJSON and SentinelHUB references', () => {
        const names = FieldTypesDictionary.SystemFieldTypes.map((t) => t.name);
        assert.deepEqual(names, ['GeoJSON', 'SentinelHUB']);
        for (const t of FieldTypesDictionary.SystemFieldTypes) {
            assert.equal(t.isRef, true);
            assert.equal(t.customType, undefined);
        }
    });

    it('MeasureFieldTypes is empty', () => {
        assert.deepEqual(FieldTypesDictionary.MeasureFieldTypes, []);
    });
});

describe('FieldTypesDictionary.equal — more edges', () => {
    it('uses loose comparison so undefined matches null', () => {
        const field = { type: 'string', format: null, pattern: null, isRef: false, customType: null };
        const type = { type: 'string', format: undefined, pattern: undefined, isRef: false, customType: undefined };
        assert.equal(FieldTypesDictionary.equal(field, type), true);
    });

    it('returns false when type differs', () => {
        const field = { type: 'number', format: undefined, pattern: undefined, isRef: false, customType: undefined };
        const type = { type: 'string', format: undefined, pattern: undefined, isRef: false, customType: undefined };
        assert.equal(FieldTypesDictionary.equal(field, type), false);
    });

    it('returns false when pattern differs', () => {
        const field = { type: 'string', format: undefined, pattern: '^a', isRef: false, customType: undefined };
        const type = { type: 'string', format: undefined, pattern: '^b', isRef: false, customType: undefined };
        assert.equal(FieldTypesDictionary.equal(field, type), false);
    });

    it('returns false when customType differs', () => {
        const field = { type: 'string', format: undefined, pattern: undefined, isRef: false, customType: 'file' };
        const type = { type: 'string', format: undefined, pattern: undefined, isRef: false, customType: 'enum' };
        assert.equal(FieldTypesDictionary.equal(field, type), false);
    });

    it('matches a real catalogue Date entry against an equivalent field', () => {
        const date = byName('Date');
        const field = { type: 'string', format: 'date', pattern: undefined, isRef: false, customType: undefined };
        assert.equal(FieldTypesDictionary.equal(field, date), true);
    });
});

describe('DefaultFieldDictionary.vcDefaultFields', () => {
    it('lists policyId, ref, guardianVersion in order', () => {
        const names = DefaultFieldDictionary.vcDefaultFields.map((f) => f.name);
        assert.deepEqual(names, ['policyId', 'ref', 'guardianVersion']);
    });

    it('marks every default field readOnly and string-typed', () => {
        for (const f of DefaultFieldDictionary.vcDefaultFields) {
            assert.equal(f.readOnly, true);
            assert.equal(f.type, 'string');
            assert.equal(f.isRef, false);
        }
    });

    it('only policyId is required', () => {
        const required = DefaultFieldDictionary.vcDefaultFields.filter((f) => f.required).map((f) => f.name);
        assert.deepEqual(required, ['policyId']);
    });
});
