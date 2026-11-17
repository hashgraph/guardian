import { METHOD, STATUS_CODE } from '../api/api-const';
import API from '../ApiUrls';
import { pollUntil } from '../checkingMethods';
import { TIMEOUTS } from './timeouts';

/**
 * Waits for an asynchronous Guardian task to finish.
 *
 * Endpoints that answer with `{ taskId, expectation, action }` only schedule the work: their 200/202
 * says nothing about the outcome, so a test that asserts right after the response reads the state
 * from before the task ran. Poll `tasks/{taskId}` instead of guessing a `cy.wait`.
 *
 * Yields the finished task state, and fails the test if the task reports an error or never completes.
 */
export const waitForTask = (authorization, taskId) => {
    expect(taskId, 'taskId of the asynchronous operation').to.be.a('string');
    return pollUntil({
        request: {
            method: METHOD.GET,
            url: API.ApiServer + API.Tasks + taskId,
            headers: { authorization },
        },
        predicate: (response) => {
            expect(response.status).to.eq(STATUS_CODE.OK);
            const task = response.body;
            if (task?.error) {
                throw new Error(`Task ${taskId} (${task.action}) failed: ${JSON.stringify(task.error)}`);
            }
            return task?.result !== undefined && task;
        },
        description: `task ${taskId} to complete`,
        timeout: TIMEOUTS.longOperation,
    });
};
