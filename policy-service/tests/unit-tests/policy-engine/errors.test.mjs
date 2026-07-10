import assert from 'node:assert/strict';
import { Module } from 'node:module';

const originalLoad = Module._load;
Module._load = function (req, parent, ...rest) {
    if (typeof req !== 'string') return originalLoad.call(this, req, parent, ...rest);
    if (req && req.endsWith && req.endsWith('interfaces/index.js')) {
        return { BlockError: class {} };
    }
    return originalLoad.call(this, req, parent, ...rest);
};

const errors = await import('../../../dist/policy-engine/errors/index.js');
const { BlockActionError, BlockInitError, PolicyOtherError } = errors;

after(() => { Module._load = originalLoad; });

describe('@unit @contract BlockActionError', () => {
    it('extends Error and carries the message', () => {
        const e = new BlockActionError('boom', 'interfaceActionBlock', 'uuid-1');
        assert.ok(e instanceof Error);
        assert.equal(e.message, 'boom');
    });

    it('errorObject discriminator is "blockActionError" — never change (frontend parses by type)', () => {
        const e = new BlockActionError('boom', 'b', 'u');
        assert.equal(e.errorObject.type, 'blockActionError');
    });

    it('errorObject carries code=500 by default', () => {
        const e = new BlockActionError('boom', 'b', 'u');
        assert.equal(e.errorObject.code, 500);
    });

    it('errorObject carries blockType and uuid forward', () => {
        const e = new BlockActionError('boom', 'aggregateBlock', 'block-uuid-42');
        assert.equal(e.errorObject.blockType, 'aggregateBlock');
        assert.equal(e.errorObject.uuid, 'block-uuid-42');
    });

    it('errorObject includes the message verbatim', () => {
        const e = new BlockActionError('Something went wrong: details', 'b', 'u');
        assert.equal(e.errorObject.message, 'Something went wrong: details');
    });
});

describe('@unit @contract BlockInitError', () => {
    it('extends Error', () => {
        const e = new BlockInitError('init failed', 'b', 'u');
        assert.ok(e instanceof Error);
        assert.equal(e.message, 'init failed');
    });

    it('errorObject discriminator is "blockInitError" — distinct from action errors', () => {
        const e = new BlockInitError('x', 'b', 'u');
        assert.equal(e.errorObject.type, 'blockInitError');
    });

    it('errorObject shape parity with BlockActionError (code/uuid/blockType/message)', () => {
        const e = new BlockInitError('init-x', 'aggregateBlock', 'u-1');
        assert.equal(e.errorObject.code, 500);
        assert.equal(e.errorObject.blockType, 'aggregateBlock');
        assert.equal(e.errorObject.uuid, 'u-1');
        assert.equal(e.errorObject.message, 'init-x');
    });

    it('discriminator differs from BlockActionError (different type strings)', () => {
        const init = new BlockInitError('x', 'b', 'u');
        const action = new BlockActionError('x', 'b', 'u');
        assert.notEqual(init.errorObject.type, action.errorObject.type);
    });
});

describe('@unit @contract PolicyOtherError', () => {
    it('extends Error', () => {
        const e = new PolicyOtherError('policy down', 'p-1');
        assert.ok(e instanceof Error);
        assert.equal(e.message, 'policy down');
    });

    it('errorObject discriminator is "policyOtherError"', () => {
        const e = new PolicyOtherError('x', 'p-1');
        assert.equal(e.errorObject.type, 'policyOtherError');
    });

    it('defaults code to 500', () => {
        const e = new PolicyOtherError('x', 'p-1');
        assert.equal(e.errorObject.code, 500);
    });

    it('honours custom code argument', () => {
        const e = new PolicyOtherError('x', 'p-1', 404);
        assert.equal(e.errorObject.code, 404);
    });

    it('carries policyId (not blockType/uuid — different shape from block errors)', () => {
        const e = new PolicyOtherError('x', 'policy-abc');
        assert.equal(e.errorObject.policyId, 'policy-abc');
        assert.equal(e.errorObject.blockType, undefined);
        assert.equal(e.errorObject.uuid, undefined);
    });
});

describe('@unit error-type cross-invariants', () => {
    it('all three discriminators are unique strings', () => {
        const a = new BlockActionError('a', 'b', 'u').errorObject.type;
        const b = new BlockInitError('b', 'b', 'u').errorObject.type;
        const c = new PolicyOtherError('c', 'p').errorObject.type;
        assert.equal(new Set([a, b, c]).size, 3);
    });

    it('all three are catchable as Error', () => {
        const errors = [
            new BlockActionError('a', 'b', 'u'),
            new BlockInitError('b', 'b', 'u'),
            new PolicyOtherError('c', 'p'),
        ];
        for (const e of errors) {
            try { throw e; } catch (caught) { assert.ok(caught instanceof Error); }
        }
    });

    it('all three are JSON-serialisable via errorObject', () => {
        for (const e of [
            new BlockActionError('msg', 'b', 'u'),
            new BlockInitError('msg', 'b', 'u'),
            new PolicyOtherError('msg', 'p'),
        ]) {
            const json = JSON.parse(JSON.stringify(e.errorObject));
            assert.equal(json.type, e.errorObject.type);
            assert.equal(json.message, 'msg');
        }
    });
});
