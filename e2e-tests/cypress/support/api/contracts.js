import { METHOD, STATUS_CODE } from './api-const';
import API from '../ApiUrls';

/**
 * Helpers shared by the `013_contracts` specs.
 *
 * Two properties of the contract API shape everything here:
 *
 * - `GET /contracts` is cached per user and per url for ten minutes. Every read below
 *   therefore carries a unique `cacheBust` parameter, so a listing taken before a
 *   mutation is never replayed after it.
 * - contract events reach Guardian through a synchronization task that polls the Hedera
 *   mirror node once a minute, so a request raised on-chain surfaces in the API tens of
 *   seconds later, and how long exactly depends on where in that minute the call landed.
 *   Everything that waits for one polls until it appears and fails loudly on timeout,
 *   rather than sleeping for a fixed span that is either too short or wasted.
 */

let cacheBustCounter = 0;

//A value unique to the process, so two reads of the same url in the same spec never share
//a cache entry
const nextCacheBust = () => `${Date.now()}-${cacheBustCounter++}`;

/**
 * Reads the contract listing of `type`, bypassing the response cache.
 */
export const listContracts = (authorization, type, qs = {}) =>
    cy.request({
        method: METHOD.GET,
        url: API.ApiServer + API.ListOfContracts,
        headers: { authorization },
        qs: { type, cacheBust: nextCacheBust(), ...qs },
        timeout: 180000,
    });

//The listing is ordered by `createDate` descending (see `GET_CONTRACTS` in
//guardian-service), so the contract the current run created is the *first* match:
//contracts of earlier runs carry the same description and sort after it.
export const getContractByDescription = (authorization, type, description) =>
    listContracts(authorization, type).then((response) => {
        expect(response.status).to.eql(STATUS_CODE.OK);
        const contract = response.body.filter((c) => c.description === description).at(0);
        expect(contract, `${type} contract "${description}" in the listing`).to.not.be.undefined;
        return cy.wrap(contract, { log: false });
    });

//The importing registry keeps its own record of a contract, and the on-chain id is what
//ties the two records together: matching on the description alone can pair up contracts
//of two different runs, and roles then get granted on one and read back from the other.
export const getContractByContractId = (authorization, type, contractId) =>
    listContracts(authorization, type).then((response) => {
        expect(response.status).to.eql(STATUS_CODE.OK);
        const contract = response.body.find((c) => c.contractId === contractId);
        expect(contract, `${type} contract ${contractId} in the listing`).to.not.be.undefined;
        return cy.wrap(contract, { log: false });
    });

/**
 * Polls `request` until `predicate(response)` returns a truthy value, then yields it.
 *
 * Throws when `timeout` elapses, quoting the last response: a poll that gives up quietly
 * turns a missing event into a confusing `undefined` several lines further down, and costs
 * the full timeout on every run.
 */
export const pollUntil = ({
    request,
    predicate,
    description,
    timeout = 180000,
    interval = 5000,
}) => {
    const deadline = Date.now() + timeout;

    const attempt = () => cy.request({ failOnStatusCode: false, ...request }).then((response) => {
        const match = predicate(response);
        if (match) {
            return cy.wrap(match, { log: false });
        }
        if (Date.now() >= deadline) {
            throw new Error(
                `Timed out after ${timeout} ms waiting for ${description}. ` +
                `Last response: ${response.status} ${JSON.stringify(response.body)}`
            );
        }
        // eslint-disable-next-line cypress/no-unnecessary-waiting -- back off between polls
        return cy.wait(interval, { log: false }).then(attempt);
    });

    return attempt();
};

const wipeRequestsRequest = (authorization, contractId) => ({
    method: METHOD.GET,
    url: API.ApiServer + API.WipeRequests,
    headers: { authorization },
    qs: { contractId },
});

/**
 * Waits for the wipe request the retire contract raises when a pool is set, and yields it.
 *
 * Pass `token` when more than one request can be outstanding on the contract, so the wait
 * ends on the request this step raised rather than on one left by an earlier step.
 */
