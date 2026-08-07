import { assert } from 'chai';
import { InterfaceDocumentActionBlock } from '../../../dist/policy-engine/block-validators/blocks/action-block.js';

class FakeValidator {
    constructor(opts = {}) {
        this.errors = [];
        this.checked = [];
        this._schemaResult = opts.schemaResult ?? null;
        this._throw = !!opts.throwGetArtifact;
    }
    addError(msg) { this.errors.push(msg); }
    getErrorMessage(err) { return err?.message ?? String(err); }
    async getArtifact() { if (this._throw) { throw new Error('artifact-down'); } return {}; }
    validateSchemaVariable(name, value, required) {
        if (this._schemaResult !== null) { return this._schemaResult; }
        if (required && !value) { return `${name} is required`; }
        return null;
    }
    checkBlockError(error) { if (error) { this.checked.push(error); } }
}

const ref = (options = {}) => ({ options, children: [] });

describe('@unit P0 InterfaceDocumentActionBlock extra', () => {
    it('blockType is interfaceActionBlock', () => {
        assert.equal(InterfaceDocumentActionBlock.blockType, 'interfaceActionBlock');
    });

    it('selector with valid uiMetaData options and field passes', async () => {
        const v = new FakeValidator();
        await InterfaceDocumentActionBlock.validate(v, ref({
            type: 'selector', field: 'f', uiMetaData: { options: [{ tag: 'a' }, { tag: 'b' }] },
        }));
        assert.deepEqual(v.errors, []);
    });

    it('selector with missing uiMetaData.options reports not set', async () => {
        const v = new FakeValidator();
        await InterfaceDocumentActionBlock.validate(v, ref({
            type: 'selector', field: 'f', uiMetaData: {},
        }));
        assert.include(v.errors, 'Option "uiMetaData.options" is not set');
    });

    it('selector flags an option missing its tag', async () => {
        const v = new FakeValidator();
        await InterfaceDocumentActionBlock.validate(v, ref({
            type: 'selector', field: 'f', uiMetaData: { options: [{}] },
        }));
        assert.include(v.errors, 'Option "tag" is not set');
    });

    it('selector with an empty options array passes (field present)', async () => {
        const v = new FakeValidator();
        await InterfaceDocumentActionBlock.validate(v, ref({
            type: 'selector', field: 'f', uiMetaData: { options: [] },
        }));
        assert.deepEqual(v.errors, []);
    });

    it('download with targetUrl and valid schema passes', async () => {
        const v = new FakeValidator({ schemaResult: null });
        await InterfaceDocumentActionBlock.validate(v, ref({
            type: 'download', targetUrl: 'https://x', schema: '#A',
        }));
        assert.deepEqual(v.errors, []);
        assert.deepEqual(v.checked, []);
    });

    it('download routes schema error via checkBlockError', async () => {
        const v = new FakeValidator({ schemaResult: 'schema is required' });
        await InterfaceDocumentActionBlock.validate(v, ref({
            type: 'download', targetUrl: 'https://x',
        }));
        assert.include(v.checked, 'schema is required');
    });

    it('dropdown with name and value passes', async () => {
        const v = new FakeValidator();
        await InterfaceDocumentActionBlock.validate(v, ref({ type: 'dropdown', name: 'n', value: 'v' }));
        assert.deepEqual(v.errors, []);
    });

    it('dropdown missing value reports not set', async () => {
        const v = new FakeValidator();
        await InterfaceDocumentActionBlock.validate(v, ref({ type: 'dropdown', name: 'n' }));
        assert.include(v.errors, 'Option "value" is not set');
    });

    it('transformation type passes with no further checks', async () => {
        const v = new FakeValidator();
        await InterfaceDocumentActionBlock.validate(v, ref({ type: 'transformation' }));
        assert.deepEqual(v.errors, []);
    });

    it('captures unhandled exception path', async () => {
        const v = new FakeValidator({ throwGetArtifact: true });
        await InterfaceDocumentActionBlock.validate(v, ref({ type: 'transformation', artifacts: [{ uuid: 'a' }] }));
        assert.equal(v.errors.some((e) => /artifact-down/.test(e)), true);
    });
});
