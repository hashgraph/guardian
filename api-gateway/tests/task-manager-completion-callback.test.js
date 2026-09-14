import assert from 'node:assert/strict';
import { TaskAction } from '@guardian/interfaces';
import { TaskManager } from '../dist/helpers/task-manager.js';

/*
 * The profile routes register cache invalidation as the task's completion callback.
 * These pin what that callback guarantees, which is what lets the callers drop their
 * own invalidate call from the error path.
 */
describe('@unit TaskManager completion callback', () => {
    const manager = () => {
        const tm = new TaskManager();
        tm.wsService = { notifyTaskProgress() {}, notifyTaskUpdate() {} };
        tm.channel = { publish() {}, sendMessage() {}, subscribe() {} };
        return tm;
    };

    const settle = () => new Promise((r) => setImmediate(r));

    it('runs the callback when the task fails, not only when it succeeds', async () => {
        const tm = manager();
        const task = tm.start(TaskAction.RESTORE_USER_PROFILE, 'u-1');
        let runs = 0;
        tm.registerCallback(task, async () => { runs++; });

        tm.addError(task.taskId, { code: 500, message: 'boom' });
        await settle();

        assert.equal(runs, 1, 'a failed restore still has to invalidate the profile cache');
    });

    it('runs it once when a result and an error both arrive', async () => {
        const tm = manager();
        const task = tm.start(TaskAction.RESTORE_USER_PROFILE, 'u-2');
        let runs = 0;
        tm.registerCallback(task, async () => { runs++; });

        tm.addResult(task.taskId, { ok: true });
        tm.addError(task.taskId, { code: 500, message: 'late failure' });
        await settle();

        assert.equal(runs, 1, 'a second run would clear the pending flag while the first is still going');
    });
});
