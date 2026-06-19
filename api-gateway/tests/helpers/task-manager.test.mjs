import assert from 'node:assert/strict';
import { TaskManager, TaskManagerChannel } from '../../dist/helpers/task-manager.js';
import { TaskAction } from '@guardian/interfaces';

const captured = {};
TaskManagerChannel.prototype.setConnection = function () { return this; };
TaskManagerChannel.prototype.subscribe = function (subject, cb) { captured[subject] = cb; };
TaskManagerChannel.prototype.publish = function (subject, payload) {
    publishCalls.push({ subject, payload });
};
const publishCalls = [];

function freshManager() {
    const tm = new TaskManager();
    for (const key of Object.keys(tm.tasks)) {
        delete tm.tasks[key];
    }
    tm.callbacks.clear();
    tm.notifyTaskLock.clear();
    wsCalls.length = 0;
    publishCalls.length = 0;
    tm.wsService = { notifyTaskProgress: (t) => wsCalls.push(t) };
    tm.channel = { publish: (subject, payload) => publishCalls.push({ subject, payload }) };
    return tm;
}

const wsCalls = [];

describe('TaskManagerChannel', () => {
    it('is a singleton-shared instance', () => {
        const a = new TaskManager();
        const b = new TaskManager();
        assert.equal(a, b);
    });

    it('registerListener delegates to getMessages', () => {
        const ch = new TaskManagerChannel();
        let seen = null;
        ch.getMessages = (event, cb) => { seen = { event, cb }; };
        const fn = () => { };
        ch.registerListener('EVT', fn);
        assert.deepEqual(seen, { event: 'EVT', cb: fn });
    });

    it('exposes the task-queue message queue name', () => {
        const ch = new TaskManagerChannel();
        assert.equal(ch.messageQueueName, 'task-queue');
        assert.ok(ch.replySubject.startsWith('task-reply-'));
    });
});

describe('TaskManager.start / getExpectation', () => {
    it('creates a task with a known expectation and publishes it', () => {
        const tm = freshManager();
        const nt = tm.start(TaskAction.CREATE_TOKEN, 'user-1');
        assert.equal(nt.action, TaskAction.CREATE_TOKEN);
        assert.equal(nt.userId, 'user-1');
        assert.equal(nt.expectation, 4);
        assert.ok(tm.tasks[nt.taskId]);
        assert.equal(publishCalls.length, 1);
        assert.equal(publishCalls[0].payload.taskId, nt.taskId);
    });

    it('defaults expectation to 2 and caches it for an unknown action', () => {
        const tm = freshManager();
        const nt = tm.start('SOME_UNKNOWN_ACTION', 'user-2');
        assert.equal(nt.expectation, 2);
        const nt2 = tm.start('SOME_UNKNOWN_ACTION', 'user-3');
        assert.equal(nt2.expectation, 2);
    });

});

describe('TaskManager.addStatuses / addStatus', () => {
    it('appends statuses to an existing task and notifies', () => {
        const tm = freshManager();
        tm.tasks['t1'] = { statuses: [], userId: 'u' };
        tm.addStatuses('t1', [{ message: 'a' }, { message: 'b' }]);
        assert.equal(tm.tasks['t1'].statuses.length, 2);
        assert.equal(wsCalls.length, 1);
    });

    it('silently returns for an unknown task when skipIfNotFound is true', () => {
        const tm = freshManager();
        assert.doesNotThrow(() => tm.addStatuses('missing', [{ message: 'x' }]));
        assert.equal(wsCalls.length, 0);
    });

    it('throws for an unknown task when skipIfNotFound is false', () => {
        const tm = freshManager();
        assert.throws(() => tm.addStatuses('missing', [{ message: 'x' }], false), /not found/);
    });

    it('addStatus wraps a single message into addStatuses', () => {
        const tm = freshManager();
        tm.tasks['t2'] = { statuses: [], userId: 'u' };
        tm.addStatus('t2', 'hello', 'PROCESSING');
        assert.deepEqual(tm.tasks['t2'].statuses, [{ message: 'hello', type: 'PROCESSING' }]);
    });
});

