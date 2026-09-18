import { assert } from 'chai';
import { RequestVcDocumentBlock } from '../../../dist/policy-engine/block-validators/blocks/request-vc-document-block.js';
import { RequestVcDocumentBlockAddon } from '../../../dist/policy-engine/block-validators/blocks/request-vc-document-block-addon.js';
import { DocumentValidatorBlock } from '../../../dist/policy-engine/block-validators/blocks/document-validator-block.js';

class FakeValidator {
    constructor(opts = {}) {
        this.errors = [];
        this.checked = [];
        this._schemaIssues = opts.schemaIssues || {};
        this._throwOnArtifact = !!opts.throwOnArtifact;
    }
    addError(msg) { this.errors.push(msg); }
    checkBlockError(err) { if (err) { this.checked.push(err); this.errors.push(err); } }
    validateSchemaVariable(name, value, required) {
        if (this._schemaIssues[name]) { return this._schemaIssues[name]; }
        if (required && !value) { return `${name} required`; }
        return null;
    }
    async getArtifact() {
        if (this._throwOnArtifact) { throw new Error('store down'); }
        return {};
    }
    getErrorMessage(err) { return err?.message ?? String(err); }
}

const ref = (options = {}) => ({ options, children: [] });

describe('RequestVcDocumentBlock.validate', () => {
    it('exposes the requestVcDocumentBlock block type', () => {
        assert.equal(RequestVcDocumentBlock.blockType, 'requestVcDocumentBlock');
    });

    it('passes when schema is present and presetSchema absent', async () => {
        const v = new FakeValidator();
        await RequestVcDocumentBlock.validate(v, ref({ schema: 's1' }));
        assert.deepEqual(v.errors, []);
    });

    it('errors when required schema is missing', async () => {
        const v = new FakeValidator();
        await RequestVcDocumentBlock.validate(v, ref({}));
        assert.include(v.errors, 'schema required');
    });

    it('surfaces a schema validation issue', async () => {
        const v = new FakeValidator({ schemaIssues: { schema: 'bad schema' } });
        await RequestVcDocumentBlock.validate(v, ref({ schema: 's1' }));
        assert.include(v.errors, 'bad schema');
    });

    it('surfaces a presetSchema validation issue', async () => {
        const v = new FakeValidator({ schemaIssues: { presetSchema: 'bad preset' } });
        await RequestVcDocumentBlock.validate(v, ref({ schema: 's1', presetSchema: 'p1' }));
        assert.include(v.errors, 'bad preset');
    });

    it('does not require presetSchema', async () => {
        const v = new FakeValidator();
        await RequestVcDocumentBlock.validate(v, ref({ schema: 's1' }));
        assert.notInclude(v.errors, 'presetSchema required');
    });

    it('wraps a thrown error as Unhandled exception', async () => {
        const v = new FakeValidator({ throwOnArtifact: true });
        await RequestVcDocumentBlock.validate(v, { options: { schema: 's1', artifacts: [{ uuid: 'a' }] }, children: [] });
        assert.include(v.errors, 'Unhandled exception store down');
    });
});

describe('RequestVcDocumentBlockAddon.validate', () => {
    it('exposes the requestVcDocumentBlockAddon block type', () => {
        assert.equal(RequestVcDocumentBlockAddon.blockType, 'requestVcDocumentBlockAddon');
    });

    it('passes a complete config', async () => {
        const v = new FakeValidator();
        await RequestVcDocumentBlockAddon.validate(v, ref({ schema: 's1', buttonName: 'Go', dialogTitle: 'Title' }));
        assert.deepEqual(v.errors, []);
    });

    it('errors on missing required schema', async () => {
        const v = new FakeValidator();
        await RequestVcDocumentBlockAddon.validate(v, ref({ buttonName: 'Go', dialogTitle: 'Title' }));
        assert.include(v.errors, 'schema required');
    });

    it('errors on missing buttonName', async () => {
        const v = new FakeValidator();
        await RequestVcDocumentBlockAddon.validate(v, ref({ schema: 's1', dialogTitle: 'Title' }));
        assert.include(v.errors, 'Button name is empty');
    });

    it('errors on missing dialogTitle', async () => {
        const v = new FakeValidator();
        await RequestVcDocumentBlockAddon.validate(v, ref({ schema: 's1', buttonName: 'Go' }));
        assert.include(v.errors, 'Dialog title is empty');
    });

    it('requires presetSchema when preset is truthy', async () => {
        const v = new FakeValidator();
        await RequestVcDocumentBlockAddon.validate(v, ref({ schema: 's1', buttonName: 'Go', dialogTitle: 'Title', preset: true }));
        assert.include(v.errors, 'presetSchema required');
    });

    it('does not require presetSchema when preset is falsy', async () => {
        const v = new FakeValidator();
        await RequestVcDocumentBlockAddon.validate(v, ref({ schema: 's1', buttonName: 'Go', dialogTitle: 'Title', preset: false }));
        assert.notInclude(v.errors, 'presetSchema required');
    });

    it('accumulates multiple errors', async () => {
        const v = new FakeValidator();
        await RequestVcDocumentBlockAddon.validate(v, ref({}));
        assert.include(v.errors, 'schema required');
        assert.include(v.errors, 'Button name is empty');
        assert.include(v.errors, 'Dialog title is empty');
    });
});

