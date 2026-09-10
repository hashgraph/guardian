import assert from 'node:assert/strict';
import { MessageAPI, PolicyEvents, PolicyStatus } from '@guardian/interfaces';
import { recordAPI } from '../../dist/api/record.service.js';
import { GuardiansService } from '../../dist/helpers/guardians.js';
import {
    callHandler,
    DatabaseServer,
    register,
    restoreStubs,
    silentLogger,
    stub,
    stubProto,
} from '../_handler-harness.mjs';

const owner = { owner: 'did:owner', id: 'owner-1' };

describe('record pause and resume handlers', () => {
    let handlers;
    let calls;

    beforeEach(async () => {
        handlers = await register(recordAPI, silentLogger());
        calls = [];
        stub(DatabaseServer, 'getPolicyById', async () => ({
            id: 'policy-1',
            owner: owner.owner,
            status: PolicyStatus.DRY_RUN,
        }));
        stubProto(GuardiansService, 'sendPolicyMessage', async (event, policyId, data) => {
            calls.push({ event, policyId, data });
            return true;
        });
    });

    afterEach(() => restoreStubs());

    it('forwards PAUSE_RECORDING to the policy service', async () => {
        const response = await callHandler(
            handlers,
            MessageAPI.PAUSE_RECORDING,
            { policyId: 'policy-1', owner }
        );
        assert.equal(response.body, true);
        assert.deepEqual(calls, [{
            event: PolicyEvents.PAUSE_RECORDING,
            policyId: 'policy-1',
            data: null,
        }]);
    });

    it('forwards RESUME_RECORDING to the policy service', async () => {
        const response = await callHandler(
            handlers,
            MessageAPI.RESUME_RECORDING,
            { policyId: 'policy-1', owner }
        );
        assert.equal(response.body, true);
        assert.deepEqual(calls, [{
            event: PolicyEvents.RESUME_RECORDING,
            policyId: 'policy-1',
            data: null,
        }]);
    });
});
