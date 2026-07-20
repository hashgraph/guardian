import assert from 'node:assert/strict';
import { SchemaToJson } from '../dist/helpers/schema-json.js';
import { UnitSystem } from '../dist/type/unit-system.type.js';

describe('SchemaToJson.getType', () => {
    it('maps a ref field with a system type to its dictionary name', () => {
        assert.equal(SchemaToJson.getType({ isRef: true, type: '#GeoJSON' }), 'GeoJSON');
        assert.equal(SchemaToJson.getType({ isRef: true, type: '#SentinelHUB' }), 'SentinelHUB');
    });

    it('returns the raw type for a ref field outside the system dictionary', () => {
        assert.equal(SchemaToJson.getType({ isRef: true, type: '#Custom&1.0.0' }), '#Custom&1.0.0');
    });

    it('maps unitSystem prefix/postfix before dictionary lookup', () => {
        assert.equal(SchemaToJson.getType({ unitSystem: UnitSystem.Prefix, type: 'number' }), 'Prefix');
        assert.equal(SchemaToJson.getType({ unitSystem: UnitSystem.Postfix, type: 'number' }), 'Postfix');
    });

    it('maps customType hederaAccount to HederaAccount', () => {
        assert.equal(SchemaToJson.getType({ customType: 'hederaAccount', type: 'string' }), 'HederaAccount');
    });

    it('maps primitive dictionary entries by structural equality', () => {
        assert.equal(SchemaToJson.getType({ type: 'number', isRef: false }), 'Number');
        assert.equal(SchemaToJson.getType({ type: 'integer', isRef: false }), 'Integer');
        assert.equal(SchemaToJson.getType({ type: 'boolean', isRef: false }), 'Boolean');
    });

    it('maps string formats to their dictionary names', () => {
        assert.equal(SchemaToJson.getType({ type: 'string', format: 'date', isRef: false }), 'Date');
        assert.equal(SchemaToJson.getType({ type: 'string', format: 'time', isRef: false }), 'Time');
        assert.equal(SchemaToJson.getType({ type: 'string', format: 'date-time', isRef: false }), 'DateTime');
        assert.equal(SchemaToJson.getType({ type: 'string', format: 'duration', isRef: false }), 'Duration');
    });

    it('maps the ipfs pattern to Image', () => {
        assert.equal(SchemaToJson.getType({ type: 'string', pattern: '^ipfs:\/\/.+', isRef: false }), 'Image');
    });

    it('falls back to String for an unmatched string field', () => {
        assert.equal(SchemaToJson.getType({ type: 'string', pattern: '^abc$', isRef: false }), 'String');
    });

    it('returns an empty string for an unknown non-string type', () => {
        assert.equal(SchemaToJson.getType({ type: 'mystery', isRef: false }), '');
    });
});

describe('SchemaToJson.getPattern', () => {
    it('returns the dictionary pattern for Image-shaped fields', () => {
        assert.equal(SchemaToJson.getPattern({ type: 'string', pattern: '^ipfs:\/\/.+', isRef: false }), '^ipfs:\/\/.+');
    });

    it('returns the custom pattern for a plain string field', () => {
        assert.equal(SchemaToJson.getPattern({ type: 'string', pattern: '^x$' }), '^x$');
    });

    it('returns undefined for non-string types', () => {
        assert.equal(SchemaToJson.getPattern({ type: 'mystery' }), undefined);
    });
});

describe('SchemaToJson.getRequired', () => {
    it('prioritises Auto Calculate over Hidden and Required', () => {
        assert.equal(SchemaToJson.getRequired({ autocalculate: true, hidden: true, required: true }), 'Auto Calculate');
    });

    it('prioritises Hidden over Required', () => {
        assert.equal(SchemaToJson.getRequired({ hidden: true, required: true }), 'Hidden');
    });

    it('returns Required and None for the remaining cases', () => {
        assert.equal(SchemaToJson.getRequired({ required: true }), 'Required');
        assert.equal(SchemaToJson.getRequired({}), 'None');
    });
});

describe('SchemaToJson small getters', () => {
    it('getPrivate returns the boolean or null', () => {
        assert.equal(SchemaToJson.getPrivate({ isPrivate: true }), true);
        assert.equal(SchemaToJson.getPrivate({ isPrivate: false }), false);
        assert.equal(SchemaToJson.getPrivate({ isPrivate: 'yes' }), null);
        assert.equal(SchemaToJson.getPrivate({}), null);
    });

    it('getEnum prefers enum, falls back to remoteLink, then null', () => {
        assert.deepEqual(SchemaToJson.getEnum({ enum: ['a'], remoteLink: 'ipfs://x' }), ['a']);
        assert.equal(SchemaToJson.getEnum({ remoteLink: 'ipfs://x' }), 'ipfs://x');
        assert.equal(SchemaToJson.getEnum({}), null);
    });

    it('getAvailableOptions returns options or null', () => {
        assert.deepEqual(SchemaToJson.getAvailableOptions({ availableOptions: ['Point'] }), ['Point']);
        assert.equal(SchemaToJson.getAvailableOptions({}), null);
    });

    it('getFront builds a font object with defaults', () => {
        assert.deepEqual(SchemaToJson.getFront({ textBold: true }), { size: '18', color: '#000000', bold: true });
        assert.deepEqual(SchemaToJson.getFront({ textSize: '25', textColor: '#ff0000' }), { size: '25', color: '#ff0000', bold: false });
        assert.equal(SchemaToJson.getFront({}), null);
    });

    it('getExpression returns the expression only for autocalculated fields', () => {
        assert.equal(SchemaToJson.getExpression({ autocalculate: true, expression: 'a+b' }), 'a+b');
        assert.equal(SchemaToJson.getExpression({ autocalculate: true }), '');
        assert.equal(SchemaToJson.getExpression({ expression: 'a+b' }), null);
    });

    it('getUnit returns the unit only when a unitSystem is set', () => {
        assert.equal(SchemaToJson.getUnit({ unitSystem: UnitSystem.Prefix, unit: '$' }), '$');
        assert.equal(SchemaToJson.getUnit({ unit: '$' }), null);
    });

    it('getExample returns the first example or null', () => {
        assert.equal(SchemaToJson.getExample({ examples: ['e1', 'e2'] }), 'e1');
        assert.equal(SchemaToJson.getExample({ examples: [] }), null);
        assert.equal(SchemaToJson.getExample({}), null);
    });

    it('getDefault and getSuggest pass values through or return null', () => {
        assert.equal(SchemaToJson.getDefault({ default: 'd' }), 'd');
        assert.equal(SchemaToJson.getDefault({}), null);
        assert.equal(SchemaToJson.getSuggest({ suggest: 's' }), 's');
        assert.equal(SchemaToJson.getSuggest({}), null);
    });
});
