import assert from 'node:assert/strict';
import { PolicyEvents } from '@guardian/interfaces';
import { GuardiansService } from '../../dist/helpers/guardians.js';

/*
 * A discontinued policy has no process until something asks for it. A dispatch that
 * finds no responder must start it once and retry, never for lifecycle subjects and
 * never for a policy that is not discontinued.
 */

const noResponders = () => Object.assign(new Error('No responders'), { code: 'NO_RESPONDERS' });

describe('GuardiansService on-demand start', () => {
    let service, calls, started, alive, startable;

    beforeEach(() => {
        service = new GuardiansService();
        calls = [];
        started = [];
        alive = false;
        startable = true;
        service.requestOrThrow = async (subject) => {
            calls.push(subject);
            if (!alive) {
                throw noResponders();
            }
            return 'ok';
        };
        service.setPolicyHooks({
            ensureRunning: async (policyId) => {
                started.push(policyId);
                if (startable) {
                    alive = true;
                }
                return startable;
            },
        });
    });

    afterEach(() => {
        service.setPolicyHooks(null);
    });

    it('starts a stopped discontinued policy and retries a block request', async () => {
        const result = await service.sendBlockMessage(PolicyEvents.GET_BLOCK_DATA, 'p1', {});
        assert.equal(result, 'ok');
        assert.deepEqual(started, ['p1']);
        assert.equal(calls.length, 2);
    });

    it('starts a stopped discontinued policy and retries a policy message', async () => {
        const result = await service.sendPolicyMessage(PolicyEvents.GET_TAG_BLOCK_MAP, 'p1', null);
        assert.equal(result, 'ok');
        assert.deepEqual(started, ['p1']);
    });

    it('does not start anything for lifecycle subjects', async () => {
        const result = await service.sendPolicyMessage(PolicyEvents.DELETE_POLICY, 'p1', {});
        assert.equal(result, null);
        assert.deepEqual(started, []);
    });

    it('keeps the soft null contract when the policy is not startable', async () => {
        startable = false;
        const result = await service.sendPolicyMessage(PolicyEvents.GET_TAG_BLOCK_MAP, 'p1', null);
        assert.equal(result, null);
        assert.deepEqual(started, ['p1']);
    });

    it('fails with a clear error when the start fails', async () => {
        service.setPolicyHooks({
            ensureRunning: async () => { throw new Error('no free slot'); },
        });
        await assert.rejects(
            service.sendBlockMessage(PolicyEvents.GET_BLOCK_DATA, 'p1', {}),
            (error) => error.code === 503 && /could not be started/.test(error.message)
        );
    });

    it('does not start a running policy', async () => {
        alive = true;
        await service.sendBlockMessage(PolicyEvents.GET_BLOCK_DATA, 'p1', {});
        assert.deepEqual(started, []);
    });
});
