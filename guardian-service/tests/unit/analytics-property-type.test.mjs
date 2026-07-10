import { assert } from 'chai';
import { PropertyType } from '../../dist/analytics/compare/types/property.type.js';

describe('analytics PropertyType enum', () => {
    it('exposes lowercase property types', () => {
        assert.equal(PropertyType.Array, 'array');
        assert.equal(PropertyType.Object, 'object');
        assert.equal(PropertyType.Property, 'property');
        assert.equal(PropertyType.Schema, 'schema');
        assert.equal(PropertyType.Token, 'token');
        assert.equal(PropertyType.UUID, 'uuid');
    });
    it('has exactly six entries', () => {
        assert.equal(Object.keys(PropertyType).length, 6);
    });
});
