import { assert } from 'chai';
import { MintBlock } from '../../../dist/policy-engine/block-validators/blocks/mint-block.js';
import { TokenActionBlock } from '../../../dist/policy-engine/block-validators/blocks/token-action-block.js';
import { TokenConfirmationBlock } from '../../../dist/policy-engine/block-validators/blocks/token-confirmation-block.js';
import { RetirementBlock } from '../../../dist/policy-engine/block-validators/blocks/retirement-block.js';

class FakeValidator {
    constructor(opts = {}) {
        this.errors = [];
        this._tokenTemplateMissing = !!opts.tokenTemplateMissing;
        this._tokenMissing = !!opts.tokenMissing;
    }
    addError(msg) { this.errors.push(msg); }
    async getArtifact() { return {}; }
    getErrorMessage(err) { return err?.message ?? String(err); }
    tokenTemplateNotExist() { return this._tokenTemplateMissing; }
    async tokenNotExist() { return this._tokenMissing; }
    checkBlockError(err) { if (err) { this.errors.push(err); } }
    validateSchemaVariable() { return null; }
}

const ref = (options = {}, children = []) => ({ options, children });
const has = (v, sub) => v.errors.some(e => typeof e === 'string' && e.includes(sub));

describe('MintBlock.validate branches', () => {
    it('blockType is mintDocumentBlock', () => {
        assert.equal(MintBlock.blockType, 'mintDocumentBlock');
    });
    it('useTemplate without template adds error', async () => {
        const v = new FakeValidator();
        await MintBlock.validate(v, ref({ useTemplate: true, rule: 'r', accountType: 'default' }));
        assert.isTrue(has(v, 'Option "template" is not set'));
    });
    it('useTemplate with non-existent template token adds error', async () => {
        const v = new FakeValidator({ tokenTemplateMissing: true });
        await MintBlock.validate(v, ref({ useTemplate: true, template: 'T', rule: 'r', accountType: 'default' }));
        assert.isTrue(has(v, 'Token "T" does not exist'));
    });
    it('non-template path: missing tokenId adds error', async () => {
        const v = new FakeValidator();
        await MintBlock.validate(v, ref({ rule: 'r', accountType: 'default' }));
        assert.isTrue(has(v, 'Option "tokenId" is not set'));
    });
    it('non-template path: non-string tokenId adds error', async () => {
        const v = new FakeValidator();
        await MintBlock.validate(v, ref({ tokenId: 123, rule: 'r', accountType: 'default' }));
        assert.isTrue(has(v, 'Option "tokenId" must be a string'));
    });
    it('non-template path: missing token adds does-not-exist error', async () => {
        const v = new FakeValidator({ tokenMissing: true });
        await MintBlock.validate(v, ref({ tokenId: '0.0.1', rule: 'r', accountType: 'default' }));
        assert.isTrue(has(v, 'Token with id 0.0.1 does not exist'));
    });
    it('missing rule adds error', async () => {
        const v = new FakeValidator();
        await MintBlock.validate(v, ref({ tokenId: '0.0.1', accountType: 'default' }));
        assert.isTrue(has(v, 'Option "rule" is not set'));
    });
    it('non-string rule adds error', async () => {
        const v = new FakeValidator();
        await MintBlock.validate(v, ref({ tokenId: '0.0.1', rule: 5, accountType: 'default' }));
        assert.isTrue(has(v, 'Option "rule" must be a string'));
    });
    it('invalid accountType adds error', async () => {
        const v = new FakeValidator();
        await MintBlock.validate(v, ref({ tokenId: '0.0.1', rule: 'r', accountType: 'bogus' }));
        assert.isTrue(has(v, 'Option "accountType" must be one of'));
    });
    it('accountType custom without accountId adds error', async () => {
        const v = new FakeValidator();
        await MintBlock.validate(v, ref({ tokenId: '0.0.1', rule: 'r', accountType: 'custom' }));
        assert.isTrue(has(v, 'Option "accountId" is not set'));
    });
    it('accountType custom-value with bad hedera value adds error', async () => {
        const v = new FakeValidator();
        await MintBlock.validate(v, ref({ tokenId: '0.0.1', rule: 'r', accountType: 'custom-value', accountIdValue: 'nope' }));
        assert.isTrue(has(v, 'Option "accountIdValue" has invalid hedera account value'));
    });
    it('accountType custom-value with valid hedera value passes that check', async () => {
        const v = new FakeValidator();
        await MintBlock.validate(v, ref({ tokenId: '0.0.1', rule: 'r', accountType: 'custom-value', accountIdValue: '0.0.99' }));
        assert.isFalse(has(v, 'invalid hedera account value'));
    });
    it('valid default config yields no errors', async () => {
        const v = new FakeValidator();
        await MintBlock.validate(v, ref({ tokenId: '0.0.1', rule: 'r', accountType: 'default' }));
        assert.deepEqual(v.errors, []);
    });
});

