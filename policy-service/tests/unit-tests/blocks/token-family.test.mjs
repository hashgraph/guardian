import { assert } from 'chai';
import { TokenActionBlock } from '../../../dist/policy-engine/block-validators/blocks/token-action-block.js';
import { TokenConfirmationBlock } from '../../../dist/policy-engine/block-validators/blocks/token-confirmation-block.js';
import { MintBlock } from '../../../dist/policy-engine/block-validators/blocks/mint-block.js';

class FakeValidator {
    constructor(opts = {}) {
        this.errors = [];
        this._tokenMissing = !!opts.tokenMissing;
        this._templateMissing = !!opts.templateMissing;
        this._throw = !!opts.throwGetArtifact;
    }
    addError(msg) { this.errors.push(msg); }
    getErrorMessage(err) { return err?.message ?? String(err); }
    async getArtifact() { if (this._throw) { throw new Error('artifact-down'); } return {}; }
    tokenTemplateNotExist() { return this._templateMissing; }
    async tokenNotExist() { return this._tokenMissing; }
}

describe('@unit P0 TokenActionBlock extra', () => {
    const base = (o = {}) => ({ options: { accountType: 'default', action: 'associate', tokenId: '0.0.1', ...o }, children: [] });

    it('blockType is tokenActionBlock', () => {
        assert.equal(TokenActionBlock.blockType, 'tokenActionBlock');
    });

    it('rejects non-string tokenId', async () => {
        const v = new FakeValidator();
        await TokenActionBlock.validate(v, base({ tokenId: 999 }));
        assert.include(v.errors, 'Option "tokenId" must be a string');
    });

    it('useTemplate without template reports missing template', async () => {
        const v = new FakeValidator();
        await TokenActionBlock.validate(v, base({ useTemplate: true, tokenId: undefined }));
        assert.include(v.errors, 'Option "template" is not set');
    });

    it('useTemplate with unknown template reports does not exist', async () => {
        const v = new FakeValidator({ templateMissing: true });
        await TokenActionBlock.validate(v, base({ useTemplate: true, template: 'T', tokenId: undefined }));
        assert.include(v.errors, 'Token "T" does not exist');
    });

    it('useTemplate with known template passes', async () => {
        const v = new FakeValidator();
        await TokenActionBlock.validate(v, base({ useTemplate: true, template: 'T', tokenId: undefined }));
        assert.deepEqual(v.errors, []);
    });

    it('custom accountType with valid action and accountId passes', async () => {
        const v = new FakeValidator();
        await TokenActionBlock.validate(v, base({ accountType: 'custom', action: 'freeze', accountId: 'a' }));
        assert.deepEqual(v.errors, []);
    });

    it('custom accountType allows all freeze-family actions', async () => {
        for (const action of ['freeze', 'unfreeze', 'grantKyc', 'revokeKyc']) {
            const v = new FakeValidator();
            await TokenActionBlock.validate(v, base({ accountType: 'custom', action, accountId: 'a' }));
            assert.deepEqual(v.errors, [], `action=${action}`);
        }
    });

    it('rejects unknown action under default accountType', async () => {
        const v = new FakeValidator();
        await TokenActionBlock.validate(v, base({ action: 'teleport' }));
        assert.isTrue(v.errors.some((e) => e.startsWith('Option "action" must be one of')));
    });

    it('captures unhandled exception path', async () => {
        const v = new FakeValidator({ throwGetArtifact: true });
        await TokenActionBlock.validate(v, base({ artifacts: [{ uuid: 'a' }] }));
        assert.equal(v.errors.some((e) => /artifact-down/.test(e)), true);
    });
});