describe('DocumentValidatorBlock.validate', () => {
    it('exposes the documentValidatorBlock block type', () => {
        assert.equal(DocumentValidatorBlock.blockType, 'documentValidatorBlock');
    });

    it('accepts documentType vc-document', async () => {
        const v = new FakeValidator();
        await DocumentValidatorBlock.validate(v, ref({ documentType: 'vc-document' }));
        assert.deepEqual(v.errors, []);
    });

    it('accepts documentType vp-document', async () => {
        const v = new FakeValidator();
        await DocumentValidatorBlock.validate(v, ref({ documentType: 'vp-document' }));
        assert.deepEqual(v.errors, []);
    });

    it('accepts documentType related-vc-document', async () => {
        const v = new FakeValidator();
        await DocumentValidatorBlock.validate(v, ref({ documentType: 'related-vc-document' }));
        assert.deepEqual(v.errors, []);
    });

    it('accepts documentType related-vp-document', async () => {
        const v = new FakeValidator();
        await DocumentValidatorBlock.validate(v, ref({ documentType: 'related-vp-document' }));
        assert.deepEqual(v.errors, []);
    });

    it('rejects an unknown documentType', async () => {
        const v = new FakeValidator();
        await DocumentValidatorBlock.validate(v, ref({ documentType: 'mystery' }));
        assert.include(v.errors, 'Option "documentType" must be one of vc-document,vp-document,related-vc-document,related-vp-document');
    });

    it('rejects a missing documentType', async () => {
        const v = new FakeValidator();
        await DocumentValidatorBlock.validate(v, ref({}));
        assert.include(v.errors, 'Option "documentType" must be one of vc-document,vp-document,related-vc-document,related-vp-document');
    });

    it('surfaces a schema validation issue (schema optional)', async () => {
        const v = new FakeValidator({ schemaIssues: { schema: 'bad schema' } });
        await DocumentValidatorBlock.validate(v, ref({ documentType: 'vc-document', schema: 's1' }));
        assert.include(v.errors, 'bad schema');
    });

    it('does not require a schema', async () => {
        const v = new FakeValidator();
        await DocumentValidatorBlock.validate(v, ref({ documentType: 'vc-document' }));
        assert.notInclude(v.errors, 'schema required');
    });

    it('accepts conditions as an array', async () => {
        const v = new FakeValidator();
        await DocumentValidatorBlock.validate(v, ref({ documentType: 'vc-document', conditions: [] }));
        assert.deepEqual(v.errors, []);
    });

    it('rejects non-array conditions', async () => {
        const v = new FakeValidator();
        await DocumentValidatorBlock.validate(v, ref({ documentType: 'vc-document', conditions: { a: 1 } }));
        assert.include(v.errors, 'conditions option must be an array');
    });

    it('wraps a thrown error as Unhandled exception', async () => {
        const v = new FakeValidator({ throwOnArtifact: true });
        await DocumentValidatorBlock.validate(v, { options: { documentType: 'vc-document', artifacts: [{ uuid: 'a' }] }, children: [] });
        assert.include(v.errors, 'Unhandled exception store down');
    });
});
