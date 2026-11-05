const optionKey = 'option';
import { STATUS_CODE, METHOD } from '../support/api/api-const';
import API from '../support/ApiUrls';
import { TIMEOUTS, POLL_INTERVAL } from './CustomHelpers/timeouts';

/**
 * Polls `request` until `predicate(response)` returns a truthy value, then yields that value.
 *
 * Reads before it waits, so a condition the backend has already reached costs nothing, and throws
 * when `timeout` runs out quoting the last response. The budget starts when the poll actually runs,
 * not when it is queued behind earlier commands.
 */
export const pollUntil = ({ request, predicate, description, timeout = TIMEOUTS.backend, interval = POLL_INTERVAL }) => cy.then(() => {
    const deadline = Date.now() + timeout;
    const attempt = () => cy.request({ failOnStatusCode: false, ...request }).then((response) => {
        const match = predicate(response);
        if (match) {
            return cy.wrap(match, { log: false });
        }
        if (Date.now() >= deadline) {
            throw new Error(
                `Timed out after ${timeout} ms waiting for ${description} on ${request.url}. ` +
                `Last response: ${response.status} ${JSON.stringify(response.body)?.slice(0, 1000)}`
            );
        }
        return cy.wait(interval, { log: false }).then(attempt);
    });
    return attempt();
});

const readPath = (body, path) => path.split('.').reduce((value, part) => value?.[part], body);

export const whileRequestProccessing = (request, dataToCompare, source) =>
    pollUntil({
        request,
        predicate: (response) => readPath(response.body, source) === dataToCompare,
        description: `${source} to be "${dataToCompare}"`,
    });

/**
 * Polls a grid block until one of its rows satisfies `predicate`, then yields that row.
 * Unlike `whileRequestProccessing`, which addresses rows by position (`data.0.…`), this
 * finds the row belonging to the current run, so it also works against a policy whose
 * grids already hold documents from earlier runs.
 */
export const waitForRow = (request, predicate) =>
    pollUntil({
        request,
        predicate: (response) => (response.body?.data ?? []).find(predicate),
        description: 'a matching row',
    });

/**
 * Polls a request until its body equals `expected`, then yields it.
 *
 * Contract permissions are granted on Hedera and mirrored back asynchronously, so a read issued
 * right after the grant still answers with the previous value.
 */
export const waitForResponseBody = (request, expected) =>
    pollUntil({
        request,
        // wrapped, so that an expected falsy body still counts as a match
        predicate: (response) => response.status === STATUS_CODE.OK && response.body === expected && { body: response.body },
        description: `the body to be ${JSON.stringify(expected)}`,
    }).then(({ body }) => body);

export const whileRequestAppear = (authorization) => {
    const newRequests = {
        method: METHOD.GET,
        url: API.ApiServer + API.ExternalPolicyRequests,
        qs: {
            status: 'NEW',
            type: 'REQUEST'
        },
        headers: {
            authorization,
        },
        timeout: TIMEOUTS.backend,
    };
    const externalRequestAction = (messageId, action) => cy.request({
        method: METHOD.PUT,
        url: API.ApiServer + API.ExternalPolicyRequests + messageId + '/' + action,
        headers: {
            authorization,
        },
        timeout: TIMEOUTS.backend,
    }).then((response) => {
        expect(response.status).to.eq(STATUS_CODE.OK);
    });
    const firstRequest = (response) => response.status === STATUS_CODE.OK && response.body[0];

    return pollUntil({ request: newRequests, predicate: firstRequest, description: 'a new external policy request' })
        .then((request) => {
            if (request.loaded === false) {
                externalRequestAction(request.messageId, API.Reload);
            }
            return pollUntil({
                request: newRequests,
                predicate: (response) => firstRequest(response)?.loaded !== false && firstRequest(response),
                description: 'the external policy request to load',
            });
        })
        .then((request) => {
            externalRequestAction(request.messageId, API.Approve);
            cy.task('log', 'Request approved');
        });
}

export const whileIPFSProcessingFile = (request) =>
    pollUntil({
        request,
        predicate: (response) => response.status === STATUS_CODE.OK,
        description: 'the IPFS file to be readable',
    });

/**
 * Polls a policy block until `read(response)` equals `expected`, then yields the body.
 */
const whileBlockReaches = (expected, request, read, description) =>
    pollUntil({
        request,
        predicate: (response) => read(response) === expected && response.body,
        description: `${description} to reach "${expected}"`,
    });

/**
 * Waits until the current user can act on the policy block at `url` (a `.../tag/<tag>/blocks` url):
 * the block answers 503 "Block Unavailable" until the policy has moved the user to it.
 */
export const waitForBlockAvailable = (url, authorization) =>
    pollUntil({
        request: { method: METHOD.GET, url, headers: { authorization } },
        predicate: (response) => response.status === STATUS_CODE.OK,
        description: `the block ${url} to become available`,
    });

const readGridRowStatus = (response) => response?.body?.data?.[0]?.[optionKey]?.status;