describe('TokenActionBlock.validate branches', () => {
    it('blockType is tokenActionBlock', () => {
        assert.equal(TokenActionBlock.blockType, 'tokenActionBlock');
    });
    it('invalid accountType adds error', async () => {
        const v = new FakeValidator();
        await TokenActionBlock.validate(v, ref({ accountType: 'x', action: 'freeze', tokenId: '0.0.1' }));
        assert.isTrue(has(v, 'Option "accountType" must be one of'));
    });
    it('default accountType allows associate action', async () => {
        const v = new FakeValidator();
        await TokenActionBlock.validate(v, ref({ accountType: 'default', action: 'associate', tokenId: '0.0.1' }));
        assert.isFalse(has(v, 'Option "action" must be one of'));
    });
    it('custom accountType disallows associate action', async () => {
        const v = new FakeValidator();
        await TokenActionBlock.validate(v, ref({ accountType: 'custom', action: 'associate', tokenId: '0.0.1', accountId: 'a' }));
        assert.isTrue(has(v, 'Option "action" must be one of'));
    });
    it('invalid action adds error', async () => {
        const v = new FakeValidator();
        await TokenActionBlock.validate(v, ref({ accountType: 'default', action: 'bogus', tokenId: '0.0.1' }));
        assert.isTrue(has(v, 'Option "action" must be one of'));
    });
    it('useTemplate missing template adds error', async () => {
        const v = new FakeValidator();
        await TokenActionBlock.validate(v, ref({ accountType: 'default', action: 'freeze', useTemplate: true }));
        assert.isTrue(has(v, 'Option "template" is not set'));
    });
    it('non-template missing tokenId adds error', async () => {
        const v = new FakeValidator();
        await TokenActionBlock.validate(v, ref({ accountType: 'default', action: 'freeze' }));
        assert.isTrue(has(v, 'Option "tokenId" is not set'));
    });
    it('non-string tokenId adds error', async () => {
        const v = new FakeValidator();
        await TokenActionBlock.validate(v, ref({ accountType: 'default', action: 'freeze', tokenId: 1 }));
        assert.isTrue(has(v, 'Option "tokenId" must be a string'));
    });
    it('custom without accountId adds error', async () => {
        const v = new FakeValidator();
        await TokenActionBlock.validate(v, ref({ accountType: 'custom', action: 'freeze', tokenId: '0.0.1' }));
        assert.isTrue(has(v, 'Option "accountId" is not set'));
    });
    it('valid default config yields no errors', async () => {
        const v = new FakeValidator();
        await TokenActionBlock.validate(v, ref({ accountType: 'default', action: 'freeze', tokenId: '0.0.1' }));
        assert.deepEqual(v.errors, []);
    });
});

