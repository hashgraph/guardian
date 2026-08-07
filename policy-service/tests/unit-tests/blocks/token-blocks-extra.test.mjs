import { assert } from 'chai';
import { CreateTokenBlock } from '../../../dist/policy-engine/block-validators/blocks/create-token-block.js';
import { TokenActionBlock } from '../../../dist/policy-engine/block-validators/blocks/token-action-block.js';
import { TokenConfirmationBlock } from '../../../dist/policy-engine/block-validators/blocks/token-confirmation-block.js';

class FakeValidator {
    constructor(opts = {}) {
        this.errors = [];
        this._template = opts.template ?? null;
        this._templateMissing = !!opts.templateMissing;
        this._tokenMissing = !!opts.tokenMissing;
    }
    addError(msg) { this.errors.push(msg); }
    getTokenTemplate() { return this._template; }
    tokenTemplateNotExist() { return this._templateMissing; }
    async tokenNotExist() { return this._tokenMissing; }
    async getArtifact() { return {}; }
    getErrorMessage(err) { return err?.message ?? String(err); }
}

const fullTemplate = (overrides = {}) => ({
    tokenType: 'non-fungible',
    tokenName: 'n',
    tokenSymbol: 's',
    enableAdmin: true,
    enableWipe: false,
    enableKYC: true,
    enableFreeze: true,
    ...overrides,
});

describe('CreateTokenBlock.validate', () => {
    it('exposes the createTokenBlock block type', () => {
        assert.equal(CreateTokenBlock.blockType, 'createTokenBlock');
    });

    it('errors when template option is empty', async () => {
        const v = new FakeValidator();
        await CreateTokenBlock.validate(v, { options: {}, children: [] });
        assert.include(v.errors, 'Template can not be empty');
    });

    it('errors when template does not exist in registry', async () => {
        const v = new FakeValidator({ template: null });
        await CreateTokenBlock.validate(v, { options: { template: 'tpl' }, children: [] });
        assert.include(v.errors, 'Token "tpl" does not exist');
    });

    it('errors when autorun combined with defaultActive', async () => {
        const v = new FakeValidator({ template: fullTemplate() });
        await CreateTokenBlock.validate(v, { options: { template: 'tpl', autorun: true, defaultActive: true }, children: [] });
        assert.include(v.errors, `Autorun can't be use with default active`);
    });

    it('passes a complete non-fungible autorun template', async () => {
        const v = new FakeValidator({ template: fullTemplate() });
        await CreateTokenBlock.validate(v, { options: { template: 'tpl', autorun: true }, children: [] });
        assert.deepEqual(v.errors, []);
    });

    it('passes a complete fungible autorun template with decimals', async () => {
        const v = new FakeValidator({ template: fullTemplate({ tokenType: 'fungible', decimals: 2 }) });
        await CreateTokenBlock.validate(v, { options: { template: 'tpl', autorun: true }, children: [] });
        assert.deepEqual(v.errors, []);
    });

    it('errors when fungible autorun template is missing decimals', async () => {
        const v = new FakeValidator({ template: fullTemplate({ tokenType: 'fungible' }) });
        await CreateTokenBlock.validate(v, { options: { template: 'tpl', autorun: true }, children: [] });
        assert.include(v.errors, 'Autorun requires all fields to be filled in token template');
    });

    it('errors when autorun template is missing tokenType', async () => {
        const v = new FakeValidator({ template: fullTemplate({ tokenType: null }) });
        await CreateTokenBlock.validate(v, { options: { template: 'tpl', autorun: true }, children: [] });
        assert.include(v.errors, 'Autorun requires all fields to be filled in token template');
    });

    it('errors when autorun template is missing tokenName', async () => {
        const v = new FakeValidator({ template: fullTemplate({ tokenName: null }) });
        await CreateTokenBlock.validate(v, { options: { template: 'tpl', autorun: true }, children: [] });
        assert.include(v.errors, 'Autorun requires all fields to be filled in token template');
    });

    it('errors when autorun template is missing tokenSymbol', async () => {
        const v = new FakeValidator({ template: fullTemplate({ tokenSymbol: null }) });
        await CreateTokenBlock.validate(v, { options: { template: 'tpl', autorun: true }, children: [] });
        assert.include(v.errors, 'Autorun requires all fields to be filled in token template');
    });

    it('errors when autorun template is missing enableAdmin', async () => {
        const v = new FakeValidator({ template: fullTemplate({ enableAdmin: null }) });
        await CreateTokenBlock.validate(v, { options: { template: 'tpl', autorun: true }, children: [] });
        assert.include(v.errors, 'Autorun requires all fields to be filled in token template');
    });

    it('errors when autorun template is missing enableKYC', async () => {
        const v = new FakeValidator({ template: fullTemplate({ enableKYC: null }) });
        await CreateTokenBlock.validate(v, { options: { template: 'tpl', autorun: true }, children: [] });
        assert.include(v.errors, 'Autorun requires all fields to be filled in token template');
    });

    it('errors when autorun template is missing enableFreeze', async () => {
        const v = new FakeValidator({ template: fullTemplate({ enableFreeze: null }) });
        await CreateTokenBlock.validate(v, { options: { template: 'tpl', autorun: true }, children: [] });
        assert.include(v.errors, 'Autorun requires all fields to be filled in token template');
    });

    it('errors when enableWipe true but wipeContractId missing', async () => {
        const v = new FakeValidator({ template: fullTemplate({ enableWipe: true, wipeContractId: null }) });
        await CreateTokenBlock.validate(v, { options: { template: 'tpl', autorun: true }, children: [] });
        assert.include(v.errors, 'Autorun requires all fields to be filled in token template');
    });

    it('passes when enableWipe true and wipeContractId is empty string', async () => {
        const v = new FakeValidator({ template: fullTemplate({ enableWipe: true, wipeContractId: '' }) });
        await CreateTokenBlock.validate(v, { options: { template: 'tpl', autorun: true }, children: [] });
        assert.deepEqual(v.errors, []);
    });

    it('passes when enableWipe true and wipeContractId is provided', async () => {
        const v = new FakeValidator({ template: fullTemplate({ enableWipe: true, wipeContractId: '0.0.7' }) });
        await CreateTokenBlock.validate(v, { options: { template: 'tpl', autorun: true }, children: [] });
        assert.deepEqual(v.errors, []);
    });

    it('does not check template fields when autorun is off', async () => {
        const v = new FakeValidator({ template: fullTemplate({ tokenType: null, tokenName: null }) });
        await CreateTokenBlock.validate(v, { options: { template: 'tpl' }, children: [] });
        assert.deepEqual(v.errors, []);
    });
});

