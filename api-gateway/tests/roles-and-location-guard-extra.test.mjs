import assert from 'node:assert/strict';
import 'reflect-metadata';
import { Reflector } from '@nestjs/core';
import { RolesAndLocationGuard } from '../dist/auth/roles-guard.js';

function buildContext(handler, request) {
    return {
        switchToHttp: () => ({ getRequest: () => request }),
        getHandler: () => handler,
        getClass: () => null,
    };
}

function withMetadata(entries) {
    const fn = () => undefined;
    for (const [key, value] of entries) {
        Reflect.defineMetadata(key, value, fn);
    }
    return fn;
}

describe('RolesAndLocationGuard: permissions-only metadata', () => {
    const guard = new RolesAndLocationGuard(new Reflector());

    it('allows when the user holds a required permission and no location is required', () => {
        const handler = withMetadata([['permissions', ['POLICY_READ']]]);
        const ctx = buildContext(handler, { user: { permissions: ['POLICY_READ'] } });
        assert.equal(guard.canActivate(ctx), true);
    });

    it('denies when the user lacks every required permission and no location is required', () => {
        const handler = withMetadata([['permissions', ['POLICY_WRITE']]]);
        const ctx = buildContext(handler, { user: { permissions: ['POLICY_READ'] } });
        assert.equal(guard.canActivate(ctx), false);
    });

    it('denies when the user has no permissions array', () => {
        const handler = withMetadata([['permissions', ['POLICY_READ']]]);
        const ctx = buildContext(handler, { user: {} });
        assert.equal(guard.canActivate(ctx), false);
    });
});

describe('RolesAndLocationGuard: empty-array metadata is no requirement', () => {
    const guard = new RolesAndLocationGuard(new Reflector());

    it('allows when both permissions and locations are empty arrays', () => {
        const handler = withMetadata([
            ['permissions', []],
            ['locations', []],
        ]);
        const ctx = buildContext(handler, { user: { location: 'LOCAL', permissions: [] } });
        assert.equal(guard.canActivate(ctx), true);
    });

    it('allows when permissions is empty but a matching location is required', () => {
        const handler = withMetadata([
            ['permissions', []],
            ['locations', ['LOCAL']],
        ]);
        const ctx = buildContext(handler, { user: { location: 'LOCAL' } });
        assert.equal(guard.canActivate(ctx), true);
    });

    it('denies when permissions is empty but the location does not match', () => {
        const handler = withMetadata([
            ['permissions', []],
            ['locations', ['REMOTE']],
        ]);
        const ctx = buildContext(handler, { user: { location: 'LOCAL' } });
        assert.equal(guard.canActivate(ctx), false);
    });
});

describe('RolesAndLocationGuard: location gate precedes permission check', () => {
    const guard = new RolesAndLocationGuard(new Reflector());

    it('denies on a location mismatch even when the permission would pass', () => {
        const handler = withMetadata([
            ['permissions', ['POLICY_READ']],
            ['locations', ['REMOTE']],
        ]);
        const ctx = buildContext(handler, {
            user: { location: 'LOCAL', permissions: ['POLICY_READ'] },
        });
        assert.equal(guard.canActivate(ctx), false);
    });

    it('allows when both the location matches and a permission matches', () => {
        const handler = withMetadata([
            ['permissions', ['POLICY_READ', 'POLICY_WRITE']],
            ['locations', ['LOCAL', 'REMOTE']],
        ]);
        const ctx = buildContext(handler, {
            user: { location: 'REMOTE', permissions: ['POLICY_WRITE'] },
        });
        assert.equal(guard.canActivate(ctx), true);
    });
});
