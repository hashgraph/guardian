import { assert } from 'chai';
import { CustomLogicBlock } from '../../../dist/policy-engine/block-validators/blocks/custom-logic-block.js';

class FakeValidator {
    constructor(opts = {}) {
        this.errors = [];
        this._artifacts = opts.artifacts || {};
        this._throwOnArtifact = !!opts.throwOnArtifact;
    }
    addError(msg) { this.errors.push(msg); }
    async getArtifact(uuid) {
        if (this._throwOnArtifact) {
            throw new Error('artifact store unavailable');
        }
        return this._artifacts[uuid] ?? null;
    }
    getErrorMessage(err) { return err?.message ?? String(err); }
}

const refWith = (overrides = {}) => ({ options: { ...overrides }, children: [] });

describe('CustomLogicBlock.validate (block-validator)', () => {
    it('exposes the customLogicBlock block type', () => {
        assert.equal(CustomLogicBlock.blockType, 'customLogicBlock');
    });

    it('produces no errors when options carry no artifacts', async () => {
        const v = new FakeValidator();
        await CustomLogicBlock.validate(v, refWith());
        assert.deepEqual(v.errors, []);
    });

    it('produces no errors when every artifact resolves to a file', async () => {
        const v = new FakeValidator({ artifacts: { 'art-1': 'code', 'art-2': '{}' } });
        await CustomLogicBlock.validate(
            v,
            refWith({ artifacts: [{ uuid: 'art-1' }, { uuid: 'art-2' }] }),
        );
        assert.deepEqual(v.errors, []);
    });

    it('errors when an artifact entry is missing', async () => {
        const v = new FakeValidator();
        await CustomLogicBlock.validate(v, refWith({ artifacts: [null] }));
        assert.deepEqual(v.errors, ['Artifact does not exist']);
    });

    it('errors when a referenced artifact is not in the store', async () => {
        const v = new FakeValidator({ artifacts: {} });
        await CustomLogicBlock.validate(v, refWith({ artifacts: [{ uuid: 'missing-uuid' }] }));
        assert.deepEqual(v.errors, ['Artifact with id "missing-uuid" does not exist']);
    });

    it('wraps a thrown error as an "Unhandled exception" instead of propagating', async () => {
        const v = new FakeValidator({ throwOnArtifact: true });
        await CustomLogicBlock.validate(v, refWith({ artifacts: [{ uuid: 'art-1' }] }));
        assert.deepEqual(v.errors, ['Unhandled exception artifact store unavailable']);
    });
});
