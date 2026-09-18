import assert from 'node:assert/strict';
import { JsonToSchema, ErrorContext } from '../dist/helpers/schema-json.js';
import { UnitSystem } from '../dist/type/unit-system.type.js';

const ctx = () => new ErrorContext().setPath(['schema', 'fields']);

describe('JsonToSchema.fromType', () => {
    it('maps primitive dictionary names to json-schema types', () => {
        assert.equal(JsonToSchema.fromType({ type: 'Number' }, [], ctx()), 'number');
        assert.equal(JsonToSchema.fromType({ type: 'Integer' }, [], ctx()), 'integer');
        assert.equal(JsonToSchema.fromType({ type: 'Boolean' }, [], ctx()), 'boolean');
        assert.equal(JsonToSchema.fromType({ type: 'String' }, [], ctx()), 'string');
    });

    it('matches names case-insensitively', () => {
        assert.equal(JsonToSchema.fromType({ type: 'number' }, [], ctx()), 'number');
        assert.equal(JsonToSchema.fromType({ type: 'DATE' }, [], ctx()), 'string');
    });

    it('maps custom field types', () => {
        assert.equal(JsonToSchema.fromType({ type: 'Prefix' }, [], ctx()), 'number');
        assert.equal(JsonToSchema.fromType({ type: 'Postfix' }, [], ctx()), 'number');
        assert.equal(JsonToSchema.fromType({ type: 'hederaAccount' }, [], ctx()), 'string');
    });

    it('maps system field types to their ref types', () => {
        assert.equal(JsonToSchema.fromType({ type: 'GeoJSON' }, [], ctx()), '#GeoJSON');
        assert.equal(JsonToSchema.fromType({ type: 'SentinelHUB' }, [], ctx()), '#SentinelHUB');
    });

    it('resolves a sub-schema iri from the provided list', () => {
        const all = [{ iri: '#Sub&1.0.0' }];
        assert.equal(JsonToSchema.fromType({ type: '#Sub&1.0.0' }, all, ctx()), '#Sub&1.0.0');
    });

    it('throws for an unknown type', () => {
        assert.throws(() => JsonToSchema.fromType({ type: '#Missing' }, [], ctx()), /primitive type or a sub-schema reference/);
    });
});

describe('JsonToSchema.fromFormat', () => {
    it('returns the dictionary format for formatted string types', () => {
        assert.equal(JsonToSchema.fromFormat({ type: 'Date' }, ctx()), 'date');
        assert.equal(JsonToSchema.fromFormat({ type: 'Time' }, ctx()), 'time');
        assert.equal(JsonToSchema.fromFormat({ type: 'DateTime' }, ctx()), 'date-time');
        assert.equal(JsonToSchema.fromFormat({ type: 'Duration' }, ctx()), 'duration');
        assert.equal(JsonToSchema.fromFormat({ type: 'URL' }, ctx()), 'url');
        assert.equal(JsonToSchema.fromFormat({ type: 'URI' }, ctx()), 'uri');
        assert.equal(JsonToSchema.fromFormat({ type: 'Email' }, ctx()), 'email');
    });

    it('returns undefined for format-less types', () => {
        assert.equal(JsonToSchema.fromFormat({ type: 'Number' }, ctx()), undefined);
        assert.equal(JsonToSchema.fromFormat({ type: 'Unknown' }, ctx()), undefined);
    });
});

describe('JsonToSchema.fromPattern', () => {
    it('uses the provided pattern for String fields', () => {
        assert.equal(JsonToSchema.fromPattern({ type: 'String', pattern: '^a$' }, ctx()), '^a$');
        assert.equal(JsonToSchema.fromPattern({ type: 'String' }, ctx()), undefined);
    });

    it('uses the dictionary pattern for Image and hederaAccount', () => {
        assert.equal(JsonToSchema.fromPattern({ type: 'Image' }, ctx()), '^ipfs:\/\/.+');
        assert.equal(JsonToSchema.fromPattern({ type: 'hederaAccount' }, ctx()), '^\\d+\\.\\d+\\.\\d+$');
    });

    it('ignores a pattern on a dictionary type that has none', () => {
        assert.equal(JsonToSchema.fromPattern({ type: 'Number', pattern: '^1$' }, ctx()), undefined);
    });

    it('throws when a pattern is supplied for an unknown type', () => {
        assert.throws(() => JsonToSchema.fromPattern({ type: '#Sub', pattern: '^1$' }, ctx()), /Invalid property type/);
    });

    it('returns undefined when an unknown type has no pattern', () => {
        assert.equal(JsonToSchema.fromPattern({ type: '#Sub' }, ctx()), undefined);
    });
});

