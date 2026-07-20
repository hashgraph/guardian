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
    xlsxToUnit,
    xlsxToFont,
    examplesToXlsx,
} from '../../../dist/xlsx/models/value-converters.js';
import { Expression } from '../../../dist/xlsx/models/expression.js';
import { XlsxVariable, XlsxExpressions } from '../../../dist/xlsx/models/xlsx-expressions.js';
import { XlsxSchemaConditions } from '../../../dist/xlsx/models/schema-condition.js';

describe('@unit value-converters edge: stringToXlsx boundaries', () => {
    it('returns "" for falsy 0 and false (truthy gate, not null-check)', () => {
        assert.equal(stringToXlsx(0), '');
        assert.equal(stringToXlsx(false), '');
        assert.equal(stringToXlsx(NaN), '');
    });

    it('preserves whitespace-only and unicode strings verbatim', () => {
        assert.equal(stringToXlsx('   '), '   ');
        assert.equal(stringToXlsx('\t\n'), '\t\n');
        assert.equal(stringToXlsx('日本語'), '日本語');
        assert.equal(stringToXlsx('a\0b'), 'a\0b');
    });

    it('returns non-empty objects/numbers unchanged via the truthy gate', () => {
        assert.equal(stringToXlsx(42), 42);
        const obj = { a: 1 };
        assert.equal(stringToXlsx(obj), obj);
    });
});

describe('@unit value-converters edge: numberToXlsx boundaries', () => {
    it('stringifies NaN, Infinity and -Infinity (only undefined returns "")', () => {
        assert.equal(numberToXlsx(NaN), 'NaN');
        assert.equal(numberToXlsx(Infinity), 'Infinity');
        assert.equal(numberToXlsx(-Infinity), '-Infinity');
    });

    it('keeps null as the string "null" (only undefined is guarded)', () => {
        assert.equal(numberToXlsx(null), 'null');
    });

    it('handles negative zero, very large, and precision-losing numbers', () => {
        assert.equal(numberToXlsx(-0), '0');
        assert.equal(numberToXlsx(1e21), '1e+21');
        assert.equal(numberToXlsx(9007199254740993), '9007199254740992');
        assert.equal(numberToXlsx(0.1 + 0.2), '0.30000000000000004');
    });
});

describe('@unit value-converters edge: booleanToXlsx strictness', () => {
    it('returns "" for truthy/falsy non-boolean values (strict === only)', () => {
        assert.equal(booleanToXlsx(1), '');
        assert.equal(booleanToXlsx(0), '');
        assert.equal(booleanToXlsx('Yes'), '');
        assert.equal(booleanToXlsx('true'), '');
    });
});

describe('@unit value-converters edge: visibilityToXlsx strictness', () => {
    it('is case-sensitive and rejects mixed casing', () => {
        assert.equal(visibilityToXlsx('HIDDEN'), '');
        assert.equal(visibilityToXlsx('AUTO'), '');
        assert.equal(visibilityToXlsx('Yes'), '');
        assert.equal(visibilityToXlsx('No'), '');
    });

    it('returns "" for truthy non-boolean values (1 is not true)', () => {
        assert.equal(visibilityToXlsx(1), '');
        assert.equal(visibilityToXlsx(null), '');
        assert.equal(visibilityToXlsx(undefined), '');
    });
});

describe('@unit value-converters edge: xlsxToVisibility passthrough', () => {
    it('returns unknown values unchanged, including null/undefined/numbers', () => {
        assert.equal(xlsxToVisibility('Yes'), 'Yes');
        assert.equal(xlsxToVisibility(''), '');
        assert.equal(xlsxToVisibility(null), null);
        assert.equal(xlsxToVisibility(undefined), undefined);
        assert.equal(xlsxToVisibility(5), 5);
    });

    it('maps "No" to Hidden but does not map "Yes" to anything special', () => {
        assert.equal(xlsxToVisibility('No'), 'Hidden');
        assert.equal(xlsxToVisibility('Auto-Calculate'), 'Auto');
    });
});

describe('@unit value-converters edge: entityToXlsx / xlsxToEntity', () => {
    it('entityToXlsx returns Sub-Schema for null/undefined/empty', () => {
        assert.equal(entityToXlsx(null), 'Sub-Schema');
        assert.equal(entityToXlsx(undefined), 'Sub-Schema');
        assert.equal(entityToXlsx(''), 'Sub-Schema');
        assert.equal(entityToXlsx('NONE'), 'Sub-Schema');
    });

    it('xlsxToEntity is case-sensitive and falls back to NONE', () => {
        assert.equal(xlsxToEntity('verifiable credentials'), 'NONE');
        assert.equal(xlsxToEntity(''), 'NONE');
        assert.equal(xlsxToEntity(null), 'NONE');
        assert.equal(xlsxToEntity(' VC '), 'NONE');
    });
});

