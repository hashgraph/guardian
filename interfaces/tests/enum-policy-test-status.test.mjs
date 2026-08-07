import assert from 'node:assert/strict';
import { PolicyTestStatus } from '../dist/type/policy-test-status.type.js';

describe('PolicyTestStatus enum', () => {
    it('exposes New/Running/Stopped/Success/Failure (PascalCase)', () => {
        assert.equal(PolicyTestStatus.New, 'New');
        assert.equal(PolicyTestStatus.Running, 'Running');
        assert.equal(PolicyTestStatus.Stopped, 'Stopped');
        assert.equal(PolicyTestStatus.Success, 'Success');
        assert.equal(PolicyTestStatus.Failure, 'Failure');
    });
});
