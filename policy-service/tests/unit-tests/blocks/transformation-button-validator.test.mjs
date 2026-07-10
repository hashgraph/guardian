import { assert } from 'chai';
import { TransformationButtonBlock } from '../../../dist/policy-engine/block-validators/blocks/transformation-button-block.js';

class FakeValidator {
    constructor() { this.errors = []; }
    addError(msg) { this.errors.push(msg); }
    async getArtifact() { return {}; }
    getErrorMessage(err) { return err?.message ?? String(err); }
}

describe('TransformationButtonBlock.validate', () => {
    it('exposes blockType "transformationButtonBlock"', () => {
        assert.equal(TransformationButtonBlock.blockType, 'transformationButtonBlock');
    });

    it('rejects missing url', async () => {
        const v = new FakeValidator();
        await TransformationButtonBlock.validate(v, { options: {} });
        assert.include(v.errors, 'Option "url" is not set');
    });

    it('rejects malformed url', async () => {
        const v = new FakeValidator();
        await TransformationButtonBlock.validate(v, { options: { url: 'not a url' } });
        assert.include(v.errors, '"Url" is not valid');
    });

    it('passes for a valid http url', async () => {
        const v = new FakeValidator();
        await TransformationButtonBlock.validate(v, { options: { url: 'https://example.com/x' } });
        assert.deepEqual(v.errors, []);
    });

    it('isValidUrl accepts proper URLs and rejects garbage', () => {
        assert.equal(TransformationButtonBlock.isValidUrl('https://x'), true);
        assert.equal(TransformationButtonBlock.isValidUrl('ipfs://bafy...'), true);
        assert.equal(TransformationButtonBlock.isValidUrl(''), false);
        assert.equal(TransformationButtonBlock.isValidUrl('not a url'), false);
    });
});