const actionRef = (overrides = {}) => ({
    options: { accountType: 'default', action: 'associate', ...overrides },
    children: [],
});

describe('TokenActionBlock.validate', () => {
    it('exposes the tokenActionBlock block type', () => {
        assert.equal(TokenActionBlock.blockType, 'tokenActionBlock');
    });

    it('passes a default associate config with tokenId', async () => {
        const v = new FakeValidator();
        await TokenActionBlock.validate(v, actionRef({ tokenId: '0.0.1' }));
        assert.deepEqual(v.errors, []);
    });

    it('rejects unknown accountType', async () => {
        const v = new FakeValidator();
        await TokenActionBlock.validate(v, actionRef({ accountType: 'nope', tokenId: '0.0.1' }));
        assert.include(v.errors, 'Option "accountType" must be one of default,custom');
    });

    it('allows associate/dissociate only for default account type', async () => {
        const v = new FakeValidator();
        await TokenActionBlock.validate(v, actionRef({ accountType: 'default', action: 'dissociate', tokenId: '0.0.1' }));
        assert.notInclude(v.errors.join('|'), 'Option "action" must be one of');
    });

    it('rejects associate for custom account type', async () => {
        const v = new FakeValidator();
        await TokenActionBlock.validate(v, actionRef({ accountType: 'custom', action: 'associate', accountId: '0.0.5', tokenId: '0.0.1' }));
        assert.include(v.errors, 'Option "action" must be one of freeze,unfreeze,grantKyc,revokeKyc');
    });

    it('accepts freeze for custom account type', async () => {
        const v = new FakeValidator();
        await TokenActionBlock.validate(v, actionRef({ accountType: 'custom', action: 'freeze', accountId: '0.0.5', tokenId: '0.0.1' }));
        assert.deepEqual(v.errors, []);
    });

    it('rejects an unknown action', async () => {
        const v = new FakeValidator();
        await TokenActionBlock.validate(v, actionRef({ action: 'explode', tokenId: '0.0.1' }));
        assert.include(v.errors, 'Option "action" must be one of associate,dissociate,freeze,unfreeze,grantKyc,revokeKyc');
    });

    it('rejects missing tokenId without template', async () => {
        const v = new FakeValidator();
        await TokenActionBlock.validate(v, actionRef({}));
        assert.include(v.errors, 'Option "tokenId" is not set');
    });

    it('rejects non-string tokenId', async () => {
        const v = new FakeValidator();
        await TokenActionBlock.validate(v, actionRef({ tokenId: 5 }));
        assert.include(v.errors, 'Option "tokenId" must be a string');
    });

    it('rejects unknown tokenId', async () => {
        const v = new FakeValidator({ tokenMissing: true });
        await TokenActionBlock.validate(v, actionRef({ tokenId: '0.0.9' }));
        assert.include(v.errors, 'Token with id 0.0.9 does not exist');
    });

    it('rejects missing template when useTemplate=true', async () => {
        const v = new FakeValidator();
        await TokenActionBlock.validate(v, actionRef({ useTemplate: true }));
        assert.include(v.errors, 'Option "template" is not set');
    });

    it('rejects unknown template when useTemplate=true', async () => {
        const v = new FakeValidator({ templateMissing: true });
        await TokenActionBlock.validate(v, actionRef({ useTemplate: true, template: 't1' }));
        assert.include(v.errors, 'Token "t1" does not exist');
    });

    it('rejects custom accountType without accountId', async () => {
        const v = new FakeValidator();
        await TokenActionBlock.validate(v, actionRef({ accountType: 'custom', action: 'freeze', tokenId: '0.0.1' }));
        assert.include(v.errors, 'Option "accountId" is not set');
    });
});

