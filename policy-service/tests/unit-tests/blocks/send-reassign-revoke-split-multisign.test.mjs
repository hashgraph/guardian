import { assert } from 'chai';
import { SendToGuardianBlock } from '../../../dist/policy-engine/block-validators/blocks/send-to-guardian-block.js';
import { ReassigningBlock } from '../../../dist/policy-engine/block-validators/blocks/reassigning.block.js';
import { RevokeBlock } from '../../../dist/policy-engine/block-validators/blocks/revoke-block.js';
import { SplitBlock } from '../../../dist/policy-engine/block-validators/blocks/split-block.js';
import { MultiSignBlock } from '../../../dist/policy-engine/block-validators/blocks/multi-sign-block.js';

class FakeValidator {
    constructor(opts = {}) {
        this.errors = [];
        this._topicMissing = !!opts.topicMissing;
        this._throwOnArtifact = !!opts.throwOnArtifact;
    }
    addError(msg) { this.errors.push(msg); }
    topicTemplateNotExist() { return this._topicMissing; }
    async getArtifact() {
        if (this._throwOnArtifact) { throw new Error('boom'); }
        return {};
    }
    getErrorMessage(err) { return err?.message ?? String(err); }
}

const ref = (options = {}) => ({ options, children: [] });

describe('SendToGuardianBlock.validate', () => {
    it('exposes the sendToGuardianBlock block type', () => {
        assert.equal(SendToGuardianBlock.blockType, 'sendToGuardianBlock');
    });

    it('passes when nothing is set', async () => {
        const v = new FakeValidator();
        await SendToGuardianBlock.validate(v, ref({}));
        assert.deepEqual(v.errors, []);
    });

    it('accepts dataType vc-documents', async () => {
        const v = new FakeValidator();
        await SendToGuardianBlock.validate(v, ref({ dataType: 'vc-documents' }));
        assert.deepEqual(v.errors, []);
    });

    it('accepts dataType did-documents', async () => {
        const v = new FakeValidator();
        await SendToGuardianBlock.validate(v, ref({ dataType: 'did-documents' }));
        assert.deepEqual(v.errors, []);
    });

    it('accepts dataType approve', async () => {
        const v = new FakeValidator();
        await SendToGuardianBlock.validate(v, ref({ dataType: 'approve' }));
        assert.deepEqual(v.errors, []);
    });

    it('accepts dataType hedera', async () => {
        const v = new FakeValidator();
        await SendToGuardianBlock.validate(v, ref({ dataType: 'hedera' }));
        assert.deepEqual(v.errors, []);
    });

    it('rejects an unknown dataType', async () => {
        const v = new FakeValidator();
        await SendToGuardianBlock.validate(v, ref({ dataType: 'mystery' }));
        assert.include(v.errors, 'Option "dataType" must be one of vc-documents|did-documents|approve|hedera');
    });

    it('accepts dataSource auto', async () => {
        const v = new FakeValidator();
        await SendToGuardianBlock.validate(v, ref({ dataSource: 'auto' }));
        assert.deepEqual(v.errors, []);
    });

    it('accepts dataSource database', async () => {
        const v = new FakeValidator();
        await SendToGuardianBlock.validate(v, ref({ dataSource: 'database' }));
        assert.deepEqual(v.errors, []);
    });

    it('accepts dataSource hedera with root topic', async () => {
        const v = new FakeValidator();
        await SendToGuardianBlock.validate(v, ref({ dataSource: 'hedera', topic: 'root' }));
        assert.deepEqual(v.errors, []);
    });

    it('accepts dataSource hedera with no topic', async () => {
        const v = new FakeValidator();
        await SendToGuardianBlock.validate(v, ref({ dataSource: 'hedera' }));
        assert.deepEqual(v.errors, []);
    });

    it('accepts dataSource hedera with an existing topic template', async () => {
        const v = new FakeValidator();
        await SendToGuardianBlock.validate(v, ref({ dataSource: 'hedera', topic: 't1' }));
        assert.deepEqual(v.errors, []);
    });

    it('rejects dataSource hedera with a missing topic template', async () => {
        const v = new FakeValidator({ topicMissing: true });
        await SendToGuardianBlock.validate(v, ref({ dataSource: 'hedera', topic: 't1' }));
        assert.include(v.errors, 'Topic "t1" does not exist');
    });

    it('rejects an unknown dataSource', async () => {
        const v = new FakeValidator();
        await SendToGuardianBlock.validate(v, ref({ dataSource: 'cloud' }));
        assert.include(v.errors, 'Option "dataSource" must be one of auto|database|hedera');
    });

    it('prefers dataType branch over dataSource branch', async () => {
        const v = new FakeValidator();
        await SendToGuardianBlock.validate(v, ref({ dataType: 'vc-documents', dataSource: 'cloud' }));
        assert.deepEqual(v.errors, []);
    });

    it('wraps a thrown error as Unhandled exception', async () => {
        const v = new FakeValidator({ throwOnArtifact: true });
        await SendToGuardianBlock.validate(v, { options: { artifacts: [{ uuid: 'a' }] }, children: [] });
        assert.include(v.errors, 'Unhandled exception boom');
    });
});