describe('@unit value-converters edge: anyToXlsx recursion', () => {
    it('returns "" for empty string but keeps 0 and false scalars', () => {
        assert.equal(anyToXlsx(''), '');
        assert.equal(anyToXlsx(0), 0);
        assert.equal(anyToXlsx(false), false);
    });

    it('drops 0 and false from arrays only when they survive as "" recursively', () => {
        assert.equal(anyToXlsx([0, false, 'a']), '0,false,a');
        assert.equal(anyToXlsx(['', null, undefined]), '');
    });

    it('recursively stringifies nested arrays joining with commas', () => {
        assert.equal(anyToXlsx([['a', 'b'], 'c']), 'a,b,c');
    });

    it('JSON-stringifies nested objects inside arrays', () => {
        assert.equal(anyToXlsx([{ a: 1 }, 'x']), '{"a":1},x');
    });

    it('JSON-stringifies a bare Date object (no special-casing)', () => {
        const d = new Date('2020-01-01T00:00:00.000Z');
        assert.equal(anyToXlsx(d), '"2020-01-01T00:00:00.000Z"');
    });
});

describe('@unit value-converters edge: xlsxToArray falsy handling', () => {
    it('treats 0 and false and NaN as empty -> []', () => {
        assert.deepEqual(xlsxToArray(0, false), []);
        assert.deepEqual(xlsxToArray(false, true), []);
        assert.deepEqual(xlsxToArray(NaN, false), []);
        assert.deepEqual(xlsxToArray(null, true), []);
    });

    it('wraps truthy objects without inspecting them', () => {
        const obj = { a: 1 };
        assert.deepEqual(xlsxToArray(obj, false), [obj]);
        assert.deepEqual(xlsxToArray(obj, true), [[obj]]);
    });
});

describe('@unit value-converters edge: xlsxToNumber / xlsxToBoolean / xlsxToString', () => {
    it('xlsxToNumber returns 0 for empty string and null, NaN for whitespace text', () => {
        assert.equal(xlsxToNumber(''), 0);
        assert.equal(xlsxToNumber(null), 0);
        assert.equal(xlsxToNumber('  '), 0);
        assert.ok(Number.isNaN(xlsxToNumber(undefined)));
        assert.ok(Number.isNaN(xlsxToNumber('1abc')));
    });

    it('xlsxToNumber parses hex/exponent strings and very large integers', () => {
        assert.equal(xlsxToNumber('0x10'), 16);
        assert.equal(xlsxToNumber('1e3'), 1000);
        assert.equal(xlsxToNumber('9007199254740993'), 9007199254740992);
    });

    it('xlsxToBoolean is strictly "Yes" only, case-sensitive', () => {
        assert.equal(xlsxToBoolean('yes'), false);
        assert.equal(xlsxToBoolean('YES'), false);
        assert.equal(xlsxToBoolean(true), false);
        assert.equal(xlsxToBoolean('Yes '), false);
    });

    it('xlsxToString / xlsxToAny are pure identity, even for null/objects', () => {
        assert.equal(xlsxToString(null), null);
        assert.equal(xlsxToString(undefined), undefined);
        const obj = {};
        assert.equal(xlsxToString(obj), obj);
        assert.equal(xlsxToAny(obj), obj);
    });
});

describe('@unit value-converters edge: formulaToXlsx', () => {
    it('wraps any value including null/number/object in { f }', () => {
        assert.deepEqual(formulaToXlsx(null), { f: null });
        assert.deepEqual(formulaToXlsx(0), { f: 0 });
        const o = { a: 1 };
        assert.deepEqual(formulaToXlsx(o), { f: o });
    });
});

describe('@unit value-converters edge: valueToFormula', () => {
    it('quotes strings without escaping embedded quotes (latent: produces broken formula)', () => {
        assert.equal(valueToFormula('a"b'), '"a"b"');
        assert.equal(valueToFormula(''), '""');
    });

    it('passes NaN and Infinity through as numbers unchanged', () => {
        assert.ok(Number.isNaN(valueToFormula(NaN)));
        assert.equal(valueToFormula(Infinity), Infinity);
    });

    it('uses Array.toString (comma-joined) for arrays', () => {
        assert.equal(valueToFormula([1, 2, 3]), '1,2,3');
    });

    it('returns null/undefined unchanged (no toString branch reached)', () => {
        assert.equal(valueToFormula(null), null);
        assert.equal(valueToFormula(undefined), undefined);
    });
});

