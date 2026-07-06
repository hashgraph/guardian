import assert from 'node:assert/strict';
import { EntityOwner } from '../dist/models/entity-owner.js';
import { AccessType } from '../dist/type/access.type.js';
import { LocationType } from '../dist/type/location.type.js';
import { Permissions } from '../dist/type/permissions.type.js';
import { UserRole } from '../dist/type/user-role.type.js';

describe('EntityOwner constructor — null/empty user', () => {
    it('falls back to a neutral envelope when user is null', () => {
        const o = new EntityOwner(null);
        assert.equal(o.id, null);
        assert.equal(o.creator, null);
        assert.equal(o.owner, null);
        assert.equal(o.access, AccessType.NONE);
        assert.equal(o.location, LocationType.LOCAL);
    });
});

describe('EntityOwner — STANDARD_REGISTRY role', () => {
    it('uses the registry DID for both creator and owner, ALL access', () => {
        const o = new EntityOwner({
            id: 42,
            parent: 'p',
            username: 'sr',
            did: 'did:sr:1',
            role: UserRole.STANDARD_REGISTRY,
            location: LocationType.LOCAL,
        });
        assert.equal(o.id, '42');
        assert.equal(o.parent, 'p');
        assert.equal(o.username, 'sr');
        assert.equal(o.creator, 'did:sr:1');
        assert.equal(o.owner, 'did:sr:1');
        assert.equal(o.access, AccessType.ALL);
    });
});

describe('EntityOwner — USER role, access derived from permissions', () => {
    function user(perms = []) {
        return {
            id: 'u1',
            parent: 'parent-did',
            username: 'alice',
            did: 'did:user:alice',
            role: UserRole.USER,
            permissions: perms,
            location: LocationType.LOCAL,
        };
    }

    it('sets creator=did, owner=parent', () => {
        const o = new EntityOwner(user([]));
        assert.equal(o.creator, 'did:user:alice');
        assert.equal(o.owner, 'parent-did');
    });

    it('ACCESS_POLICY_ALL beats every other flag', () => {
        const o = new EntityOwner(user([
            Permissions.ACCESS_POLICY_ALL,
            Permissions.ACCESS_POLICY_ASSIGNED,
            Permissions.ACCESS_POLICY_PUBLISHED,
        ]));
        assert.equal(o.access, AccessType.ALL);
    });

    it('ASSIGNED + PUBLISHED ⇒ ASSIGNED_OR_PUBLISHED', () => {
        const o = new EntityOwner(user([
            Permissions.ACCESS_POLICY_ASSIGNED,
            Permissions.ACCESS_POLICY_PUBLISHED,
        ]));
        assert.equal(o.access, AccessType.ASSIGNED_OR_PUBLISHED);
    });

    it('only ASSIGNED ⇒ ASSIGNED', () => {
        const o = new EntityOwner(user([Permissions.ACCESS_POLICY_ASSIGNED]));
        assert.equal(o.access, AccessType.ASSIGNED);
    });

    it('only PUBLISHED ⇒ PUBLISHED', () => {
        const o = new EntityOwner(user([Permissions.ACCESS_POLICY_PUBLISHED]));
        assert.equal(o.access, AccessType.PUBLISHED);
    });

    it('only ASSIGNED_AND_PUBLISHED ⇒ ASSIGNED_AND_PUBLISHED', () => {
        const o = new EntityOwner(user([Permissions.ACCESS_POLICY_ASSIGNED_AND_PUBLISHED]));
        assert.equal(o.access, AccessType.ASSIGNED_AND_PUBLISHED);
    });

    it('no relevant permissions ⇒ NONE', () => {
        const o = new EntityOwner(user([]));
        assert.equal(o.access, AccessType.NONE);
    });
});

describe('EntityOwner — unknown role', () => {
    it('clears creator/owner and sets access to NONE', () => {
        const o = new EntityOwner({
            id: 9,
            parent: 'p',
            username: 'x',
            did: 'd',
            role: 'SOME_OTHER_ROLE',
            permissions: [Permissions.ACCESS_POLICY_ALL],
            location: LocationType.LOCAL,
        });
        assert.equal(o.creator, null);
        assert.equal(o.owner, null);
        assert.equal(o.access, AccessType.NONE);
    });
});

describe('EntityOwner.sr (static factory)', () => {
    it('returns a registry envelope with ALL access and LOCAL location', () => {
        const o = EntityOwner.sr('user-1', 'did:sr:42');
        assert.equal(o.id, 'user-1');
        assert.equal(o.creator, 'did:sr:42');
        assert.equal(o.owner, 'did:sr:42');
        assert.equal(o.username, null);
        assert.equal(o.access, AccessType.ALL);
        assert.equal(o.location, LocationType.LOCAL);
    });
});
