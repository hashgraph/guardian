import assert from 'node:assert/strict';
import { SchemaHelper } from '../dist/helpers/schema-helper.js';

describe('SchemaHelper.buildSchemaComment / parseSchemaComment', () => {
    it('builds canonical { @id, term } JSON without version', () => {
        const comment = SchemaHelper.buildSchemaComment('uuid-1', 'https://x#uuid-1');
        const parsed = JSON.parse(comment);
        assert.equal(parsed['@id'], 'https://x#uuid-1');
        assert.equal(parsed.term, 'uuid-1');
        assert.equal(parsed.previousVersion, undefined);
    });

    it('embeds previousVersion when supplied', () => {
        const comment = SchemaHelper.buildSchemaComment('uuid-1', 'https://x#uuid-1', '1.0.0');
        const parsed = JSON.parse(comment);
        assert.equal(parsed.previousVersion, '1.0.0');
    });

    it('parseSchemaComment round-trips a built comment', () => {
        const built = SchemaHelper.buildSchemaComment('uuid-1', 'https://x#uuid-1', '1.0.0');
        const parsed = SchemaHelper.parseSchemaComment(built);
        assert.equal(parsed.previousVersion, '1.0.0');
    });

    it('parseSchemaComment returns {} for malformed input', () => {
        assert.deepEqual(SchemaHelper.parseSchemaComment(''), {});
        assert.deepEqual(SchemaHelper.parseSchemaComment('not-json'), {});
        assert.deepEqual(SchemaHelper.parseSchemaComment(null), {});
    });
});

describe('SchemaHelper.parseFieldComment', () => {
    it('parses a JSON object string', () => {
        assert.deepEqual(SchemaHelper.parseFieldComment('{"unit":"kg"}'), { unit: 'kg' });
    });

    it('returns {} for malformed JSON', () => {
        assert.deepEqual(SchemaHelper.parseFieldComment('not-json'), {});
        assert.deepEqual(SchemaHelper.parseFieldComment(''), {});
        assert.deepEqual(SchemaHelper.parseFieldComment(null), {});
    });
});

describe('SchemaHelper.buildFieldComment', () => {
    it('embeds term, schema.org @id for non-ref fields, and skips falsy options', () => {
        const json = SchemaHelper.buildFieldComment(
            { isRef: false }, 'name', 'https://x',
        );
        const parsed = JSON.parse(json);
        assert.equal(parsed.term, 'name');
        assert.equal(parsed['@id'], 'https://www.schema.org/text');
        // No optional fields → only term + @id.
        assert.deepEqual(Object.keys(parsed).sort(), ['@id', 'term']);
    });

    it('embeds the constructed URL @id for $ref fields', () => {
        const json = SchemaHelper.buildFieldComment(
            { isRef: true, type: '#child' }, 'rel', 'https://x',
        );
        const parsed = JSON.parse(json);
        assert.equal(parsed['@id'], 'https://x#child');
    });

    it('passes through unit, customType, hidden, expression, etc.', () => {
        const json = SchemaHelper.buildFieldComment(
            {
                isRef: false,
                unit: 'kg',
                unitSystem: 'metric',
                customType: 'enum',
                hidden: true,
                expression: 'a+b',
                isUpdatable: true,
                availableOptions: ['A', 'B'],
            },
            'qty', 'https://x', 3,
        );
        const parsed = JSON.parse(json);
        assert.equal(parsed.unit, 'kg');
        assert.equal(parsed.unitSystem, 'metric');
        assert.equal(parsed.customType, 'enum');
        assert.equal(parsed.hidden, true);
        assert.equal(parsed.expression, 'a+b');
        assert.equal(parsed.isUpdatable, true);
        assert.deepEqual(parsed.availableOptions, ['A', 'B']);
        assert.equal(parsed.orderPosition, 3);
    });

    it('omits orderPosition when not an integer or negative', () => {
        let parsed = JSON.parse(SchemaHelper.buildFieldComment({ isRef: false }, 'a', 'u'));
        assert.equal(parsed.orderPosition, undefined);

        parsed = JSON.parse(SchemaHelper.buildFieldComment({ isRef: false }, 'a', 'u', -1));
        assert.equal(parsed.orderPosition, undefined);
    });

    it('embeds isPrivate=false (explicit) but not when null/undefined', () => {
        let parsed = JSON.parse(
            SchemaHelper.buildFieldComment({ isRef: false, isPrivate: false }, 'a', 'u'),
        );
        assert.equal(parsed.isPrivate, false);

        parsed = JSON.parse(SchemaHelper.buildFieldComment({ isRef: false }, 'a', 'u'));
        assert.equal(parsed.isPrivate, undefined);
    });
});

describe('SchemaHelper.checkSchemaKey', () => {
    it('returns true when no property keys contain whitespace', () => {
        const ok = SchemaHelper.checkSchemaKey({
            document: { properties: { foo: {}, bar_baz: {} } },
        });
        assert.equal(ok, true);
    });

    it('throws when any property key contains whitespace', () => {
        assert.throws(() => SchemaHelper.checkSchemaKey({
            document: { properties: { 'has space': {} } },
        }), /must not contain spaces/);
    });

    it('returns true (no-op) when the schema lacks document.properties', () => {
        assert.equal(SchemaHelper.checkSchemaKey({}), true);
        assert.equal(SchemaHelper.checkSchemaKey({ document: {} }), true);
    });
});