describe('@unit value-converters edge: xlsxToPresetValue', () => {
    it('returns "" for empty string but passes through 0 and false', () => {
        assert.equal(xlsxToPresetValue({ type: 'number' }, 0), 0);
        assert.equal(xlsxToPresetValue({ type: 'boolean' }, false), false);
        assert.equal(xlsxToPresetValue({ type: 'string' }, ''), '');
    });

    it('returns "" when isRef + JSON is whitespace or partial', () => {
        assert.equal(xlsxToPresetValue({ isRef: true }, '{bad'), '');
        assert.equal(xlsxToPresetValue({ isRef: true }, '   '), '');
    });

    it('parses JSON primitives/arrays when isRef=true', () => {
        assert.equal(xlsxToPresetValue({ isRef: true }, '123'), 123);
        assert.equal(xlsxToPresetValue({ isRef: true }, 'true'), true);
        assert.deepEqual(xlsxToPresetValue({ isRef: true }, '[1,2]'), [1, 2]);
    });
});

describe('@unit value-converters edge: xlsxToPresetArray', () => {
    it('returns null for empty string and whitespace-only (no matches)', () => {
        assert.equal(xlsxToPresetArray({ type: 'string' }, ''), null);
    });

    it('splits comma lists and trims nothing (preserves inner spaces)', () => {
        assert.deepEqual(xlsxToPresetArray({ type: 'string' }, 'a, b ,c'), ['a', ' b ', 'c']);
    });

    it('coerces non-string scalars via String() before matching', () => {
        assert.deepEqual(xlsxToPresetArray({ type: 'number' }, 123), ['123']);
    });

    it('drops empty entries between commas (regex skips them)', () => {
        assert.deepEqual(xlsxToPresetArray({ type: 'string' }, 'a,,b'), ['a', 'b']);
    });

    it('parses each quoted segment as JSON when isRef=true', () => {
        const out = xlsxToPresetArray({ isRef: true }, '{"a":1},{"b":2}');
        assert.deepEqual(out, [{ a: 1 }, { b: 2 }]);
    });
});

describe('@unit value-converters edge: unitToXlsx', () => {
    it('returns "" for unknown unitSystem regardless of unit', () => {
        assert.equal(unitToXlsx({ unit: 'kg', unitSystem: 'middle' }), '');
        assert.equal(unitToXlsx({ unit: 'kg', unitSystem: undefined }), '');
    });

    it('embeds undefined unit literally for prefix/postfix', () => {
        assert.equal(unitToXlsx({ unitSystem: 'prefix' }), '"undefined"#,##0.00');
        assert.equal(unitToXlsx({ unitSystem: 'postfix' }), '#,##0.00"undefined"');
    });
});

describe('@unit value-converters edge: xlsxToUnit regex', () => {
    it('extracts the unit token out of an exceljs number format', () => {
        assert.equal(xlsxToUnit('"$"#,##0.00'), '$');
        assert.equal(xlsxToUnit('#,##0.00"kg"'), 'kg');
    });

    it('throws when the format contains no unit token (null match deref)', () => {
        assert.throws(() => xlsxToUnit('#,##0.00'));
        assert.throws(() => xlsxToUnit(''));
    });
});

describe('@unit value-converters edge: fontToXlsx', () => {
    it('defaults bold to false and omits size/color when absent', () => {
        const out = fontToXlsx({});
        assert.equal(out.font.bold, false);
        assert.equal(out.font.size, undefined);
        assert.equal(out.font.color, undefined);
    });

    it('strips only the first "px" occurrence from size', () => {
        assert.equal(fontToXlsx({ size: '12px' }).font.size, '12');
        assert.equal(fontToXlsx({ size: '12pxpx' }).font.size, '12px');
    });

    it('prefixes color with FF and strips a single leading #', () => {
        assert.deepEqual(fontToXlsx({ color: '#abcdef' }).font.color, { argb: 'FFabcdef' });
        assert.deepEqual(fontToXlsx({ color: 'abcdef' }).font.color, { argb: 'FFabcdef' });
    });

    it('base merge overwrites base.font entirely (shallow Object.assign)', () => {
        const base = { font: { italic: true }, fill: 'x' };
        const out = fontToXlsx({ bold: true }, base);
        assert.equal(out.font.italic, undefined);
        assert.equal(out.font.bold, true);
        assert.equal(out.fill, 'x');
    });
});

