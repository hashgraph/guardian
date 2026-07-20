import assert from 'node:assert/strict';
import { JsonToSchema, ErrorContext } from '../dist/helpers/schema-json.js';
import { SchemaEntity } from '../dist/type/schema-entity.type.js';

const ctx = () => new ErrorContext().setPath(['schema', 'fields']);

describe('JsonToSchema.fromTextSize', () => {
    it('accepts numbers in the open interval (0, 70)', () => {
        assert.equal(JsonToSchema.fromTextSize(18, ctx()), '18');
        assert.equal(JsonToSchema.fromTextSize(69, ctx()), '69');
    });

    it('accepts numeric strings, optionally with a px suffix', () => {
        assert.equal(JsonToSchema.fromTextSize('25', ctx()), '25');
        assert.equal(JsonToSchema.fromTextSize('25px', ctx()), '25');
    });

    it('rejects out-of-range sizes', () => {
        assert.throws(() => JsonToSchema.fromTextSize(70, ctx()), /between 0 and 70/);
        assert.throws(() => JsonToSchema.fromTextSize(-5, ctx()));
        assert.throws(() => JsonToSchema.fromTextSize('99px', ctx()));
    });

    it('returns undefined for falsy input', () => {
        assert.equal(JsonToSchema.fromTextSize(undefined, ctx()), undefined);
        assert.equal(JsonToSchema.fromTextSize(0, ctx()), undefined);
        assert.equal(JsonToSchema.fromTextSize('', ctx()), undefined);
    });
});

describe('JsonToSchema.fromTextColor', () => {
    it('accepts 3- and 6-digit hex colors', () => {
        assert.equal(JsonToSchema.fromTextColor('#fff', ctx()), '#fff');
        assert.equal(JsonToSchema.fromTextColor('#FF00aa', ctx()), '#FF00aa');
    });

    it('rejects malformed colors', () => {
        assert.throws(() => JsonToSchema.fromTextColor('red', ctx()), /Rgb color definition/);
        assert.throws(() => JsonToSchema.fromTextColor('#12345', ctx()));
        assert.throws(() => JsonToSchema.fromTextColor(255, ctx()));
    });

    it('returns undefined for falsy input', () => {
        assert.equal(JsonToSchema.fromTextColor(undefined, ctx()), undefined);
        assert.equal(JsonToSchema.fromTextColor('', ctx()), undefined);
    });
});

describe('JsonToSchema.fromFont', () => {
    it('builds a full font object for Help Text fields', () => {
        const font = JsonToSchema.fromFont({ type: 'Help Text', textSize: 20, textColor: '#ff0000', textBold: true }, ctx());
        assert.deepEqual(font, { size: '20', color: '#ff0000', bold: true });
    });

    it('applies defaults for missing Help Text font properties', () => {
        const font = JsonToSchema.fromFont({ type: 'Help Text' }, ctx());
        assert.deepEqual(font, { size: '18', color: '#000000', bold: false });
    });

    it('throws when font properties are set on a non Help Text field', () => {
        assert.throws(() => JsonToSchema.fromFont({ type: 'String', textSize: 20 }, ctx()), /Invalid property type/);
        assert.throws(() => JsonToSchema.fromFont({ type: 'String', textColor: '#fff' }, ctx()));
        assert.throws(() => JsonToSchema.fromFont({ type: 'String', textBold: true }, ctx()));
    });

    it('returns an empty font object for plain fields', () => {
        assert.deepEqual(JsonToSchema.fromFont({ type: 'String' }, ctx()), { size: undefined, color: undefined, bold: undefined });
    });
});

describe('JsonToSchema.fromRequired', () => {
    it('maps boolean and boolean-string values', () => {
        assert.deepEqual(JsonToSchema.fromRequired({ required: true }, ctx()), { required: true, hidden: false, autocalculate: false });
        assert.deepEqual(JsonToSchema.fromRequired({ required: 'true' }, ctx()), { required: true, hidden: false, autocalculate: false });
        assert.deepEqual(JsonToSchema.fromRequired({ required: false }, ctx()), { required: false, hidden: false, autocalculate: false });
        assert.deepEqual(JsonToSchema.fromRequired({ required: 'false' }, ctx()), { required: false, hidden: false, autocalculate: false });
    });

    it('maps the documented enum values case-insensitively', () => {
        assert.deepEqual(JsonToSchema.fromRequired({ required: 'none' }, ctx()), { required: false, hidden: false, autocalculate: false });
        assert.deepEqual(JsonToSchema.fromRequired({ required: 'REQUIRED' }, ctx()), { required: true, hidden: false, autocalculate: false });
        assert.deepEqual(JsonToSchema.fromRequired({ required: 'hidden' }, ctx()), { required: false, hidden: true, autocalculate: false });
        assert.deepEqual(JsonToSchema.fromRequired({ required: 'auto calculate' }, ctx()), { required: false, hidden: false, autocalculate: true });
    });

    it('throws for unrecognised non-empty values', () => {
        assert.throws(() => JsonToSchema.fromRequired({ required: 'maybe' }, ctx()), /must be one of \[None, Required, Hidden, Auto Calculate\]/);
    });

    it('defaults to all-false when required is missing', () => {
        assert.deepEqual(JsonToSchema.fromRequired({}, ctx()), { required: false, hidden: false, autocalculate: false });
    });
});

describe('JsonToSchema.fromIsPrivate', () => {
    it('reads the private flag for EVC entities', () => {
        assert.equal(JsonToSchema.fromIsPrivate({ private: true }, SchemaEntity.EVC, ctx()), true);
        assert.equal(JsonToSchema.fromIsPrivate({ private: 'false' }, SchemaEntity.EVC, ctx()), false);
        assert.equal(JsonToSchema.fromIsPrivate({}, SchemaEntity.EVC, ctx()), undefined);
    });

    it('rejects the private flag for non-EVC entities', () => {
        assert.throws(() => JsonToSchema.fromIsPrivate({ private: true }, SchemaEntity.VC, ctx()), /Invalid property type/);
        assert.throws(() => JsonToSchema.fromIsPrivate({ private: false }, SchemaEntity.NONE, ctx()));
    });

    it('returns undefined when the flag is absent for non-EVC entities', () => {
        assert.equal(JsonToSchema.fromIsPrivate({}, SchemaEntity.VC, ctx()), undefined);
    });
});
