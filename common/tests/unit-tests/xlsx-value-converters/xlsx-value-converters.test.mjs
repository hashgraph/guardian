import assert from 'node:assert/strict';
import {
    entityToXlsx,
    xlsxToEntity,
    stringToXlsx,
    numberToXlsx,
    booleanToXlsx,
    visibilityToXlsx,
    anyToXlsx,
    xlsxToArray,
    formulaToXlsx,
    xlsxToString,
    xlsxToNumber,
    xlsxToBoolean,
    xlsxToAny,
    xlsxToType,
    valueToFormula,
    xlsxToVisibility,
    xlsxToPresetValue,
    xlsxToPresetArray,
    unitToXlsx,
    fontToXlsx,
    typeToXlsx,
} from '../../../dist/xlsx/models/value-converters.js';

describe('entityToXlsx / xlsxToEntity', () => {
    it('VC ↔ "Verifiable Credentials"', () => {
        assert.equal(entityToXlsx('VC'), 'Verifiable Credentials');
        assert.equal(xlsxToEntity('Verifiable Credentials'), 'VC');
        assert.equal(xlsxToEntity('VC'), 'VC');
    });

    it('EVC ↔ "Encrypted Verifiable Credential"', () => {
        assert.equal(entityToXlsx('EVC'), 'Encrypted Verifiable Credential');
        assert.equal(xlsxToEntity('Encrypted Verifiable Credential'), 'EVC');
        assert.equal(xlsxToEntity('EVC'), 'EVC');
    });

    it('falls back to Sub-Schema / NONE for everything else', () => {
        assert.equal(entityToXlsx('OTHER'), 'Sub-Schema');
        assert.equal(xlsxToEntity('something else'), 'NONE');
    });
});

describe('primitive XLSX writers', () => {
    it('stringToXlsx returns the value or ""', () => {
        assert.equal(stringToXlsx('x'), 'x');
        assert.equal(stringToXlsx(''), '');
        assert.equal(stringToXlsx(null), '');
        assert.equal(stringToXlsx(undefined), '');
    });

    it('numberToXlsx stringifies finite + zero, returns "" for undefined', () => {
        assert.equal(numberToXlsx(0), '0');
        assert.equal(numberToXlsx(42), '42');
        assert.equal(numberToXlsx(undefined), '');
    });

    it('booleanToXlsx maps true→Yes, false→No, otherwise ""', () => {
        assert.equal(booleanToXlsx(true), 'Yes');
        assert.equal(booleanToXlsx(false), 'No');
        assert.equal(booleanToXlsx(null), '');
        assert.equal(booleanToXlsx(undefined), '');
    });

    it('visibilityToXlsx normalises Hidden/Auto/Yes/No', () => {
        assert.equal(visibilityToXlsx('hidden'), 'Hidden');
        assert.equal(visibilityToXlsx('Hidden'), 'Hidden');
        assert.equal(visibilityToXlsx('auto'), 'Auto');
        assert.equal(visibilityToXlsx('Auto'), 'Auto');
        assert.equal(visibilityToXlsx(true), 'Yes');
        assert.equal(visibilityToXlsx(false), 'No');
        assert.equal(visibilityToXlsx('other'), '');
    });
});

describe('anyToXlsx', () => {
    it('returns "" for undefined or null', () => {
        assert.equal(anyToXlsx(undefined), '');
        assert.equal(anyToXlsx(null), '');
    });

    it('returns scalars unchanged', () => {
        assert.equal(anyToXlsx('x'), 'x');
        assert.equal(anyToXlsx(7), 7);
        assert.equal(anyToXlsx(true), true);
    });

    it('JSON-stringifies plain objects', () => {
        assert.equal(anyToXlsx({ a: 1 }), '{"a":1}');
    });

    it('joins arrays and skips falsy/empty entries', () => {
        assert.equal(anyToXlsx(['a', '', null, 'b']), 'a,b');
    });
});

describe('xlsxToArray', () => {
    it('wraps a single value (multiple=false)', () => {
        assert.deepEqual(xlsxToArray('a', false), ['a']);
    });

    it('double-wraps for multiple=true', () => {
        assert.deepEqual(xlsxToArray('a', true), [[ 'a' ]]);
    });

    it('returns [] for falsy input', () => {
        assert.deepEqual(xlsxToArray(undefined, false), []);
        assert.deepEqual(xlsxToArray('', true), []);
    });
});