describe('@unit value-converters edge: xlsxToFont', () => {
    it('parses a JSON string into an object', () => {
        assert.deepEqual(xlsxToFont('{"bold":true}'), { bold: true });
    });

    it('returns {} on malformed JSON instead of throwing', () => {
        assert.deepEqual(xlsxToFont('{bad'), {});
    });

    it('returns {} for object input (function builds result but never returns it)', () => {
        assert.deepEqual(xlsxToFont({ bold: true, size: 12 }), {});
        assert.deepEqual(xlsxToFont(null), {});
        assert.deepEqual(xlsxToFont(undefined), {});
    });
});

describe('@unit value-converters edge: typeToXlsx / xlsxToType', () => {
    it('xlsxToType returns null for unknown / empty / null names', () => {
        assert.equal(xlsxToType('NoSuchType'), null);
        assert.equal(xlsxToType(''), null);
        assert.equal(xlsxToType(null), null);
    });

    it('xlsxToType is case-sensitive on the type name', () => {
        assert.equal(xlsxToType('number'), null);
        assert.ok(xlsxToType('Number'));
    });

    it('typeToXlsx returns undefined when no field type matches', () => {
        assert.equal(typeToXlsx({ type: 'totally-unknown' }), undefined);
    });

    it('typeToXlsx resolves String and Boolean by structural equality', () => {
        assert.equal(typeToXlsx({ type: 'string', isRef: false }), 'String');
        assert.equal(typeToXlsx({ type: 'boolean', isRef: false }), 'Boolean');
    });

    it('round-trips a resolved type name back through xlsxToType', () => {
        const t = xlsxToType('Integer');
        assert.equal(t.type, 'integer');
        assert.equal(typeof t.pars, 'function');
        assert.equal(t.pars('5.5'), '');
        assert.equal(t.pars('5'), 5);
    });
});

describe('@unit value-converters edge: examplesToXlsx', () => {
    it('returns the first example coerced via anyToXlsx when examples present', () => {
        assert.equal(examplesToXlsx({ examples: ['first', 'second'] }), 'first');
        assert.equal(examplesToXlsx({ examples: [{ a: 1 }] }), '{"a":1}');
    });

    it('returns "" for isRef fields without examples', () => {
        assert.equal(examplesToXlsx({ isRef: true }), '');
        assert.equal(examplesToXlsx({ isRef: true, examples: null }), '');
    });

    it('returns "" when an empty examples array is supplied (examples[0] undefined)', () => {
        assert.equal(examplesToXlsx({ examples: [] }), '');
    });
});

describe('@unit expression edge: malformed / empty formulae', () => {
    it('does not throw on empty / whitespace formula (mathjs yields undefined node)', () => {
        const e1 = new Expression('e', '');
        e1.parse();
        assert.equal(e1.symbols.size, 0);
        assert.equal(e1.transformed, 'undefined');
        const e2 = new Expression('e', '   ');
        e2.parse();
        assert.equal(e2.transformed, 'undefined');
    });

    it('throws on syntactically invalid formula', () => {
        assert.throws(() => new Expression('e', 'A1 +').parse());
        assert.throws(() => new Expression('e', '((A1)').parse());
    });

    it('parses a bare numeric constant with no symbols', () => {
        const e = new Expression('e', '42');
        e.parse();
        assert.equal(e.symbols.size, 0);
        assert.equal(e.transformed, '42');
    });

    it('treats a single-cell range A1:A1 as one cell', () => {
        const e = new Expression('e', 'sum(A1:A1)');
        e.parse();
        assert.deepEqual(e.ranges.get('A1_A1'), ['A1']);
    });

    it('throws Invalid range when a range endpoint lacks a row number', () => {
        const e = new Expression('e', 'sum(A:A3)');
        assert.throws(() => e.parse(), /Invalid range/);
    });

    it('nested function calls collect inner symbols recursively', () => {
        const e = new Expression('e', 'add(sub(A1, B2), C3)');
        e.parse();
        assert.deepEqual(Array.from(e.symbols).sort(), ['A1', 'B2', 'C3']);
    });
});

