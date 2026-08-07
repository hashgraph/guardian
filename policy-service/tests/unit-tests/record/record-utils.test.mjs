import { assert } from 'chai';
import esmock from 'esmock';

let currentComponents = null;

const { RecordUtils } = await esmock.strict(
    '../../../dist/policy-engine/record-utils.js',
    {
        '../../../dist/policy-engine/policy-components-utils.js': {
            PolicyComponentsUtils: {
                GetPolicyComponents: () => currentComponents,
            },
        },
    },
);

function setComponents(c) {
    currentComponents = c;
}

describe('@unit RecordUtils (no components)', () => {
    beforeEach(() => setComponents(null));

    it('GetRecordingController returns null', () => {
        assert.equal(RecordUtils.GetRecordingController('p'), null);
    });

    it('GetRunAndRecordController returns null', () => {
        assert.equal(RecordUtils.GetRunAndRecordController('p'), null);
    });

    it('StartRecording returns false', async () => {
        assert.equal(await RecordUtils.StartRecording('p'), false);
    });

    it('StopRecording returns false', async () => {
        assert.equal(await RecordUtils.StopRecording('p'), false);
    });

    it('StopRunning returns true', async () => {
        assert.equal(await RecordUtils.StopRunning('p'), true);
    });

    it('DestroyRecording returns false', async () => {
        assert.equal(await RecordUtils.DestroyRecording('p'), false);
    });

    it('DestroyRunning returns true', async () => {
        assert.equal(await RecordUtils.DestroyRunning('p'), true);
    });

    it('FastForward returns false', async () => {
        assert.equal(await RecordUtils.FastForward('p', {}), false);
    });

    it('RetryStep returns false', async () => {
        assert.equal(await RecordUtils.RetryStep('p', {}), false);
    });

    it('SkipStep returns false', async () => {
        assert.equal(await RecordUtils.SkipStep('p', {}), false);
    });

    it('RunRecord returns null', async () => {
        assert.equal(await RecordUtils.RunRecord('p', [], [], {}), null);
    });

    it('GetRecordStatus returns { policyId } when no controller', () => {
        assert.deepEqual(RecordUtils.GetRecordStatus('p'), { policyId: 'p' });
    });

    it('GetRecordedActions returns null when no controller', async () => {
        assert.equal(await RecordUtils.GetRecordedActions('p'), null);
    });

    it('GetRecordResults returns null when no controller', async () => {
        assert.equal(await RecordUtils.GetRecordResults('p'), null);
    });

    it('RecordSelectGroup is a no-op when no recording controller', async () => {
        assert.equal(await RecordUtils.RecordSelectGroup('p', {}, 'u'), undefined);
    });

    it('RecordSetBlockData is a no-op when no recording controller', async () => {
        assert.equal(await RecordUtils.RecordSetBlockData('p', {}, {}, {}), undefined);
    });

    it('RecordExternalData is a no-op when no recording controller', async () => {
        assert.equal(await RecordUtils.RecordExternalData('p', {}), undefined);
    });

    it('RecordCreateUser is a no-op when no recording controller', async () => {
        assert.equal(await RecordUtils.RecordCreateUser('p', 'did', {}), undefined);
    });

    it('RecordSetUser is a no-op when no recording controller', async () => {
        assert.equal(await RecordUtils.RecordSetUser('p', 'did'), undefined);
    });
});

