import { assert } from 'chai';
import { TokenOperationAddon } from '../../../dist/policy-engine/block-validators/blocks/impact-addon.js';

class FakeValidator {
    constructor() { this.errors = []; }
    addError(msg) { this.errors.push(msg); }
    async getArtifact() { return {}; }
    getErrorMessage(err) { return err?.message ?? String(err); }
    checkBlockError(err) { if (err) this.errors.push(err); }
}

const ref = (options) => ({ options, children: [] });

describe('@unit TokenOperationAddon (impactAddon).validate', () => {
    it('blockType is "impactAddon"', () => {
        assert.equal(TokenOperationAddon.blockType, 'impactAddon');
    });

    it('passes when both options are valid', async () => {
        const v = new FakeValidator();
        await TokenOperationAddon.validate(v, ref({ amount: '10', impactType: 'Primary Impacts' }));
        assert.deepEqual(v.errors, []);
    });

    it('passes for "Secondary Impacts" too', async () => {
        const v = new FakeValidator();
        await TokenOperationAddon.validate(v, ref({ amount: '5', impactType: 'Secondary Impacts' }));
        assert.deepEqual(v.errors, []);
    });

    it('flags missing amount', async () => {
        const v = new FakeValidator();
        await TokenOperationAddon.validate(v, ref({ impactType: 'Primary Impacts' }));
        assert.equal(v.errors.some((e) => /amount/i.test(e)), true);
    });

    it('flags non-string amount', async () => {
        const v = new FakeValidator();
        await TokenOperationAddon.validate(v, ref({ amount: 42, impactType: 'Primary Impacts' }));
        assert.equal(v.errors.some((e) => /amount/i.test(e)), true);
    });

    it('flags missing impactType', async () => {
        const v = new FakeValidator();
        await TokenOperationAddon.validate(v, ref({ amount: '1' }));
        assert.equal(v.errors.some((e) => /impactType/i.test(e)), true);
    });

    it('flags impactType outside the allowed set', async () => {
        const v = new FakeValidator();
        await TokenOperationAddon.validate(v, ref({ amount: '1', impactType: 'Tertiary Impacts' }));
        assert.equal(v.errors.some((e) => /impactType/i.test(e)), true);
    });

    it('captures unhandled exception from getArtifact', async () => {
        const v = new FakeValidator();
        v.getArtifact = async () => { throw new Error('artifact-store-down'); };
        await TokenOperationAddon.validate(v, {
            options: { amount: '1', impactType: 'Primary Impacts', artifacts: [{ uuid: 'a-1' }] },
            children: [],
        });
        assert.equal(
            v.errors.some((e) => /artifact-store-down/.test(e) || /a-1/.test(e)),
            true,
        );
    });
});
