import { assert } from 'chai';
import { SendToGuardianBlock } from '../../../dist/policy-engine/block-validators/blocks/send-to-guardian-block.js';

class FakeValidator {
    constructor(opts = {}) {
        this.errors = [];
        this._topicMissing = !!opts.topicMissing;
    }
    addError(msg) { this.errors.push(msg); }
    async getArtifact() { return {}; }
    getErrorMessage(err) { return err?.message ?? String(err); }
    topicTemplateNotExist() { return this._topicMissing; }
}

const refWith = (overrides = {}) => ({ options: { ...overrides }, children: [] });

describe('SendToGuardianBlock.validate', () => {
    it('accepts every supported dataType', async () => {
        for (const dt of ['vc-documents', 'did-documents', 'approve', 'hedera']) {
            const v = new FakeValidator();
            await SendToGuardianBlock.validate(v, refWith({ dataType: dt }));
            assert.deepEqual(v.errors, []);
        }
    });

    it('rejects unknown dataType', async () => {
        const v = new FakeValidator();
        await SendToGuardianBlock.validate(v, refWith({ dataType: 'mystery' }));
        assert.match(v.errors[0], /^Option "dataType" must be one of /);
    });

    it("returns silently for dataSource 'auto' and 'database' and missing source", async () => {
        for (const source of ['auto', 'database', undefined]) {
            const v = new FakeValidator();
            await SendToGuardianBlock.validate(v, refWith({ dataSource: source }));
            assert.deepEqual(v.errors, []);
        }
    });

    it('accepts hedera dataSource with topic=root (no template lookup)', async () => {
        const v = new FakeValidator({ topicMissing: true });
        await SendToGuardianBlock.validate(v, refWith({ dataSource: 'hedera', topic: 'root' }));
        assert.deepEqual(v.errors, []);
    });

    it('rejects hedera dataSource with unknown topic template', async () => {
        const v = new FakeValidator({ topicMissing: true });
        await SendToGuardianBlock.validate(v, refWith({ dataSource: 'hedera', topic: 'tpl-1' }));
        assert.include(v.errors, 'Topic "tpl-1" does not exist');
    });

    it('rejects unknown dataSource value', async () => {
        const v = new FakeValidator();
        await SendToGuardianBlock.validate(v, refWith({ dataSource: 'something-else' }));
        assert.include(v.errors, 'Option "dataSource" must be one of auto|database|hedera');
    });
});
