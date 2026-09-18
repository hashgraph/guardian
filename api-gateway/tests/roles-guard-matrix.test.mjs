import assert from 'node:assert/strict';
import 'reflect-metadata';
import { Reflector } from '@nestjs/core';
import { RolesGuard, RolesAndLocationGuard } from '../dist/auth/roles-guard.js';
import { Permissions, LocationType, UserRole } from '@guardian/interfaces';

function buildContext(handler, request) {
    return {
        switchToHttp: () => ({ getRequest: () => request }),
        getHandler: () => handler,
        getClass: () => null,
    };
}

function handlerWith(entries) {
    const fn = () => undefined;
    for (const [key, value] of entries) {
        Reflect.defineMetadata(key, value, fn);
    }
    return fn;
}

const ROLES = [
    UserRole.STANDARD_REGISTRY,
    UserRole.USER,
    UserRole.AUDITOR,
    UserRole.ADMIN,
    UserRole.TENANT_ADMIN,
    UserRole.TENANT_OPERATOR,
];

describe('RolesGuard: permission-held vs required matrix', () => {
    const guard = new RolesGuard(new Reflector());
    const required = [Permissions.POLICIES_POLICY_READ, Permissions.POLICIES_POLICY_CREATE];

    for (const role of ROLES) {
        it(`allows ${role} who holds one required permission`, () => {
            const handler = handlerWith([['permissions', required]]);
            const ctx = buildContext(handler, { user: { role, permissions: [Permissions.POLICIES_POLICY_CREATE] } });
            assert.equal(guard.canActivate(ctx), true);
        });

        it(`denies ${role} who holds only an unrelated permission`, () => {
            const handler = handlerWith([['permissions', required]]);
            const ctx = buildContext(handler, { user: { role, permissions: [Permissions.TOKENS_TOKEN_READ] } });
            assert.equal(guard.canActivate(ctx), false);
        });
    }

    it('allows when the user holds every required permission', () => {
        const handler = handlerWith([['permissions', required]]);
        const ctx = buildContext(handler, { user: { permissions: required } });
        assert.equal(guard.canActivate(ctx), true);
    });

    it('allows when the user holds extra permissions beyond the required one', () => {
        const handler = handlerWith([['permissions', [Permissions.POLICIES_POLICY_READ]]]);
        const ctx = buildContext(handler, {
            user: { permissions: [Permissions.TOKENS_TOKEN_READ, Permissions.POLICIES_POLICY_READ] },
        });
        assert.equal(guard.canActivate(ctx), true);
    });

    it('denies when required is a single permission the user lacks', () => {
        const handler = handlerWith([['permissions', [Permissions.PERMISSIONS_ROLE_MANAGE]]]);
        const ctx = buildContext(handler, { user: { permissions: [Permissions.POLICIES_POLICY_READ] } });
        assert.equal(guard.canActivate(ctx), false);
    });

    it('allows when required is a single permission the user holds', () => {
        const handler = handlerWith([['permissions', [Permissions.PERMISSIONS_ROLE_MANAGE]]]);
        const ctx = buildContext(handler, { user: { permissions: [Permissions.PERMISSIONS_ROLE_MANAGE] } });
        assert.equal(guard.canActivate(ctx), true);
    });

    it('treats undefined metadata as no requirement (allow)', () => {
        const handler = handlerWith([]);
        const ctx = buildContext(handler, { user: { permissions: [] } });
        assert.equal(guard.canActivate(ctx), true);
    });

    it('treats null metadata as no requirement (allow)', () => {
        const handler = handlerWith([['permissions', null]]);
        const ctx = buildContext(handler, {});
        assert.equal(guard.canActivate(ctx), true);
    });

    it('treats a non-array (object) metadata value as no requirement (allow)', () => {
        const handler = handlerWith([['permissions', { not: 'array' }]]);
        const ctx = buildContext(handler, {});
        assert.equal(guard.canActivate(ctx), true);
    });

    it('denies a user with an empty permissions array when a permission is required', () => {
        const handler = handlerWith([['permissions', [Permissions.POLICIES_POLICY_READ]]]);
        const ctx = buildContext(handler, { user: { permissions: [] } });
        assert.equal(guard.canActivate(ctx), false);
    });

    it('denies a user whose permissions field is undefined when a permission is required', () => {
        const handler = handlerWith([['permissions', [Permissions.POLICIES_POLICY_READ]]]);
        const ctx = buildContext(handler, { user: { role: UserRole.USER } });
        assert.equal(guard.canActivate(ctx), false);
    });

    it('denies when user is null and a permission is required', () => {
        const handler = handlerWith([['permissions', [Permissions.POLICIES_POLICY_READ]]]);
        const ctx = buildContext(handler, { user: null });
        assert.equal(guard.canActivate(ctx), false);
    });
});

