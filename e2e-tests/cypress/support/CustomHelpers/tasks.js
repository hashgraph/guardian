import { METHOD, STATUS_CODE } from '../api/api-const';
import API from '../ApiUrls';

const POLL_INTERVAL = 2000;
const DEFAULT_ATTEMPTS = 60;

/**
 * Waits for an asynchronous Guardian task to finish.
 *
 * Endpoints that answer with `{ taskId, expectation, action }` only schedule the work: their 200/202
 * says nothing about the outcome, so a test that asserts right after the response reads the state
 * from before the task ran. Poll `tasks/{taskId}` instead of guessing a `cy.wait`.
 *
 * Yields the finished task state, and fails the test if the task reports an error or never completes.
 */
export const waitForTask = (authorization, taskId, attempts = DEFAULT_ATTEMPTS) => {
    expect(taskId, 'taskId of the asynchronous operation').to.be.a('string');
    const poll = (attemptsLeft) => cy.request({
        method: METHOD.GET,
        url: API.ApiServer + API.Tasks + taskId,
        headers: { authorization },
    }).then((response) => {
        expect(response.status).to.eq(STATUS_CODE.OK);
        const task = response.body;
        if (task?.error) {
            throw new Error(`Task ${taskId} (${task.action}) failed: ${JSON.stringify(task.error)}`);
        }
        if (task?.result !== undefined) {
            return cy.wrap(task, { log: false });
        }
        if (attemptsLeft <= 0) {
            throw new Error(`Task ${taskId} (${task?.action}) did not complete in time`);
        }
        // eslint-disable-next-line cypress/no-unnecessary-waiting -- back off between task status polls
        cy.wait(POLL_INTERVAL);
        return poll(attemptsLeft - 1);
    });
    return poll(attempts);
};
