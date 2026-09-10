import assert from 'node:assert/strict';
import { PolicyContainer } from '../../../dist/helpers/policy-container.js';

/*
 * addPolicy used to overwrite an existing entry with `{ options, process: null }`, and
 * runPolicyProcess only skips an instance that already has a `process` - so a repeated
 * GENERATE_POLICY forked a SECOND child and dropped the handle to the first.
 */

/** A container with just the state addPolicy touches - no NATS, no child processes. */
function makeContainer(maxPolicyInstances = 5) {
    const container = Object.create(PolicyContainer.prototype);
    container.container = new Map();
    container.maxPolicyInstances = maxPolicyInstances;
    container.unsubscribeFromModelGeneration = () => { container.unsubscribed = true; };
    container.logger = { warn() {}, info() {}, error() {} };
    return container;
}

const config = (policyId, overrides = {}) => ({
    policyId, skipRegistration: false, policyOwnerId: 'o', enableMock: false, ...overrides,
});

describe('PolicyContainer.addPolicy', () => {
    it('accepts a policy this pod is not hosting yet', () => {
        const c = makeContainer();
        assert.equal(c.addPolicy(config('p1')), true);
        assert.equal(c.container.size, 1);
    });

    it('does not replace the entry of a policy this pod already hosts', () => {
        const c = makeContainer();
        c.addPolicy(config('p1'));

        // The policy has been forked by now, so the entry owns a live child handle.
        const running = { pid: 111 };
        c.container.get('p1').process = running;

        assert.equal(c.addPolicy(config('p1')), true, 'the policy is hosted, so report success');
        assert.equal(
            c.container.get('p1').process,
            running,
            'the live child handle must survive a repeated GENERATE_POLICY'
        );
        assert.equal(c.container.size, 1, 'no second entry for the same policy');
    });

    it('does not grow the process count when the same policy is added twice', () => {
        const c = makeContainer(1);
        assert.equal(c.addPolicy(config('p1')), true);
        // At maxPolicyInstances now. Re-adding the SAME policy costs no slot, so it
        // must not be refused as if the pod were full.
        assert.equal(c.addPolicy(config('p1')), true);
        assert.equal(c.container.size, 1);
    });

    it('declines a request whose start options differ from the running child', () => {
        // the child was forked with the old options, so claiming this request would
        // serve it from a process that does not match what the caller asked for
        const c = makeContainer();
        c.addPolicy(config('p1'));
        c.container.get('p1').process = { pid: 1 };

        assert.equal(c.addPolicy(config('p1', { enableMock: true })), false,
            'declining routes the request to a pod that can honour it');
        assert.equal(c.container.get('p1').options.enableMock, false,
            'and the hosted entry is left as it is');
    });

    it('still claims a repeat request that matches', () => {
        const c = makeContainer();
        c.addPolicy(config('p1'));

        assert.equal(c.addPolicy(config('p1')), true);
    });

    it('still refuses a NEW policy once the pod is full', () => {
        const c = makeContainer(1);
        c.addPolicy(config('p1'));
        assert.equal(c.addPolicy(config('p2')), false);
        assert.equal(c.container.size, 1);
        assert.equal(c.unsubscribed, true, 'a full pod stops advertising for more work');
    });
});