describe('@unit P0 TokenConfirmationBlock.validate', () => {
    const base = (o = {}) => ({ options: { accountType: 'default', action: 'associate', tokenId: '0.0.1', ...o }, children: [] });

    it('blockType is tokenConfirmationBlock', () => {
        assert.equal(TokenConfirmationBlock.blockType, 'tokenConfirmationBlock');
    });

    it('passes a minimal valid config', async () => {
        const v = new FakeValidator();
        await TokenConfirmationBlock.validate(v, base());
        assert.deepEqual(v.errors, []);
    });

    it('allows action associate and dissociate', async () => {
        for (const action of ['associate', 'dissociate']) {
            const v = new FakeValidator();
            await TokenConfirmationBlock.validate(v, base({ action }));
            assert.deepEqual(v.errors, [], `action=${action}`);
        }
    });

    it('rejects action outside associate/dissociate', async () => {
        const v = new FakeValidator();
        await TokenConfirmationBlock.validate(v, base({ action: 'freeze' }));
        assert.include(v.errors, 'Option "action" must be one of associate,dissociate');
    });

    it('rejects unknown accountType', async () => {
        const v = new FakeValidator();
        await TokenConfirmationBlock.validate(v, base({ accountType: 'weird' }));
        assert.include(v.errors, 'Option "accountType" must be one of default,custom');
    });

    it('rejects missing tokenId when not using template', async () => {
        const v = new FakeValidator();
        await TokenConfirmationBlock.validate(v, base({ tokenId: undefined }));
        assert.include(v.errors, 'Option "tokenId" is not set');
    });

    it('rejects non-string tokenId', async () => {
        const v = new FakeValidator();
        await TokenConfirmationBlock.validate(v, base({ tokenId: 5 }));
        assert.include(v.errors, 'Option "tokenId" must be a string');
    });

    it('rejects unknown tokenId from registry', async () => {
        const v = new FakeValidator({ tokenMissing: true });
        await TokenConfirmationBlock.validate(v, base({ tokenId: '0.0.999' }));
        assert.include(v.errors, 'Token with id 0.0.999 does not exist');
    });

    it('useTemplate without template reports missing template', async () => {
        const v = new FakeValidator();
        await TokenConfirmationBlock.validate(v, base({ useTemplate: true, tokenId: undefined }));
        assert.include(v.errors, 'Option "template" is not set');
    });

    it('useTemplate with unknown template reports does not exist', async () => {
        const v = new FakeValidator({ templateMissing: true });
        await TokenConfirmationBlock.validate(v, base({ useTemplate: true, template: 'X', tokenId: undefined }));
        assert.include(v.errors, 'Token "X" does not exist');
    });

    it('custom accountType without accountId reports not set', async () => {
        const v = new FakeValidator();
        await TokenConfirmationBlock.validate(v, base({ accountType: 'custom' }));
        assert.include(v.errors, 'Option "accountId" is not set');
    });

    it('custom accountType with accountId passes', async () => {
        const v = new FakeValidator();
        await TokenConfirmationBlock.validate(v, base({ accountType: 'custom', accountId: 'a' }));
        assert.deepEqual(v.errors, []);
    });

    it('captures unhandled exception path', async () => {
        const v = new FakeValidator({ throwGetArtifact: true });
        await TokenConfirmationBlock.validate(v, base({ artifacts: [{ uuid: 'a' }] }));
        assert.equal(v.errors.some((e) => /artifact-down/.test(e)), true);
    });
});

describe('@unit P0 MintBlock extra', () => {
    const base = (o = {}) => ({ options: { rule: 'r', accountType: 'default', tokenId: '0.0.1', ...o }, children: [] });

    it('blockType is mintDocumentBlock', () => {
        assert.equal(MintBlock.blockType, 'mintDocumentBlock');
    });

    it('custom accountType with accountId passes', async () => {
        const v = new FakeValidator();
        await MintBlock.validate(v, base({ accountType: 'custom', accountId: 'a' }));
        assert.deepEqual(v.errors, []);
    });

    it('useTemplate with known template passes', async () => {
        const v = new FakeValidator();
        await MintBlock.validate(v, base({ useTemplate: true, template: 't1', tokenId: undefined }));
        assert.deepEqual(v.errors, []);
    });

    it('captures unhandled exception path', async () => {
        const v = new FakeValidator({ throwGetArtifact: true });
        await MintBlock.validate(v, base({ artifacts: [{ uuid: 'a' }] }));
        assert.equal(v.errors.some((e) => /artifact-down/.test(e)), true);
    });

    it('accepts default accountType (no accountId required)', async () => {
        const v = new FakeValidator();
        await MintBlock.validate(v, base({ accountType: 'default' }));
        assert.deepEqual(v.errors, []);
    });
});