export const waitForWipeRequest = (authorization, contractId, { token, timeout = 180000 } = {}) =>
    pollUntil({
        request: wipeRequestsRequest(authorization, contractId),
        predicate: (response) => response.status === STATUS_CODE.OK &&
            (response.body ?? []).find((request) => request.contractId === contractId &&
                (!token || request.token === token)),
        description: `a wipe request on contract ${contractId}${token ? ` for token ${token}` : ''}`,
        timeout,
    });

/**
 * Asserts that no wipe request shows up on `contractId` for the whole of `window`.
 *
 * Absence cannot be observed the instant a pool is set: the request would be raised on-chain
 * and only surface on the next run of the once-a-minute synchronization task. The window has
 * to span at least one full sync cycle for the assertion to mean anything, and the listing is
 * re-read throughout it rather than only at the end, so a request that appears and is removed
 * again is still caught.
 */
export const expectNoWipeRequest = (authorization, contractId, { token, window: waitWindow = 90000, interval = 5000 } = {}) => {
    const deadline = Date.now() + waitWindow;

    const attempt = () => cy.request(wipeRequestsRequest(authorization, contractId)).then((response) => {
        expect(response.status).to.eql(STATUS_CODE.OK);
        const unexpected = (response.body ?? []).filter((request) => !token || request.token === token);
        expect(
            unexpected,
            `no wipe request on contract ${contractId}${token ? ` for token ${token}` : ''} while requests are disabled`
        ).to.eql([]);
        if (Date.now() >= deadline) {
            return cy.wrap(response.body, { log: false });
        }
        // eslint-disable-next-line cypress/no-unnecessary-waiting -- the window has to outlast one sync cycle
        return cy.wait(interval, { log: false }).then(attempt);
    });

    return attempt();
};

/**
 * Waits for the retire request a user raises against a pool, and yields it.
 */
export const waitForRetireRequest = (authorization, contractId, { timeout = 180000 } = {}) =>
    pollUntil({
        request: {
            method: METHOD.GET,
            url: API.ApiServer + API.RetireRequests,
            headers: { authorization },
            qs: { contractId },
        },
        predicate: (response) => response.status === STATUS_CODE.OK &&
            (response.body ?? []).find((request) => request.contractId === contractId),
        description: `a retire request on contract ${contractId}`,
        timeout,
    });

/**
 * Waits for a retire pool of `contractId` to become visible to `authorization`, and yields it.
 *
 * A pool is only listed to a plain user once the retire contract holds the wiper role on
 * every token of the pool, which happens when the wipe request is approved.
 */
export const waitForRetirePool = (authorization, { contractId, tokenId, timeout = 180000 } = {}) =>
    pollUntil({
        request: {
            method: METHOD.GET,
            url: API.ApiServer + API.RetirePools,
            headers: { authorization },
            qs: contractId ? { contractId } : {},
        },
        predicate: (response) => response.status === STATUS_CODE.OK &&
            (response.body ?? []).find((pool) => (!tokenId || (pool.tokenIds ?? []).includes(tokenId))),
        description: `a retire pool${contractId ? ` on contract ${contractId}` : ''}` +
            `${tokenId ? ` holding token ${tokenId}` : ''}`,
        timeout,
    });

/**
 * Waits until the token balance of `hederaAccountId` reaches `expected`, and yields it.
 */
export const waitForTokenBalance = (authorization, { tokenId, expected, timeout = 600000 } = {}) =>
    pollUntil({
        request: {
            method: METHOD.GET,
            url: API.ApiServer + API.ListOfTokens,
            headers: { authorization },
        },
        predicate: (response) => response.status === STATUS_CODE.OK &&
            (response.body ?? []).some((token) => token.tokenId === tokenId && token.balance === expected),
        description: `token ${tokenId} to reach balance ${expected}`,
        timeout,
    });