describe('@unit RecordUtils (with components)', () => {
    it('GetRecordingController returns the components recordingController', () => {
        const ctrl = { id: 'rec' };
        setComponents({ recordingController: ctrl });
        assert.strictEqual(RecordUtils.GetRecordingController('p'), ctrl);
    });

    it('GetRunAndRecordController returns the runAndRecordController', () => {
        const ctrl = { id: 'rar' };
        setComponents({ runAndRecordController: ctrl });
        assert.strictEqual(RecordUtils.GetRunAndRecordController('p'), ctrl);
    });

    it('StartRecording delegates to components.startRecording', async () => {
        setComponents({ startRecording: async () => true });
        assert.equal(await RecordUtils.StartRecording('p'), true);
    });

    it('StopRecording delegates to components.stopRecording', async () => {
        setComponents({ stopRecording: async () => true });
        assert.equal(await RecordUtils.StopRecording('p'), true);
    });

    it('StopRunning delegates to components.stopRunning', async () => {
        setComponents({ stopRunning: async () => false });
        assert.equal(await RecordUtils.StopRunning('p'), false);
    });

    it('DestroyRecording delegates to components.destroyRecording', async () => {
        setComponents({ destroyRecording: async () => true });
        assert.equal(await RecordUtils.DestroyRecording('p'), true);
    });

    it('FastForward delegates with options', async () => {
        let received;
        setComponents({ fastForward: async (opts) => { received = opts; return true; } });
        assert.equal(await RecordUtils.FastForward('p', { a: 1 }), true);
        assert.deepEqual(received, { a: 1 });
    });

    it('RetryStep delegates to components.retryStep', async () => {
        setComponents({ retryStep: async () => true });
        assert.equal(await RecordUtils.RetryStep('p', {}), true);
    });

    it('SkipStep delegates to components.skipStep', async () => {
        setComponents({ skipStep: async () => true });
        assert.equal(await RecordUtils.SkipStep('p', {}), true);
    });

    it('RunRecord delegates actions/results/options', async () => {
        let args;
        setComponents({ runRecord: async (a, r, o) => { args = [a, r, o]; return 'started'; } });
        const out = await RecordUtils.RunRecord('p', [1], [2], { x: 1 });
        assert.equal(out, 'started');
        assert.deepEqual(args, [[1], [2], { x: 1 }]);
    });

    it('GetRecordStatus returns controller.getStatus()', () => {
        setComponents({ runAndRecordController: { getStatus: () => ({ s: 'ok' }) } });
        assert.deepEqual(RecordUtils.GetRecordStatus('p'), { s: 'ok' });
    });

    it('GetRecordedActions returns controller.getActions()', async () => {
        setComponents({ runAndRecordController: { getActions: async () => [1, 2] } });
        assert.deepEqual(await RecordUtils.GetRecordedActions('p'), [1, 2]);
    });

    it('GetRecordResults returns controller.getResults()', async () => {
        setComponents({ runAndRecordController: { getResults: async () => ['r'] } });
        assert.deepEqual(await RecordUtils.GetRecordResults('p'), ['r']);
    });

    it('RecordSelectGroup forwards user and uuid', async () => {
        let args;
        setComponents({ recordingController: { selectGroup: async (u, id) => { args = [u, id]; } } });
        await RecordUtils.RecordSelectGroup('p', { did: 'd' }, 'uuid-1');
        assert.deepEqual(args, [{ did: 'd' }, 'uuid-1']);
    });

    it('RecordSetBlockData forwards all params', async () => {
        let args;
        setComponents({ recordingController: { setBlockData: async (...a) => { args = a; } } });
        await RecordUtils.RecordSetBlockData('p', { did: 'd' }, { tag: 'b' }, { v: 1 }, 'aid', 123);
        assert.deepEqual(args, [{ did: 'd' }, { tag: 'b' }, { v: 1 }, 'aid', 123]);
    });

    it('RecordExternalData forwards data', async () => {
        let args;
        setComponents({ recordingController: { externalData: async (...a) => { args = a; } } });
        await RecordUtils.RecordExternalData('p', { d: 1 }, 'aid', 5);
        assert.deepEqual(args, [{ d: 1 }, 'aid', 5]);
    });

    it('RecordCreateUser forwards did and data', async () => {
        let args;
        setComponents({ recordingController: { createUser: async (...a) => { args = a; } } });
        await RecordUtils.RecordCreateUser('p', 'did:x', { name: 'n' });
        assert.deepEqual(args, ['did:x', { name: 'n' }]);
    });

    it('RecordSetUser forwards did', async () => {
        let args;
        setComponents({ recordingController: { setUser: async (...a) => { args = a; } } });
        await RecordUtils.RecordSetUser('p', 'did:y');
        assert.deepEqual(args, ['did:y']);
    });
});
