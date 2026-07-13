import assert from 'node:assert/strict';
import { TaskEntity } from '../dist/entity/task.js';
import { DataBaseHelper } from '@guardian/common';

const largeData = () => ({ blob: 'x'.repeat(5 * 1024 * 1024 + 1024) });
const smallData = () => ({ foo: 'bar', n: 42 });

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

describe('TaskEntity large-payload GridFS offloading', () => {
    function stubFiles(t) {
        const calls = { create: [], load: [] };
        const nextId = 'grid-file-id';
        const store = new Map();
        t._createFile = async (json, name) => {
            calls.create.push({ json, name });
            store.set(nextId, json);
            return nextId;
        };
        t._loadFile = async (id) => {
            calls.load.push(id);
            return Buffer.from(store.get(id) ?? '');
        };
        return calls;
    }

    it('keeps small data inline and does not offload', async () => {
        const t = new TaskEntity();
        const calls = stubFiles(t);
        t.data = smallData();

        await t.offloadDataOnCreate();

        assert.equal(t.dataFileId, undefined);
        assert.equal(calls.create.length, 0);
        assert.deepEqual(t.data, smallData());
    });

    it('offloads data larger than the limit to GridFS on create', async () => {
        const t = new TaskEntity();
        const calls = stubFiles(t);
        const original = largeData();
        t.data = original;

        await t.offloadDataOnCreate();

        assert.equal(calls.create.length, 1);
        assert.equal(calls.create[0].name, 'Task');
        assert.ok(t.dataFileId);
        assert.equal(t.data, null);
        assert.deepEqual(JSON.parse(calls.create[0].json), original);
    });

    it('restores offloaded data from GridFS on load', async () => {
        const t = new TaskEntity();
        const calls = stubFiles(t);
        const original = largeData();

        t.data = original;
        await t.offloadDataOnCreate();
        assert.equal(t.data, null);
        const fileId = t.dataFileId;

        await t.restoreData();

        assert.deepEqual(t.data, original);
        assert.deepEqual(calls.load, [fileId]);
    });

    it('round-trips large data through offload then restore', async () => {
        const t = new TaskEntity();
        stubFiles(t);
        const original = largeData();
        t.data = original;

        await t.offloadDataOnCreate();
        t.data = null;
        await t.restoreData();

        assert.deepEqual(t.data, original);
    });

    it('does not re-upload on update when already offloaded', async () => {
        const t = new TaskEntity();
        const calls = stubFiles(t);
        t.dataFileId = 'existing-file-id';
        t.data = largeData();

        await t.offloadDataOnUpdate();

        assert.equal(calls.create.length, 0);
        assert.equal(t.dataFileId, 'existing-file-id');
        assert.equal(t.data, null);
    });

    it('offloads on update when not yet offloaded', async () => {
        const t = new TaskEntity();
        const calls = stubFiles(t);
        t.data = largeData();

        await t.offloadDataOnUpdate();

        assert.equal(calls.create.length, 1);
        assert.ok(t.dataFileId);
        assert.equal(t.data, null);
    });

    it('restore is a no-op when data was never offloaded', async () => {
        const t = new TaskEntity();
        const calls = stubFiles(t);
        t.data = smallData();

        await t.restoreData();

        assert.equal(calls.load.length, 0);
        assert.deepEqual(t.data, smallData());
    });

    it('deletes the GridFS file on delete', () => {
        const original = DataBaseHelper.gridFS;
        const deleted = [];
        DataBaseHelper.gridFS = { delete: async (id) => { deleted.push(id); } };
        try {
            const t = new TaskEntity();
            t.dataFileId = 'grid-file-id';
            t.deleteDataFile();
            assert.deepEqual(deleted, ['grid-file-id']);
        } finally {
            DataBaseHelper.gridFS = original;
        }
    });

    it('does not touch GridFS on delete when there is no offloaded file', () => {
        const original = DataBaseHelper.gridFS;
        let called = false;
        DataBaseHelper.gridFS = { delete: async () => { called = true; } };
        try {
            const t = new TaskEntity();
            t.deleteDataFile();
            assert.equal(called, false);
        } finally {
            DataBaseHelper.gridFS = original;
        }
    });
});
