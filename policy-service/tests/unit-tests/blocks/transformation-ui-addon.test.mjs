import { assert } from 'chai';
import { TransformationUIAddon } from '../../../dist/policy-engine/block-validators/blocks/transformation-ui-addon.js';

class FakeValidator {
    constructor() { this.errors = []; }
    addError(msg) { this.errors.push(msg); }
    async getArtifact() { return {}; }
    getErrorMessage(err) { return err?.message ?? String(err); }
}

describe('TransformationUIAddon.validate', () => {
    it('exposes blockType "transformationUIAddon"', () => {
        assert.equal(TransformationUIAddon.blockType, 'transformationUIAddon');
    });

    it('rejects empty expression', async () => {
        const v = new FakeValidator();
        await TransformationUIAddon.validate(v, { options: {} });
        assert.include(v.errors, 'Expression can not be empty');
    });

    it('passes when expression is non-empty', async () => {
        const v = new FakeValidator();
        await TransformationUIAddon.validate(v, { options: { expression: 'x + 1' } });
        assert.deepEqual(v.errors, []);
    });
});
