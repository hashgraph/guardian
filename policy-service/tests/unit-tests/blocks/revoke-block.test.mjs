import { assert } from 'chai';
import { RevokeBlock } from '../../../dist/policy-engine/block-validators/blocks/revoke-block.js';

class FakeValidator {
    constructor() { this.errors = []; }
    addError(msg) { this.errors.push(msg); }
    async getArtifact() { return {}; }
    getErrorMessage(err) { return err?.message ?? String(err); }
}

const refWith = (uiMetaData) => ({ options: uiMetaData === undefined ? {} : { uiMetaData } });

describe('RevokeBlock.validate', () => {
    it('exposes blockType "revokeBlock"', () => {
        assert.equal(RevokeBlock.blockType, 'revokeBlock');
    });

    it('rejects when uiMetaData is missing', async () => {
        const v = new FakeValidator();
        await RevokeBlock.validate(v, refWith(undefined));
        assert.include(v.errors, 'Option "uiMetaData" is not set');
    });

    it('rejects when uiMetaData is not an object', async () => {
        const v = new FakeValidator();
        await RevokeBlock.validate(v, refWith('string-not-object'));
        assert.include(v.errors, 'Option "uiMetaData" is not set');
    });

    it('rejects when updatePrevDoc is enabled but prevDocStatus is empty', async () => {
        const v = new FakeValidator();
        await RevokeBlock.validate(v, refWith({ updatePrevDoc: true }));
        assert.include(v.errors, 'Option "Status Value" is not set');
    });

    it('passes when uiMetaData is a valid object without updatePrevDoc', async () => {
        const v = new FakeValidator();
        await RevokeBlock.validate(v, refWith({}));
        assert.deepEqual(v.errors, []);
    });

    it('passes when updatePrevDoc=true and prevDocStatus is set', async () => {
        const v = new FakeValidator();
        await RevokeBlock.validate(v, refWith({ updatePrevDoc: true, prevDocStatus: 'REVOKED' }));
        assert.deepEqual(v.errors, []);
    });
});