export const whileApplicationCreating = (dataToCompare, request) =>
    whileBlockReaches(dataToCompare, request, (response) => response?.body?.uiMetaData?.title, 'the application block');

export const whileApplicationApproving = (dataToCompare, request) =>
    whileBlockReaches(dataToCompare, request, (response) => response?.body?.fields?.[0]?.title, 'the approved application block');

export const whileDeviceCreating = (dataToCompare, request) =>
    whileBlockReaches(dataToCompare, request, readGridRowStatus, 'the device grid');

export const whileDeviceApproving = (dataToCompare, request) =>
    whileBlockReaches(dataToCompare, request, readGridRowStatus, 'the device grid');

export const whileIssueRequestCreating = (dataToCompare, request) =>
    whileBlockReaches(dataToCompare, request, readGridRowStatus, 'the issue request grid');

export const whileIssueRequestApproving = (dataToCompare, request) =>
    whileBlockReaches(dataToCompare, request, readGridRowStatus, 'the issue request grid');

export const whileBalanceVerifying = (dataToCompare, request, tokenId) =>
    pollUntil({
        request,
        predicate: (response) => (response.body ?? []).find((token) => token.tokenId === tokenId)?.balance === dataToCompare,
        description: `the balance of ${tokenId} to be ${dataToCompare}`,
    });

export const whilePolicyTestExecuting = (request) =>
    pollUntil({
        request,
        predicate: (response) => {
            expect(response.status, 'policy test status request').to.eq(200);
            const test = response.body.tests?.at(0);
            expect(test, 'policy test in the policy response').to.exist;
            return test.progress === null && test.result !== null;
        },
        description: 'the policy test to finish',
        timeout: TIMEOUTS.longOperation,
    });

export const getAccessToken = (username) => {
    return cy.fixture('credentials').then(({ goodPassword }) => {
        return cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.AccountsLogin,
            body: {
                username,
                password: goodPassword
            }
        }).then((response) => {
            //Get AT
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.AccessToken,
                body: {
                    refreshToken: response.body.refreshToken
                }
            }).then((response) => {
                return 'Bearer ' + response.body.accessToken;
            })
        })
    })
}

// A UI state that follows a policy step waits on the backend, Hedera transactions included.
export const waitForElement = (element, timeout = TIMEOUTS.backend) => {
    cy.get(element, { timeout }).should('exist');
}

// Publishing a policy, schema or token runs many Hedera transactions behind the task viewer.
export const waitForTaskComplete = (timeout = TIMEOUTS.longOperation) => {
    // eslint-disable-next-line cypress/no-unnecessary-waiting -- lets the task viewer open after the click that starts the task
    cy.wait(1000);
    cy.get('div.task-viewer', { timeout }).should('not.exist');
}

/**
 * Waits until the `username` row in the open per-token user view shows a balance of at
 * least `balance`. The balance cell (`div.user-balance`) renders only once the account is
 * associated with the token and the mint has landed, so each retry re-requests the row
 * through the per-row refresh button. `balance` is the expected value as the spec writes it
 * (e.g. `' 85 '`); it is parsed to a number and compared, so a row still loading or not yet
 * associated reads as "not reached" and is retried.
 */
export const waitForBalanceIncrease = (balance, username, timeout = TIMEOUTS.longOperation) => {
    const expected = parseFloat(String(balance).replace(/[^0-9.]/g, ''));
    if (Number.isNaN(expected)) {
        throw new Error(`Expected balance "${balance}" is not a number`);
    }
    const parse = (text) => parseFloat(String(text || '').replace(/[^0-9.]/g, ''));
    const check = (deadline) => cy.get('body', { log: false }).then((body) => {
        const row = Array.from(body.querySelectorAll('tr.guardian-grid-row')).find((r) => {
            const cells = Array.from(r.querySelectorAll('span.text-truncate'));
            return cells.length > 0 && cells[0].textContent.trim() === username;
        });
        const balanceCell = row ? row.querySelector('div.user-balance') : null;
        const current = balanceCell ? parse(balanceCell.textContent) : NaN;
        if (!Number.isNaN(current) && current >= expected) {
            return;
        }
        if (Date.now() >= deadline) {
            throw new Error(`Balance for ${username} never reached ${expected} in ${timeout} ms (last seen: ${current})`);
        }
        cy.log(`Balance for ${username}: ${Number.isNaN(current) ? 'not loaded yet' : current} (< ${expected}); refreshing`);
        const refresh = row ? row.querySelector('div.guardian-icon-button svg-icon[src*="refresh-2"]') : null;
        if (refresh) {
            refresh.click();
        }
        cy.wait(POLL_INTERVAL, { log: false }).then(() => check(deadline));
    });
    return cy.then(() => check(Date.now() + timeout));
}

export const waitForLoading = (timeout = TIMEOUTS.backend) => {
    cy.get('div.loading', { timeout }).should('not.exist');
}
