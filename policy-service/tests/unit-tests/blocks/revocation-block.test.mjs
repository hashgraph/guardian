import { assert } from 'chai';
import { RevocationBlock } from '../../../dist/policy-engine/block-validators/blocks/revocation-block.js';

class FakeValidator {
    constructor() { this.errors = []; }
    addError(msg) { this.errors.push(msg); }
    async getArtifact() { return {}; }
    getErrorMessage(err) { return err?.message ?? String(err); }
}

const refWith = (options = {}) => ({ options });

describe('RevocationBlock.validate', () => {
    it('exposes blockType "revocationBlock"', () => {
        assert.equal(RevocationBlock.blockType, 'revocationBlock');
    });

    it('passes for an empty options object', async () => {
        const v = new FakeValidator();
        await RevocationBlock.validate(v, refWith({}));
        assert.deepEqual(v.errors, []);
    });

    it('rejects when updatePrevDoc=true but prevDocStatus is not set', async () => {
        const v = new FakeValidator();
        await RevocationBlock.validate(v, refWith({ updatePrevDoc: true }));
        assert.include(v.errors, 'Option "Status Value" is not set');
    });

    it('passes when updatePrevDoc=true and prevDocStatus is set', async () => {
        const v = new FakeValidator();
        await RevocationBlock.validate(v, refWith({ updatePrevDoc: true, prevDocStatus: 'NEW' }));
        assert.deepEqual(v.errors, []);
    });

    it('passes when updatePrevDoc=false (no prevDocStatus required)', async () => {
        const v = new FakeValidator();
        await RevocationBlock.validate(v, refWith({ updatePrevDoc: false }));
        assert.deepEqual(v.errors, []);
    });
});
