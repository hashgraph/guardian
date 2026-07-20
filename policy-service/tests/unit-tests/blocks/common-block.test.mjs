import { assert } from 'chai';
import { CommonBlock } from '../../../dist/policy-engine/block-validators/blocks/common.js';

class FakeValidator {
    constructor(artifactMap = {}) {
        this.errors = [];
        this.artifacts = artifactMap;
    }
    addError(msg) { this.errors.push(msg); }
    async getArtifact(uuid) { return this.artifacts[uuid]; }
    getErrorMessage(err) { return err?.message ?? String(err); }
}

describe('CommonBlock.validate', () => {
    it('returns true and pushes no errors when ref has no artifacts option', async () => {
        const v = new FakeValidator();
        const ok = await CommonBlock.validate(v, { options: {} });
        assert.equal(ok, true);
        assert.deepEqual(v.errors, []);
    });

    it('returns true when artifacts is an empty array', async () => {
        const v = new FakeValidator();
        const ok = await CommonBlock.validate(v, { options: { artifacts: [] } });
        assert.equal(ok, true);
        assert.deepEqual(v.errors, []);
    });

    it('reports "Artifact does not exist" for null/undefined entries', async () => {
        const v = new FakeValidator();
        const ok = await CommonBlock.validate(v, { options: { artifacts: [null] } });
        assert.equal(ok, false);
        assert.include(v.errors, 'Artifact does not exist');
    });

    it('reports unknown UUID by name', async () => {
        const v = new FakeValidator({});
        const ok = await CommonBlock.validate(v, { options: { artifacts: [{ uuid: 'missing-uuid' }] } });
        assert.equal(ok, false);
        assert.include(v.errors, 'Artifact with id "missing-uuid" does not exist');
    });

    it('passes when every UUID resolves to a file', async () => {
        const v = new FakeValidator({ 'a': { name: 'a.bin' }, 'b': { name: 'b.bin' } });
        const ok = await CommonBlock.validate(v, { options: { artifacts: [{ uuid: 'a' }, { uuid: 'b' }] } });
        assert.equal(ok, true);
        assert.deepEqual(v.errors, []);
    });

    it('short-circuits at the first missing artifact', async () => {
        const v = new FakeValidator({ 'a': { name: 'a' } });
        await CommonBlock.validate(v, { options: { artifacts: [{ uuid: 'a' }, { uuid: 'missing' }, { uuid: 'a' }] } });
        // Exactly one error pushed (the missing one)
        assert.equal(v.errors.length, 1);
        assert.include(v.errors[0], 'missing');
    });
});
