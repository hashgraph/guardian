import assert from 'node:assert/strict';
import { MessageAPI } from '@guardian/interfaces';
import { Guardians } from '../../dist/helpers/guardians.js';

function make(canned = { ok: true }) {
    const g = new Guardians(undefined);
    const calls = [];
    g.sendMessage = async (subject, data) => {
        calls.push([subject, data]);
        return canned;
    };
    return { g, calls };
}

const owner = { creator: 'did:owner', owner: 'did:owner', id: 'o1' };
const user = { id: 'u1', did: 'did:u' };
const task = { taskId: 't1', userId: 'u1' };

describe('Guardians wizard and branding', () => {
    it('wizardPolicyCreate forwards owner and config', async () => {
        const { g, calls } = make();
        await g.wizardPolicyCreate({ c: 1 }, owner);
        assert.deepEqual(calls[0], [MessageAPI.WIZARD_POLICY_CREATE, { owner, config: { c: 1 } }]);
    });

    it('wizardPolicyCreateAsync forwards task', async () => {
        const { g, calls } = make();
        await g.wizardPolicyCreateAsync({ c: 1 }, owner, task);
        assert.deepEqual(calls[0], [MessageAPI.WIZARD_POLICY_CREATE_ASYNC, { owner, config: { c: 1 }, task }]);
    });

    it('wizardPolicyCreateAsyncNew forwards saveState and task', async () => {
        const { g, calls } = make();
        await g.wizardPolicyCreateAsyncNew({ c: 1 }, owner, true, task);
        assert.deepEqual(calls[0], [MessageAPI.WIZARD_POLICY_CREATE_ASYNC, { owner, config: { c: 1 }, saveState: true, task }]);
    });

    it('wizardGetPolicyConfig forwards policyId config owner', async () => {
        const { g, calls } = make();
        await g.wizardGetPolicyConfig('p1', { c: 1 }, owner);
        assert.deepEqual(calls[0], [MessageAPI.WIZARD_GET_POLICY_CONFIG, { policyId: 'p1', config: { c: 1 }, owner }]);
    });

    it('setBranding forwards user and config', async () => {
        const { g, calls } = make();
        await g.setBranding(user, '{"k":1}');
        assert.deepEqual(calls[0], [MessageAPI.STORE_BRANDING, { user, config: '{"k":1}' }]);
    });

    it('getBranding sends only the subject', async () => {
        const { g, calls } = make();
        await g.getBranding();
        assert.equal(calls[0][0], MessageAPI.GET_BRANDING);
        assert.equal(calls[0][1], undefined);
    });
});

describe('Guardians suggestions and blocks', () => {
    it('policySuggestions forwards user and input', async () => {
        const { g, calls } = make();
        await g.policySuggestions({ s: 1 }, user);
        assert.deepEqual(calls[0], [MessageAPI.SUGGESTIONS, { user, suggestionsInput: { s: 1 } }]);
    });

    it('setPolicySuggestionsConfig forwards items and user', async () => {
        const { g, calls } = make();
        await g.setPolicySuggestionsConfig([{ id: 'a' }], user);
        assert.deepEqual(calls[0], [MessageAPI.SET_SUGGESTIONS_CONFIG, { items: [{ id: 'a' }], user }]);
    });

    it('getPolicySuggestionsConfig forwards user', async () => {
        const { g, calls } = make();
        await g.getPolicySuggestionsConfig(user);
        assert.deepEqual(calls[0], [MessageAPI.GET_SUGGESTIONS_CONFIG, { user }]);
    });

    it('searchBlocks forwards config blockId user', async () => {
        const { g, calls } = make();
        await g.searchBlocks({ c: 1 }, 'b1', user);
        assert.deepEqual(calls[0], [MessageAPI.SEARCH_BLOCKS, { config: { c: 1 }, blockId: 'b1', user }]);
    });
});

