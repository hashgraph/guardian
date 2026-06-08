import { assert } from 'chai';
import { MintBlock } from '../../../dist/policy-engine/block-validators/blocks/mint-block.js';

class FakeValidator {
    constructor(opts = {}) {
        this.errors = [];
        this._templateMissing = !!opts.templateMissing;
        this._tokenMissing = !!opts.tokenMissing;
    }
    addError(msg) {
        this.errors.push(msg);
    }
    tokenTemplateNotExist() {
        return this._templateMissing;
    }
    async tokenNotExist() {
        return this._tokenMissing;
    }
    async getArtifact() {
        return {};
    }
    getErrorMessage(err) {
        return err?.message ?? String(err);
    }
}

const baseRef = (overrides = {}) => ({
    options: {
        rule: 'someRule',
        accountType: 'default',
        ...overrides,
    },
    children: [],
});

describe('MintBlock.validate', () => {
    it('passes for a minimal valid tokenId-based config', async () => {
        const v = new FakeValidator();
        await MintBlock.validate(v, baseRef({ tokenId: '0.0.123' }));
        assert.deepEqual(v.errors, []);
    });

    it('rejects missing tokenId when not using a template', async () => {
        const v = new FakeValidator();
        await MintBlock.validate(v, baseRef({}));
        assert.include(v.errors, 'Option "tokenId" is not set');
    });

    it('rejects non-string tokenId', async () => {
        const v = new FakeValidator();
        await MintBlock.validate(v, baseRef({ tokenId: 123 }));
        assert.include(v.errors, 'Option "tokenId" must be a string');
    });

    it('rejects unknown tokenId from registry', async () => {
        const v = new FakeValidator({ tokenMissing: true });
        await MintBlock.validate(v, baseRef({ tokenId: '0.0.999' }));
        assert.include(v.errors, 'Token with id 0.0.999 does not exist');
    });

    it('rejects missing template when useTemplate=true', async () => {
        const v = new FakeValidator();
        await MintBlock.validate(v, baseRef({ useTemplate: true }));
        assert.include(v.errors, 'Option "template" is not set');
    });

    it('rejects unknown template when useTemplate=true', async () => {
        const v = new FakeValidator({ templateMissing: true });
        await MintBlock.validate(v, baseRef({ useTemplate: true, template: 't1' }));
        assert.include(v.errors, 'Token "t1" does not exist');
    });

    it('rejects missing rule', async () => {
        const v = new FakeValidator();
        await MintBlock.validate(v, baseRef({ tokenId: '0.0.1', rule: undefined }));
        assert.include(v.errors, 'Option "rule" is not set');
    });

    it('rejects non-string rule', async () => {
        const v = new FakeValidator();
        await MintBlock.validate(v, baseRef({ tokenId: '0.0.1', rule: 42 }));
        assert.include(v.errors, 'Option "rule" must be a string');
    });

    it('rejects unknown accountType', async () => {
        const v = new FakeValidator();
        await MintBlock.validate(v, baseRef({ tokenId: '0.0.1', accountType: 'weird' }));
        assert.include(
            v.errors,
            'Option "accountType" must be one of default,custom,custom-value',
        );
    });

    it('rejects custom accountType without accountId', async () => {
        const v = new FakeValidator();
        await MintBlock.validate(v, baseRef({ tokenId: '0.0.1', accountType: 'custom' }));
        assert.include(v.errors, 'Option "accountId" is not set');
    });

    it('rejects custom-value accountType with malformed accountIdValue', async () => {
        const v = new FakeValidator();
        await MintBlock.validate(
            v,
            baseRef({ tokenId: '0.0.1', accountType: 'custom-value', accountIdValue: 'oops' }),
        );
        assert.include(v.errors, 'Option "accountIdValue" has invalid hedera account value');
    });

    it('accepts custom-value accountType with valid hedera id', async () => {
        const v = new FakeValidator();
        await MintBlock.validate(
            v,
            baseRef({ tokenId: '0.0.1', accountType: 'custom-value', accountIdValue: '0.0.7' }),
        );
        assert.deepEqual(v.errors, []);
    });
});