describe('JsonToSchema.fromIsRef', () => {
    it('is false for dictionary and custom types', () => {
        assert.equal(JsonToSchema.fromIsRef({ type: 'Number' }, [], ctx()), false);
        assert.equal(JsonToSchema.fromIsRef({ type: 'Prefix' }, [], ctx()), false);
        assert.equal(JsonToSchema.fromIsRef({ type: 'String' }, [], ctx()), false);
    });

    it('is true for sub-schema iris', () => {
        assert.equal(JsonToSchema.fromIsRef({ type: '#Sub' }, [{ iri: '#Sub' }], ctx()), true);
    });

    it('treats GeoJSON as a form field type rather than a system ref', () => {
        assert.equal(JsonToSchema.fromIsRef({ type: 'GeoJSON' }, [], ctx()), false);
    });

    it('is false for an unresolvable type', () => {
        assert.equal(JsonToSchema.fromIsRef({ type: '#Sub' }, [], ctx()), false);
    });
});

describe('JsonToSchema.fromUnit / fromUnitType', () => {
    it('returns the unit string for Prefix and Postfix types', () => {
        assert.equal(JsonToSchema.fromUnit({ type: 'Prefix', unit: '$' }, ctx()), '$');
        assert.equal(JsonToSchema.fromUnit({ type: 'Postfix', unit: 'kg' }, ctx()), 'kg');
    });

    it('returns undefined unit for other types', () => {
        assert.equal(JsonToSchema.fromUnit({ type: 'Number', unit: '$' }, ctx()), undefined);
    });

    it('derives the unit system from the type name', () => {
        assert.equal(JsonToSchema.fromUnitType({ type: 'Prefix' }, ctx()), UnitSystem.Prefix);
        assert.equal(JsonToSchema.fromUnitType({ type: 'Postfix' }, ctx()), UnitSystem.Postfix);
        assert.equal(JsonToSchema.fromUnitType({ type: 'Number' }, ctx()), undefined);
    });
});

describe('JsonToSchema.fromCustomType', () => {
    it('returns the dictionary customType when defined', () => {
        assert.equal(JsonToSchema.fromCustomType({ type: 'Enum' }, ctx()), 'enum');
        assert.equal(JsonToSchema.fromCustomType({ type: 'File' }, ctx()), 'file');
        assert.equal(JsonToSchema.fromCustomType({ type: 'Table' }, ctx()), 'table');
        assert.equal(JsonToSchema.fromCustomType({ type: 'hederaAccount' }, ctx()), 'hederaAccount');
    });

    it('returns undefined for plain types', () => {
        assert.equal(JsonToSchema.fromCustomType({ type: 'Number' }, ctx()), undefined);
        assert.equal(JsonToSchema.fromCustomType({ type: '#Sub' }, ctx()), undefined);
    });
});

describe('JsonToSchema.fromSubFields', () => {
    it('returns [] for dictionary and custom types', () => {
        assert.deepEqual(JsonToSchema.fromSubFields({ type: 'Number' }, [], ctx()), []);
        assert.deepEqual(JsonToSchema.fromSubFields({ type: 'Prefix' }, [], ctx()), []);
    });

    it('deep-copies fields from a matching sub-schema', () => {
        const all = [{ iri: '#Sub', fields: [{ name: 'a', fields: [] }] }];
        const result = JsonToSchema.fromSubFields({ type: '#Sub' }, all, ctx());
        assert.deepEqual(result, [{ name: 'a', fields: [] }]);
        assert.notEqual(result, all[0].fields);
        assert.notEqual(result[0], all[0].fields[0]);
    });

    it('returns [] for an unknown type', () => {
        assert.deepEqual(JsonToSchema.fromSubFields({ type: '#Missing' }, [], ctx()), []);
    });
});
