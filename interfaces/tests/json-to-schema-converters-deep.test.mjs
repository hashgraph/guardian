import assert from 'node:assert/strict';

import { JsonToSchema, ErrorContext } from '../dist/helpers/schema-json.js';
import { SchemaEntity } from '../dist/type/schema-entity.type.js';

function ctx() {
    return new ErrorContext().setPath(['schema', 'field']);
}

describe('JsonToSchema.equalString', () => {
    it('matches identical strings', () => {
        assert.equal(JsonToSchema.equalString('A', 'A'), true);
    });

    it('matches case-insensitively', () => {
        assert.equal(JsonToSchema.equalString('Abc', 'aBC'), true);
    });

    it('rejects different strings', () => {
        assert.equal(JsonToSchema.equalString('a', 'b'), false);
    });

    it('matches identical non-strings by strict equality', () => {
        assert.equal(JsonToSchema.equalString(1, 1), true);
    });

    it('rejects different non-strings', () => {
        assert.equal(JsonToSchema.equalString(1, 2), false);
    });

    it('rejects a string compared with a non-string', () => {
        assert.equal(JsonToSchema.equalString('1', 1), false);
    });
});

describe('JsonToSchema.fromString', () => {
    it('returns a string value unchanged', () => {
        assert.equal(JsonToSchema.fromString('x', ctx()), 'x');
    });

    it('returns undefined for undefined', () => {
        assert.equal(JsonToSchema.fromString(undefined, ctx()), undefined);
    });

    it('throws for a number', () => {
        assert.throws(() => JsonToSchema.fromString(5, ctx()), /Invalid format/);
    });

    it('throws for an object', () => {
        assert.throws(() => JsonToSchema.fromString({}, ctx()), /Invalid format/);
    });
});

describe('JsonToSchema.fromRequiredString', () => {
    it('returns a non-empty string', () => {
        assert.equal(JsonToSchema.fromRequiredString('hi', ctx()), 'hi');
    });

    it('throws for an empty string', () => {
        assert.throws(() => JsonToSchema.fromRequiredString('', ctx()), /Invalid format/);
    });

    it('throws for undefined', () => {
        assert.throws(() => JsonToSchema.fromRequiredString(undefined, ctx()), /Invalid format/);
    });
});

describe('JsonToSchema.fromBoolean', () => {
    it('accepts true and "true"', () => {
        assert.equal(JsonToSchema.fromBoolean(true, ctx()), true);
        assert.equal(JsonToSchema.fromBoolean('true', ctx()), true);
    });

    it('accepts false and "false"', () => {
        assert.equal(JsonToSchema.fromBoolean(false, ctx()), false);
        assert.equal(JsonToSchema.fromBoolean('false', ctx()), false);
    });

    it('returns undefined for undefined', () => {
        assert.equal(JsonToSchema.fromBoolean(undefined, ctx()), undefined);
    });

    it('throws for a non-boolean value', () => {
        assert.throws(() => JsonToSchema.fromBoolean('yes', ctx()), /Invalid format/);
    });
});

describe('JsonToSchema.fromEntity', () => {
    it('accepts NONE', () => {
        assert.equal(JsonToSchema.fromEntity(SchemaEntity.NONE, ctx()), SchemaEntity.NONE);
    });

    it('accepts VC', () => {
        assert.equal(JsonToSchema.fromEntity(SchemaEntity.VC, ctx()), SchemaEntity.VC);
    });

    it('accepts EVC', () => {
        assert.equal(JsonToSchema.fromEntity(SchemaEntity.EVC, ctx()), SchemaEntity.EVC);
    });

    it('throws for an unknown entity', () => {
        assert.throws(() => JsonToSchema.fromEntity('OTHER', ctx()), /Invalid format/);
    });
});

describe('JsonToSchema.fromTextSize', () => {
    it('accepts a numeric size within range', () => {
        assert.equal(JsonToSchema.fromTextSize(20, ctx()), '20');
    });

    it('parses a px string', () => {
        assert.equal(JsonToSchema.fromTextSize('30px', ctx()), '30');
    });

    it('returns undefined for undefined', () => {
        assert.equal(JsonToSchema.fromTextSize(undefined, ctx()), undefined);
    });

    it('throws for an out-of-range number', () => {
        assert.throws(() => JsonToSchema.fromTextSize(100, ctx()), /Invalid format/);
    });

    it('throws for a non-numeric string', () => {
        assert.throws(() => JsonToSchema.fromTextSize('abc', ctx()), /Invalid format/);
    });
});

