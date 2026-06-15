import { assert } from 'chai';
import { TokenActionBlock } from '../../../dist/policy-engine/block-validators/blocks/token-action-block.js';

class FakeValidator {
    constructor(opts = {}) {
        this.errors = [];
        this._tokenMissing = !!opts.tokenMissing;
        this._templateMissing = !!opts.templateMissing;
    }
    addError(msg) { this.errors.push(msg); }
    async getArtifact() { return {}; }
    getErrorMessage(err) { return err?.message ?? String(err); }
    tokenTemplateNotExist() { return this._templateMissing; }
    async tokenNotExist() { return this._tokenMissing; }
}

const refWith = (overrides = {}) => ({
    options: {
        accountType: 'default',
        action: 'associate',
        tokenId: '0.0.1',
        ...overrides,
    },
    children: [],
});

describe('TokenActionBlock.validate', () => {
    it('passes a minimal valid default-account config', async () => {
        const v = new FakeValidator();
        await TokenActionBlock.validate(v, refWith());
        assert.deepEqual(v.errors, []);
    });

    it('rejects unknown accountType', async () => {
        const v = new FakeValidator();
        await TokenActionBlock.validate(v, refWith({ accountType: 'mystery' }));
        assert.include(v.errors, 'Option "accountType" must be one of default,custom');
    });

    it('default accountType allows associate/dissociate', async () => {
        for (const action of ['associate', 'dissociate', 'freeze', 'unfreeze', 'grantKyc', 'revokeKyc']) {
            const v = new FakeValidator();
            await TokenActionBlock.validate(v, refWith({ action }));
            assert.deepEqual(v.errors, [], `action=${action} unexpectedly failed`);
        }
    });

    it('custom accountType disallows associate/dissociate', async () => {
        const v = new FakeValidator();
        await TokenActionBlock.validate(v, refWith({
            accountType: 'custom',
            action: 'associate',
            accountId: 'a',
        }));
        assert.isTrue(v.errors.some((e) => e.startsWith('Option "action" must be one of')));
    });

    it('rejects custom accountType without accountId', async () => {
        const v = new FakeValidator();
        await TokenActionBlock.validate(v, refWith({
            accountType: 'custom',
            action: 'freeze',
        }));
        assert.include(v.errors, 'Option "accountId" is not set');
    });

    it('rejects missing tokenId when not using template', async () => {
        const v = new FakeValidator();
        await TokenActionBlock.validate(v, refWith({ tokenId: undefined }));
        assert.include(v.errors, 'Option "tokenId" is not set');
    });

    it('rejects unknown tokenId from registry', async () => {
        const v = new FakeValidator({ tokenMissing: true });
        await TokenActionBlock.validate(v, refWith({ tokenId: '0.0.999' }));
        assert.include(v.errors, 'Token with id 0.0.999 does not exist');
    });

    it('rejects missing template when useTemplate=true', async () => {
        const v = new FakeValidator();
        await TokenActionBlock.validate(v, refWith({ useTemplate: true, tokenId: undefined }));
        assert.include(v.errors, 'Option "template" is not set');
    });
});
