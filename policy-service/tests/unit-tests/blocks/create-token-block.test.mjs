import { assert } from 'chai';
import { CreateTokenBlock } from '../../../dist/policy-engine/block-validators/blocks/create-token-block.js';

const completeFungibleTemplate = {
    tokenType: 'fungible',
    tokenName: 'My Token',
    tokenSymbol: 'MT',
    decimals: 2,
    enableAdmin: true,
    enableWipe: false,
    enableKYC: false,
    enableFreeze: false,
};

class FakeValidator {
    constructor(template) {
        this.errors = [];
        this._template = template;
    }
    addError(msg) { this.errors.push(msg); }
    async getArtifact() { return {}; }
    getErrorMessage(err) { return err?.message ?? String(err); }
    getTokenTemplate() { return this._template; }
}

const refWith = (overrides = {}) => ({
    options: { template: 'tpl-1', ...overrides },
    children: [],
});

describe('CreateTokenBlock.validate', () => {
    it('rejects missing template', async () => {
        const v = new FakeValidator(completeFungibleTemplate);
        await CreateTokenBlock.validate(v, refWith({ template: '' }));
        assert.include(v.errors, 'Template can not be empty');
    });

    it('rejects autorun + defaultActive together', async () => {
        const v = new FakeValidator(completeFungibleTemplate);
        await CreateTokenBlock.validate(v, refWith({ autorun: true, defaultActive: true }));
        assert.include(v.errors, "Autorun can't be use with default active");
    });

    it('rejects unknown template id', async () => {
        const v = new FakeValidator(undefined);
        await CreateTokenBlock.validate(v, refWith());
        assert.include(v.errors, 'Token "tpl-1" does not exist');
    });

    it('passes a complete fungible template under autorun', async () => {
        const v = new FakeValidator(completeFungibleTemplate);
        await CreateTokenBlock.validate(v, refWith({ autorun: true }));
        assert.deepEqual(v.errors, []);
    });

    it('flags incomplete template fields under autorun', async () => {
        const v = new FakeValidator({ ...completeFungibleTemplate, tokenName: null });
        await CreateTokenBlock.validate(v, refWith({ autorun: true }));
        assert.include(v.errors, 'Autorun requires all fields to be filled in token template');
    });

    it('accepts non-autorun even with sparse template', async () => {
        const v = new FakeValidator({ tokenType: null });
        await CreateTokenBlock.validate(v, refWith());
        assert.deepEqual(v.errors, []);
    });
});
