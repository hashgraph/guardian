import { assert } from 'chai';
import { InterfaceDocumentActionBlock } from '../../../dist/policy-engine/block-validators/blocks/action-block.js';
import { ButtonBlock } from '../../../dist/policy-engine/block-validators/blocks/button-block.js';
import { FiltersAddonBlock } from '../../../dist/policy-engine/block-validators/blocks/filters-addon-block.js';
import { DocumentValidatorBlock } from '../../../dist/policy-engine/block-validators/blocks/document-validator-block.js';
import { RevokeBlock } from '../../../dist/policy-engine/block-validators/blocks/revoke-block.js';
import { RevocationBlock } from '../../../dist/policy-engine/block-validators/blocks/revocation-block.js';
import { SendToGuardianBlock } from '../../../dist/policy-engine/block-validators/blocks/send-to-guardian-block.js';

class FakeValidator {
    constructor(opts = {}) {
        this.errors = [];
        this._topicMissing = !!opts.topicMissing;
    }
    addError(msg) { this.errors.push(msg); }
    async getArtifact() { return {}; }
    getErrorMessage(err) { return err?.message ?? String(err); }
    checkBlockError(err) { if (err) { this.errors.push(err); } }
    validateSchemaVariable() { return null; }
    topicTemplateNotExist() { return this._topicMissing; }
}

const ref = (options = {}) => ({ options, children: [] });
const has = (v, sub) => v.errors.some(e => typeof e === 'string' && e.includes(sub));

describe('InterfaceDocumentActionBlock.validate branches', () => {
    it('blockType is interfaceActionBlock', () => {
        assert.equal(InterfaceDocumentActionBlock.blockType, 'interfaceActionBlock');
    });
    it('missing type adds error', async () => {
        const v = new FakeValidator();
        await InterfaceDocumentActionBlock.validate(v, ref({}));
        assert.isTrue(has(v, 'Option "type" is not set'));
    });
    it('selector without uiMetaData adds error', async () => {
        const v = new FakeValidator();
        await InterfaceDocumentActionBlock.validate(v, ref({ type: 'selector' }));
        assert.isTrue(has(v, 'Option "uiMetaData" is not set'));
    });
    it('selector missing field adds error', async () => {
        const v = new FakeValidator();
        await InterfaceDocumentActionBlock.validate(v, ref({ type: 'selector', uiMetaData: { options: [] } }));
        assert.isTrue(has(v, 'Option "field" is not set'));
    });
    it('selector with non-array options adds error', async () => {
        const v = new FakeValidator();
        await InterfaceDocumentActionBlock.validate(v, ref({ type: 'selector', field: 'f', uiMetaData: { options: 'x' } }));
        assert.isTrue(has(v, 'Option "uiMetaData.options" must be an array'));
    });
    it('selector option missing tag adds error', async () => {
        const v = new FakeValidator();
        await InterfaceDocumentActionBlock.validate(v, ref({ type: 'selector', field: 'f', uiMetaData: { options: [{}] } }));
        assert.isTrue(has(v, 'Option "tag" is not set'));
    });
    it('selector duplicate option tag adds error', async () => {
        const v = new FakeValidator();
        await InterfaceDocumentActionBlock.validate(v, ref({ type: 'selector', field: 'f', uiMetaData: { options: [{ tag: 'a' }, { tag: 'a' }] } }));
        assert.isTrue(has(v, 'already exist'));
    });
    it('download missing targetUrl adds error', async () => {
        const v = new FakeValidator();
        await InterfaceDocumentActionBlock.validate(v, ref({ type: 'download' }));
        assert.isTrue(has(v, 'Option "targetUrl" is not set'));
    });
    it('dropdown missing name adds error', async () => {
        const v = new FakeValidator();
        await InterfaceDocumentActionBlock.validate(v, ref({ type: 'dropdown' }));
        assert.isTrue(has(v, 'Option "name" is not set'));
    });
    it('dropdown missing value adds error', async () => {
        const v = new FakeValidator();
        await InterfaceDocumentActionBlock.validate(v, ref({ type: 'dropdown', name: 'n' }));
        assert.isTrue(has(v, 'Option "value" is not set'));
    });
    it('transformation type passes', async () => {
        const v = new FakeValidator();
        await InterfaceDocumentActionBlock.validate(v, ref({ type: 'transformation' }));
        assert.deepEqual(v.errors, []);
    });
    it('unknown type adds error', async () => {
        const v = new FakeValidator();
        await InterfaceDocumentActionBlock.validate(v, ref({ type: 'weird' }));
        assert.isTrue(has(v, 'Option "type" must be a "selector|download|dropdown"'));
    });
});

