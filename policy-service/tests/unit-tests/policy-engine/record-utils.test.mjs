import { assert } from 'chai';
import { RecordUtils } from '../../../dist/policy-engine/record-utils.js';

const unknownId = () => 'no-such-policy-' + Math.random().toString(36).slice(2);

describe('RecordUtils (no registered components)', () => {
    it('GetRecordingController returns null', () => {
        assert.isNull(RecordUtils.GetRecordingController(unknownId()));
    });

    it('GetRunAndRecordController returns null', () => {
        assert.isNull(RecordUtils.GetRunAndRecordController(unknownId()));
    });

    it('StartRecording returns false', async () => {
        assert.isFalse(await RecordUtils.StartRecording(unknownId()));
    });

    it('StopRecording returns false', async () => {
        assert.isFalse(await RecordUtils.StopRecording(unknownId()));
    });

    it('StopRunning returns true', async () => {
        assert.isTrue(await RecordUtils.StopRunning(unknownId()));
    });

    it('DestroyRecording returns false', async () => {
        assert.isFalse(await RecordUtils.DestroyRecording(unknownId()));
    });

    it('DestroyRunning returns true', async () => {
        assert.isTrue(await RecordUtils.DestroyRunning(unknownId()));
    });

    it('FastForward returns false', async () => {
        assert.isFalse(await RecordUtils.FastForward(unknownId(), {}));
    });

    it('RetryStep returns false', async () => {
        assert.isFalse(await RecordUtils.RetryStep(unknownId(), {}));
    });

    it('SkipStep returns false', async () => {
        assert.isFalse(await RecordUtils.SkipStep(unknownId(), {}));
    });

    it('GetRecordStatus returns an object containing the policyId', () => {
        const id = unknownId();
        assert.deepEqual(RecordUtils.GetRecordStatus(id), { policyId: id });
    });

    it('GetRecordedActions returns null', async () => {
        assert.isNull(await RecordUtils.GetRecordedActions(unknownId()));
    });

    it('GetRecordResults returns null', async () => {
        assert.isNull(await RecordUtils.GetRecordResults(unknownId()));
    });

    it('RunRecord returns null', async () => {
        assert.isNull(await RecordUtils.RunRecord(unknownId(), [], [], {}));
    });

    it('RecordSelectGroup resolves without throwing', async () => {
        assert.equal(await RecordUtils.RecordSelectGroup(unknownId(), {}, 'uuid'), undefined);
    });

    it('RecordSetBlockData resolves without throwing', async () => {
        assert.equal(await RecordUtils.RecordSetBlockData(unknownId(), {}, {}, {}), undefined);
    });

    it('RecordExternalData resolves without throwing', async () => {
        assert.equal(await RecordUtils.RecordExternalData(unknownId(), {}), undefined);
    });

    it('RecordCreateUser resolves without throwing', async () => {
        assert.equal(await RecordUtils.RecordCreateUser(unknownId(), 'did', {}), undefined);
    });

    it('RecordSetUser resolves without throwing', async () => {
        assert.equal(await RecordUtils.RecordSetUser(unknownId(), 'did'), undefined);
    });
});
