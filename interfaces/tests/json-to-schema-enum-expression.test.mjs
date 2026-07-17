import assert from 'node:assert/strict';
import { JsonToSchema, ErrorContext } from '../dist/helpers/schema-json.js';

const ctx = () => new ErrorContext().setPath(['schema', 'fields']);

describe('JsonToSchema.fromEnum', () => {
    it('reads an inline enum array for Enum fields', () => {
        assert.deepEqual(JsonToSchema.fromEnum({ type: 'Enum', enum: ['A', 'B'] }, ctx()), { enum: ['A', 'B'], link: undefined });
    });

    it('treats a string enum as a remote link', () => {
        assert.deepEqual(JsonToSchema.fromEnum({ type: 'Enum', enum: 'ipfs://cid' }, ctx()), { enum: undefined, link: 'ipfs://cid' });
    });

    it('rejects empty enum entries', () => {
        assert.throws(() => JsonToSchema.fromEnum({ type: 'Enum', enum: ['A', ''] }, ctx()), /Value of type string is required/);
    });

    it('rejects a missing or non-enum value on Enum fields', () => {
        assert.throws(() => JsonToSchema.fromEnum({ type: 'Enum' }, ctx()), /Value of type enum or a reference to enum is required/);
        assert.throws(() => JsonToSchema.fromEnum({ type: 'Enum', enum: 5 }, ctx()));
    });

    it('rejects enum values on non-Enum fields', () => {
        assert.throws(() => JsonToSchema.fromEnum({ type: 'String', enum: ['A'] }, ctx()), /Invalid property type/);
    });

    it('returns empty enum and link for plain fields', () => {
        assert.deepEqual(JsonToSchema.fromEnum({ type: 'String' }, ctx()), { enum: undefined, link: undefined });
    });
});

describe('JsonToSchema.fromAvailableOptions', () => {
    it('copies a valid options array', () => {
        assert.deepEqual(JsonToSchema.fromAvailableOptions({ availableOptions: ['Point', 'Polygon'] }, ctx()), { availableOptions: ['Point', 'Polygon'] });
    });

    it('rejects empty option strings', () => {
        assert.throws(() => JsonToSchema.fromAvailableOptions({ availableOptions: [''] }, ctx()));
    });

    it('returns undefined when no options are provided', () => {
        assert.equal(JsonToSchema.fromAvailableOptions({}, ctx()), undefined);
    });
});

describe('JsonToSchema.fromExpression', () => {
    it('requires an expression for Auto Calculate fields', () => {
        assert.equal(JsonToSchema.fromExpression({ required: 'Auto Calculate', expression: 'a+b' }, ctx()), 'a+b');
        assert.throws(() => JsonToSchema.fromExpression({ required: 'Auto Calculate' }, ctx()));
    });

    it('rejects expressions on non-calculated fields', () => {
        assert.throws(() => JsonToSchema.fromExpression({ required: 'Required', expression: 'a+b' }, ctx()), /Invalid property type/);
    });

    it('returns undefined when no expression is supplied', () => {
        assert.equal(JsonToSchema.fromExpression({ required: 'Required' }, ctx()), undefined);
    });
});

describe('JsonToSchema.fromExamples', () => {
    it('wraps a scalar example in a single-element array', () => {
        assert.deepEqual(JsonToSchema.fromExamples({ example: 'e' }, ctx()), { examples: ['e'], suggest: undefined, default: undefined });
    });

    it('keeps an array example as a nested array for isArray fields', () => {
        assert.deepEqual(JsonToSchema.fromExamples({ example: ['e1', 'e2'], isArray: true }, ctx()), { examples: [['e1', 'e2']], suggest: undefined, default: undefined });
    });

    it('rejects an array example on a non-array field', () => {
        assert.throws(() => JsonToSchema.fromExamples({ example: ['e'] }, ctx()), /non-array/);
    });

    it('rejects a scalar example on an array field', () => {
        assert.throws(() => JsonToSchema.fromExamples({ example: 'e', isArray: true }, ctx()), /Value of type array is required/);
    });

    it('reads suggest and default with the same array rules', () => {
        assert.deepEqual(JsonToSchema.fromExamples({ suggest: 's', default: 'd' }, ctx()), { examples: undefined, suggest: 's', default: 'd' });
        assert.deepEqual(JsonToSchema.fromExamples({ suggest: ['s'], default: ['d'], isArray: true }, ctx()), { examples: undefined, suggest: ['s'], default: ['d'] });
    });

    it('returns all-undefined when nothing is provided', () => {
        assert.deepEqual(JsonToSchema.fromExamples({}, ctx()), { examples: undefined, suggest: undefined, default: undefined });
    });
});

describe('JsonToSchema.createError message substitution', () => {
    it('substitutes property and entity into the template', () => {
        const context = new ErrorContext().setPath(['schema', 'fields', '[0]', 'key']);
        try {
            JsonToSchema.fromRequiredString(undefined, context);
            assert.fail('expected to throw');
        } catch (error) {
            assert.ok(error.message.includes('schema.fields[0]'));
            assert.ok(error.message.includes('"key"'));
            assert.ok(error.message.includes('Value of type string is required.'));
        }
    });

    it('embeds a truncated JSON value into the message', () => {
        try {
            JsonToSchema.fromString({ very: 'long value that exceeds twenty chars' }, new ErrorContext().setPath(['schema', 'name']));
            assert.fail('expected to throw');
        } catch (error) {
            assert.ok(error.message.includes('...'));
        }
    });
});
