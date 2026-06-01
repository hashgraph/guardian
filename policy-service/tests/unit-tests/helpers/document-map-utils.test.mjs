import { assert } from 'chai';
import { DocumentMap } from '../../../dist/policy-engine/helpers/math-model/document-map.js';
import {
    convertValue,
    getValueByPath,
    getDocumentValueByPath,
    parseValue,
    findCommand,
} from '../../../dist/policy-engine/helpers/math-model/utils.js';

describe('DocumentMap', () => {
    it('addDocument sets current and indexes by schema', () => {
        const m = new DocumentMap();
        m.addDocument({ schema: 's1', document: { a: 1 } });
        assert.deepEqual(m.getCurrent(), { a: 1 });
        assert.deepEqual(m.getDocument('s1'), { a: 1 });
    });

    it('getDocument(null) returns the current document', () => {
        const m = new DocumentMap();
        m.addDocument({ schema: 's1', document: { x: true } });
        assert.deepEqual(m.getDocument(null), { x: true });
    });

    it('addRelationships indexes additional schemas', () => {
        const m = new DocumentMap();
        m.addDocument({ schema: 'main', document: { a: 1 } });
        m.addRelationships([
            { schema: 'rel-1', document: { b: 2 } },
            { schema: 'rel-2', document: { c: 3 } },
        ]);
        assert.deepEqual(m.getDocument('rel-1'), { b: 2 });
        assert.deepEqual(m.getDocument('rel-2'), { c: 3 });
    });

    it('getRelationships excludes the current document', () => {
        const m = new DocumentMap();
        m.addDocument({ schema: 'main', document: { a: 1 } });
        m.addRelationships([{ schema: 'rel-1', document: { b: 2 } }]);
        const rels = m.getRelationships();
        assert.equal(rels.length, 1);
        assert.equal(rels[0].schema, 'rel-1');
    });

    it('toJson returns { target, relationships } where relationships keys to docs', () => {
        const m = new DocumentMap();
        m.addDocument({ schema: 'main', document: { a: 1 } });
        m.addRelationships([{ schema: 'rel-1', document: { b: 2 } }]);
        const json = m.toJson();
        assert.deepEqual(json.target, { a: 1 });
        assert.deepEqual(json.relationships['rel-1'], { b: 2 });
    });

    it('static from() rebuilds from a toJson() snapshot', () => {
        const json = { target: { a: 1 }, relationships: { 's1': { b: 2 } } };
        const m = DocumentMap.from(json);
        assert.deepEqual(m.getCurrent(), { a: 1 });
        assert.deepEqual(m.getDocument('s1'), { b: 2 });
    });
});

describe('convertValue', () => {
    it('passes through string / number / boolean unchanged', () => {
        assert.equal(convertValue('s'), 's');
        assert.equal(convertValue(42), 42);
        assert.equal(convertValue(true), true);
    });

    it('wraps arrays into ["List", ...mappedItems]', () => {
        const result = convertValue([1, 2, 'three']);
        assert.deepEqual(result, ['List', 1, 2, 'three']);
    });

    it('returns null when array contains an unsupported value', () => {
        // null and {} are not supported types → inner convertValue returns null → outer returns null.
        assert.equal(convertValue([1, null]), null);
        assert.equal(convertValue([{}]), null);
    });

    it('returns null for objects', () => {
        assert.equal(convertValue({ a: 1 }), null);
    });
});

describe('getValueByPath / getDocumentValueByPath', () => {
    it('walks dotted keys into a nested object', () => {
        const obj = { a: { b: { c: 7 } } };
        assert.equal(getValueByPath(obj, ['a', 'b', 'c'], 0), 7);
    });

    it('maps over arrays at each level', () => {
        const obj = { items: [{ v: 1 }, { v: 2 }] };
        assert.deepEqual(getValueByPath(obj, ['items', 'v'], 0), [1, 2]);
    });

    it('getDocumentValueByPath returns null for falsy doc/path', () => {
        assert.equal(getDocumentValueByPath(null, 'a'), null);
        assert.equal(getDocumentValueByPath({}, ''), null);
    });

    it('getDocumentValueByPath splits on dots', () => {
        assert.equal(getDocumentValueByPath({ a: { b: 9 } }, 'a.b'), 9);
    });
});

describe('parseValue', () => {
    it('returns the input unchanged for plain values', () => {
        assert.equal(parseValue(42), 42);
        assert.equal(parseValue('x'), 'x');
        assert.equal(parseValue(null), null);
    });

    it('extracts .value from typed values', () => {
        assert.equal(parseValue({ type: { kind: 'number' }, value: 9 }), 9);
    });

    it('expands list-typed values into a recursive array', () => {
        const list = {
            type: { kind: 'list' },
            ops: [
                { type: { kind: 'number' }, value: 1 },
                { type: { kind: 'number' }, value: 2 },
            ],
        };
        assert.deepEqual(parseValue(list), [1, 2]);
    });

    it('returns [] for an empty list', () => {
        assert.deepEqual(parseValue({ type: { kind: 'list' }, ops: [] }), []);
    });
});

describe('findCommand', () => {
    it('collects every array node whose head equals the target command', () => {
        const tree = ['Add', ['Multiply', 1, 2], ['Add', 3, 4]];
        const result = findCommand(tree, 'Add');
        assert.equal(result.length, 2);
    });

    it('returns [] when nothing matches', () => {
        assert.deepEqual(findCommand(['Subtract', 1, 2], 'Add'), []);
    });
});
