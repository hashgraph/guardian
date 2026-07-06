import assert from 'node:assert/strict';
import { SchemaHelper } from '../dist/helpers/schema-helper.js';

describe('SchemaHelper.parseProperty', () => {
    it('parses a basic string property', () => {
        const field = SchemaHelper.parseProperty('username', {
            type: 'string',
            title: 'User Name',
            description: 'The user',
        });
        assert.equal(field.name, 'username');
        assert.equal(field.type, 'string');
        assert.equal(field.title, 'User Name');
        assert.equal(field.description, 'The user');
        assert.equal(field.isArray, false);
        assert.equal(field.isRef, false);
        assert.equal(field.readOnly, false);
    });

    it('falls back to name for missing title/description', () => {
        const field = SchemaHelper.parseProperty('age', { type: 'integer' });
        assert.equal(field.title, 'age');
        assert.equal(field.description, 'age');
    });

    it('detects array type and unwraps to items', () => {
        const field = SchemaHelper.parseProperty('tags', {
            type: 'array',
            items: { type: 'string' },
        });
        assert.equal(field.isArray, true);
        assert.equal(field.type, 'string');
    });

    it('detects $ref-only properties as references', () => {
        const field = SchemaHelper.parseProperty('child', { $ref: '#/$defs/Child' });
        assert.equal(field.isRef, true);
        assert.equal(field.type, '#/$defs/Child');
    });

    it('captures format and pattern when present', () => {
        const field = SchemaHelper.parseProperty('birth', {
            type: 'string',
            format: 'date',
            pattern: '\\d{4}-\\d{2}-\\d{2}',
        });
        assert.equal(field.format, 'date');
        assert.equal(field.pattern, '\\d{4}-\\d{2}-\\d{2}');
    });

    it('captures readOnly flag', () => {
        const field = SchemaHelper.parseProperty('id', { type: 'string', readOnly: true });
        assert.equal(field.readOnly, true);
    });

    it('captures examples when an array is provided', () => {
        const field = SchemaHelper.parseProperty('greet', {
            type: 'string',
            examples: ['hi', 'hello'],
        });
        assert.deepEqual(field.examples, ['hi', 'hello']);
    });

    it('ignores non-array examples', () => {
        const field = SchemaHelper.parseProperty('greet', {
            type: 'string',
            examples: 'hi',
        });
        assert.equal(field.examples, null);
    });

    it('captures $comment as comment', () => {
        const field = SchemaHelper.parseProperty('notes', {
            type: 'string',
            $comment: 'internal use',
        });
        assert.equal(field.comment, 'internal use');
    });

    it('captures default value', () => {
        const field = SchemaHelper.parseProperty('count', { type: 'integer', default: 42 });
        assert.equal(field.default, 42);
    });
});
