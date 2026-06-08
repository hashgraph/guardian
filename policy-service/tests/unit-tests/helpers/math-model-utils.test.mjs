import assert from 'node:assert/strict';
import {
    convertValue,
    getValueByPath,
    getDocumentValueByPath,
    setValueByPath,
    setDocumentValueByPath,
    findCommand,
    parseValue,
} from '../../../dist/policy-engine/helpers/math-model/utils.js';

describe('convertValue', () => {
    it('returns strings, numbers, and booleans unchanged', () => {
        assert.equal(convertValue('hello'), 'hello');
        assert.equal(convertValue(42), 42);
        assert.equal(convertValue(true), true);
        assert.equal(convertValue(false), false);
    });

    it('wraps an array of primitives in a List head', () => {
        assert.deepEqual(convertValue([1, 2, 3]), ['List', 1, 2, 3]);
    });

    it('recurses into nested arrays', () => {
        assert.deepEqual(convertValue([[1], [2]]), ['List', ['List', 1], ['List', 2]]);
    });

    it('returns null for unsupported types (object, null, undefined)', () => {
        assert.equal(convertValue({}), null);
        assert.equal(convertValue(null), null);
        assert.equal(convertValue(undefined), null);
    });

    it('returns null for an array containing an unsupported value', () => {
        assert.equal(convertValue([1, {}]), null);
    });
});

describe('getValueByPath', () => {
    it('walks a flat path', () => {
        assert.equal(getValueByPath({ a: { b: { c: 5 } } }, ['a', 'b', 'c'], 0), 5);
    });

    it('returns the value as-is when index >= keys.length', () => {
        assert.deepEqual(getValueByPath({ a: 1 }, ['a'], 1), { a: 1 });
    });

    it('maps over arrays at intermediate steps', () => {
        const doc = { items: [{ v: 1 }, { v: 2 }, { v: 3 }] };
        assert.deepEqual(getValueByPath(doc, ['items', 'v'], 0), [1, 2, 3]);
    });
});

describe('getDocumentValueByPath', () => {
    it('reads a nested string path', () => {
        assert.equal(getDocumentValueByPath({ a: { b: 'x' } }, 'a.b'), 'x');
    });

    it('returns null when doc is null/undefined or path is empty', () => {
        assert.equal(getDocumentValueByPath(null, 'a'), null);
        assert.equal(getDocumentValueByPath({ a: 1 }, ''), null);
        assert.equal(getDocumentValueByPath({ a: 1 }, undefined), null);
    });

    it('returns null on traversal error', () => {
        assert.equal(getDocumentValueByPath({ a: null }, 'a.b.c'), null);
    });
});

describe('setValueByPath', () => {
    it('writes a leaf value when fields agree', () => {
        const fields = [{ name: 'a', isRef: true, fields: [{ name: 'b' }] }];
        const target = {};
        setValueByPath(target, fields, ['a', 'b'], 0, 9);
        assert.deepEqual(target, { a: { b: 9 } });
    });

    it('throws when an intermediate field is missing or not a ref', () => {
        const fields = [{ name: 'a', isRef: false }];
        assert.throws(() => setValueByPath({}, fields, ['a', 'b'], 0, 1), /Invalid path/);
    });

    it('writes per-element through an array ref', () => {
        const fields = [
            {
                name: 'list',
                isRef: true,
                isArray: true,
                fields: [{ name: 'v' }],
            },
        ];
        const target = {};
        setValueByPath(target, fields, ['list', 'v'], 0, [10, 20]);
        assert.deepEqual(target, { list: [{ v: 10 }, { v: 20 }] });
    });

    it('throws when array path expects an array value but got scalar', () => {
        const fields = [
            {
                name: 'list',
                isRef: true,
                isArray: true,
                fields: [{ name: 'v' }],
            },
        ];
        assert.throws(
            () => setValueByPath({}, fields, ['list', 'v'], 0, 1),
            /Invalid path/,
        );
    });
});

describe('setDocumentValueByPath', () => {
    it('mutates and returns the document', () => {
        const fields = [{ name: 'a', isRef: true, fields: [{ name: 'b' }] }];
        const doc = {};
        const out = setDocumentValueByPath({ fields }, doc, 'a.b', 7);
        assert.equal(out, doc);
        assert.deepEqual(doc, { a: { b: 7 } });
    });

    it('throws when the doc is missing', () => {
        const fields = [];
        assert.throws(() => setDocumentValueByPath({ fields }, null, 'a', 1), /Invalid path/);
    });

    it('throws when the path is empty', () => {
        const fields = [];
        assert.throws(() => setDocumentValueByPath({ fields }, {}, '', 1), /Invalid path/);
    });

    it('translates underlying setValueByPath errors', () => {
        const fields = [{ name: 'a', isRef: false }];
        assert.throws(
            () => setDocumentValueByPath({ fields }, {}, 'a.b', 1),
            /Invalid path/,
        );
    });
});

describe('findCommand', () => {
    it('finds the top-level command', () => {
        const json = ['Sum', 1, 2];
        const result = findCommand(json, 'Sum');
        assert.equal(result.length, 1);
        assert.equal(result[0], json);
    });

    it('finds nested commands', () => {
        const inner = ['Tuple', 'i', 1];
        const outer = ['Sum', ['Add', 'a', 'b'], inner];
        const result = findCommand(outer, 'Tuple');
        assert.equal(result.length, 1);
        assert.equal(result[0], inner);
    });

    it('finds bare-symbol command and returns its parent', () => {
        const parent = ['Add', 'pi', 1];
        const result = findCommand(parent, 'pi');
        assert.equal(result.length, 1);
        assert.equal(result[0], parent);
    });

    it('returns [] when the command is not present', () => {
        assert.deepEqual(findCommand(['Add', 1, 2], 'Sum'), []);
    });

    it('returns multiple matches across the tree', () => {
        const tree = ['Add', ['Sum', 1, 2], ['Mul', ['Sum', 3, 4]]];
        assert.equal(findCommand(tree, 'Sum').length, 2);
    });
});

describe('parseValue', () => {
    it('returns the value field of a typed scalar', () => {
        assert.equal(parseValue({ type: { kind: 'number' }, value: 42 }), 42);
    });

    it('expands a typed list into an array of recursively parsed values', () => {
        const list = {
            type: { kind: 'list' },
            ops: [
                { type: { kind: 'number' }, value: 1 },
                { type: { kind: 'number' }, value: 2 },
            ],
        };
        assert.deepEqual(parseValue(list), [1, 2]);
    });

    it('returns [] for a list without ops', () => {
        assert.deepEqual(parseValue({ type: { kind: 'list' } }), []);
    });

    it('returns the input as-is when it has no type field', () => {
        assert.equal(parseValue('plain'), 'plain');
        assert.equal(parseValue(7), 7);
        assert.equal(parseValue(null), null);
    });
});
