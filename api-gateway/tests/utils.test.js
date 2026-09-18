import assert from 'node:assert/strict';
import {
    findAllEntities,
    replaceAllEntities,
    parseInteger,
    parseSavepointIdsJson,
    ONLY_SR,
} from '../dist/helpers/utils.js';

describe('findAllEntities', () => {
    it('finds top-level matches', () => {
        const obj = { id: 'A' };
        assert.deepEqual(findAllEntities(obj, 'id'), ['A']);
    });

    it('descends through children[]', () => {
        const obj = {
            id: 'root',
            children: [
                { id: 'a' },
                { id: 'b', children: [{ id: 'c' }] },
            ],
        };
        const ids = findAllEntities(obj, 'id').sort();
        assert.deepEqual(ids, ['a', 'b', 'c', 'root']);
    });

    it('deduplicates duplicate values', () => {
        const obj = {
            id: 'X',
            children: [{ id: 'X' }, { id: 'Y' }, { id: 'X' }],
        };
        const ids = findAllEntities(obj, 'id').sort();
        assert.deepEqual(ids, ['X', 'Y']);
    });

    it('returns empty array when the field is absent everywhere', () => {
        const obj = { foo: 1, children: [{ foo: 2 }] };
        assert.deepEqual(findAllEntities(obj, 'id'), []);
    });

    it('safely handles a null root', () => {
        assert.deepEqual(findAllEntities(null, 'id'), []);
    });
});

describe('replaceAllEntities', () => {
    it('replaces matching values at top level', () => {
        const obj = { name: 'old' };
        replaceAllEntities(obj, 'name', 'old', 'new');
        assert.equal(obj.name, 'new');
    });

    it('replaces matching values inside children[]', () => {
        const obj = {
            name: 'a',
            children: [
                { name: 'old' },
                { name: 'b', children: [{ name: 'old' }] },
            ],
        };
        replaceAllEntities(obj, 'name', 'old', 'new');
        assert.equal(obj.children[0].name, 'new');
        assert.equal(obj.children[1].children[0].name, 'new');
        // Untouched
        assert.equal(obj.name, 'a');
        assert.equal(obj.children[1].name, 'b');
    });

    it('does nothing when no value matches oldValue', () => {
        const obj = { name: 'x', children: [{ name: 'y' }] };
        replaceAllEntities(obj, 'name', 'z', 'w');
        assert.equal(obj.name, 'x');
        assert.equal(obj.children[0].name, 'y');
    });
});

describe('parseInteger', () => {
    it('parses a numeric string to an integer', () => {
        assert.equal(parseInteger('42'), 42);
    });

    it('parses a leading-numeric string (Number.parseInt semantics)', () => {
        assert.equal(parseInteger('42abc'), 42);
    });

    it('returns undefined for non-numeric strings', () => {
        assert.equal(parseInteger('abc'), undefined);
        assert.equal(parseInteger(''), undefined);
    });

    it('floors finite numeric input', () => {
        assert.equal(parseInteger(7.9), 7);
        assert.equal(parseInteger(-3.2), -4);
    });

    it('returns undefined for NaN/Infinity', () => {
        assert.equal(parseInteger(NaN), undefined);
        assert.equal(parseInteger(Infinity), undefined);
        assert.equal(parseInteger(-Infinity), undefined);
    });

    it('returns undefined for non-string/non-number', () => {
        assert.equal(parseInteger(null), undefined);
        assert.equal(parseInteger(undefined), undefined);
        assert.equal(parseInteger({}), undefined);
        assert.equal(parseInteger([1]), undefined);
        assert.equal(parseInteger(true), undefined);
    });
});

describe('parseSavepointIdsJson', () => {
    it('returns undefined when input is empty/null/undefined', () => {
        assert.equal(parseSavepointIdsJson(undefined), undefined);
        assert.equal(parseSavepointIdsJson(null), undefined);
        assert.equal(parseSavepointIdsJson(''), undefined);
    });

    it('parses a JSON array of strings', () => {
        assert.deepEqual(parseSavepointIdsJson('["a","b","c"]'), ['a', 'b', 'c']);
    });

    it('filters out empty strings and whitespace-only entries', () => {
        assert.deepEqual(parseSavepointIdsJson('["a","","   ","b"]'), ['a', 'b']);
    });

    it('filters out non-string entries', () => {
        assert.deepEqual(parseSavepointIdsJson('["a", 1, true, null, "b"]'), ['a', 'b']);
    });

    it('deduplicates while preserving the first-seen order', () => {
        assert.deepEqual(parseSavepointIdsJson('["a","b","a","c","b"]'), ['a', 'b', 'c']);
    });

    it('returns undefined when the parsed array contains no usable strings', () => {
        assert.equal(parseSavepointIdsJson('[]'), undefined);
        assert.equal(parseSavepointIdsJson('["", "  ", null]'), undefined);
    });

    it('throws an HttpException on malformed JSON', () => {
        assert.throws(
            () => parseSavepointIdsJson('not-json'),
            /JSON array of strings/
        );
    });

    it('throws an HttpException when JSON is valid but not an array', () => {
        assert.throws(
            () => parseSavepointIdsJson('{"foo":"bar"}'),
            /JSON array of strings/
        );
        assert.throws(
            () => parseSavepointIdsJson('"a"'),
            /JSON array of strings/
        );
    });
});

describe('ONLY_SR constant', () => {
    it('mentions Standard Registry role', () => {
        assert.match(ONLY_SR, /Standard Registry/);
    });
});
