import { assert } from 'chai';
import { HttpRequestBlock } from '../../../dist/policy-engine/blocks/http-request-block.js';

const basePrototype = Object.getPrototypeOf(HttpRequestBlock.prototype);
const block = Object.create(HttpRequestBlock.prototype);

describe('HttpRequestBlock runtime — getFieldByPath', () => {
    it('reads a top-level field', () => {
        assert.equal(block.getFieldByPath({ a: 1 }, 'a'), 1);
    });

    it('reads a nested field via dotted path', () => {
        assert.equal(block.getFieldByPath({ a: { b: { c: 'deep' } } }, 'a.b.c'), 'deep');
    });

    it('returns empty string when an intermediate node is undefined', () => {
        assert.equal(block.getFieldByPath({ a: {} }, 'a.b.c'), '');
    });

    it('returns empty string for a missing top-level field', () => {
        assert.equal(block.getFieldByPath({}, 'x.y'), '');
    });

    it('returns undefined for an existing-but-undefined leaf', () => {
        assert.isUndefined(block.getFieldByPath({ a: undefined }, 'a'));
    });
});

describe('HttpRequestBlock runtime — replaceVariablesInString', () => {
    it('replaces a single ${var} token', () => {
        const out = block.replaceVariablesInString('Hi ${name}', { name: 'Bob' });
        assert.equal(out, 'Hi Bob');
    });

    it('replaces a nested-path token', () => {
        const out = block.replaceVariablesInString('${user.did}', { user: { did: 'did:9' } });
        assert.equal(out, 'did:9');
    });

    it('leaves a string with no tokens unchanged', () => {
        assert.equal(block.replaceVariablesInString('plain text', {}), 'plain text');
    });

    it('substitutes empty string when an intermediate path node is missing', () => {
        const out = block.replaceVariablesInString('x=${a.b.c}', { a: {} });
        assert.equal(out, 'x=');
    });

    it('replaces a token inside a JSON-shaped string', () => {
        const out = block.replaceVariablesInString('{"u":"${username}"}', { username: 'alice' });
        assert.equal(out, '{"u":"alice"}');
    });

    it('keeps the value when the path resolves to a number', () => {
        const out = block.replaceVariablesInString('n=${count}', { count: 7 });
        assert.equal(out, 'n=7');
    });
});
