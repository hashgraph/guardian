import { assert } from 'chai';
import { CustomLogicBlock } from '../../../dist/policy-engine/block-validators/blocks/custom-logic-block.js';
import { InterfaceStepBlock } from '../../../dist/policy-engine/block-validators/blocks/step-block.js';
import { ExtractDataBlock } from '../../../dist/policy-engine/block-validators/blocks/extract-data.js';
import { MessagesReportBlock } from '../../../dist/policy-engine/block-validators/blocks/messages-report-block.js';
import { ReportItemBlock } from '../../../dist/policy-engine/block-validators/blocks/report-item-block.js';
import { RevokeBlock } from '../../../dist/policy-engine/block-validators/blocks/revoke-block.js';
import { RevocationBlock } from '../../../dist/policy-engine/block-validators/blocks/revocation-block.js';

class FakeValidator {
    constructor(opts = {}) {
        this.errors = [];
        this._throw = !!opts.throwGetArtifact;
    }
    addError(msg) { this.errors.push(msg); }
    getErrorMessage(err) { return err?.message ?? String(err); }
    async getArtifact() { if (this._throw) { throw new Error('artifact-down'); } return {}; }
}

const ref = (options = {}) => ({ options, children: [] });
const artifactRef = () => ({ options: { artifacts: [{ uuid: 'a' }] }, children: [] });

const passthroughBlocks = [
    ['CustomLogicBlock', CustomLogicBlock, 'customLogicBlock'],
    ['InterfaceStepBlock', InterfaceStepBlock, 'interfaceStepBlock'],
    ['ExtractDataBlock', ExtractDataBlock, 'extractDataBlock'],
    ['MessagesReportBlock', MessagesReportBlock, 'messagesReportBlock'],
    ['ReportItemBlock', ReportItemBlock, 'reportItemBlock'],
];

for (const [label, Block, type] of passthroughBlocks) {
    describe(`@unit P0 ${label} (CommonBlock passthrough)`, () => {
        it(`blockType is ${type}`, () => {
            assert.equal(Block.blockType, type);
        });

        it('passes empty options without errors', async () => {
            const v = new FakeValidator();
            await Block.validate(v, ref({}));
            assert.deepEqual(v.errors, []);
        });

        it('passes when artifacts resolve', async () => {
            const v = new FakeValidator();
            await Block.validate(v, artifactRef());
            assert.deepEqual(v.errors, []);
        });

        it('reports a missing/null artifact via CommonBlock', async () => {
            const v = new FakeValidator();
            await Block.validate(v, { options: { artifacts: [null] }, children: [] });
            assert.include(v.errors, 'Artifact does not exist');
        });

        it('captures unhandled exception from getArtifact', async () => {
            const v = new FakeValidator({ throwGetArtifact: true });
            await Block.validate(v, artifactRef());
            assert.equal(v.errors.some((e) => /artifact-down/.test(e)), true);
        });
    });
}

describe('@unit P0 RevokeBlock.validate', () => {
    it('blockType is revokeBlock', () => {
        assert.equal(RevokeBlock.blockType, 'revokeBlock');
    });

    it('rejects missing uiMetaData', async () => {
        const v = new FakeValidator();
        await RevokeBlock.validate(v, ref({}));
        assert.include(v.errors, 'Option "uiMetaData" is not set');
    });

    it('rejects non-object uiMetaData', async () => {
        const v = new FakeValidator();
        await RevokeBlock.validate(v, ref({ uiMetaData: 'oops' }));
        assert.include(v.errors, 'Option "uiMetaData" is not set');
    });

    it('returns early after uiMetaData error (no Status Value error)', async () => {
        const v = new FakeValidator();
        await RevokeBlock.validate(v, ref({}));
        assert.equal(v.errors.length, 1);
    });

    it('rejects updatePrevDoc without prevDocStatus', async () => {
        const v = new FakeValidator();
        await RevokeBlock.validate(v, ref({ uiMetaData: { updatePrevDoc: true } }));
        assert.include(v.errors, 'Option "Status Value" is not set');
    });

    it('passes when updatePrevDoc true and prevDocStatus set', async () => {
        const v = new FakeValidator();
        await RevokeBlock.validate(v, ref({ uiMetaData: { updatePrevDoc: true, prevDocStatus: 'Done' } }));
        assert.deepEqual(v.errors, []);
    });

    it('passes when updatePrevDoc is false', async () => {
        const v = new FakeValidator();
        await RevokeBlock.validate(v, ref({ uiMetaData: { updatePrevDoc: false } }));
        assert.deepEqual(v.errors, []);
    });

    it('passes for a minimal empty-object uiMetaData', async () => {
        const v = new FakeValidator();
        await RevokeBlock.validate(v, ref({ uiMetaData: {} }));
        assert.deepEqual(v.errors, []);
    });

    it('captures unhandled exception path', async () => {
        const v = new FakeValidator({ throwGetArtifact: true });
        await RevokeBlock.validate(v, { options: { artifacts: [{ uuid: 'a' }], uiMetaData: {} }, children: [] });
        assert.equal(v.errors.some((e) => /artifact-down/.test(e)), true);
    });
});

describe('@unit P0 RevocationBlock.validate', () => {
    it('blockType is revocationBlock', () => {
        assert.equal(RevocationBlock.blockType, 'revocationBlock');
    });

    it('passes with empty options', async () => {
        const v = new FakeValidator();
        await RevocationBlock.validate(v, ref({}));
        assert.deepEqual(v.errors, []);
    });

    it('rejects updatePrevDoc without prevDocStatus', async () => {
        const v = new FakeValidator();
        await RevocationBlock.validate(v, ref({ updatePrevDoc: true }));
        assert.include(v.errors, 'Option "Status Value" is not set');
    });

    it('passes when updatePrevDoc true and prevDocStatus set', async () => {
        const v = new FakeValidator();
        await RevocationBlock.validate(v, ref({ updatePrevDoc: true, prevDocStatus: 'Revoked' }));
        assert.deepEqual(v.errors, []);
    });

    it('passes when updatePrevDoc is false', async () => {
        const v = new FakeValidator();
        await RevocationBlock.validate(v, ref({ updatePrevDoc: false }));
        assert.deepEqual(v.errors, []);
    });

    it('captures unhandled exception path', async () => {
        const v = new FakeValidator({ throwGetArtifact: true });
        await RevocationBlock.validate(v, artifactRef());
        assert.equal(v.errors.some((e) => /artifact-down/.test(e)), true);
    });
});
