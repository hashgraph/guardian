import assert from 'node:assert/strict';

import { ErrorContext } from '../dist/helpers/schema-json.js';

describe('ErrorContext.setPath entity/property derivation', () => {
    it('starts empty by default', () => {
        const c = new ErrorContext();
        assert.equal(c.entity, '');
        assert.equal(c.property, '');
    });

    it('uses the single segment as both entity and property', () => {
        const c = new ErrorContext().setPath(['schema']);
        assert.equal(c.entity, 'schema');
        assert.equal(c.property, 'schema');
    });

    it('joins nested segments with dots into entity', () => {
        const c = new ErrorContext().setPath(['schema', 'fields', 'key']);
        assert.equal(c.entity, 'schema.fields');
        assert.equal(c.property, 'key');
    });

    it('attaches bracket segments without a dot', () => {
        const c = new ErrorContext().setPath(['schema', 'fields', '[0]', 'key']);
        assert.equal(c.entity, 'schema.fields[0]');
        assert.equal(c.property, 'key');
    });

    it('builds property as previous + bracket when last is a bracket', () => {
        const c = new ErrorContext().setPath(['schema', 'f', '[2]']);
        assert.equal(c.entity, 'schema.f');
        assert.equal(c.property, 'f[2]');
    });

    it('handles an empty path array', () => {
        const c = new ErrorContext().setPath([]);
        assert.equal(c.entity, 'undefined');
        assert.equal(c.property, undefined);
    });

    it('resets entity/property on a fresh setPath call', () => {
        const c = new ErrorContext().setPath(['schema', 'a', 'b']);
        c.setPath(['other']);
        assert.equal(c.entity, 'other');
        assert.equal(c.property, 'other');
    });
});

describe('ErrorContext.add', () => {
    it('returns a new context with the field appended to the path', () => {
        const base = new ErrorContext().setPath(['schema']);
        const child = base.add('name');
        assert.notEqual(child, base);
        assert.equal(child.property, 'name');
    });

    it('appends to an existing multi-segment path', () => {
        const base = new ErrorContext().setPath(['schema', 'fields']);
        const child = base.add('key');
        assert.equal(child.entity, 'schema.fields');
        assert.equal(child.property, 'key');
    });

    it('appends a bracket segment correctly', () => {
        const base = new ErrorContext().setPath(['schema', 'fields']);
        const child = base.add('[3]');
        assert.equal(child.entity, 'schema.fields');
        assert.equal(child.property, 'fields[3]');
    });

    it('add starting from no path produces a single-segment context', () => {
        const base = new ErrorContext();
        const child = base.add('root');
        assert.equal(child.property, 'root');
        assert.equal(child.entity, 'root');
    });

    it('chains add calls building deeper paths', () => {
        const c = new ErrorContext().setPath(['schema']).add('fields').add('[0]').add('title');
        assert.equal(c.entity, 'schema.fields[0]');
        assert.equal(c.property, 'title');
    });
});

describe('ErrorContext.setMessage', () => {
    it('records the error and message', () => {
        const c = new ErrorContext().setMessage('ERR', 'MSG');
        assert.equal(c.error, 'ERR');
        assert.equal(c.message, 'MSG');
    });

    it('defaults message to empty string', () => {
        const c = new ErrorContext().setMessage('ERR');
        assert.equal(c.message, '');
    });

    it('returns itself for chaining', () => {
        const c = new ErrorContext();
        assert.equal(c.setMessage('E', 'M'), c);
    });
});

describe('ErrorContext.setData', () => {
    it('stores arbitrary data', () => {
        const c = new ErrorContext();
        const data = { a: 1 };
        c.setData(data);
        assert.equal(c.data, data);
    });
});
