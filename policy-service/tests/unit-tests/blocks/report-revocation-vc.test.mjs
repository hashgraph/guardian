import { assert } from 'chai';
import { ReportBlock } from '../../../dist/policy-engine/block-validators/blocks/report-block.js';
import { RevocationBlock } from '../../../dist/policy-engine/block-validators/blocks/revocation-block.js';
import { RequestVcDocumentBlock } from '../../../dist/policy-engine/block-validators/blocks/request-vc-document-block.js';

class FakeValidator {
    constructor() {
        this.errors = [];
        this.checked = [];
    }
    addError(msg) { this.errors.push(msg); }
    async getArtifact() { return {}; }
    getErrorMessage(err) { return err?.message ?? String(err); }
    validateSchemaVariable(name, value, required) {
        if (required && !value) return `${name} is required`;
        return null;
    }
    checkBlockError(error) { if (error) this.checked.push(error); }
}

describe('ReportBlock.validate', () => {
    it('passes without options (delegates to CommonBlock only)', async () => {
        const v = new FakeValidator();
        await ReportBlock.validate(v, { options: {}, children: [] });
        assert.deepEqual(v.errors, []);
    });
});

describe('RevocationBlock.validate', () => {
    it('passes when updatePrevDoc is false', async () => {
        const v = new FakeValidator();
        await RevocationBlock.validate(v, { options: {}, children: [] });
        assert.deepEqual(v.errors, []);
    });

    it('rejects updatePrevDoc=true without prevDocStatus', async () => {
        const v = new FakeValidator();
        await RevocationBlock.validate(v, {
            options: { updatePrevDoc: true },
            children: [],
        });
        assert.include(v.errors, 'Option "Status Value" is not set');
    });

    it('passes when both updatePrevDoc and prevDocStatus are set', async () => {
        const v = new FakeValidator();
        await RevocationBlock.validate(v, {
            options: { updatePrevDoc: true, prevDocStatus: 'revoked' },
            children: [],
        });
        assert.deepEqual(v.errors, []);
    });
});

describe('RequestVcDocumentBlock.validate', () => {
    it('flags missing required schema via checkBlockError', async () => {
        const v = new FakeValidator();
        await RequestVcDocumentBlock.validate(v, { options: {}, children: [] });
        assert.include(v.checked, 'schema is required');
    });

    it('passes a fully-set schema config', async () => {
        const v = new FakeValidator();
        await RequestVcDocumentBlock.validate(v, {
            options: { schema: 's-1', presetSchema: 'ps-1' },
            children: [],
        });
        assert.deepEqual(v.errors, []);
        assert.deepEqual(v.checked, []);
    });
});
