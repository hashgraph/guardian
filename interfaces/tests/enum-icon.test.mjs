import assert from 'node:assert/strict';
import { IconType } from '../dist/type/icon.type.js';

describe('IconType enum', () => {
    it('exposes COMMON and CUSTOM', () => {
        assert.equal(IconType.COMMON, 'common');
        assert.equal(IconType.CUSTOM, 'custom');
        assert.equal(Object.keys(IconType).length, 2);
    });
});
