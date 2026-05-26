import { assert } from 'chai';
import { ReassigningBlock } from '../../../dist/policy-engine/block-validators/blocks/reassigning.block.js';

class FakeValidator {
    constructor() { this.errors = []; }
    addError(msg) { this.errors.push(msg); }
    async getArtifact() { return {}; }
    getErrorMessage(err) { return err?.message ?? String(err); }
}

describe('ReassigningBlock.validate', () => {
    it('exposes blockType "reassigningBlock"', () => {
        assert.equal(ReassigningBlock.blockType, 'reassigningBlock');
    });

    it('passes for an empty options object', async () => {
        const v = new FakeValidator();
        await ReassigningBlock.validate(v, { options: {} });
        assert.deepEqual(v.errors, []);
    });

    it('reports CommonBlock artifact errors', async () => {
        const v = new FakeValidator();
        await ReassigningBlock.validate(v, { options: { artifacts: [null] } });
        assert.include(v.errors, 'Artifact does not exist');
    });
});
