import assert from 'node:assert/strict';

import { SchemaHelper } from '../dist/helpers/schema-helper.js';

describe('SchemaHelper.parseProperty scalar shapes', () => {
    it('parses a plain string property', () => {
        const f = SchemaHelper.parseProperty('name', { type: 'string' });
        assert.equal(f.name, 'name');
        assert.equal(f.type, 'string');
        assert.equal(f.isArray, false);
        assert.equal(f.isRef, false);
    });

    it('defaults title and description to the field name', () => {
        const f = SchemaHelper.parseProperty('age', { type: 'number' });
        assert.equal(f.title, 'age');
        assert.equal(f.description, 'age');
    });

    it('keeps explicit title and description', () => {
        const f = SchemaHelper.parseProperty('age', { type: 'number', title: 'Age', description: 'Your age' });
        assert.equal(f.title, 'Age');
        assert.equal(f.description, 'Your age');
    });

    it('captures format, pattern and enum', () => {
        const f = SchemaHelper.parseProperty('d', { type: 'string', format: 'date', pattern: '^x', enum: ['a', 'b'] });
        assert.equal(f.format, 'date');
        assert.equal(f.pattern, '^x');
        assert.deepEqual(f.enum, ['a', 'b']);
    });

    it('captures the $comment', () => {
        const f = SchemaHelper.parseProperty('c', { type: 'string', $comment: '{"unit":"kg"}' });
        assert.equal(f.comment, '{"unit":"kg"}');
    });

    it('captures examples when present and array', () => {
        const f = SchemaHelper.parseProperty('e', { type: 'string', examples: ['x', 'y'] });
        assert.deepEqual(f.examples, ['x', 'y']);
    });

    it('sets examples to null when not an array', () => {
        const f = SchemaHelper.parseProperty('e', { type: 'string', examples: 'nope' });
        assert.equal(f.examples, null);
    });

    it('captures a default value', () => {
        const f = SchemaHelper.parseProperty('e', { type: 'string', default: 'dv' });
        assert.equal(f.default, 'dv');
    });

    it('marks readOnly from the property', () => {
        const f = SchemaHelper.parseProperty('r', { type: 'string', readOnly: true });
        assert.equal(f.readOnly, true);
    });

    it('captures remoteLink ($ref alongside type)', () => {
        const f = SchemaHelper.parseProperty('rl', { type: 'string', $ref: '#remote' });
        assert.equal(f.remoteLink, '#remote');
        assert.equal(f.isRef, false);
    });
});

describe('SchemaHelper.parseProperty array shapes', () => {
    it('marks an array property and unwraps items', () => {
        const f = SchemaHelper.parseProperty('list', { type: 'array', items: { type: 'string' } });
        assert.equal(f.isArray, true);
        assert.equal(f.type, 'string');
        assert.equal(f.isRef, false);
    });

    it('handles an array of refs', () => {
        const f = SchemaHelper.parseProperty('refs', { type: 'array', items: { $ref: '#Sub' } });
        assert.equal(f.isArray, true);
        assert.equal(f.isRef, true);
        assert.equal(f.type, '#Sub');
    });
});

describe('SchemaHelper.parseProperty ref shapes', () => {
    it('marks a ref-only property', () => {
        const f = SchemaHelper.parseProperty('sub', { $ref: '#Sub' });
        assert.equal(f.isRef, true);
        assert.equal(f.type, '#Sub');
    });

    it('a ref with a type is not treated as a ref', () => {
        const f = SchemaHelper.parseProperty('sub', { $ref: '#Sub', type: 'object' });
        assert.equal(f.isRef, false);
    });

    it('unwraps oneOf into the first entry', () => {
        const f = SchemaHelper.parseProperty('o', { oneOf: [{ type: 'string', format: 'date' }] });
        assert.equal(f.type, 'string');
        assert.equal(f.format, 'date');
    });

    it('propagates outer readOnly when oneOf is used', () => {
        const f = SchemaHelper.parseProperty('o', { readOnly: true, oneOf: [{ type: 'string' }] });
        assert.equal(f.readOnly, true);
    });
});

describe('SchemaHelper.buildField scalar', () => {
    function field(extra) {
        return { title: 'T', description: 'D', type: 'string', ...extra };
    }

    it('builds a scalar property with title/description/type', () => {
        const p = SchemaHelper.buildField(field(), 'n', 'http://c', 0);
        assert.equal(p.title, 'T');
        assert.equal(p.description, 'D');
        assert.equal(p.type, 'string');
        assert.equal(p.readOnly, false);
    });

    it('defaults title and description to the name', () => {
        const p = SchemaHelper.buildField({ type: 'string' }, 'theName', 'http://c', 0);
        assert.equal(p.title, 'theName');
        assert.equal(p.description, 'theName');
    });

    it('carries examples when present', () => {
        const p = SchemaHelper.buildField(field({ examples: ['a'] }), 'n', 'http://c', 0);
        assert.deepEqual(p.examples, ['a']);
    });

    it('omits examples when absent', () => {
        const p = SchemaHelper.buildField(field(), 'n', 'http://c', 0);
        assert.equal('examples' in p, false);
    });

    it('carries a truthy default', () => {
        const p = SchemaHelper.buildField(field({ default: 'dv' }), 'n', 'http://c', 0);
        assert.equal(p.default, 'dv');
    });

    it('omits a falsy default', () => {
        const p = SchemaHelper.buildField(field({ default: '' }), 'n', 'http://c', 0);
        assert.equal('default' in p, false);
    });

    it('marks readOnly when flagged', () => {
        const p = SchemaHelper.buildField(field({ readOnly: true }), 'n', 'http://c', 0);
        assert.equal(p.readOnly, true);
    });

    it('writes enum, format and pattern', () => {
        const p = SchemaHelper.buildField(field({ enum: ['a'], format: 'date', pattern: '^x' }), 'n', 'http://c', 0);
        assert.deepEqual(p.enum, ['a']);
        assert.equal(p.format, 'date');
        assert.equal(p.pattern, '^x');
    });

    it('writes a remoteLink $ref alongside the type', () => {
        const p = SchemaHelper.buildField(field({ remoteLink: '#remote' }), 'n', 'http://c', 0);
        assert.equal(p.$ref, '#remote');
        assert.equal(p.type, 'string');
    });

    it('always attaches a $comment', () => {
        const p = SchemaHelper.buildField(field(), 'n', 'http://c', 0);
        assert.ok(p.$comment);
    });
});