describe('@unit xlsx-expressions edge: variable graph errors', () => {
    it('fullPath is null even after add when field unset on child', () => {
        const parent = new XlsxVariable('p', 'p', 'd', 0);
        parent.setField({ name: 'root' });
        const child = new XlsxVariable('c', 'c', 'd', 1);
        parent.add(child);
        assert.equal(child.fullPath, null);
    });

    it('add wires parent pointer and is order-preserving', () => {
        const p = new XlsxVariable('p', 'p', 'd', 0);
        const a = new XlsxVariable('a', 'a', 'd', 1);
        const b = new XlsxVariable('b', 'b', 'd', 1);
        p.add(a);
        p.add(b);
        assert.equal(p.children.length, 2);
        assert.equal(a.parent, p);
        assert.equal(p.children[1], b);
    });

    it('updateSchemas on empty list is a no-op', () => {
        const ex = new XlsxExpressions();
        ex.setSchema({ fields: [] });
        assert.doesNotThrow(() => ex.updateSchemas([]));
        assert.equal(ex.getVariables().size, 0);
    });

    it('updateSchemas throws Invalid group level when first var has lvl 1 (no prior sibling)', () => {
        const ex = new XlsxExpressions();
        ex.setSchema({ fields: [] });
        ex.addVariable({ name: 'n', path: 'p' }, 'd', 1);
        assert.throws(() => ex.updateSchemas([]), /Invalid group level/);
    });

    it('getVariables collapses duplicate fieldPaths to the last entry', () => {
        const ex = new XlsxExpressions();
        ex.addVariable({ name: 'a', path: 'dup' }, 'd', 0);
        ex.addVariable({ name: 'b', path: 'dup' }, 'd', 0);
        assert.equal(ex.getVariables().size, 1);
    });

    it('update throws Fields not found when title does not match at lvl 0', () => {
        const v = new XlsxVariable('n', 'Missing', 'd', 0);
        v.setSchema({ fields: [{ name: 'f', title: 'Other' }] });
        assert.throws(() => v.update([]), /Fields not found/);
    });
});

describe('@unit schema-condition edge: constructor disambiguation', () => {
    it('treats an object field arg with explicit value as the single form', () => {
        const c = new XlsxSchemaConditions({ op: 'OR', items: [] }, 'V');
        assert.ok(c.single);
        assert.equal(c.condition.ifCondition.fieldValue, 'V');
        assert.equal(c.group, undefined);
    });

    it('object with op but non-array items falls into the single form', () => {
        const c = new XlsxSchemaConditions({ op: 'OR', items: 'nope' });
        assert.ok(c.single);
        assert.equal(c.group, undefined);
    });

    it('treats undefined field with undefined value as single form (field=undefined)', () => {
        const c = new XlsxSchemaConditions(undefined, undefined);
        assert.ok(c.single);
        assert.equal(c.condition.ifCondition.field, undefined);
    });

    it('builds an empty-items group when items array is empty', () => {
        const c = new XlsxSchemaConditions({ op: 'AND', items: [] });
        assert.ok(c.group);
        assert.deepEqual(c.condition.ifCondition.AND, []);
    });

    it('non-OR op is treated as AND in the payload mapping', () => {
        const c = new XlsxSchemaConditions({ op: 'XOR', items: [{ field: { name: 'a' }, value: 1 }] });
        assert.ok(c.condition.ifCondition.AND);
        assert.equal(c.condition.ifCondition.OR, undefined);
    });
});

describe('@unit schema-condition edge: equal() boundaries', () => {
    it('single.equal returns false when comparison field is undefined', () => {
        const c = new XlsxSchemaConditions({ name: 'a' }, 'X');
        assert.equal(c.equal(undefined, 'X'), false);
    });

    it('single.equal uses deep JSON compare so undefined==undefined values match', () => {
        const c = new XlsxSchemaConditions({ name: 'a' }, undefined);
        assert.equal(c.equal({ name: 'a' }, undefined), true);
    });

    it('group.equal returns false when other is null/undefined', () => {
        const c = new XlsxSchemaConditions({ op: 'OR', items: [] });
        assert.equal(c.equal(null), false);
        assert.equal(c.equal(undefined), false);
    });

    it('group.equal of two empty-item groups with same op is true', () => {
        const c = new XlsxSchemaConditions({ op: 'OR', items: [] });
        assert.equal(c.equal({ op: 'OR', items: [] }), true);
    });

    it('group.equal normalises items by field.name + JSON value', () => {
        const c = new XlsxSchemaConditions({
            op: 'AND',
            items: [{ field: { name: 'a' }, value: { z: 1 } }],
        });
        assert.equal(c.equal({ op: 'AND', items: [{ field: { name: 'a' }, value: { z: 1 } }] }), true);
        assert.equal(c.equal({ op: 'AND', items: [{ field: { name: 'a' }, value: { z: 2 } }] }), false);
    });
});
