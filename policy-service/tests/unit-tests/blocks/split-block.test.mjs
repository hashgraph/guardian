import { assert } from 'chai';
import { SplitBlock } from '../../../dist/policy-engine/block-validators/blocks/split-block.js';

class FakeValidator {
    constructor() { this.errors = []; }
    addError(msg) { this.errors.push(msg); }
    async getArtifact() { return {}; }
    getErrorMessage(err) { return err?.message ?? String(err); }
}

const refWith = (opts = {}) => ({ options: opts });

describe('SplitBlock.validate', () => {
    it('exposes blockType "splitBlock"', () => {
        assert.equal(SplitBlock.blockType, 'splitBlock');
    });

    it('rejects when threshold is missing', async () => {
        const v = new FakeValidator();
        await SplitBlock.validate(v, refWith({}));
        assert.include(v.errors, 'Option "threshold" is not set');
    });

    it('rejects when threshold is empty string', async () => {
        const v = new FakeValidator();
        await SplitBlock.validate(v, refWith({ threshold: '' }));
        assert.include(v.errors, 'Option "threshold" is not set');
    });

    it('passes for a numeric-string threshold', async () => {
        const v = new FakeValidator();
        await SplitBlock.validate(v, refWith({ threshold: '10' }));
        assert.deepEqual(v.errors, []);
    });

    it('passes for a number threshold (parseFloat does not throw)', async () => {
        const v = new FakeValidator();
        await SplitBlock.validate(v, refWith({ threshold: 10 }));
        assert.deepEqual(v.errors, []);
    });
});
