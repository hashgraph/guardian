import { assert } from 'chai';
import '../../../dist/policy-engine/block-validators/index.js';
import { TokenOperationAddon } from '../../../dist/policy-engine/block-validators/blocks/impact-addon.js';

class FakeValidator {
    constructor(opts = {}) {
        this.errors = [];
        this._throw = !!opts.throwGetArtifact;
    }
    addError(msg) { this.errors.push(msg); }
    getErrorMessage(err) { return err?.message ?? String(err); }
    async getArtifact() { if (this._throw) { throw new Error('artifact-down'); } return {}; }
    checkBlockError(err) { if (err) { this.errors.push(err); } }
}

const ref = (options) => ({ options, children: [] });

describe('@unit P0 TokenOperationAddon (impactAddon) extra', () => {
    it('blockType is impactAddon', () => {
        assert.equal(TokenOperationAddon.blockType, 'impactAddon');
    });

    it('passes Primary Impacts with a string amount', async () => {
        const v = new FakeValidator();
        await TokenOperationAddon.validate(v, ref({ amount: '12', impactType: 'Primary Impacts' }));
        assert.deepEqual(v.errors, []);
    });

    it('passes Secondary Impacts with a string amount', async () => {
        const v = new FakeValidator();
        await TokenOperationAddon.validate(v, ref({ amount: '0.5', impactType: 'Secondary Impacts' }));
        assert.deepEqual(v.errors, []);
    });

    it('flags missing amount (not set)', async () => {
        const v = new FakeValidator();
        await TokenOperationAddon.validate(v, ref({ impactType: 'Primary Impacts' }));
        assert.include(v.errors, 'Option "amount" is not set');
    });

    it('flags empty-string amount as not set', async () => {
        const v = new FakeValidator();
        await TokenOperationAddon.validate(v, ref({ amount: '', impactType: 'Primary Impacts' }));
        assert.include(v.errors, 'Option "amount" is not set');
    });

    it('flags numeric amount as wrong type', async () => {
        const v = new FakeValidator();
        await TokenOperationAddon.validate(v, ref({ amount: 10, impactType: 'Primary Impacts' }));
        assert.include(v.errors, 'Option "amount" must be a string');
    });

    it('flags missing impactType', async () => {
        const v = new FakeValidator();
        await TokenOperationAddon.validate(v, ref({ amount: '1' }));
        assert.include(v.errors, 'Option "impactType" must be one of [Primary Impacts, Secondary Impacts]');
    });

    it('flags impactType outside the allowed set', async () => {
        const v = new FakeValidator();
        await TokenOperationAddon.validate(v, ref({ amount: '1', impactType: 'Tertiary' }));
        assert.include(v.errors, 'Option "impactType" must be one of [Primary Impacts, Secondary Impacts]');
    });

    it('reports both amount and impactType issues together', async () => {
        const v = new FakeValidator();
        await TokenOperationAddon.validate(v, ref({}));
        assert.equal(v.errors.length, 2);
    });

    it('captures unhandled exception from artifact lookup', async () => {
        const v = new FakeValidator({ throwGetArtifact: true });
        await TokenOperationAddon.validate(v, ref({ amount: '1', impactType: 'Primary Impacts', artifacts: [{ uuid: 'a' }] }));
        assert.equal(v.errors.some((e) => /artifact-down/.test(e)), true);
    });
});