describe('formulaToXlsx / xlsxTo*', () => {
    it('formulaToXlsx wraps a string in {f:...}', () => {
        assert.deepEqual(formulaToXlsx('A1+B2'), { f: 'A1+B2' });
    });

    it('xlsxToString is identity for strings', () => {
        assert.equal(xlsxToString('hello'), 'hello');
    });

    it('xlsxToNumber coerces with Number()', () => {
        assert.equal(xlsxToNumber('42'), 42);
        assert.ok(Number.isNaN(xlsxToNumber('abc')));
    });

    it('xlsxToBoolean is true only for "Yes"', () => {
        assert.equal(xlsxToBoolean('Yes'), true);
        assert.equal(xlsxToBoolean('No'), false);
        assert.equal(xlsxToBoolean(''), false);
    });

    it('xlsxToAny is identity', () => {
        assert.equal(xlsxToAny('xyz'), 'xyz');
    });

    it('xlsxToType resolves a known FieldTypes name', () => {
        const t = xlsxToType('Number');
        assert.equal(t.type, 'number');
    });
});

describe('valueToFormula', () => {
    it('returns numbers + booleans unchanged', () => {
        assert.equal(valueToFormula(42), 42);
        assert.equal(valueToFormula(true), true);
    });

    it('quotes strings', () => {
        assert.equal(valueToFormula('hello'), '"hello"');
    });

    it('uses .toString() for objects', () => {
        assert.equal(valueToFormula({ toString: () => 'X' }), 'X');
    });
});

describe('xlsxToVisibility', () => {
    it('maps hidden/Hidden/No → "Hidden"', () => {
        assert.equal(xlsxToVisibility('hidden'), 'Hidden');
        assert.equal(xlsxToVisibility('Hidden'), 'Hidden');
        assert.equal(xlsxToVisibility('No'), 'Hidden');
    });

    it('maps Auto/auto/Auto-Calculate → "Auto"', () => {
        assert.equal(xlsxToVisibility('auto'), 'Auto');
        assert.equal(xlsxToVisibility('Auto'), 'Auto');
        assert.equal(xlsxToVisibility('Auto-Calculate'), 'Auto');
    });

    it('passes through other values', () => {
        assert.equal(xlsxToVisibility('Yes'), 'Yes');
        assert.equal(xlsxToVisibility(''), '');
    });
});

describe('xlsxToPresetValue / xlsxToPresetArray', () => {
    it('xlsxToPresetValue returns "" for undefined/null/empty', () => {
        assert.equal(xlsxToPresetValue({ type: 'string' }, undefined), '');
        assert.equal(xlsxToPresetValue({ type: 'string' }, null), '');
        assert.equal(xlsxToPresetValue({ type: 'string' }, ''), '');
    });

    it('xlsxToPresetValue passes through scalar non-ref values', () => {
        assert.equal(xlsxToPresetValue({ type: 'string' }, 'abc'), 'abc');
        assert.equal(xlsxToPresetValue({ type: 'number' }, 42), 42);
    });

    it('xlsxToPresetValue parses JSON when isRef=true', () => {
        const out = xlsxToPresetValue({ type: '#X', isRef: true }, '{"a":1}');
        assert.deepEqual(out, { a: 1 });
    });

    it('xlsxToPresetValue returns "" when isRef=true and JSON is bad', () => {
        const out = xlsxToPresetValue({ type: '#X', isRef: true }, 'not-json');
        assert.equal(out, '');
    });

    it('xlsxToPresetArray returns null for null/undefined', () => {
        assert.equal(xlsxToPresetArray({ type: 'string' }, null), null);
        assert.equal(xlsxToPresetArray({ type: 'string' }, undefined), null);
    });

    it('xlsxToPresetArray splits on commas, supports quoted entries', () => {
        const out = xlsxToPresetArray({ type: 'string' }, '"a,b",c');
        assert.deepEqual(out, ['a,b', 'c']);
    });
});

describe('unitToXlsx / fontToXlsx / typeToXlsx', () => {
    it('unitToXlsx wraps prefix and postfix correctly', () => {
        assert.equal(unitToXlsx({ unit: '$', unitSystem: 'prefix' }), '"$"#,##0.00');
        assert.equal(unitToXlsx({ unit: 'kg', unitSystem: 'postfix' }), '#,##0.00"kg"');
        assert.equal(unitToXlsx({ unit: '', unitSystem: 'other' }), '');
    });

    it('fontToXlsx builds a font object preserving bold/size/color', () => {
        const out = fontToXlsx({ bold: true, size: '12px', color: '#abcdef' });
        assert.equal(out.font.bold, true);
        assert.equal(out.font.size, '12');
        assert.deepEqual(out.font.color, { argb: 'FFabcdef' });
    });

    it('fontToXlsx merges into a base when supplied', () => {
        const base = { fill: { color: 'red' } };
        const out = fontToXlsx({ bold: true }, base);
        assert.deepEqual(out.fill, { color: 'red' });
        assert.equal(out.font.bold, true);
    });

    it('typeToXlsx round-trips through FieldTypes', () => {
        const name = typeToXlsx({ type: 'number', isRef: false });
        assert.equal(name, 'Number');
    });
});