const confirmRef = (overrides = {}) => ({
    options: { accountType: 'default', action: 'associate', ...overrides },
    children: [],
});

describe('TokenConfirmationBlock.validate', () => {
    it('exposes the tokenConfirmationBlock block type', () => {
        assert.equal(TokenConfirmationBlock.blockType, 'tokenConfirmationBlock');
    });

    it('passes a valid associate config', async () => {
        const v = new FakeValidator();
        await TokenConfirmationBlock.validate(v, confirmRef({ tokenId: '0.0.1' }));
        assert.deepEqual(v.errors, []);
    });

    it('passes a valid dissociate config', async () => {
        const v = new FakeValidator();
        await TokenConfirmationBlock.validate(v, confirmRef({ action: 'dissociate', tokenId: '0.0.1' }));
        assert.deepEqual(v.errors, []);
    });

    it('rejects freeze action (not allowed for confirmation)', async () => {
        const v = new FakeValidator();
        await TokenConfirmationBlock.validate(v, confirmRef({ action: 'freeze', tokenId: '0.0.1' }));
        assert.include(v.errors, 'Option "action" must be one of associate,dissociate');
    });

    it('rejects unknown accountType', async () => {
        const v = new FakeValidator();
        await TokenConfirmationBlock.validate(v, confirmRef({ accountType: 'nope', tokenId: '0.0.1' }));
        assert.include(v.errors, 'Option "accountType" must be one of default,custom');
    });

    it('rejects missing tokenId without template', async () => {
        const v = new FakeValidator();
        await TokenConfirmationBlock.validate(v, confirmRef({}));
        assert.include(v.errors, 'Option "tokenId" is not set');
    });

    it('rejects non-string tokenId', async () => {
        const v = new FakeValidator();
        await TokenConfirmationBlock.validate(v, confirmRef({ tokenId: 7 }));
        assert.include(v.errors, 'Option "tokenId" must be a string');
    });

    it('rejects unknown tokenId', async () => {
        const v = new FakeValidator({ tokenMissing: true });
        await TokenConfirmationBlock.validate(v, confirmRef({ tokenId: '0.0.9' }));
        assert.include(v.errors, 'Token with id 0.0.9 does not exist');
    });

    it('rejects missing template when useTemplate=true', async () => {
        const v = new FakeValidator();
        await TokenConfirmationBlock.validate(v, confirmRef({ useTemplate: true }));
        assert.include(v.errors, 'Option "template" is not set');
    });

    it('rejects unknown template when useTemplate=true', async () => {
        const v = new FakeValidator({ templateMissing: true });
        await TokenConfirmationBlock.validate(v, confirmRef({ useTemplate: true, template: 't1' }));
        assert.include(v.errors, 'Token "t1" does not exist');
    });

    it('rejects custom accountType without accountId', async () => {
        const v = new FakeValidator();
        await TokenConfirmationBlock.validate(v, confirmRef({ accountType: 'custom', tokenId: '0.0.1' }));
        assert.include(v.errors, 'Option "accountId" is not set');
    });

    it('accepts custom accountType with accountId', async () => {
        const v = new FakeValidator();
        await TokenConfirmationBlock.validate(v, confirmRef({ accountType: 'custom', accountId: '0.0.5', tokenId: '0.0.1' }));
        assert.deepEqual(v.errors, []);
    });
});
