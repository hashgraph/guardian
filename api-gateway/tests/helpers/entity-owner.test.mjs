import assert from 'node:assert/strict';
import { HttpException } from '@nestjs/common';
import { EntityOwner } from '../../dist/helpers/entity-owner.js';

describe('EntityOwner constructor', () => {
    it('constructs with no argument', () => {
        assert.doesNotThrow(() => new EntityOwner());
    });

    it('constructs with a null user', () => {
        assert.doesNotThrow(() => new EntityOwner(null));
    });

    it('constructs with a user that has a did', () => {
        assert.doesNotThrow(() => new EntityOwner({ did: 'did:example', role: 'USER', id: '1' }));
    });

    it('exposes the creator from the user did', () => {
        const owner = new EntityOwner({ did: 'did:example', role: 'USER', id: '1' });
        assert.equal(owner.creator, 'did:example');
    });

    it('throws a 422 HttpException when the user has no did', () => {
        assert.throws(
            () => new EntityOwner({ role: 'USER', id: '1' }),
            (e) => e instanceof HttpException && e.getStatus() === 422
        );
    });

    it('uses the "User is not registered." message on the did-less branch', () => {
        assert.throws(
            () => new EntityOwner({ username: 'x' }),
            (e) => e instanceof HttpException && e.message === 'User is not registered.'
        );
    });
});
