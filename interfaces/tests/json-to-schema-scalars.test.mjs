import assert from 'node:assert/strict';
import { JsonToSchema, ErrorContext } from '../dist/helpers/schema-json.js';
import { SchemaEntity } from '../dist/type/schema-entity.type.js';

const ctx = () => new ErrorContext().setPath(['schema']);

describe('JsonToSchema.equalString', () => {
    it('returns true for identical values', () => {
        assert.equal(JsonToSchema.equalString('abc', 'abc'), true);
        assert.equal(JsonToSchema.equalString(5, 5), true);
    });

    it('compares strings case-insensitively', () => {
        assert.equal(JsonToSchema.equalString('Prefix', 'prefix'), true);
        assert.equal(JsonToSchema.equalString('STRING', 'string'), true);
    });

    it('returns false for different strings', () => {
        assert.equal(JsonToSchema.equalString('abc', 'abd'), false);
    });

    it('returns false when either side is not a string', () => {
        assert.equal(JsonToSchema.equalString(5, '5'), false);
        assert.equal(JsonToSchema.equalString(undefined, 'x'), false);
    });
});

describe('JsonToSchema.fromString', () => {
    it('passes strings through and keeps undefined', () => {
        assert.equal(JsonToSchema.fromString('hello', ctx()), 'hello');
        assert.equal(JsonToSchema.fromString('', ctx()), '');
        assert.equal(JsonToSchema.fromString(undefined, ctx()), undefined);
    });

    it('throws on non-string values', () => {
        assert.throws(() => JsonToSchema.fromString(5, ctx()), /Value of type string is required/);
        assert.throws(() => JsonToSchema.fromString(null, ctx()), /Value of type string is required/);
    });
});

describe('JsonToSchema.fromRequiredString', () => {
    it('accepts a non-empty string', () => {
        assert.equal(JsonToSchema.fromRequiredString('x', ctx()), 'x');
    });

    it('rejects empty strings and undefined', () => {
        assert.throws(() => JsonToSchema.fromRequiredString('', ctx()));
        assert.throws(() => JsonToSchema.fromRequiredString(undefined, ctx()));
    });
});

describe('JsonToSchema.fromBoolean', () => {
    it('accepts boolean literals', () => {
        assert.equal(JsonToSchema.fromBoolean(true, ctx()), true);
        assert.equal(JsonToSchema.fromBoolean(false, ctx()), false);
    });

    it('accepts the strings "true" and "false"', () => {
        assert.equal(JsonToSchema.fromBoolean('true', ctx()), true);
        assert.equal(JsonToSchema.fromBoolean('false', ctx()), false);
    });

    it('returns undefined for undefined', () => {
        assert.equal(JsonToSchema.fromBoolean(undefined, ctx()), undefined);
    });

    it('throws for any other value', () => {
        assert.throws(() => JsonToSchema.fromBoolean(1, ctx()), /Value of type boolean is required/);
        assert.throws(() => JsonToSchema.fromBoolean('yes', ctx()), /Value of type boolean is required/);
    });
});

describe('JsonToSchema.fromEntity', () => {
    it('accepts NONE, VC and EVC', () => {
        assert.equal(JsonToSchema.fromEntity(SchemaEntity.NONE, ctx()), SchemaEntity.NONE);
        assert.equal(JsonToSchema.fromEntity(SchemaEntity.VC, ctx()), SchemaEntity.VC);
        assert.equal(JsonToSchema.fromEntity(SchemaEntity.EVC, ctx()), SchemaEntity.EVC);
    });

    it('rejects other entities', () => {
        assert.throws(() => JsonToSchema.fromEntity('USER', ctx()), /must be one of \[NONE, VC, EVC\]/);
        assert.throws(() => JsonToSchema.fromEntity(undefined, ctx()));
    });
});

describe('JsonToSchema.fromArray / fromNotArray', () => {
    it('fromArray passes arrays through', () => {
        assert.deepEqual(JsonToSchema.fromArray([1, 2], ctx()), [1, 2]);
        assert.deepEqual(JsonToSchema.fromArray([], ctx()), []);
    });

    it('fromArray rejects non-arrays', () => {
        assert.throws(() => JsonToSchema.fromArray('x', ctx()), /Value of type array is required/);
        assert.throws(() => JsonToSchema.fromArray({}, ctx()));
    });

    it('fromNotArray passes scalars through', () => {
        assert.equal(JsonToSchema.fromNotArray('x', ctx()), 'x');
        assert.equal(JsonToSchema.fromNotArray(5, ctx()), 5);
        assert.equal(JsonToSchema.fromNotArray(true, ctx()), true);
    });

    it('fromNotArray rejects arrays with a dedicated message', () => {
        assert.throws(() => JsonToSchema.fromNotArray([1], ctx()), /Value of type non-array is required/);
    });

    it('fromNotArray rejects plain objects with a dedicated message', () => {
        assert.throws(() => JsonToSchema.fromNotArray({ a: 1 }, ctx()), /Value of type non-object is required/);
    });
});

describe('JsonToSchema.getStringValue', () => {
    it('stringifies short values verbatim', () => {
        assert.equal(JsonToSchema.getStringValue(5), '5');
        assert.equal(JsonToSchema.getStringValue('ab'), '"ab"');
    });

    it('truncates long values with an ellipsis', () => {
        const long = JsonToSchema.getStringValue('a'.repeat(50));
        assert.equal(long.length, 23);
        assert.ok(long.endsWith('...'));
    });
});
