import assert from 'node:assert/strict';
import { SchemaHelper } from '../dist/helpers/schema-helper.js';

describe('SchemaHelper.updateFields', () => {
    it('returns the input unchanged when document has no properties', () => {
        const result = SchemaHelper.updateFields(null, () => ({}));
        assert.equal(result, null);

        const noProps = { foo: 'bar' };
        assert.equal(SchemaHelper.updateFields(noProps, () => ({})), noProps);
    });

    it('applies the transform to each property by name', () => {
        const doc = {
            properties: {
                a: { type: 'string' },
                b: { type: 'number' },
            },
        };
        const seen = [];
        const result = SchemaHelper.updateFields(doc, (name, prop) => {
            seen.push(name);
            return { ...prop, touched: true };
        });
        assert.deepEqual(seen.sort(), ['a', 'b']);
        assert.equal(result.properties.a.touched, true);
        assert.equal(result.properties.b.touched, true);
    });

    it('mutates the same document object (returns identity)', () => {
        const doc = { properties: { a: { type: 'string' } } };
        const result = SchemaHelper.updateFields(doc, (_, p) => ({ ...p, marker: 1 }));
        assert.equal(result, doc);
        assert.equal(doc.properties.a.marker, 1);
    });
});