describe('RolesAndLocationGuard: location matrix', () => {
    const guard = new RolesAndLocationGuard(new Reflector());
    const allLocations = [LocationType.LOCAL, LocationType.REMOTE];

    for (const allowed of allLocations) {
        for (const userLoc of allLocations) {
            const expected = allowed === userLoc;
            it(`location-only: allowed=${allowed} user=${userLoc} -> ${expected}`, () => {
                const handler = handlerWith([['locations', [allowed]]]);
                const ctx = buildContext(handler, { user: { location: userLoc } });
                assert.equal(guard.canActivate(ctx), expected);
            });
        }
    }

    it('allows when user location is in a multi-entry allow list', () => {
        const handler = handlerWith([['locations', [LocationType.LOCAL, LocationType.REMOTE]]]);
        const ctx = buildContext(handler, { user: { location: LocationType.REMOTE } });
        assert.equal(guard.canActivate(ctx), true);
    });

    it('denies when user location is undefined and a location is required', () => {
        const handler = handlerWith([['locations', [LocationType.LOCAL]]]);
        const ctx = buildContext(handler, { user: {} });
        assert.equal(guard.canActivate(ctx), false);
    });
});

describe('RolesAndLocationGuard: combined permission + location decision matrix', () => {
    const guard = new RolesAndLocationGuard(new Reflector());
    const perms = [Permissions.POLICIES_POLICY_READ];
    const locs = [LocationType.LOCAL];

    const cases = [
        { locOk: true, permOk: true, expected: true },
        { locOk: true, permOk: false, expected: false },
        { locOk: false, permOk: true, expected: false },
        { locOk: false, permOk: false, expected: false },
    ];

    for (const { locOk, permOk, expected } of cases) {
        it(`locOk=${locOk} permOk=${permOk} -> ${expected}`, () => {
            const handler = handlerWith([
                ['permissions', perms],
                ['locations', locs],
            ]);
            const ctx = buildContext(handler, {
                user: {
                    location: locOk ? LocationType.LOCAL : LocationType.REMOTE,
                    permissions: permOk ? [Permissions.POLICIES_POLICY_READ] : [Permissions.TOKENS_TOKEN_READ],
                },
            });
            assert.equal(guard.canActivate(ctx), expected);
        });
    }

    it('denies on location mismatch even before evaluating a held permission', () => {
        const handler = handlerWith([
            ['permissions', [Permissions.POLICIES_POLICY_READ]],
            ['locations', [LocationType.REMOTE]],
        ]);
        const ctx = buildContext(handler, {
            user: { location: LocationType.LOCAL, permissions: [Permissions.POLICIES_POLICY_READ] },
        });
        assert.equal(guard.canActivate(ctx), false);
    });

    it('denies when location matches but permissions field is undefined', () => {
        const handler = handlerWith([
            ['permissions', [Permissions.POLICIES_POLICY_READ]],
            ['locations', [LocationType.LOCAL]],
        ]);
        const ctx = buildContext(handler, { user: { location: LocationType.LOCAL } });
        assert.equal(guard.canActivate(ctx), false);
    });
});

describe('RolesAndLocationGuard: no metadata / no user branches', () => {
    const guard = new RolesAndLocationGuard(new Reflector());

    it('allows when neither permissions nor locations metadata is present', () => {
        const handler = handlerWith([]);
        const ctx = buildContext(handler, { user: null });
        assert.equal(guard.canActivate(ctx), true);
    });

    it('allows when both metadata values are empty arrays', () => {
        const handler = handlerWith([
            ['permissions', []],
            ['locations', []],
        ]);
        const ctx = buildContext(handler, {});
        assert.equal(guard.canActivate(ctx), true);
    });

    it('denies a missing user when only permissions metadata is present', () => {
        const handler = handlerWith([['permissions', [Permissions.POLICIES_POLICY_READ]]]);
        const ctx = buildContext(handler, {});
        assert.equal(guard.canActivate(ctx), false);
    });

    it('denies a missing user when only locations metadata is present', () => {
        const handler = handlerWith([['locations', [LocationType.LOCAL]]]);
        const ctx = buildContext(handler, {});
        assert.equal(guard.canActivate(ctx), false);
    });

    it('allows location-only metadata with a matching user even without permissions field', () => {
        const handler = handlerWith([['locations', [LocationType.LOCAL]]]);
        const ctx = buildContext(handler, { user: { location: LocationType.LOCAL } });
        assert.equal(guard.canActivate(ctx), true);
    });
});
