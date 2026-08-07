import assert from 'node:assert/strict';
import {
    DEPRECATED_BLOCKS,
    DEPRECATED_PROPERTIES,
} from '../dist/validators/deprecations/registry.js';

describe('Deprecations registries', () => {
    it('DEPRECATED_BLOCKS is a Map', () => {
        assert.ok(DEPRECATED_BLOCKS instanceof Map);
    });

    it('DEPRECATED_PROPERTIES is a Map of Maps', () => {
        assert.ok(DEPRECATED_PROPERTIES instanceof Map);
        for (const value of DEPRECATED_PROPERTIES.values()) {
            assert.ok(value instanceof Map);
        }
    });

    it('returns undefined for unknown block / property keys', () => {
        assert.equal(DEPRECATED_BLOCKS.get('mystery'), undefined);
        assert.equal(DEPRECATED_PROPERTIES.get('mystery'), undefined);
    });
});
