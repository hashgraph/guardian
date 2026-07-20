import assert from 'node:assert/strict';
import { UserPermissions } from '../dist/helpers/permissions-helper.js';
import { Permissions, LocationType, UserRole } from '../dist/type/index.js';

const make = (permissions, role = UserRole.USER) => new UserPermissions({ role, permissions });

describe('ACCESS_POLICY_ASSIGNED_AND_PUBLISHED getter', () => {
    it('is true only when the dedicated combined permission is held', () => {
        assert.equal(make([Permissions.ACCESS_POLICY_ASSIGNED_AND_PUBLISHED]).ACCESS_POLICY_ASSIGNED_AND_PUBLISHED, true);
    });

    it('is false when only ASSIGNED is held', () => {
        assert.equal(make([Permissions.ACCESS_POLICY_ASSIGNED]).ACCESS_POLICY_ASSIGNED_AND_PUBLISHED, false);
    });

    it('is false when only PUBLISHED is held', () => {
        assert.equal(make([Permissions.ACCESS_POLICY_PUBLISHED]).ACCESS_POLICY_ASSIGNED_AND_PUBLISHED, false);
    });

    it('is false when both ASSIGNED and PUBLISHED are held but not the combined permission', () => {
        assert.equal(
            make([Permissions.ACCESS_POLICY_ASSIGNED, Permissions.ACCESS_POLICY_PUBLISHED]).ACCESS_POLICY_ASSIGNED_AND_PUBLISHED,
            false,
        );
    });

    it('is false with no permissions', () => {
        assert.equal(make([]).ACCESS_POLICY_ASSIGNED_AND_PUBLISHED, false);
    });
});

describe('ACCESS_POLICY_ASSIGNED_OR_PUBLISHED getter (requires BOTH despite the name)', () => {
    const both = [Permissions.ACCESS_POLICY_ASSIGNED, Permissions.ACCESS_POLICY_PUBLISHED];

    it('is true when both ASSIGNED and PUBLISHED are held', () => {
        assert.equal(make(both).ACCESS_POLICY_ASSIGNED_OR_PUBLISHED, true);
    });

    it('is false when only ASSIGNED is held', () => {
        assert.equal(make([Permissions.ACCESS_POLICY_ASSIGNED]).ACCESS_POLICY_ASSIGNED_OR_PUBLISHED, false);
    });

    it('is false when only PUBLISHED is held', () => {
        assert.equal(make([Permissions.ACCESS_POLICY_PUBLISHED]).ACCESS_POLICY_ASSIGNED_OR_PUBLISHED, false);
    });

    it('is false when neither is held', () => {
        assert.equal(make([]).ACCESS_POLICY_ASSIGNED_OR_PUBLISHED, false);
    });

    it('is false when the combined ALL permission is held but not the two parts', () => {
        assert.equal(make([Permissions.ACCESS_POLICY_ALL]).ACCESS_POLICY_ASSIGNED_OR_PUBLISHED, false);
    });
});

describe('UserPermissions.has — array argument branches', () => {
    const user = { permissions: ['A', 'B', 'C'] };

    it('returns true when the first listed permission matches', () => {
        assert.equal(UserPermissions.has(user, ['A', 'X']), true);
    });

    it('returns true when a later listed permission matches', () => {
        assert.equal(UserPermissions.has(user, ['X', 'Y', 'C']), true);
    });

    it('returns false for an empty required array', () => {
        assert.equal(UserPermissions.has(user, []), false);
    });

    it('returns false when none of the listed permissions match', () => {
        assert.equal(UserPermissions.has(user, ['X', 'Y', 'Z']), false);
    });

    it('returns true when the required list contains a duplicate that matches', () => {
        assert.equal(UserPermissions.has(user, ['A', 'A']), true);
    });

    it('returns false for an array argument when user is null', () => {
        assert.equal(UserPermissions.has(null, ['A']), false);
    });

    it('returns false for an array argument when user has no permissions field', () => {
        assert.equal(UserPermissions.has({}, ['A']), false);
    });

    it('returns false for an array argument when permissions is undefined', () => {
        assert.equal(UserPermissions.has({ permissions: undefined }, ['A']), false);
    });
});

