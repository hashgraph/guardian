import { assert } from 'chai';
import { TokenType } from '@guardian/interfaces';
import { CreateTokenBlock } from '../../../dist/policy-engine/block-validators/blocks/create-token-block.js';

class FakeValidator {
    constructor(opts = {}) {
        this.errors = [];
        this._template = opts.template ?? undefined;
        this._throw = !!opts.throwGetArtifact;
    }
    addError(msg) { this.errors.push(msg); }
    getErrorMessage(err) { return err?.message ?? String(err); }
    async getArtifact() { if (this._throw) { throw new Error('artifact-down'); } return {}; }
    getTokenTemplate() { return this._template; }
}

const completeTemplate = (o = {}) => ({
    tokenType: TokenType.NON_FUNGIBLE,
    tokenName: 'Name',
    tokenSymbol: 'SYM',
    enableAdmin: true,
    enableWipe: false,
    enableKYC: true,
    enableFreeze: true,
    ...o,
});

const ref = (o = {}) => ({ options: { template: 'tpl', ...o }, children: [] });

describe('@unit P0 CreateTokenBlock._isEmpty', () => {
    it('true for null', () => { assert.isTrue(CreateTokenBlock._isEmpty(null)); });
    it('true for undefined', () => { assert.isTrue(CreateTokenBlock._isEmpty(undefined)); });
    it('false for 0', () => { assert.isFalse(CreateTokenBlock._isEmpty(0)); });
    it('false for empty string', () => { assert.isFalse(CreateTokenBlock._isEmpty('')); });
    it('false for false', () => { assert.isFalse(CreateTokenBlock._isEmpty(false)); });
    it('false for a string value', () => { assert.isFalse(CreateTokenBlock._isEmpty('x')); });
    it('false for an object', () => { assert.isFalse(CreateTokenBlock._isEmpty({})); });
});

describe('@unit P0 CreateTokenBlock.validate', () => {
    it('blockType is createTokenBlock', () => {
        assert.equal(CreateTokenBlock.blockType, 'createTokenBlock');
    });

    it('rejects empty template option', async () => {
        const v = new FakeValidator({ template: completeTemplate() });
        await CreateTokenBlock.validate(v, ref({ template: '' }));
        assert.include(v.errors, 'Template can not be empty');
    });

    it('rejects autorun combined with defaultActive', async () => {
        const v = new FakeValidator({ template: completeTemplate() });
        await CreateTokenBlock.validate(v, ref({ autorun: true, defaultActive: true }));
        assert.include(v.errors, `Autorun can't be use with default active`);
    });

    it('reports missing token template and returns early', async () => {
        const v = new FakeValidator({ template: undefined });
        await CreateTokenBlock.validate(v, ref({}));
        assert.include(v.errors, 'Token "tpl" does not exist');
    });

    it('passes for a present template without autorun', async () => {
        const v = new FakeValidator({ template: completeTemplate() });
        await CreateTokenBlock.validate(v, ref({}));
        assert.deepEqual(v.errors, []);
    });

    it('passes autorun with a fully populated non-fungible template', async () => {
        const v = new FakeValidator({ template: completeTemplate() });
        await CreateTokenBlock.validate(v, ref({ autorun: true }));
        assert.deepEqual(v.errors, []);
    });

    it('autorun flags missing tokenType', async () => {
        const v = new FakeValidator({ template: completeTemplate({ tokenType: null }) });
        await CreateTokenBlock.validate(v, ref({ autorun: true }));
        assert.include(v.errors, 'Autorun requires all fields to be filled in token template');
    });

    it('autorun fungible flags missing decimals', async () => {
        const v = new FakeValidator({ template: completeTemplate({ tokenType: TokenType.FUNGIBLE, decimals: null }) });
        await CreateTokenBlock.validate(v, ref({ autorun: true }));
        assert.include(v.errors, 'Autorun requires all fields to be filled in token template');
    });

    it('autorun fungible passes with decimals present', async () => {
        const v = new FakeValidator({ template: completeTemplate({ tokenType: TokenType.FUNGIBLE, decimals: 2 }) });
        await CreateTokenBlock.validate(v, ref({ autorun: true }));
        assert.deepEqual(v.errors, []);
    });

    it('autorun flags missing tokenName', async () => {
        const v = new FakeValidator({ template: completeTemplate({ tokenName: null }) });
        await CreateTokenBlock.validate(v, ref({ autorun: true }));
        assert.include(v.errors, 'Autorun requires all fields to be filled in token template');
    });

    it('autorun flags missing tokenSymbol', async () => {
        const v = new FakeValidator({ template: completeTemplate({ tokenSymbol: undefined }) });
        await CreateTokenBlock.validate(v, ref({ autorun: true }));
        assert.include(v.errors, 'Autorun requires all fields to be filled in token template');
    });

    it('autorun flags missing enableAdmin', async () => {
        const v = new FakeValidator({ template: completeTemplate({ enableAdmin: null }) });
        await CreateTokenBlock.validate(v, ref({ autorun: true }));
        assert.include(v.errors, 'Autorun requires all fields to be filled in token template');
    });

    it('autorun flags missing enableWipe', async () => {
        const v = new FakeValidator({ template: completeTemplate({ enableWipe: undefined }) });
        await CreateTokenBlock.validate(v, ref({ autorun: true }));
        assert.include(v.errors, 'Autorun requires all fields to be filled in token template');
    });

    it('autorun flags missing enableKYC', async () => {
        const v = new FakeValidator({ template: completeTemplate({ enableKYC: null }) });
        await CreateTokenBlock.validate(v, ref({ autorun: true }));
        assert.include(v.errors, 'Autorun requires all fields to be filled in token template');
    });

    it('autorun flags missing enableFreeze', async () => {
        const v = new FakeValidator({ template: completeTemplate({ enableFreeze: undefined }) });
        await CreateTokenBlock.validate(v, ref({ autorun: true }));
        assert.include(v.errors, 'Autorun requires all fields to be filled in token template');
    });

    it('autorun with enableWipe true but null wipeContractId flags missing field', async () => {
        const v = new FakeValidator({ template: completeTemplate({ enableWipe: true, wipeContractId: null }) });
        await CreateTokenBlock.validate(v, ref({ autorun: true }));
        assert.include(v.errors, 'Autorun requires all fields to be filled in token template');
    });

    it('autorun with enableWipe true and empty-string wipeContractId is allowed', async () => {
        const v = new FakeValidator({ template: completeTemplate({ enableWipe: true, wipeContractId: '' }) });
        await CreateTokenBlock.validate(v, ref({ autorun: true }));
        assert.deepEqual(v.errors, []);
    });

    it('autorun with enableWipe true and a real wipeContractId passes', async () => {
        const v = new FakeValidator({ template: completeTemplate({ enableWipe: true, wipeContractId: '0.0.5' }) });
        await CreateTokenBlock.validate(v, ref({ autorun: true }));
        assert.deepEqual(v.errors, []);
    });

    it('non-autorun ignores incomplete template fields', async () => {
        const v = new FakeValidator({ template: completeTemplate({ tokenName: null, tokenSymbol: null }) });
        await CreateTokenBlock.validate(v, ref({ autorun: false }));
        assert.deepEqual(v.errors, []);
    });

    it('captures unhandled exception path', async () => {
        const v = new FakeValidator({ template: completeTemplate(), throwGetArtifact: true });
        await CreateTokenBlock.validate(v, ref({ artifacts: [{ uuid: 'a' }] }));
        assert.equal(v.errors.some((e) => /artifact-down/.test(e)), true);
    });
});
