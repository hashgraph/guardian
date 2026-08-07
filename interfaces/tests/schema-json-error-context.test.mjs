import assert from 'node:assert/strict';
import { ErrorContext, JsonError, JsonErrorMessage } from '../dist/helpers/schema-json.js';

describe('ErrorContext', () => {
    it('initializes with empty entity / property / error / message', () => {
        const ctx = new ErrorContext();
        assert.equal(ctx.entity, '');
        assert.equal(ctx.property, '');
        assert.equal(ctx.error, '');
        assert.equal(ctx.message, '');
    });

    describe('setPath', () => {
        it('builds entity from a single root segment, property = root', () => {
            const ctx = new ErrorContext().setPath(['schema']);
            assert.equal(ctx.entity, 'schema');
            assert.equal(ctx.property, 'schema');
        });

        it("joins intermediate segments with '.' and treats the last as the property", () => {
            const ctx = new ErrorContext().setPath(['schema', 'fields', 'name']);
            assert.equal(ctx.entity, 'schema.fields');
            assert.equal(ctx.property, 'name');
        });

        it("appends bracketed segments without a separator (e.g. fields[0])", () => {
            const ctx = new ErrorContext().setPath(['schema', '[0]', 'name']);
            assert.equal(ctx.entity, 'schema[0]');
            assert.equal(ctx.property, 'name');
        });

        it("composes property correctly when last segment is bracketed", () => {
            const ctx = new ErrorContext().setPath(['schema', 'fields', '[2]']);
            assert.equal(ctx.property, 'fields[2]');
        });
    });

    describe('add', () => {
        it('returns a new ErrorContext with extended path', () => {
            const a = new ErrorContext().setPath(['schema']);
            const b = a.add('fields');
            assert.notEqual(a, b);
            assert.equal(b.entity, 'schema');
            assert.equal(b.property, 'fields');
        });

        it('starts from an empty path when add() is called on a freshly constructed ctx', () => {
            const ctx = new ErrorContext().add('first');
            assert.equal(ctx.entity, 'first');
            assert.equal(ctx.property, 'first');
        });
    });

    describe('setMessage', () => {
        it('records error template and message and returns this for chaining', () => {
            const ctx = new ErrorContext().setMessage(JsonError.INVALID_FORMAT, JsonErrorMessage.STRING);
            assert.equal(ctx.error, JsonError.INVALID_FORMAT);
            assert.equal(ctx.message, JsonErrorMessage.STRING);
        });

        it("falls back to '' when message is omitted", () => {
            const ctx = new ErrorContext().setMessage(JsonError.NOT_AVAILABLE);
            assert.equal(ctx.message, '');
        });
    });

    it('setData stores the raw payload for later inspection', () => {
        const ctx = new ErrorContext();
        ctx.setData({ payload: 'x' });
        assert.deepEqual(ctx.data, { payload: 'x' });
    });
});

describe('JsonError / JsonErrorMessage enums', () => {
    it('JsonError exposes canonical templates', () => {
        assert.match(JsonError.INVALID_FORMAT, /\$\{prop\}.*\$\{entity\}.*\$\{message\}/);
        assert.match(JsonError.NOT_AVAILABLE, /property type/);
        assert.match(JsonError.UNIQUE, /must be unique/);
    });

    it('JsonErrorMessage exposes the documented validation strings', () => {
        assert.equal(JsonErrorMessage.STRING, 'Value of type string is required.');
        assert.equal(JsonErrorMessage.BOOLEAN, 'Value of type boolean is required.');
        assert.match(JsonErrorMessage.SIZE, /between 0 and 70/);
    });
});
