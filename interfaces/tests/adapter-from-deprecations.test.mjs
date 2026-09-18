import assert from 'node:assert/strict';
import {
    getDeprecationMessagesForBlock,
    getDeprecationMessagesForProperties,
} from '../dist/validators/policy-messages/adapter-from-deprecations.js';

describe('getDeprecationMessagesForBlock', () => {
    it('returns [] when the block type has no deprecation registered', () => {
        assert.deepEqual(getDeprecationMessagesForBlock('not-deprecated'), []);
    });
});

describe('getDeprecationMessagesForProperties', () => {
    it('returns [] when usedProperties is undefined', () => {
        assert.deepEqual(
            getDeprecationMessagesForProperties('any-block', undefined),
            [],
        );
    });

    it('returns [] when block has no property deprecations registered', () => {
        assert.deepEqual(
            getDeprecationMessagesForProperties('not-tracked', { foo: 'bar' }),
            [],
        );
    });

    it('returns [] when usedProperties is an empty object', () => {
        assert.deepEqual(
            getDeprecationMessagesForProperties('not-tracked', {}),
            [],
        );
    });
});
