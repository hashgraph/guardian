import { assert } from 'chai';
import esmock from 'esmock';

const { ComponentsService } = await esmock.strict(
    '../../../dist/policy-engine/helpers/components-service.js',
    {
        '@guardian/common': {
            DatabaseServer: class {},
            PinoLogger: class {},
            TopicConfig: class {},
            Users: class {},
            VcHelper: class {},
        },
        '@guardian/interfaces': {
            GenerateUUIDv4: () => 'uuid',
            PolicyHelper: { isDryRunMode: () => true },
            PolicyStatus: { PUBLISH: 'PUBLISH' },
            SchemaStatus: { VIEW: 'VIEW' },
        },
        '../../../dist/policy-engine/record/index.js': {
            Recording: class {},
            Running: class {},
        },
    },
);

function makeService() {
    return new ComponentsService({
        owner: 'did:owner',
        ownerId: 'owner-1',
        topicId: '0.0.1',
        status: 'DRY-RUN',
    }, 'policy-1');
}

describe('@unit ComponentsService recording boundary', () => {
    it('retains the controller while pausing and resuming', async () => {
        const service = makeService();
        const calls = [];
        const controller = {
            pause: async () => { calls.push('pause'); return true; },
            resume: async () => { calls.push('resume'); return true; },
        };
        service._recordingController = controller;
        assert.equal(await service.pauseRecording(), true);
        assert.strictEqual(service.recordingController, controller);
        assert.equal(await service.resumeRecording(), true);
        assert.strictEqual(service.recordingController, controller);
        assert.deepEqual(calls, ['pause', 'resume']);
    });

    it('removes the controller only on final stop', async () => {
        const service = makeService();
        const controller = { stop: async () => true };
        service._recordingController = controller;
        assert.equal(await service.stopRecording(), true);
        assert.equal(service.recordingController, null);
    });

    it('rejects pause and resume without a recording controller', async () => {
        const service = makeService();
        assert.equal(await service.pauseRecording(), false);
        assert.equal(await service.resumeRecording(), false);
    });
});
