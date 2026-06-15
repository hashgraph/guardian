import { assert } from 'chai';
import { InterfaceDocumentsSource } from '../../../dist/policy-engine/block-validators/blocks/documents-source.js';
import { DocumentsSourceAddon } from '../../../dist/policy-engine/block-validators/blocks/documents-source-addon.js';
import { ButtonBlockAddon } from '../../../dist/policy-engine/block-validators/blocks/button-block-addon.js';
import { IpfsTransformationUIAddon } from '../../../dist/policy-engine/block-validators/blocks/ipfs-transformation-ui-addon.js';

class FakeValidator {
    constructor(opts = {}) {
        this.errors = [];
        this.checked = [];
        this._missingTags = new Set(opts.missingTags || []);
    }
    addError(msg) { this.errors.push(msg); }
    async getArtifact() { return {}; }
    getErrorMessage(err) { return err?.message ?? String(err); }
    tagNotExist(tag) { return this._missingTags.has(tag); }
    validateSchemaVariable() { return null; }
    checkBlockError(error) { if (error) this.checked.push(error); }
}

describe('InterfaceDocumentsSource.validate', () => {
    it('passes a config without uiMetaData', async () => {
        const v = new FakeValidator();
        await InterfaceDocumentsSource.validate(v, { options: {}, children: [] });
        assert.deepEqual(v.errors, []);
    });

    it('flags fields that bind to a non-existent tag', async () => {
        const v = new FakeValidator({ missingTags: ['ghost'] });
        await InterfaceDocumentsSource.validate(v, {
            options: { uiMetaData: { fields: [{ bindBlock: 'ghost' }, { bindBlock: 'real' }] } },
            children: [],
        });
        assert.include(v.errors, 'Tag "ghost" does not exist');
    });

    it('skips tag check entries that have no bindBlock', async () => {
        const v = new FakeValidator();
        await InterfaceDocumentsSource.validate(v, {
            options: { uiMetaData: { fields: [{}, { bindBlock: '' }] } },
            children: [],
        });
        assert.deepEqual(v.errors, []);
    });

    it('rejects a sort-enabled config when source-addons have mixed dataTypes', async () => {
        const v = new FakeValidator();
        await InterfaceDocumentsSource.validate(v, {
            options: { uiMetaData: { enableSorting: true } },
            children: [
                { blockType: 'documentsSourceAddon', options: { dataType: 'vc-documents' } },
                { blockType: 'documentsSourceAddon', options: { dataType: 'did-documents' } },
            ],
        });
        assert.include(v.errors, "There are different types in documentSourceAddon's");
    });

    it('passes a sort-enabled config with consistent dataTypes', async () => {
        const v = new FakeValidator();
        await InterfaceDocumentsSource.validate(v, {
            options: { uiMetaData: { enableSorting: true } },
            children: [
                { blockType: 'documentsSourceAddon', options: { dataType: 'vc-documents' } },
                { blockType: 'documentsSourceAddon', options: { dataType: 'vc-documents' } },
            ],
        });
        assert.deepEqual(v.errors, []);
    });
});

describe('DocumentsSourceAddon.validate', () => {
    it('rejects unknown dataType', async () => {
        const v = new FakeValidator();
        await DocumentsSourceAddon.validate(v, {
            options: { dataType: 'mystery' },
            children: [],
        });
        assert.match(v.errors[0], /^Option "dataType" must be one of /);
    });

    it('accepts every documented dataType', async () => {
        const allowed = [
            'vc-documents', 'did-documents', 'vp-documents',
            'root-authorities', 'standard-registries', 'approve', 'source',
        ];
        for (const dataType of allowed) {
            const v = new FakeValidator();
            await DocumentsSourceAddon.validate(v, { options: { dataType }, children: [] });
            assert.deepEqual(v.errors, [], `dataType=${dataType} unexpectedly failed`);
        }
    });
});

describe('ButtonBlockAddon.validate', () => {
    it('rejects missing button name', async () => {
        const v = new FakeValidator();
        await ButtonBlockAddon.validate(v, { options: {}, children: [] });
        assert.include(v.errors, 'Button name is empty');
    });

    it('passes a basic non-dialog button', async () => {
        const v = new FakeValidator();
        await ButtonBlockAddon.validate(v, {
            options: { name: 'Submit' },
            children: [],
        });
        assert.deepEqual(v.errors, []);
    });

    it('flags missing dialog title and result-field path when dialog=true', async () => {
        const v = new FakeValidator();
        await ButtonBlockAddon.validate(v, {
            options: { name: 'Open', dialog: true },
            children: [],
        });
        assert.include(v.errors, 'Dialog title is empty');
        assert.include(v.errors, 'Dialog result field path is empty');
    });

    it('passes a fully populated dialog button', async () => {
        const v = new FakeValidator();
        await ButtonBlockAddon.validate(v, {
            options: {
                name: 'Open',
                dialog: true,
                dialogOptions: { dialogTitle: 't', dialogResultFieldPath: 'a.b' },
            },
            children: [],
        });
        assert.deepEqual(v.errors, []);
    });
});

describe('IpfsTransformationUIAddon.validate', () => {
    it('passes with empty options (CommonBlock-only delegation)', async () => {
        const v = new FakeValidator();
        await IpfsTransformationUIAddon.validate(v, { options: {}, children: [] });
        assert.deepEqual(v.errors, []);
    });
});
