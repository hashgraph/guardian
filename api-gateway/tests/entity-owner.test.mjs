import assert from 'node:assert/strict';
import { EntityOwner } from '../dist/helpers/entity-owner.js';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('EntityOwner (api-gateway subclass)', () => {
    it('constructs without a user (anonymous owner)', () => {
        const owner = new EntityOwner();
        assert.ok(owner instanceof EntityOwner);
    });

    it('constructs without a user passed as undefined', () => {
        const owner = new EntityOwner(undefined);
        assert.ok(owner instanceof EntityOwner);
    });

    it('constructs when the user has a did', () => {
        const owner = new EntityOwner({ id: 'u1', did: 'did:hedera:1', username: 'bob' });
        assert.equal(owner.username, 'bob');
    });

    it('exposes the user id on the owner', () => {
        const owner = new EntityOwner({ id: 'u1', did: 'did:1', username: 'bob' });
        assert.equal(owner.id, 'u1');
    });

    it('throws an HttpException when the user has no did', () => {
        assert.throws(() => new EntityOwner({ id: 'u1', username: 'bob' }), HttpException);
    });

    it('throws with UNPROCESSABLE_ENTITY (422) status when did is missing', () => {
        try {
            new EntityOwner({ id: 'u1', username: 'bob' });
            assert.fail('expected throw');
        } catch (err) {
            assert.equal(err.getStatus(), HttpStatus.UNPROCESSABLE_ENTITY);
        }
    });

    it('throws with the "User is not registered." message', () => {
        try {
            new EntityOwner({ id: 'u1' });
            assert.fail('expected throw');
        } catch (err) {
            assert.equal(err.message, 'User is not registered.');
        }
    });

    it('throws when did is an empty string (falsy)', () => {
        assert.throws(() => new EntityOwner({ id: 'u1', did: '' }), HttpException);
    });

    it('does not throw when did is present even if other fields are absent', () => {
        assert.doesNotThrow(() => new EntityOwner({ did: 'did:only' }));
    });
});