describe('ReassigningBlock.validate', () => {
    it('exposes the reassigningBlock block type', () => {
        assert.equal(ReassigningBlock.blockType, 'reassigningBlock');
    });

    it('passes with empty options', async () => {
        const v = new FakeValidator();
        await ReassigningBlock.validate(v, ref({}));
        assert.deepEqual(v.errors, []);
    });

    it('errors on a missing artifact (CommonBlock delegation)', async () => {
        const v = new FakeValidator();
        await ReassigningBlock.validate(v, { options: { artifacts: [null] }, children: [] });
        assert.include(v.errors, 'Artifact does not exist');
    });

    it('wraps a thrown error as Unhandled exception', async () => {
        const v = new FakeValidator({ throwOnArtifact: true });
        await ReassigningBlock.validate(v, { options: { artifacts: [{ uuid: 'a' }] }, children: [] });
        assert.include(v.errors, 'Unhandled exception boom');
    });
});

describe('RevokeBlock.validate', () => {
    it('exposes the revokeBlock block type', () => {
        assert.equal(RevokeBlock.blockType, 'revokeBlock');
    });

    it('errors when uiMetaData is missing', async () => {
        const v = new FakeValidator();
        await RevokeBlock.validate(v, ref({}));
        assert.include(v.errors, 'Option "uiMetaData" is not set');
    });

    it('errors when uiMetaData is not an object', async () => {
        const v = new FakeValidator();
        await RevokeBlock.validate(v, ref({ uiMetaData: 'nope' }));
        assert.include(v.errors, 'Option "uiMetaData" is not set');
    });

    it('passes with a minimal uiMetaData object', async () => {
        const v = new FakeValidator();
        await RevokeBlock.validate(v, ref({ uiMetaData: {} }));
        assert.deepEqual(v.errors, []);
    });

    it('errors when updatePrevDoc set without prevDocStatus', async () => {
        const v = new FakeValidator();
        await RevokeBlock.validate(v, ref({ uiMetaData: { updatePrevDoc: true } }));
        assert.include(v.errors, 'Option "Status Value" is not set');
    });

    it('passes when updatePrevDoc set with prevDocStatus', async () => {
        const v = new FakeValidator();
        await RevokeBlock.validate(v, ref({ uiMetaData: { updatePrevDoc: true, prevDocStatus: 'Revoked' } }));
        assert.deepEqual(v.errors, []);
    });

    it('passes when updatePrevDoc is false', async () => {
        const v = new FakeValidator();
        await RevokeBlock.validate(v, ref({ uiMetaData: { updatePrevDoc: false } }));
        assert.deepEqual(v.errors, []);
    });
});

describe('SplitBlock.validate', () => {
    it('exposes the splitBlock block type', () => {
        assert.equal(SplitBlock.blockType, 'splitBlock');
    });

    it('errors when threshold is not set', async () => {
        const v = new FakeValidator();
        await SplitBlock.validate(v, ref({}));
        assert.include(v.errors, 'Option "threshold" is not set');
    });

    it('errors when threshold is zero (falsy)', async () => {
        const v = new FakeValidator();
        await SplitBlock.validate(v, ref({ threshold: 0 }));
        assert.include(v.errors, 'Option "threshold" is not set');
    });

    it('passes with a numeric threshold', async () => {
        const v = new FakeValidator();
        await SplitBlock.validate(v, ref({ threshold: 10 }));
        assert.deepEqual(v.errors, []);
    });

    it('passes with a string threshold', async () => {
        const v = new FakeValidator();
        await SplitBlock.validate(v, ref({ threshold: '5.5' }));
        assert.deepEqual(v.errors, []);
    });
});

describe('MultiSignBlock.validate', () => {
    it('exposes the multiSignBlock block type', () => {
        assert.equal(MultiSignBlock.blockType, 'multiSignBlock');
    });

    it('errors when threshold is not set', async () => {
        const v = new FakeValidator();
        await MultiSignBlock.validate(v, ref({}));
        assert.include(v.errors, 'Option "threshold" is not set');
    });

    it('passes with a valid percentage threshold', async () => {
        const v = new FakeValidator();
        await MultiSignBlock.validate(v, ref({ threshold: 50 }));
        assert.deepEqual(v.errors, []);
    });

    it('passes at the lower bound of 0 via string (truthy)', async () => {
        const v = new FakeValidator();
        await MultiSignBlock.validate(v, ref({ threshold: '0' }));
        assert.deepEqual(v.errors, []);
    });

    it('passes at the upper bound of 100', async () => {
        const v = new FakeValidator();
        await MultiSignBlock.validate(v, ref({ threshold: 100 }));
        assert.deepEqual(v.errors, []);
    });

    it('errors when threshold exceeds 100', async () => {
        const v = new FakeValidator();
        await MultiSignBlock.validate(v, ref({ threshold: 150 }));
        assert.include(v.errors, '"threshold" value must be between 0 and 100');
    });

    it('errors when threshold is negative', async () => {
        const v = new FakeValidator();
        await MultiSignBlock.validate(v, ref({ threshold: '-5' }));
        assert.include(v.errors, '"threshold" value must be between 0 and 100');
    });
});