describe('JsonToSchema.fromTextColor', () => {
    it('accepts a 6-digit hex color', () => {
        assert.equal(JsonToSchema.fromTextColor('#aabbcc', ctx()), '#aabbcc');
    });

    it('accepts a 3-digit hex color', () => {
        assert.equal(JsonToSchema.fromTextColor('#abc', ctx()), '#abc');
    });

    it('returns undefined for undefined', () => {
        assert.equal(JsonToSchema.fromTextColor(undefined, ctx()), undefined);
    });

    it('throws for an invalid color', () => {
        assert.throws(() => JsonToSchema.fromTextColor('red', ctx()), /Invalid format/);
    });
});

describe('JsonToSchema.fromArray and fromNotArray', () => {
    it('fromArray returns an array unchanged', () => {
        assert.deepEqual(JsonToSchema.fromArray([1, 2], ctx()), [1, 2]);
    });

    it('fromArray throws for a non-array', () => {
        assert.throws(() => JsonToSchema.fromArray('x', ctx()), /Invalid format/);
    });

    it('fromNotArray returns a primitive unchanged', () => {
        assert.equal(JsonToSchema.fromNotArray('x', ctx()), 'x');
        assert.equal(JsonToSchema.fromNotArray(5, ctx()), 5);
    });

    it('fromNotArray throws for an array', () => {
        assert.throws(() => JsonToSchema.fromNotArray([1], ctx()), /Invalid format/);
    });

    it('fromNotArray throws for an object', () => {
        assert.throws(() => JsonToSchema.fromNotArray({}, ctx()), /Invalid format/);
    });
});

describe('JsonToSchema.fromRequired', () => {
    function valueWith(required) {
        return { required };
    }

    it('maps boolean true to required', () => {
        const r = JsonToSchema.fromRequired(valueWith(true), ctx());
        assert.deepEqual(r, { required: true, hidden: false, autocalculate: false });
    });

    it('maps "Required" to required', () => {
        assert.equal(JsonToSchema.fromRequired(valueWith('Required'), ctx()).required, true);
    });

    it('maps "Hidden" to hidden', () => {
        assert.equal(JsonToSchema.fromRequired(valueWith('Hidden'), ctx()).hidden, true);
    });

    it('maps "Auto Calculate" to autocalculate', () => {
        assert.equal(JsonToSchema.fromRequired(valueWith('Auto Calculate'), ctx()).autocalculate, true);
    });

    it('maps "None" to all-false', () => {
        assert.deepEqual(JsonToSchema.fromRequired(valueWith('None'), ctx()), { required: false, hidden: false, autocalculate: false });
    });

    it('defaults to all-false for undefined', () => {
        assert.deepEqual(JsonToSchema.fromRequired(valueWith(undefined), ctx()), { required: false, hidden: false, autocalculate: false });
    });

    it('throws for an unknown required value', () => {
        assert.throws(() => JsonToSchema.fromRequired(valueWith('Maybe'), ctx()), /Invalid format/);
    });
});

describe('JsonToSchema.getStringValue', () => {
    it('serializes a short object', () => {
        assert.equal(JsonToSchema.getStringValue({ a: 1 }), '{"a":1}');
    });

    it('truncates a long string with ellipsis', () => {
        const out = JsonToSchema.getStringValue('abcdefghijklmnopqrstuvwxyz');
        assert.ok(out.endsWith('...'));
        assert.ok(out.length <= 23);
    });

    it('handles a number', () => {
        assert.equal(JsonToSchema.getStringValue(5), '5');
    });
});

describe('JsonToSchema.fromEnum', () => {
    it('returns an enum array for an Enum field', () => {
        const r = JsonToSchema.fromEnum({ type: 'Enum', enum: ['a', 'b'] }, ctx());
        assert.deepEqual(r.enum, ['a', 'b']);
        assert.equal(r.link, undefined);
    });

    it('returns a link for a string enum value', () => {
        const r = JsonToSchema.fromEnum({ type: 'Enum', enum: 'http://link' }, ctx());
        assert.equal(r.enum, undefined);
        assert.equal(r.link, 'http://link');
    });

    it('returns empties for a non-Enum field without enum', () => {
        const r = JsonToSchema.fromEnum({ type: 'String' }, ctx());
        assert.deepEqual(r, { enum: undefined, link: undefined });
    });

    it('throws when enum is present on a non-Enum field', () => {
        assert.throws(() => JsonToSchema.fromEnum({ type: 'String', enum: ['x'] }, ctx()), /Invalid property type/);
    });

    it('throws for an Enum field with an invalid enum shape', () => {
        assert.throws(() => JsonToSchema.fromEnum({ type: 'Enum', enum: 5 }, ctx()), /Invalid format/);
    });
});
