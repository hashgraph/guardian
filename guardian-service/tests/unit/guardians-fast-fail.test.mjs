import assert from 'node:assert/strict';
import sinon from 'sinon';
import { GuardiansService } from '../../dist/helpers/guardians.js';

// The three senders route through requestOrThrow; stub it and assert each
// method maps its outcomes to the documented contract.
const noResponders = () => Object.assign(new Error('no responders'), { code: 'NO_RESPONDERS' });
const requestTimeout = () => Object.assign(new Error('timeout'), { code: 'REQUEST_TIMEOUT' });

// GuardiansService is a @Singleton; new() returns the shared instance. The three
// methods only touch this.requestOrThrow, so stubbing it fully isolates them.
function svcWith(requestOrThrowImpl) {
    const svc = new GuardiansService();
    sinon.stub(svc, 'requestOrThrow').callsFake(requestOrThrowImpl);
    return svc;
}

describe('GuardiansService.checkIfPolicyAlive fast-fail', () => {
    afterEach(() => sinon.restore());

    it('returns true when the policy answers', async () => {
        const svc = svcWith(async () => true);
        assert.equal(await svc.checkIfPolicyAlive('p1'), true);
    });

    it('targets the policy subject with the policyId filter header', async () => {
        const svc = svcWith(async () => true);
        await svc.checkIfPolicyAlive('p1');
        const [subject, , , extraHeaders] = svc.requestOrThrow.firstCall.args;
        assert.ok(subject.startsWith('p1-'), `subject should be policyId-prefixed, got ${subject}`);
        assert.deepEqual(extraHeaders, { policyId: 'p1' });
    });

    it('returns false when the policy is not loaded (NO_RESPONDERS)', async () => {
        const svc = svcWith(async () => { throw noResponders(); });
        assert.equal(await svc.checkIfPolicyAlive('p1'), false);
    });

    it('returns false on a falsy body', async () => {
        const svc = svcWith(async () => null);
        assert.equal(await svc.checkIfPolicyAlive('p1'), false);
    });

    it('reports alive on REQUEST_TIMEOUT (a responder exists) to avoid a spurious reload', async () => {
        const svc = svcWith(async () => { throw requestTimeout(); });
        assert.equal(await svc.checkIfPolicyAlive('p1'), true);
    });

    it('reports alive on a responder-side error rather than falsely declaring the policy dead', async () => {
        const svc = svcWith(async () => { throw Object.assign(new Error('boom'), { code: 500 }); });
        assert.equal(await svc.checkIfPolicyAlive('p1'), true);
    });
});

describe('GuardiansService.sendPolicyMessage fast-fail', () => {
    afterEach(() => sinon.restore());

    it('returns the response body on success', async () => {
        const svc = svcWith(async () => ({ ok: 1 }));
        assert.deepEqual(await svc.sendPolicyMessage('EVENT', 'p1', {}), { ok: 1 });
    });

    it('returns null (soft contract) when there is no host (NO_RESPONDERS)', async () => {
        const svc = svcWith(async () => { throw noResponders(); });
        assert.equal(await svc.sendPolicyMessage('EVENT', 'p1', {}), null);
    });

    it('returns null on REQUEST_TIMEOUT', async () => {
        const svc = svcWith(async () => { throw requestTimeout(); });
        assert.equal(await svc.sendPolicyMessage('EVENT', 'p1', {}), null);
    });

    it('propagates a responder-returned error', async () => {
        const svc = svcWith(async () => { throw Object.assign(new Error('Forbidden'), { code: 403 }); });
        await assert.rejects(svc.sendPolicyMessage('EVENT', 'p1', {}), /Forbidden/);
    });
});

describe('GuardiansService.sendBlockMessage fast-fail', () => {
    afterEach(() => sinon.restore());

    it('returns the block response on success', async () => {
        const svc = svcWith(async () => ({ ok: true }));
        assert.deepEqual(await svc.sendBlockMessage('SET_BLOCK_DATA', 'p1', {}), { ok: true });
    });

    it('rejects with Block Timeout (504) once the deadline passes with no host', async () => {
        // awaitInterval < retryDelay(500) => after the first NO_RESPONDERS the
        // deadline is already within a retry window, so it fails fast, no retry.
        const stub = sinon.stub().rejects(noResponders());
        const svc = new GuardiansService();
        sinon.stub(svc, 'requestOrThrow').callsFake(stub);
        await assert.rejects(
            svc.sendBlockMessage('SET_BLOCK_DATA', 'p1', {}, 50),
            (e) => e.message === 'Block Timeout' && e.code === 504
        );
        assert.equal(stub.callCount, 1, 'must not keep retrying past the deadline');
    });

    it('retries on NO_RESPONDERS while the policy is reloading, then succeeds', async () => {
        let calls = 0;
        const svc = svcWith(async () => {
            calls += 1;
            if (calls === 1) { throw noResponders(); }
            return { ok: 'started' };
        });
        // awaitInterval > retryDelay so one retry (after ~500ms) is allowed.
        const result = await svc.sendBlockMessage('SET_BLOCK_DATA', 'p1', {}, 5000);
        assert.deepEqual(result, { ok: 'started' });
        assert.equal(calls, 2);
    });

    it('does NOT retry on REQUEST_TIMEOUT (possible delivery) and maps to Block Timeout', async () => {
        const stub = sinon.stub().rejects(requestTimeout());
        const svc = new GuardiansService();
        sinon.stub(svc, 'requestOrThrow').callsFake(stub);
        await assert.rejects(
            svc.sendBlockMessage('SET_BLOCK_DATA', 'p1', {}, 5000),
            (e) => e.message === 'Block Timeout' && e.code === 504
        );
        assert.equal(stub.callCount, 1);
    });

    it('propagates a responder-returned error (e.g. Block Unavailable 503)', async () => {
        const svc = svcWith(async () => { throw Object.assign(new Error('Block Unavailable'), { code: 503 }); });
        await assert.rejects(
            svc.sendBlockMessage('SET_BLOCK_DATA', 'p1', {}, 5000),
            (e) => e.message === 'Block Unavailable' && e.code === 503
        );
    });
});
