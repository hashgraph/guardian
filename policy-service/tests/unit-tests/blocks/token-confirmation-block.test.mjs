import { assert } from 'chai';
import { TokenConfirmationBlock } from '../../../dist/policy-engine/block-validators/blocks/token-confirmation-block.js';

class FakeValidator {
    constructor({ tokens = new Set(), templates = new Set() } = {}) {
        this.errors = [];
        this.tokens = tokens;
        this.templates = templates;
    }
    addError(msg) { this.errors.push(msg); }
    async getArtifact() { return {}; }
    getErrorMessage(err) { return err?.message ?? String(err); }
    async tokenNotExist(id) { return !this.tokens.has(id); }
    tokenTemplateNotExist(name) { return !this.templates.has(name); }
}

const refWith = (opts = {}) => ({ options: opts });

describe('TokenConfirmationBlock.validate', () => {
    it('exposes blockType "tokenConfirmationBlock"', () => {
        assert.equal(TokenConfirmationBlock.blockType, 'tokenConfirmationBlock');
    });

    it('rejects unknown accountType and unknown action together', async () => {
        const v = new FakeValidator({ tokens: new Set(['T-1']) });
        await TokenConfirmationBlock.validate(v, refWith({
            accountType: 'mystery', action: 'mystery', tokenId: 'T-1'
        }));
        assert.include(v.errors.join('\n'), 'Option "accountType" must be one of default,custom');
        assert.include(v.errors.join('\n'), 'Option "action" must be one of associate,dissociate');
    });

    it('rejects missing tokenId when not using template', async () => {
        const v = new FakeValidator();
        await TokenConfirmationBlock.validate(v, refWith({
            accountType: 'default', action: 'associate'
        }));
        assert.include(v.errors, 'Option "tokenId" is not set');
    });

    it('rejects non-string tokenId', async () => {
        const v = new FakeValidator();
        await TokenConfirmationBlock.validate(v, refWith({
            accountType: 'default', action: 'associate', tokenId: 12345
        }));
        assert.include(v.errors, 'Option "tokenId" must be a string');
    });

    it('rejects unknown tokenId', async () => {
        const v = new FakeValidator({ tokens: new Set([]) });
        await TokenConfirmationBlock.validate(v, refWith({
            accountType: 'default', action: 'associate', tokenId: 'T-missing'
        }));
        assert.include(v.errors, 'Token with id T-missing does not exist');
    });

    it('rejects useTemplate with missing template', async () => {
        const v = new FakeValidator();
        await TokenConfirmationBlock.validate(v, refWith({
            accountType: 'default', action: 'associate', useTemplate: true
        }));
        assert.include(v.errors, 'Option "template" is not set');
    });

    it('rejects useTemplate with unknown template name', async () => {
        const v = new FakeValidator({ templates: new Set([]) });
        await TokenConfirmationBlock.validate(v, refWith({
            accountType: 'default', action: 'associate', useTemplate: true, template: 'TplX'
        }));
        assert.include(v.errors, 'Token "TplX" does not exist');
    });

    it('passes when accountType=default + action=associate + valid tokenId', async () => {
        const v = new FakeValidator({ tokens: new Set(['T-1']) });
        await TokenConfirmationBlock.validate(v, refWith({
            accountType: 'default', action: 'associate', tokenId: 'T-1'
        }));
        assert.deepEqual(v.errors, []);
    });

    it('rejects accountType=custom without accountId', async () => {
        const v = new FakeValidator({ tokens: new Set(['T-1']) });
        await TokenConfirmationBlock.validate(v, refWith({
            accountType: 'custom', action: 'associate', tokenId: 'T-1'
        }));
        assert.include(v.errors, 'Option "accountId" is not set');
    });
});
