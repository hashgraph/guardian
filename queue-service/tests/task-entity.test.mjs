import assert from 'node:assert/strict';
import { TaskEntity } from '../dist/entity/task.js';

describe('TaskEntity', () => {
    it('instantiates with no constructor arguments', () => {
        const t = new TaskEntity();
        assert.ok(t);
    });

    it('all task fields are independently assignable', () => {
        const t = new TaskEntity();
        t.userId = 'u1';
        t.taskId = 't1';
        t.priority = 5;
        t.type = 'CREATE_ACCOUNT';
        t.data = { foo: 'bar' };
        t.sent = false;
        t.isRetryableTask = true;
        t.attempts = 3;
        t.processedTime = new Date('2024-01-01T00:00:00Z');
        t.done = false;
        t.isError = false;
        t.errorReason = null;
        t.attempt = 1;
        t.interception = null;
        t.tenantContext = { tenantId: 'tenant-1' };

        assert.equal(t.userId, 'u1');
        assert.equal(t.taskId, 't1');
        assert.equal(t.priority, 5);
        assert.equal(t.type, 'CREATE_ACCOUNT');
        assert.deepEqual(t.data, { foo: 'bar' });
        assert.equal(t.sent, false);
        assert.equal(t.isRetryableTask, true);
        assert.equal(t.attempts, 3);
        assert.ok(t.processedTime instanceof Date);
        assert.equal(t.done, false);
        assert.equal(t.isError, false);
        assert.equal(t.errorReason, null);
        assert.equal(t.attempt, 1);
        assert.equal(t.interception, null);
        assert.deepEqual(t.tenantContext, { tenantId: 'tenant-1' });
    });

    it('userId/taskId/interception accept null (nullable fields)', () => {
        const t = new TaskEntity();
        t.userId = null;
        t.interception = null;
        assert.equal(t.userId, null);
        assert.equal(t.interception, null);
    });
});