describe('UserPermissions.has — single argument branches', () => {
    const user = { permissions: ['READ', 'WRITE'] };

    it('returns true when the single permission is held', () => {
        assert.equal(UserPermissions.has(user, 'READ'), true);
    });

    it('returns false when the single permission is not held', () => {
        assert.equal(UserPermissions.has(user, 'DELETE'), false);
    });

    it('returns false for undefined user', () => {
        assert.equal(UserPermissions.has(undefined, 'READ'), false);
    });

    it('returns false when permissions array is empty', () => {
        assert.equal(UserPermissions.has({ permissions: [] }, 'READ'), false);
    });

    it('returns false for falsy permission strings against an empty store', () => {
        assert.equal(UserPermissions.has({ permissions: [] }, ''), false);
    });
});

describe('UserPermissions.isPolicyAdmin — full single-permission matrix', () => {
    const adminPerms = [
        Permissions.POLICIES_MIGRATION_CREATE,
        Permissions.POLICIES_POLICY_CREATE,
        Permissions.POLICIES_POLICY_UPDATE,
        Permissions.POLICIES_POLICY_DELETE,
        Permissions.POLICIES_POLICY_REVIEW,
    ];

    for (const perm of adminPerms) {
        it(`returns true when only ${perm} is held`, () => {
            assert.equal(UserPermissions.isPolicyAdmin({ permissions: [perm] }), true);
        });
    }

    const nonAdminPerms = [
        Permissions.POLICIES_POLICY_READ,
        Permissions.POLICIES_POLICY_EXECUTE,
        Permissions.POLICIES_RECORD_ALL,
        Permissions.SCHEMAS_SCHEMA_CREATE,
        Permissions.TOKENS_TOKEN_CREATE,
    ];

    for (const perm of nonAdminPerms) {
        it(`returns false when only ${perm} is held`, () => {
            assert.equal(UserPermissions.isPolicyAdmin({ permissions: [perm] }), false);
        });
    }

    it('returns true when an admin permission is mixed with non-admin permissions', () => {
        assert.equal(
            UserPermissions.isPolicyAdmin({
                permissions: [Permissions.POLICIES_POLICY_READ, Permissions.POLICIES_POLICY_CREATE],
            }),
            true,
        );
    });

    it('returns false for empty permissions / missing field / null user', () => {
        assert.equal(UserPermissions.isPolicyAdmin({ permissions: [] }), false);
        assert.equal(UserPermissions.isPolicyAdmin({}), false);
        assert.equal(UserPermissions.isPolicyAdmin(null), false);
        assert.equal(UserPermissions.isPolicyAdmin(undefined), false);
    });
});

describe('UserPermissions constructor edge cases', () => {
    it('falls back to an empty permissions array when user.permissions is falsy', () => {
        assert.deepEqual(new UserPermissions({ role: UserRole.USER }).permissions, []);
        assert.deepEqual(new UserPermissions({ role: UserRole.USER, permissions: null }).permissions, []);
        assert.deepEqual(new UserPermissions({ role: UserRole.USER, permissions: 0 }).permissions, []);
    });

    it('preserves a provided non-empty permissions array by reference content', () => {
        const up = new UserPermissions({ role: UserRole.USER, permissions: ['X', 'Y'] });
        assert.deepEqual(up.permissions, ['X', 'Y']);
    });

    it('copies username/did/parent/role/permissionsGroup/location verbatim', () => {
        const up = new UserPermissions({
            username: 'bob',
            did: 'did:b',
            parent: 'did:a',
            role: UserRole.STANDARD_REGISTRY,
            permissions: ['P'],
            permissionsGroup: ['g1', 'g2'],
            location: LocationType.REMOTE,
        });
        assert.equal(up.username, 'bob');
        assert.equal(up.did, 'did:b');
        assert.equal(up.parent, 'did:a');
        assert.equal(up.role, UserRole.STANDARD_REGISTRY);
        assert.deepEqual(up.permissionsGroup, ['g1', 'g2']);
        assert.equal(up.location, LocationType.REMOTE);
    });

    it('defaults to LOCAL location and empty permissions for no-arg construction', () => {
        const up = new UserPermissions();
        assert.equal(up.location, LocationType.LOCAL);
        assert.deepEqual(up.permissions, []);
        assert.equal(up.username, undefined);
        assert.equal(up.role, undefined);
    });

    it('getters operate against the constructed permissions array', () => {
        const up = new UserPermissions({ role: UserRole.USER, permissions: [Permissions.POLICIES_POLICY_READ] });
        assert.equal(up.POLICIES_POLICY_READ, true);
        assert.equal(up.POLICIES_POLICY_CREATE, false);
    });
});