describe('TaskManager.addInfo', () => {
    it('sets info when no prior info exists', () => {
        const tm = freshManager();
        tm.tasks['i1'] = { statuses: [], userId: 'u' };
        tm.addInfo('i1', { timestamp: 5, text: 'x' });
        assert.equal(tm.tasks['i1'].info.text, 'x');
    });

    it('overwrites info with an equal-or-newer timestamp', () => {
        const tm = freshManager();
        tm.tasks['i2'] = { statuses: [], userId: 'u', info: { timestamp: 5 } };
        tm.addInfo('i2', { timestamp: 9, text: 'newer' });
        assert.equal(tm.tasks['i2'].info.text, 'newer');
    });

    it('keeps existing info when the new timestamp is older', () => {
        const tm = freshManager();
        tm.tasks['i3'] = { statuses: [], userId: 'u', info: { timestamp: 9, text: 'keep' } };
        tm.addInfo('i3', { timestamp: 1, text: 'older' });
        assert.equal(tm.tasks['i3'].info.text, 'keep');
    });

    it('sets info when existing info has no timestamp', () => {
        const tm = freshManager();
        tm.tasks['i4'] = { statuses: [], userId: 'u', info: {} };
        tm.addInfo('i4', { timestamp: 1, text: 'set' });
        assert.equal(tm.tasks['i4'].info.text, 'set');
    });

    it('silently returns for a missing task with skipIfNotFound true', () => {
        const tm = freshManager();
        assert.doesNotThrow(() => tm.addInfo('nope', { timestamp: 1 }));
    });

    it('throws for a missing task with skipIfNotFound false', () => {
        const tm = freshManager();
        assert.throws(() => tm.addInfo('nope', { timestamp: 1 }, false), /not found/);
    });
});

describe('TaskManager.addResult / addError / callbacks', () => {
    it('sets result and notifies progress when no callback registered', () => {
        const tm = freshManager();
        tm.tasks['r1'] = { statuses: [], userId: 'u', taskId: 'r1' };
        tm.addResult('r1', { ok: true });
        assert.deepEqual(tm.tasks['r1'].result, { ok: true });
        assert.equal(wsCalls.length, 1);
    });

    it('invokes a registered callback and cleans it up afterwards', async () => {
        const tm = freshManager();
        tm.tasks['r2'] = { statuses: [], userId: 'u', taskId: 'r2' };
        let called = null;
        tm.registerCallback({ taskId: 'r2' }, async (task) => { called = task; });
        tm.addResult('r2', { v: 1 });
        await new Promise((res) => setImmediate(res));
        assert.equal(called.taskId, 'r2');
        assert.equal(tm.callbacks.has('r2'), false);
    });

    it('sets error and routes through the callback path', async () => {
        const tm = freshManager();
        tm.tasks['e1'] = { statuses: [], userId: 'u', taskId: 'e1' };
        let got = null;
        tm.registerCallback({ taskId: 'e1' }, async (task) => { got = task.error; });
        tm.addError('e1', new Error('boom'));
        await new Promise((res) => setImmediate(res));
        assert.equal(got.message, 'boom');
    });

    it('addResult skips silently for a missing task', () => {
        const tm = freshManager();
        assert.doesNotThrow(() => tm.addResult('missing', {}));
    });

    it('addResult throws for a missing task when skipIfNotFound false', () => {
        const tm = freshManager();
        assert.throws(() => tm.addResult('missing', {}, false), /not found/);
    });

    it('addError skips silently for a missing task', () => {
        const tm = freshManager();
        assert.doesNotThrow(() => tm.addError('missing', new Error('x')));
    });

    it('addError throws for a missing task when skipIfNotFound false', () => {
        const tm = freshManager();
        assert.throws(() => tm.addError('missing', new Error('x'), false), /not found/);
    });
});

describe('TaskManager.getState', () => {
    it('returns the task when the user matches', () => {
        const tm = freshManager();
        tm.tasks['g1'] = { userId: 'owner', statuses: [] };
        assert.equal(tm.getState('owner', 'g1'), tm.tasks['g1']);
    });

    it('skips silently when the user does not match', () => {
        const tm = freshManager();
        tm.tasks['g2'] = { userId: 'owner', statuses: [] };
        assert.equal(tm.getState('other', 'g2'), undefined);
    });

    it('throws when the task is missing and skipIfNotFound is false', () => {
        const tm = freshManager();
        assert.throws(() => tm.getState('u', 'missing', false), /not found/);
    });
});

describe('TaskManager.transferOwnership', () => {
    it('reassigns the userId on an existing task', () => {
        const tm = freshManager();
        tm.tasks['o1'] = { userId: 'old', statuses: [] };
        tm.transferOwnership('o1', 'new');
        assert.equal(tm.tasks['o1'].userId, 'new');
    });

    it('does nothing for a missing task', () => {
        const tm = freshManager();
        assert.doesNotThrow(() => tm.transferOwnership('missing', 'new'));
    });
});