describe('Guardians recording and run-record', () => {
    it('startRecording forwards policyId owner options', async () => {
        const { g, calls } = make();
        await g.startRecording('p1', owner, { o: 1 });
        assert.deepEqual(calls[0], [MessageAPI.START_RECORDING, { policyId: 'p1', owner, options: { o: 1 } }]);
    });

    it('stopRecording returns base64 decoded buffer', async () => {
        const b64 = Buffer.from('recording').toString('base64');
        const { g, calls } = make(b64);
        const res = await g.stopRecording('p1', owner, { o: 1 });
        assert.ok(Buffer.isBuffer(res));
        assert.equal(res.toString(), 'recording');
        assert.deepEqual(calls[0], [MessageAPI.STOP_RECORDING, { policyId: 'p1', owner, options: { o: 1 } }]);
    });

    it('getRecordedActions forwards policyId and owner', async () => {
        const { g, calls } = make();
        await g.getRecordedActions('p1', owner);
        assert.deepEqual(calls[0], [MessageAPI.GET_RECORDED_ACTIONS, { policyId: 'p1', owner }]);
    });

    it('getRecordStatus forwards policyId and owner', async () => {
        const { g, calls } = make();
        await g.getRecordStatus('p1', owner);
        assert.deepEqual(calls[0], [MessageAPI.GET_RECORD_STATUS, { policyId: 'p1', owner }]);
    });

    it('runRecord forwards options', async () => {
        const { g, calls } = make();
        await g.runRecord('p1', owner, { o: 1 });
        assert.deepEqual(calls[0], [MessageAPI.RUN_RECORD, { policyId: 'p1', owner, options: { o: 1 } }]);
    });

    it('stopRunning forwards options', async () => {
        const { g, calls } = make();
        await g.stopRunning('p1', owner, { o: 1 });
        assert.deepEqual(calls[0], [MessageAPI.STOP_RUNNING, { policyId: 'p1', owner, options: { o: 1 } }]);
    });

    it('getRecordResults forwards policyId and owner', async () => {
        const { g, calls } = make();
        await g.getRecordResults('p1', owner);
        assert.deepEqual(calls[0], [MessageAPI.GET_RECORD_RESULTS, { policyId: 'p1', owner }]);
    });

    it('getRecordDetails forwards policyId and owner', async () => {
        const { g, calls } = make();
        await g.getRecordDetails('p1', owner);
        assert.deepEqual(calls[0], [MessageAPI.GET_RECORD_DETAILS, { policyId: 'p1', owner }]);
    });

    it('getRecordActionDocuments forwards recordActionId', async () => {
        const { g, calls } = make();
        await g.getRecordActionDocuments('p1', 'a1', owner);
        assert.deepEqual(calls[0], [MessageAPI.GET_RECORD_ACTION_DOCUMENTS, { policyId: 'p1', recordActionId: 'a1', owner }]);
    });

    it('fastForward forwards options', async () => {
        const { g, calls } = make();
        await g.fastForward('p1', owner, { o: 1 });
        assert.deepEqual(calls[0], [MessageAPI.FAST_FORWARD, { policyId: 'p1', owner, options: { o: 1 } }]);
    });

    it('retryStep forwards options', async () => {
        const { g, calls } = make();
        await g.retryStep('p1', owner, { o: 1 });
        assert.deepEqual(calls[0], [MessageAPI.RECORD_RETRY_STEP, { policyId: 'p1', owner, options: { o: 1 } }]);
    });

    it('skipStep forwards options', async () => {
        const { g, calls } = make();
        await g.skipStep('p1', owner, { o: 1 });
        assert.deepEqual(calls[0], [MessageAPI.RECORD_SKIP_STEP, { policyId: 'p1', owner, options: { o: 1 } }]);
    });
});

describe('Guardians external policies', () => {
    it('getExternalPolicyRequest forwards filters and owner', async () => {
        const { g, calls } = make();
        await g.getExternalPolicyRequest({ f: 1 }, owner);
        assert.deepEqual(calls[0], [MessageAPI.GET_EXTERNAL_POLICY_REQUEST, { filters: { f: 1 }, owner }]);
    });

    it('previewExternalPolicy forwards messageId and owner', async () => {
        const { g, calls } = make();
        await g.previewExternalPolicy('m1', owner);
        assert.deepEqual(calls[0], [MessageAPI.PREVIEW_EXTERNAL_POLICY, { messageId: 'm1', owner }]);
    });

    it('importExternalPolicy forwards messageId and owner', async () => {
        const { g, calls } = make();
        await g.importExternalPolicy('m1', owner);
        assert.deepEqual(calls[0], [MessageAPI.IMPORT_EXTERNAL_POLICY, { messageId: 'm1', owner }]);
    });

    it('approveExternalPolicyAsync forwards task', async () => {
        const { g, calls } = make();
        await g.approveExternalPolicyAsync('m1', owner, task);
        assert.deepEqual(calls[0], [MessageAPI.APPROVE_EXTERNAL_POLICY_ASYNC, { messageId: 'm1', owner, task }]);
    });

    it('rejectExternalPolicyAsync forwards task', async () => {
        const { g, calls } = make();
        await g.rejectExternalPolicyAsync('m1', owner, task);
        assert.deepEqual(calls[0], [MessageAPI.REJECT_EXTERNAL_POLICY_ASYNC, { messageId: 'm1', owner, task }]);
    });

    it('approveExternalPolicy forwards messageId and owner', async () => {
        const { g, calls } = make();
        await g.approveExternalPolicy('m1', owner);
        assert.deepEqual(calls[0], [MessageAPI.APPROVE_EXTERNAL_POLICY, { messageId: 'm1', owner }]);
    });

    it('rejectExternalPolicy forwards messageId and owner', async () => {
        const { g, calls } = make();
        await g.rejectExternalPolicy('m1', owner);
        assert.deepEqual(calls[0], [MessageAPI.REJECT_EXTERNAL_POLICY, { messageId: 'm1', owner }]);
    });

    it('groupExternalPolicyRequests forwards filters and owner', async () => {
        const { g, calls } = make();
        const filters = { full: true, pageIndex: 0, pageSize: 5 };
        await g.groupExternalPolicyRequests(filters, owner);
        assert.deepEqual(calls[0], [MessageAPI.GROUP_EXTERNAL_POLICY_REQUESTS, { filters, owner }]);
    });

    it('disconnectPolicy forwards messageId full owner', async () => {
        const { g, calls } = make();
        await g.disconnectPolicy('m1', true, owner);
        assert.deepEqual(calls[0], [MessageAPI.DISCONNECT_EXTERNAL_POLICY, { messageId: 'm1', full: true, owner }]);
    });

    it('deletePolicy forwards messageId and owner', async () => {
        const { g, calls } = make();
        await g.deletePolicy('m1', owner);
        assert.deepEqual(calls[0], [MessageAPI.DELETE_EXTERNAL_POLICY, { messageId: 'm1', owner }]);
    });
});
