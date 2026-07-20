import { assert } from 'chai';
import {
    BlockActionError,
    BlockInitError,
    PolicyOtherError,
} from '../../../dist/policy-engine/errors/index.js';

describe('BlockActionError', () => {
    it('extends Error and exposes message via parent', () => {
        const err = new BlockActionError('boom', 'mintBlock', 'uuid-1');
        assert.instanceOf(err, Error);
        assert.equal(err.message, 'boom');
    });

    it('errorObject includes type/code/uuid/blockType/message', () => {
        const err = new BlockActionError('boom', 'mintBlock', 'uuid-1');
        assert.deepEqual(err.errorObject, {
            type: 'blockActionError',
            code: 500,
            uuid: 'uuid-1',
            blockType: 'mintBlock',
            message: 'boom',
        });
    });
});

describe('BlockInitError', () => {
    it('extends Error and exposes type=blockInitError', () => {
        const err = new BlockInitError('init failed', 'switchBlock', 'uuid-2');
        assert.instanceOf(err, Error);
        assert.equal(err.errorObject.type, 'blockInitError');
        assert.equal(err.errorObject.uuid, 'uuid-2');
        assert.equal(err.errorObject.blockType, 'switchBlock');
        assert.equal(err.errorObject.message, 'init failed');
        assert.equal(err.errorObject.code, 500);
    });
});

describe('PolicyOtherError', () => {
    it('defaults code to 500 when omitted', () => {
        const err = new PolicyOtherError('oops', 'policy-1');
        assert.equal(err.errorObject.code, 500);
        assert.equal(err.errorObject.policyId, 'policy-1');
        assert.equal(err.errorObject.type, 'policyOtherError');
        assert.equal(err.errorObject.message, 'oops');
    });

    it('honours an explicit code', () => {
        const err = new PolicyOtherError('forbidden', 'policy-1', 403);
        assert.equal(err.errorObject.code, 403);
    });

    it('extends Error', () => {
        assert.instanceOf(new PolicyOtherError('x', 'p1'), Error);
    });
});
