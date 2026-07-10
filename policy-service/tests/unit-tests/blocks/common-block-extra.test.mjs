import { assert } from 'chai';
import { CommonBlock } from '../../../dist/policy-engine/block-validators/blocks/common.js';

class FakeValidator {
    constructor(opts = {}) {
        this.errors = [];
        this._artifacts = opts.artifacts || {};
        this._throwOn = opts.throwOn || null;
    }
    addError(msg) { this.errors.push(msg); }
    getErrorMessage(err) { return err?.message ?? String(err); }
    async getArtifact(uuid) {
        if (this._throwOn === uuid) { throw new Error(`store-down:${uuid}`); }
        return this._artifacts[uuid];
    }
}

const ref = (options = {}) => ({ options, children: [] });

describe('@unit P0 CommonBlock.validate', () => {
    it('returns true when no artifacts option present', async () => {
        const v = new FakeValidator();
        const result = await CommonBlock.validate(v, ref({}));
        assert.isTrue(result);
        assert.deepEqual(v.errors, []);
    });

    it('returns true when artifacts is not an array', async () => {
        const v = new FakeValidator();
        const result = await CommonBlock.validate(v, ref({ artifacts: 'not-array' }));
        assert.isTrue(result);
        assert.deepEqual(v.errors, []);
    });

    it('returns true for an empty artifacts array', async () => {
        const v = new FakeValidator();
        const result = await CommonBlock.validate(v, ref({ artifacts: [] }));
        assert.isTrue(result);
        assert.deepEqual(v.errors, []);
    });

    it('returns true when all artifacts resolve to files', async () => {
        const v = new FakeValidator({ artifacts: { a1: { data: 1 }, a2: { data: 2 } } });
        const result = await CommonBlock.validate(
            v,
            ref({ artifacts: [{ uuid: 'a1' }, { uuid: 'a2' }] }),
        );
        assert.isTrue(result);
        assert.deepEqual(v.errors, []);
    });

    it('returns false and errors when an artifact entry is null', async () => {
        const v = new FakeValidator();
        const result = await CommonBlock.validate(v, ref({ artifacts: [null] }));
        assert.isFalse(result);
        assert.include(v.errors, 'Artifact does not exist');
    });

    it('returns false and errors when an artifact entry is undefined', async () => {
        const v = new FakeValidator();
        const result = await CommonBlock.validate(v, ref({ artifacts: [undefined] }));
        assert.isFalse(result);
        assert.include(v.errors, 'Artifact does not exist');
    });

    it('returns false when artifact file is not found by uuid', async () => {
        const v = new FakeValidator({ artifacts: {} });
        const result = await CommonBlock.validate(v, ref({ artifacts: [{ uuid: 'missing' }] }));
        assert.isFalse(result);
        assert.include(v.errors, 'Artifact with id "missing" does not exist');
    });

    it('stops at the first missing artifact (short-circuits)', async () => {
        const v = new FakeValidator({ artifacts: { ok: { data: 1 } } });
        const result = await CommonBlock.validate(
            v,
            ref({ artifacts: [{ uuid: 'bad' }, { uuid: 'ok' }] }),
        );
        assert.isFalse(result);
        assert.equal(v.errors.length, 1);
        assert.include(v.errors[0], '"bad"');
    });

    it('propagates errors thrown by getArtifact (no internal catch)', async () => {
        const v = new FakeValidator({ throwOn: 'boom' });
        let caught = null;
        try {
            await CommonBlock.validate(v, ref({ artifacts: [{ uuid: 'boom' }] }));
        } catch (e) {
            caught = e;
        }
        assert.isNotNull(caught);
        assert.match(caught.message, /store-down:boom/);
    });

    it('a falsy artifact reported before any lookup happens', async () => {
        const v = new FakeValidator({ throwOn: 'x' });
        const result = await CommonBlock.validate(v, ref({ artifacts: [0] }));
        assert.isFalse(result);
        assert.include(v.errors, 'Artifact does not exist');
    });
});