describe('ButtonBlock.validate branches', () => {
    it('blockType is buttonBlock', () => {
        assert.equal(ButtonBlock.blockType, 'buttonBlock');
    });
    it('missing uiMetaData adds error', async () => {
        const v = new FakeValidator();
        await ButtonBlock.validate(v, ref({}));
        assert.isTrue(has(v, 'Option "uiMetaData" is not set'));
    });
    it('buttons not an array adds error', async () => {
        const v = new FakeValidator();
        await ButtonBlock.validate(v, ref({ uiMetaData: { buttons: 'x' } }));
        assert.isTrue(has(v, 'Option "uiMetaData.buttons" must be an array'));
    });
    it('button missing tag adds error', async () => {
        const v = new FakeValidator();
        await ButtonBlock.validate(v, ref({ uiMetaData: { buttons: [{ type: 'selector', filters: [] }] } }));
        assert.isTrue(has(v, 'Option "tag" is not set'));
    });
    it('button filters not an array adds error', async () => {
        const v = new FakeValidator();
        await ButtonBlock.validate(v, ref({ uiMetaData: { buttons: [{ tag: 't', type: 'selector', filters: 'x' }] } }));
        assert.isTrue(has(v, 'Option "button.filters" must be an array'));
    });
    it('filter missing type adds error', async () => {
        const v = new FakeValidator();
        await ButtonBlock.validate(v, ref({ uiMetaData: { buttons: [{ tag: 't', type: 'selector', filters: [{ field: 'f' }] }] } }));
        assert.isTrue(has(v, 'Option "type" is not set'));
    });
    it('filter missing field adds error', async () => {
        const v = new FakeValidator();
        await ButtonBlock.validate(v, ref({ uiMetaData: { buttons: [{ tag: 't', type: 'selector', filters: [{ type: 'eq' }] }] } }));
        assert.isTrue(has(v, 'Option "field" is not set'));
    });
    it('selector-dialog missing title adds error', async () => {
        const v = new FakeValidator();
        await ButtonBlock.validate(v, ref({ uiMetaData: { buttons: [{ tag: 't', type: 'selector-dialog', filters: [] }] } }));
        assert.isTrue(has(v, 'Option "title" is not set'));
    });
    it('selector-dialog missing description adds error', async () => {
        const v = new FakeValidator();
        await ButtonBlock.validate(v, ref({ uiMetaData: { buttons: [{ tag: 't', type: 'selector-dialog', title: 'T', filters: [] }] } }));
        assert.isTrue(has(v, 'Option "description" is not set'));
    });
    it('unknown button type adds error', async () => {
        const v = new FakeValidator();
        await ButtonBlock.validate(v, ref({ uiMetaData: { buttons: [{ tag: 't', type: 'weird', filters: [] }] } }));
        assert.isTrue(has(v, 'Option "type" must be a "selector|selector-dialog"'));
    });
    it('valid selector button yields no errors', async () => {
        const v = new FakeValidator();
        await ButtonBlock.validate(v, ref({ uiMetaData: { buttons: [{ tag: 't', type: 'selector', filters: [{ type: 'eq', field: 'f' }] }] } }));
        assert.deepEqual(v.errors, []);
    });
});

describe('FiltersAddonBlock.validate branches', () => {
    it('blockType is filtersAddon', () => {
        assert.equal(FiltersAddonBlock.blockType, 'filtersAddon');
    });
    it('missing type adds error', async () => {
        const v = new FakeValidator();
        await FiltersAddonBlock.validate(v, ref({}));
        assert.isTrue(has(v, 'Option "type" is not set'));
    });
    for (const t of ['dropdown', 'datepicker', 'input']) {
        it(`type ${t} passes`, async () => {
            const v = new FakeValidator();
            await FiltersAddonBlock.validate(v, ref({ type: t }));
            assert.deepEqual(v.errors, []);
        });
    }
    it('unknown type adds error', async () => {
        const v = new FakeValidator();
        await FiltersAddonBlock.validate(v, ref({ type: 'weird' }));
        assert.isTrue(has(v, 'Option "type" must be a "dropdown"'));
    });
});

