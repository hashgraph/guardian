import assert from 'node:assert/strict';
import { ConfigType } from '../dist/type/config.type.js';

describe('ConfigType enum', () => {
    it('exposes Policy and Module display strings', () => {
        assert.equal(ConfigType.POLICY, 'Policy');
        assert.equal(ConfigType.MODULE, 'Module');
    });
});