/**
 * Creates a non-fungible token whose wipe key is `wipeContractId`.
 *
 * The binding is what makes a pool on that token raise a wipe request: the retire contract
 * reads the token's wipe key to find the wipe contract it has to ask for the wiper role.
 * Each token carries its own request, so a step that needs a request of its own creates a
 * token of its own - re-setting a pool on a token the contract can already wipe raises
 * nothing.
 */
export const createWipeBoundToken = (authorization, { tokenName, tokenSymbol, wipeContractId }) =>
    cy.request({
        method: METHOD.POST,
        url: API.ApiServer + API.ListOfTokens,
        headers: { authorization },
        body: {
            draftToken: false,
            tokenName,
            tokenSymbol,
            tokenType: 'non-fungible',
            decimals: '2',
            initialSupply: '0',
            enableAdmin: true,
            changeSupply: true,
            enableFreeze: false,
            enableKYC: false,
            enableWipe: true,
            wipeContractId,
            tokenId: null,
        },
        timeout: 180000,
    }).then((response) => {
        expect(response.status).to.eql(STATUS_CODE.SUCCESS);
        //The response is the registry's whole token list, and earlier runs leave tokens of the same
        //name behind, so the wipe contract - which is created afresh by every run - is what
        //identifies the one this call just created
        const token = response.body
            .filter((element) => element.tokenName === tokenName && element.wipeContractId === wipeContractId)
            .at(-1);
        expect(token, `token "${tokenName}" bound to wipe contract ${wipeContractId}`).to.not.be.undefined;
        return cy.wrap(token.tokenId, { log: false });
    });

/**
 * Yields the id of the newest token bound to `wipeContractId`.
 *
 * Creating a token costs a fixed fee on Hedera, so a step that needs a wipe request re-uses the
 * token an earlier spec of the folder created rather than minting one of its own: a request can be
 * raised on the same token again once the previous one has been rejected or cleared.
 */
export const findWipeBoundToken = (authorization, wipeContractId) =>
    cy.request({
        method: METHOD.GET,
        url: API.ApiServer + API.ListOfTokens,
        headers: { authorization },
    }).then((response) => {
        expect(response.status).to.eql(STATUS_CODE.OK);
        const token = response.body.filter((element) => element.wipeContractId === wipeContractId).at(-1);
        expect(token, `a token bound to wipe contract ${wipeContractId}`).to.not.be.undefined;
        return cy.wrap(token.tokenId, { log: false });
    });

/**
 * Sets a single-token pool on a retire contract.
 *
 * Guardian records the pool by reading the token back from the Hedera mirror node, and the mirror
 * node needs a few seconds to index a token that was just created: called too early the endpoint
 * answers 500, with a 404 from the mirror node behind it. The call is therefore repeated until it
 * is accepted, which is also what a client would have to do.
 *
 * Repeating it is safe - the on-chain call is idempotent, a second `requestWiper` for a token that
 * already has a request outstanding reverts inside the retire contract's `try/catch` - but it does
 * cost gas, hence the interval well above the poll default.
 */
export const setRetirePool = (authorization, { contractId, tokenId, count = 1, immediately = false, timeout = 120000 }) =>
    pollUntil({
        interval: 10000,
        request: {
            method: METHOD.POST,
            url: `${API.ApiServer}${API.RetireContract}${contractId}/${API.PoolContract}`,
            headers: { authorization },
            body: {
                tokens: [{ token: tokenId, count }],
                immediately,
            },
            timeout: 180000,
        },
        predicate: (response) => response.status === STATUS_CODE.OK,
        description: `token ${tokenId} to be accepted into a pool of contract ${contractId}`,
        timeout,
    });

export const getWipeRequests = (authorization, qs = {}) =>
    cy.request({
        method: METHOD.GET,
        url: API.ApiServer + API.WipeRequests,
        headers: authorization ? { authorization } : {},
        qs,
        failOnStatusCode: false,
    });