describe('DocumentValidatorBlock.validate branches', () => {
    it('blockType is documentValidatorBlock', () => {
        assert.equal(DocumentValidatorBlock.blockType, 'documentValidatorBlock');
    });
    it('invalid documentType adds error', async () => {
        const v = new FakeValidator();
        await DocumentValidatorBlock.validate(v, ref({ documentType: 'bad' }));
        assert.isTrue(has(v, 'Option "documentType" must be one of'));
    });
    for (const t of ['vc-document', 'vp-document', 'related-vc-document', 'related-vp-document']) {
        it(`documentType ${t} passes type check`, async () => {
            const v = new FakeValidator();
            await DocumentValidatorBlock.validate(v, ref({ documentType: t }));
            assert.isFalse(has(v, 'Option "documentType" must be one of'));
        });
    }
    it('non-array conditions adds error', async () => {
        const v = new FakeValidator();
        await DocumentValidatorBlock.validate(v, ref({ documentType: 'vc-document', conditions: {} }));
        assert.isTrue(has(v, 'conditions option must be an array'));
    });
    it('array conditions passes', async () => {
        const v = new FakeValidator();
        await DocumentValidatorBlock.validate(v, ref({ documentType: 'vc-document', conditions: [] }));
        assert.deepEqual(v.errors, []);
    });
});

describe('RevokeBlock.validate branches', () => {
    it('blockType is revokeBlock', () => {
        assert.equal(RevokeBlock.blockType, 'revokeBlock');
    });
    it('missing uiMetaData adds error', async () => {
        const v = new FakeValidator();
        await RevokeBlock.validate(v, ref({}));
        assert.isTrue(has(v, 'Option "uiMetaData" is not set'));
    });
    it('updatePrevDoc without prevDocStatus adds error', async () => {
        const v = new FakeValidator();
        await RevokeBlock.validate(v, ref({ uiMetaData: { updatePrevDoc: true } }));
        assert.isTrue(has(v, 'Option "Status Value" is not set'));
    });
    it('valid config yields no errors', async () => {
        const v = new FakeValidator();
        await RevokeBlock.validate(v, ref({ uiMetaData: { updatePrevDoc: true, prevDocStatus: 'x' } }));
        assert.deepEqual(v.errors, []);
    });
});

describe('RevocationBlock.validate branches', () => {
    it('blockType is revocationBlock', () => {
        assert.equal(RevocationBlock.blockType, 'revocationBlock');
    });
    it('updatePrevDoc without prevDocStatus adds error', async () => {
        const v = new FakeValidator();
        await RevocationBlock.validate(v, ref({ updatePrevDoc: true }));
        assert.isTrue(has(v, 'Option "Status Value" is not set'));
    });
    it('valid config yields no errors', async () => {
        const v = new FakeValidator();
        await RevocationBlock.validate(v, ref({ updatePrevDoc: true, prevDocStatus: 'x' }));
        assert.deepEqual(v.errors, []);
    });
});

describe('SendToGuardianBlock.validate branches', () => {
    it('blockType is sendToGuardianBlock', () => {
        assert.equal(SendToGuardianBlock.blockType, 'sendToGuardianBlock');
    });
    it('invalid dataType adds error', async () => {
        const v = new FakeValidator();
        await SendToGuardianBlock.validate(v, ref({ dataType: 'bad' }));
        assert.isTrue(has(v, 'Option "dataType" must be one of'));
    });
    for (const t of ['vc-documents', 'did-documents', 'approve', 'hedera']) {
        it(`dataType ${t} passes`, async () => {
            const v = new FakeValidator();
            await SendToGuardianBlock.validate(v, ref({ dataType: t }));
            assert.deepEqual(v.errors, []);
        });
    }
    it('dataSource auto passes', async () => {
        const v = new FakeValidator();
        await SendToGuardianBlock.validate(v, ref({ dataSource: 'auto' }));
        assert.deepEqual(v.errors, []);
    });
    it('dataSource database passes', async () => {
        const v = new FakeValidator();
        await SendToGuardianBlock.validate(v, ref({ dataSource: 'database' }));
        assert.deepEqual(v.errors, []);
    });
    it('dataSource hedera with missing topic template adds error', async () => {
        const v = new FakeValidator({ topicMissing: true });
        await SendToGuardianBlock.validate(v, ref({ dataSource: 'hedera', topic: 'myTopic' }));
        assert.isTrue(has(v, 'Topic "myTopic" does not exist'));
    });
    it('dataSource hedera with root topic passes', async () => {
        const v = new FakeValidator({ topicMissing: true });
        await SendToGuardianBlock.validate(v, ref({ dataSource: 'hedera', topic: 'root' }));
        assert.deepEqual(v.errors, []);
    });
    it('no dataType and no dataSource passes', async () => {
        const v = new FakeValidator();
        await SendToGuardianBlock.validate(v, ref({}));
        assert.deepEqual(v.errors, []);
    });
    it('unknown dataSource adds error', async () => {
        const v = new FakeValidator();
        await SendToGuardianBlock.validate(v, ref({ dataSource: 'weird' }));
        assert.isTrue(has(v, 'Option "dataSource" must be one of auto|database|hedera'));
    });
});