describe('SchemaHelper.buildField array and ref', () => {
    it('builds an array property whose items carry the type', () => {
        const p = SchemaHelper.buildField({ isArray: true, type: 'string', title: 'T' }, 'n', 'http://c', 0);
        assert.equal(p.type, 'array');
        assert.equal(p.items.type, 'string');
    });

    it('builds an array of refs', () => {
        const p = SchemaHelper.buildField({ isArray: true, isRef: true, type: '#Sub' }, 'n', 'http://c', 0);
        assert.equal(p.type, 'array');
        assert.equal(p.items.$ref, '#Sub');
    });

    it('builds a scalar ref', () => {
        const p = SchemaHelper.buildField({ isRef: true, type: '#Sub' }, 'n', 'http://c', 0);
        assert.equal(p.$ref, '#Sub');
        assert.equal(p.type, undefined);
    });
});

describe('SchemaHelper parseProperty -> buildField round-trip', () => {
    const scalarShapes = [
        { type: 'string' },
        { type: 'number' },
        { type: 'integer' },
        { type: 'boolean' },
    ];
    for (const shape of scalarShapes) {
        it(`preserves type ${shape.type} across parse->build`, () => {
            const parsed = SchemaHelper.parseProperty('f', shape);
            const built = SchemaHelper.buildField(parsed, 'f', 'http://c', 0);
            assert.equal(built.type, shape.type);
        });
    }

    it('preserves format across parse->build', () => {
        const parsed = SchemaHelper.parseProperty('f', { type: 'string', format: 'date-time' });
        const built = SchemaHelper.buildField(parsed, 'f', 'http://c', 0);
        assert.equal(built.format, 'date-time');
    });

    it('preserves enum across parse->build', () => {
        const parsed = SchemaHelper.parseProperty('f', { type: 'string', enum: ['x', 'y'] });
        const built = SchemaHelper.buildField(parsed, 'f', 'http://c', 0);
        assert.deepEqual(built.enum, ['x', 'y']);
    });

    it('preserves pattern across parse->build', () => {
        const parsed = SchemaHelper.parseProperty('f', { type: 'string', pattern: '^[a-z]+$' });
        const built = SchemaHelper.buildField(parsed, 'f', 'http://c', 0);
        assert.equal(built.pattern, '^[a-z]+$');
    });

    it('preserves isArray across parse->build', () => {
        const parsed = SchemaHelper.parseProperty('f', { type: 'array', items: { type: 'string' } });
        const built = SchemaHelper.buildField(parsed, 'f', 'http://c', 0);
        assert.equal(built.type, 'array');
        assert.equal(built.items.type, 'string');
    });

    it('preserves a ref across parse->build', () => {
        const parsed = SchemaHelper.parseProperty('f', { $ref: '#Sub' });
        const built = SchemaHelper.buildField(parsed, 'f', 'http://c', 0);
        assert.equal(built.$ref, '#Sub');
    });
});

describe('SchemaHelper.cloneFields', () => {
    it('returns a deep clone array of flat fields', () => {
        const fields = [{ name: 'a' }, { name: 'b' }];
        const cloned = SchemaHelper.cloneFields(fields);
        assert.notEqual(cloned, fields);
        assert.notEqual(cloned[0], fields[0]);
        assert.deepEqual(cloned, fields);
    });

    it('recursively clones nested fields', () => {
        const fields = [{ name: 'a', fields: [{ name: 'a1' }] }];
        const cloned = SchemaHelper.cloneFields(fields);
        assert.notEqual(cloned[0].fields, fields[0].fields);
        assert.notEqual(cloned[0].fields[0], fields[0].fields[0]);
        cloned[0].fields[0].name = 'changed';
        assert.equal(fields[0].fields[0].name, 'a1');
    });

    it('returns an empty array for empty input', () => {
        assert.deepEqual(SchemaHelper.cloneFields([]), []);
    });
});

describe('SchemaHelper.getFieldsFromObject', () => {
    it('builds properties and collects required keys', () => {
        const required = [];
        const properties = {};
        const fields = [
            { name: 'a', type: 'string', required: true },
            { name: 'b', type: 'number', required: false },
        ];
        SchemaHelper.getFieldsFromObject(fields, required, properties, 'http://c');
        assert.ok(properties.a);
        assert.ok(properties.b);
        assert.deepEqual(required, ['a']);
    });

    it('throws when a field name contains a space', () => {
        assert.throws(
            () => SchemaHelper.getFieldsFromObject([{ name: 'bad name', type: 'string' }], [], {}, 'http://c'),
            /must not contain spaces/
        );
    });

    it('does not overwrite an existing property of the same name', () => {
        const properties = { a: { sentinel: true } };
        SchemaHelper.getFieldsFromObject([{ name: 'a', type: 'string', required: true }], [], properties, 'http://c');
        assert.equal(properties.a.sentinel, true);
    });
});
