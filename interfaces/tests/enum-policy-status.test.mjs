import assert from 'node:assert/strict';
import { PolicyStatus } from '../dist/type/policy-status.type.js';

describe('PolicyStatus enum', () => {
    it('exposes the documented lifecycle values', () => {
        assert.equal(PolicyStatus.DRY_RUN, 'DRY-RUN');
        assert.equal(PolicyStatus.DRAFT, 'DRAFT');
        assert.equal(PolicyStatus.PUBLISH_ERROR, 'PUBLISH_ERROR');
        assert.equal(PolicyStatus.PUBLISH, 'PUBLISH');
        assert.equal(PolicyStatus.DISCONTINUED, 'DISCONTINUED');
        assert.equal(PolicyStatus.DEMO, 'DEMO');
        assert.equal(PolicyStatus.VIEW, 'VIEW');
    });
});
