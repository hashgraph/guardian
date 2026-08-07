import assert from 'node:assert/strict';
import { DocumentGenerator } from '../dist/helpers/generate-document.js';

describe('DocumentGenerator string format examples', () => {
    it('generates a date', () => {
        assert.equal(DocumentGenerator.generateExample({ type: 'string', format: 'date' }), '2000-01-01');
    });

    it('generates a time', () => {
        assert.equal(DocumentGenerator.generateExample({ type: 'string', format: 'time' }), '00:00:00');
    });

    it('generates a date-time', () => {
        assert.equal(DocumentGenerator.generateExample({ type: 'string', format: 'date-time' }), '2000-01-01T01:00:00.000Z');
    });

    it('generates a duration', () => {
        assert.equal(DocumentGenerator.generateExample({ type: 'string', format: 'duration' }), 'P1D');
    });

    it('generates a url and a uri', () => {
        assert.equal(DocumentGenerator.generateExample({ type: 'string', format: 'url' }), 'https://example.com');
        assert.equal(DocumentGenerator.generateExample({ type: 'string', format: 'uri' }), 'example:uri');
    });

    it('generates an email', () => {
        assert.equal(DocumentGenerator.generateExample({ type: 'string', format: 'email' }), 'example@email.com');
    });

    it('falls through unknown formats to the plain string default', () => {
        assert.equal(DocumentGenerator.generateExample({ type: 'string', format: 'ipv4' }), 'example');
    });
});

describe('DocumentGenerator pattern-based strings', () => {
    it('generates an ipfs link for the ipfs pattern', () => {
        const value = DocumentGenerator.generateExample({ type: 'string', pattern: '^ipfs:\/\/.+' });
        assert.ok(value.startsWith('ipfs://'));
        assert.ok(value.length > 'ipfs://'.length);
    });

    it('generates an opaque id for any other pattern', () => {
        const value = DocumentGenerator.generateExample({ type: 'string', pattern: '^\\d+$' });
        assert.equal(typeof value, 'string');
        assert.ok(value.length > 0);
    });
});

describe('DocumentGenerator precedence rules', () => {
    it('prefers a rowPreset over examples and default', () => {
        const field = { name: 'f', type: 'string', examples: ['ex'], default: 'def' };
        assert.equal(DocumentGenerator.generateField(field, ['ctx'], null, { f: 'preset' }), 'preset');
    });

    it('accepts a falsy-but-defined rowPreset', () => {
        const field = { name: 'f', type: 'number' };
        assert.equal(DocumentGenerator.generateField(field, ['ctx'], null, { f: 0 }), 0);
    });

    it('skips an empty-string example and falls back to default', () => {
        assert.equal(DocumentGenerator.generateExample({ type: 'string', examples: [''], default: 'def' }), 'def');
    });

    it('ignores a non-array examples value', () => {
        assert.equal(DocumentGenerator.generateExample({ type: 'number', examples: 'nope' }), 1);
    });
});

describe('DocumentGenerator array handling', () => {
    it('keeps an already-array value un-nested', () => {
        const field = { name: 'f', type: 'string', isArray: true, examples: [['a', 'b']] };
        assert.deepEqual(DocumentGenerator.generateField(field, ['ctx'], null, {}), ['a', 'b']);
    });

    it('wraps a scalar in an array', () => {
        const field = { name: 'f', type: 'integer', isArray: true };
        assert.deepEqual(DocumentGenerator.generateField(field, ['ctx'], null, {}), [1]);
    });

    it('returns undefined rather than [undefined] for null-typed array fields', () => {
        const field = { name: 'f', type: 'null', isArray: true };
        assert.equal(DocumentGenerator.generateField(field, ['ctx'], null, {}), undefined);
    });
});

describe('DocumentGenerator unknown types', () => {
    it('returns undefined for an unrecognised type', () => {
        assert.equal(DocumentGenerator.generateExample({ type: 'mystery' }), undefined);
    });

    it('returns undefined for enum fields without values', () => {
        assert.equal(DocumentGenerator.generateExample({ type: 'string', customType: 'enum' }), undefined);
    });

    it('returns the first enum value when present', () => {
        assert.equal(DocumentGenerator.generateExample({ type: 'string', customType: 'enum', enum: ['x', 'y'] }), 'x');
    });
});
