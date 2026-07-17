import assert from 'node:assert/strict';
import { Hash3, Sha256 } from '../../dist/analytics/compare/hash/utils.js';

describe('Hash3', () => {
    it('produces a stable result for the same sequence of values', () => {
        const a = new Hash3().add('one').add('two').add('three').result();
        const b = new Hash3().add('one').add('two').add('three').result();
        assert.equal(a, b);
        assert.equal(typeof a, 'string');
        assert.ok(a.length > 0);
    });

    it('hash() and add() are equivalent', () => {
        const a = new Hash3().add('x').add('y').result();
        const b = new Hash3().hash('x').hash('y').result();
        assert.equal(a, b);
    });

    it('produces a different result when inputs differ', () => {
        const a = new Hash3().add('x').add('y').result();
        const b = new Hash3().add('y').add('x').result();
        assert.notEqual(a, b);
    });

    it('coerces non-strings via String(...)', () => {
        const a = new Hash3().add('42').result();
        const b = new Hash3().add(42).result();
        assert.equal(a, b);
    });

    it('clear() resets the running hash', () => {
        const h = new Hash3().add('x').add('y');
        h.clear();
        const fresh = new Hash3();
        assert.equal(h.result(), fresh.result());
    });

    it('add()/hash()/clear() return `this` for chaining', () => {
        const h = new Hash3();
        assert.equal(h.add('x'), h);
        assert.equal(h.hash('y'), h);
        assert.equal(h.clear(), h);
    });

    it('static aggregate() matches the running-state result', () => {
        const a = Hash3.aggregate('a', 'b', 'c');
        const b = new Hash3().add('a').add('b').add('c').result();
        assert.equal(a, b);
    });
});

describe('Sha256', () => {
    it('hash() returns a deterministic non-empty string', () => {
        const a = Sha256.hash('hello');
        const b = Sha256.hash('hello');
        assert.equal(a, b);
        assert.ok(a.length > 0);
    });

    it('hash() returns different strings for different inputs', () => {
        assert.notEqual(Sha256.hash('a'), Sha256.hash('b'));
    });

    it('hash(falsy) coerces to empty string (does not throw)', () => {
        const empty = Sha256.hash('');
        const nullish = Sha256.hash(null);
        assert.equal(empty, nullish);
    });

    it('base58() returns a non-empty deterministic string for a string input', () => {
        const a = Sha256.base58('hello');
        const b = Sha256.base58('hello');
        assert.equal(a, b);
        assert.ok(a.length > 0);
    });

    it('base58() returns different strings for different inputs', () => {
        assert.notEqual(Sha256.base58('a'), Sha256.base58('b'));
    });

    it('base58() returns "" on internal errors (e.g. unhashable input)', () => {
        // crypto.createHash().update(undefined) throws — exercise that catch path.
        assert.equal(Sha256.base58(undefined), '');
    });
});
