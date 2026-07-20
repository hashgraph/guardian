import { assert } from 'chai';
import { DocumentsSourceAddon } from '../../../dist/policy-engine/block-validators/blocks/documents-source-addon.js';

const ALLOWED_TYPES = [
    'vc-documents',
    'did-documents',
    'vp-documents',
    'root-authorities',
    'standard-registries',
    'approve',
    'source',
];

class FakeValidator {
    constructor(opts = {}) {
        this.errors = [];
        this._schemaResults = opts.schemaResults || {}; // schema iri → error msg or null
    }
    addError(msg) { this.errors.push(msg); }
    async getArtifact() { return {}; }
    getErrorMessage(err) { return err?.message ?? String(err); }
    checkBlockError(err) { if (err) this.errors.push(err); }
    validateSchemaVariable(name, value, required) {
        if (!value && !required) return null;
        if (!value && required) return `Option "${name}" is not set`;
        if (typeof value !== 'string') return `Option "${name}" must be a string`;
        return this._schemaResults[value] ?? null;
    }
}

const ref = (options = {}) => ({ options: { dataType: 'vc-documents', ...options }, children: [] });

describe('@unit DocumentsSourceAddon.validate', () => {
    it('accepts a known dataType with no schema (schema is optional here)', async () => {
        const v = new FakeValidator();
        await DocumentsSourceAddon.validate(v, ref({ dataType: 'vc-documents' }));
        assert.deepEqual(v.errors, []);
    });

    for (const t of ALLOWED_TYPES) {
        it(`accepts dataType "${t}"`, async () => {
            const v = new FakeValidator();
            await DocumentsSourceAddon.validate(v, ref({ dataType: t }));
            assert.deepEqual(v.errors, []);
        });
    }

    it('rejects unknown dataType', async () => {
        const v = new FakeValidator();
        await DocumentsSourceAddon.validate(v, ref({ dataType: 'made-up-type' }));
        assert.equal(
            v.errors.some((e) => e.includes('"dataType" must be one of')),
            true,
        );
    });

    it('rejects when dataType is missing (undefined → not in list)', async () => {
        const v = new FakeValidator();
        await DocumentsSourceAddon.validate(v, { options: {}, children: [] });
        assert.equal(
            v.errors.some((e) => e.includes('"dataType"')),
            true,
        );
    });

    it('forwards schema errors when schema iri is unknown', async () => {
        const v = new FakeValidator({ schemaResults: { 'iri:unknown': 'Schema with id "iri:unknown" does not exist' } });
        await DocumentsSourceAddon.validate(v, ref({ schema: 'iri:unknown' }));
        assert.equal(
            v.errors.some((e) => /does not exist/.test(e)),
            true,
        );
    });

    it('does not error when schema iri is known and resolves cleanly', async () => {
        const v = new FakeValidator({ schemaResults: { 'iri:ok': null } });
        await DocumentsSourceAddon.validate(v, ref({ schema: 'iri:ok' }));
        assert.deepEqual(v.errors, []);
    });

    it('schema is optional — no error when omitted', async () => {
        const v = new FakeValidator();
        await DocumentsSourceAddon.validate(v, ref({}));
        assert.deepEqual(v.errors, []);
    });

    it('captures unhandled exceptions in the catch path (does not throw)', async () => {
        const v = new FakeValidator();
        v.validateSchemaVariable = () => { throw new Error('schema lookup blew up'); };
        await DocumentsSourceAddon.validate(v, ref({ schema: 'iri:x' }));
        assert.equal(
            v.errors.some((e) => /Unhandled exception/.test(e) && /schema lookup blew up/.test(e)),
            true,
        );
    });
});