describe('TokenConfirmationBlock.validate branches', () => {
    it('blockType is tokenConfirmationBlock', () => {
        assert.equal(TokenConfirmationBlock.blockType, 'tokenConfirmationBlock');
    });
    it('invalid accountType adds error', async () => {
        const v = new FakeValidator();
        await TokenConfirmationBlock.validate(v, ref({ accountType: 'x', action: 'associate', tokenId: '0.0.1' }));
        assert.isTrue(has(v, 'Option "accountType" must be one of'));
    });
    it('invalid action adds error', async () => {
        const v = new FakeValidator();
        await TokenConfirmationBlock.validate(v, ref({ accountType: 'default', action: 'mint', tokenId: '0.0.1' }));
        assert.isTrue(has(v, 'Option "action" must be one of'));
    });
    it('useTemplate missing template adds error', async () => {
        const v = new FakeValidator();
        await TokenConfirmationBlock.validate(v, ref({ accountType: 'default', action: 'associate', useTemplate: true }));
        assert.isTrue(has(v, 'Option "template" is not set'));
    });
    it('non-template missing tokenId adds error', async () => {
        const v = new FakeValidator();
        await TokenConfirmationBlock.validate(v, ref({ accountType: 'default', action: 'associate' }));
        assert.isTrue(has(v, 'Option "tokenId" is not set'));
    });
    it('custom without accountId adds error', async () => {
        const v = new FakeValidator();
        await TokenConfirmationBlock.validate(v, ref({ accountType: 'custom', action: 'associate', tokenId: '0.0.1' }));
        assert.isTrue(has(v, 'Option "accountId" is not set'));
    });
    it('valid config yields no errors', async () => {
        const v = new FakeValidator();
        await TokenConfirmationBlock.validate(v, ref({ accountType: 'default', action: 'associate', tokenId: '0.0.1' }));
        assert.deepEqual(v.errors, []);
    });
});

describe('RetirementBlock.validate branches', () => {
    it('blockType is retirementDocumentBlock', () => {
        assert.equal(RetirementBlock.blockType, 'retirementDocumentBlock');
    });
    it('useTemplate missing template adds error', async () => {
        const v = new FakeValidator();
        await RetirementBlock.validate(v, ref({ useTemplate: true }));
        assert.isTrue(has(v, 'Option "template" is not set'));
    });
    it('non-template missing tokenId adds error', async () => {
        const v = new FakeValidator();
        await RetirementBlock.validate(v, ref({}));
        assert.isTrue(has(v, 'Option "tokenId" is not set'));
    });
    it('non-string rule adds error', async () => {
        const v = new FakeValidator();
        await RetirementBlock.validate(v, ref({ tokenId: '0.0.1', rule: 5 }));
        assert.isTrue(has(v, 'Option "rule" must be a string'));
    });
    it('non-string serialNumbersExpression adds error', async () => {
        const v = new FakeValidator();
        await RetirementBlock.validate(v, ref({ tokenId: '0.0.1', serialNumbersExpression: 5 }));
        assert.isTrue(has(v, 'Option "serial numbers" must be a string'));
    });
    it('serial expression with illegal character adds error', async () => {
        const v = new FakeValidator();
        await RetirementBlock.validate(v, ref({ tokenId: '0.0.1', serialNumbersExpression: '1,@@' }));
        assert.isTrue(has(v, 'is not allowed'));
    });
    it('serial number less than 1 adds error', async () => {
        const v = new FakeValidator();
        await RetirementBlock.validate(v, ref({ tokenId: '0.0.1', serialNumbersExpression: '0' }));
        assert.isTrue(has(v, 'must be greater than or equal to 1'));
    });
    it('valid serial number range yields no serial error', async () => {
        const v = new FakeValidator();
        await RetirementBlock.validate(v, ref({ tokenId: '0.0.1', serialNumbersExpression: '1-3', accountType: 'default' }));
        assert.isFalse(has(v, 'Invalid serial'));
    });
    it('invalid accountType adds error', async () => {
        const v = new FakeValidator();
        await RetirementBlock.validate(v, ref({ tokenId: '0.0.1', accountType: 'bogus' }));
        assert.isTrue(has(v, 'Option "accountType" must be one of'));
    });
    it('custom accountType without accountId adds error', async () => {
        const v = new FakeValidator();
        await RetirementBlock.validate(v, ref({ tokenId: '0.0.1', accountType: 'custom' }));
        assert.isTrue(has(v, 'Option "accountId" is not set'));
    });
    it('valid simple config yields no errors', async () => {
        const v = new FakeValidator();
        await RetirementBlock.validate(v, ref({ tokenId: '0.0.1', accountType: 'default' }));
        assert.deepEqual(v.errors, []);
    });
});