describe('TaskManager.getOnboardingTask', () => {
    it('returns undefined for a missing task', () => {
        const tm = freshManager();
        assert.equal(tm.getOnboardingTask('missing'), undefined);
    });

    it('throws a TASK_NOT_ONBOARDING error for non-onboarding actions', () => {
        const tm = freshManager();
        tm.tasks['ob1'] = { action: TaskAction.CREATE_TOKEN, taskId: 'ob1' };
        try {
            tm.getOnboardingTask('ob1');
            assert.fail('should have thrown');
        } catch (err) {
            assert.equal(err.code, 'TASK_NOT_ONBOARDING');
        }
    });

    it('returns a sanitized completed onboarding task', () => {
        const tm = freshManager();
        tm.tasks['ob2'] = {
            taskId: 'ob2',
            action: TaskAction.ONBOARD_USER,
            expectation: 9,
            result: { secret: 'x' },
            error: null,
        };
        const out = tm.getOnboardingTask('ob2');
        assert.deepEqual(out, {
            taskId: 'ob2',
            action: TaskAction.ONBOARD_USER,
            expectation: 9,
            completed: true,
            failed: false,
            error: null,
        });
    });

    it('returns a sanitized failed onboarding task with a fallback message', () => {
        const tm = freshManager();
        tm.tasks['ob3'] = {
            taskId: 'ob3',
            action: TaskAction.ONBOARD_USER,
            expectation: 9,
            result: null,
            error: {},
        };
        const out = tm.getOnboardingTask('ob3');
        assert.equal(out.completed, false);
        assert.equal(out.failed, true);
        assert.deepEqual(out.error, { message: 'Task failed' });
    });

    it('surfaces the underlying error message when present', () => {
        const tm = freshManager();
        tm.tasks['ob4'] = {
            taskId: 'ob4',
            action: TaskAction.ONBOARD_USER,
            expectation: 9,
            result: null,
            error: { message: 'real error' },
        };
        const out = tm.getOnboardingTask('ob4');
        assert.deepEqual(out.error, { message: 'real error' });
    });
});

describe('TaskManager.notifyTaskProgress rate limiting', () => {
    it('debounces repeated canSkip notifications via the lock', async () => {
        const tm = freshManager();
        const task = { statuses: [], userId: 'u', marker: 'n1' };
        tm.tasks['n1'] = task;
        tm.addInfo('n1', { timestamp: 1 });
        tm.addInfo('n1', { timestamp: 2 });
        assert.equal(wsCalls.filter((t) => t === task).length, 0);
        assert.equal(tm.notifyTaskLock.has('n1'), true);
        await new Promise((res) => setTimeout(res, 1100));
        assert.equal(wsCalls.filter((t) => t === task).length, 1);
        assert.equal(tm.notifyTaskLock.has('n1'), false);
    });
});

describe('TaskManager.setDependencies subscriptions', () => {
    it('routes UPDATE_TASK_STATUS messages to info/status/result/error handlers', async () => {
        const tm = freshManager();
        tm.setDependencies(tm.wsService, {});
        const handler = captured['UPDATE_TASK_STATUS'];
        assert.equal(typeof handler, 'function');

        tm.tasks['s1'] = { statuses: [], userId: 'u', taskId: 's1' };
        await handler({ taskId: 's1', info: { timestamp: 1 }, result: { ok: 1 } });
        assert.ok(tm.tasks['s1'].info);
        assert.deepEqual(tm.tasks['s1'].result, { ok: 1 });

        tm.tasks['s2'] = { statuses: [], userId: 'u', taskId: 's2' };
        await handler({ taskId: 's2', statuses: [{ message: 'm' }], error: new Error('e') });
        assert.equal(tm.tasks['s2'].statuses.length, 1);
        assert.equal(tm.tasks['s2'].error.message, 'e');
    });

    it('ignores UPDATE_TASK_STATUS messages without a taskId', async () => {
        const tm = freshManager();
        tm.setDependencies(tm.wsService, {});
        const handler = captured['UPDATE_TASK_STATUS'];
        const res = await handler({});
        assert.ok(res);
    });

    it('PUBLISH_TASK handler creates a task only when absent', async () => {
        const tm = freshManager();
        tm.setDependencies(tm.wsService, {});
        const pub = captured['publish-task'];
        await pub({ taskId: 'p1', action: TaskAction.ONBOARD_USER, userId: 'u', expectation: 9 });
        assert.ok(tm.tasks['p1']);
        const first = tm.tasks['p1'];
        await pub({ taskId: 'p1', action: TaskAction.ONBOARD_USER, userId: 'u', expectation: 9 });
        assert.equal(tm.tasks['p1'], first);
    });
});
