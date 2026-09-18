import { assert } from 'chai';
import { DocumentValidatorBlock } from '../../../dist/policy-engine/block-validators/blocks/document-validator-block.js';

class FakeValidator {
    constructor() {
        this.errors = [];
        this.checked = [];
    }
    addError(msg) { this.errors.push(msg); }
    async getArtifact() { return {}; }
    getErrorMessage(err) { return err?.message ?? String(err); }
    validateSchemaVariable(name, value, required) {
        // mimic returning null when fine, error string when required and missing
        if (required && !value) return `${name} is required`;
        return null;
    }
    checkBlockError(error) {
        if (error) this.checked.push(error);
    }
}

const refWith = (overrides = {}) => ({
    options: { documentType: 'vc-document', ...overrides },
    children: [],
});

describe('DocumentValidatorBlock.validate', () => {
    it('accepts every documented type', async () => {
        for (const t of ['vc-document', 'vp-document', 'related-vc-document', 'related-vp-document']) {
            const v = new FakeValidator();
            await DocumentValidatorBlock.validate(v, refWith({ documentType: t }));
            assert.deepEqual(v.errors, []);
        }
    });

    it('rejects an unknown documentType', async () => {
        const v = new FakeValidator();
        await DocumentValidatorBlock.validate(v, refWith({ documentType: 'random' }));
        assert.match(v.errors[0], /^Option "documentType" must be one of /);
    });

    it('rejects non-array conditions', async () => {
        const v = new FakeValidator();
        await DocumentValidatorBlock.validate(v, refWith({ conditions: 'oops' }));
        assert.include(v.errors, 'conditions option must be an array');
    });

    it('passes through schema validation via checkBlockError', async () => {
        const v = new FakeValidator();
        await DocumentValidatorBlock.validate(v, refWith({ schema: 'schema-1' }));
        // not required → returns null → checkBlockError called with null → not pushed
        assert.deepEqual(v.checked, []);
    });

    describe('sourceValidations', () => {
        it('accepts a valid sourceValidations array', async () => {
            const v = new FakeValidator();
            await DocumentValidatorBlock.validate(v, refWith({
                sourceValidations: [{ dbCollection: 'VcDocument', filters: [], conditions: [] }]
            }));
            assert.deepEqual(v.errors, []);
        });

        it('rejects sourceValidations that is not an array', async () => {
            const v = new FakeValidator();
            await DocumentValidatorBlock.validate(v, refWith({ sourceValidations: 'bad' }));
            assert.ok(v.errors.some(e => e.includes('sourceValidations')));
        });

        it('rejects an entry with an invalid dbCollection', async () => {
            const v = new FakeValidator();
            await DocumentValidatorBlock.validate(v, refWith({
                sourceValidations: [{ dbCollection: 'UnknownCollection' }]
            }));
            assert.ok(v.errors.some(e => e.includes('dbCollection')));
        });

        it('accepts VpDocument as dbCollection', async () => {
            const v = new FakeValidator();
            await DocumentValidatorBlock.validate(v, refWith({
                sourceValidations: [{ dbCollection: 'VpDocument' }]
            }));
            assert.deepEqual(v.errors, []);
        });

        it('rejects filters that is not an array', async () => {
            const v = new FakeValidator();
            await DocumentValidatorBlock.validate(v, refWith({
                sourceValidations: [{ dbCollection: 'VcDocument', filters: 'bad' }]
            }));
            assert.ok(v.errors.some(e => e.includes('filters')));
        });

        it('rejects conditions that is not an array', async () => {
            const v = new FakeValidator();
            await DocumentValidatorBlock.validate(v, refWith({
                sourceValidations: [{ dbCollection: 'VcDocument', conditions: 'bad' }]
            }));
            assert.ok(v.errors.some(e => e.includes('conditions')));
        });

        it('accepts undefined filters and conditions', async () => {
            const v = new FakeValidator();
            await DocumentValidatorBlock.validate(v, refWith({
                sourceValidations: [{ dbCollection: 'VcDocument' }]
            }));
            assert.deepEqual(v.errors, []);
        });

        it('validates multiple entries independently', async () => {
            const v = new FakeValidator();
            await DocumentValidatorBlock.validate(v, refWith({
                sourceValidations: [
                    { dbCollection: 'VcDocument' },
                    { dbCollection: 'Bad' },
                    { dbCollection: 'VpDocument', filters: 'x' },
                ]
            }));
            assert.equal(v.errors.length, 2);
        });
    });
});
