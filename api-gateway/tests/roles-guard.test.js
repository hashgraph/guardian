import assert from 'node:assert/strict';
import 'reflect-metadata';
import { Reflector } from '@nestjs/core';
import { RolesGuard, RolesAndLocationGuard } from '../dist/auth/roles-guard.js';

function buildContext(handler, request) {
    return {
        switchToHttp: () => ({ getRequest: () => request }),
        getHandler: () => handler,
        getClass: () => null,
    };
}

function withMetadata(key, value) {
    const fn = () => undefined;
    Reflect.defineMetadata(key, value, fn);
    return fn;
}

function withMultipleMetadata(entries) {
    const fn = () => undefined;
    for (const [key, value] of entries) {
        Reflect.defineMetadata(key, value, fn);
    }
    return fn;
}

describe('RolesGuard', () => {
    const guard = new RolesGuard(new Reflector());

    it('allows when no permissions metadata is set', () => {
        const handler = () => undefined;
        const ctx = buildContext(handler, { user: null });
        assert.equal(guard.canActivate(ctx), true);
    });

    it('allows when the user has at least one of the required permissions', () => {
        const handler = withMetadata('permissions', ['POLICY_READ', 'POLICY_WRITE']);
        const ctx = buildContext(handler, {
            user: { permissions: ['POLICY_READ'] },
        });
        assert.equal(guard.canActivate(ctx), true);
    });

    it('denies when the user has none of the required permissions', () => {
        const handler = withMetadata('permissions', ['POLICY_WRITE']);
        const ctx = buildContext(handler, {
            user: { permissions: ['POLICY_READ'] },
        });
        assert.equal(guard.canActivate(ctx), false);
    });

    it('denies when the user is missing entirely', () => {
        const handler = withMetadata('permissions', ['POLICY_READ']);
        const ctx = buildContext(handler, {});
        assert.equal(guard.canActivate(ctx), false);
    });

    it('denies when the user has no permissions array', () => {
        const handler = withMetadata('permissions', ['POLICY_READ']);
        const ctx = buildContext(handler, { user: {} });
        assert.equal(guard.canActivate(ctx), false);
    });

    it('treats an empty permissions array as no requirement (allow)', () => {
        const handler = withMetadata('permissions', []);
        const ctx = buildContext(handler, { user: null });
        assert.equal(guard.canActivate(ctx), true);
    });
});

describe('RolesAndLocationGuard', () => {
    const guard = new RolesAndLocationGuard(new Reflector());

    it('allows when neither permissions nor locations metadata is set', () => {
        const handler = () => undefined;
        const ctx = buildContext(handler, { user: { location: 'LOCAL' } });
        assert.equal(guard.canActivate(ctx), true);
    });

    it('denies when the user is missing and any metadata is present', () => {
        const handler = withMetadata('locations', ['LOCAL']);
        const ctx = buildContext(handler, {});
        assert.equal(guard.canActivate(ctx), false);
    });

    it("denies when the user's location is not in the allowed list", () => {
        const handler = withMetadata('locations', ['REMOTE']);
        const ctx = buildContext(handler, { user: { location: 'LOCAL' } });
        assert.equal(guard.canActivate(ctx), false);
    });

    it('allows when location matches and no permissions are required', () => {
        const handler = withMetadata('locations', ['LOCAL']);
        const ctx = buildContext(handler, { user: { location: 'LOCAL' } });
        assert.equal(guard.canActivate(ctx), true);
    });

    it('allows when location matches and the user has a required permission', () => {
        const handler = withMultipleMetadata([
            ['permissions', ['POLICY_READ']],
            ['locations', ['LOCAL']],
        ]);
        const ctx = buildContext(handler, {
            user: { location: 'LOCAL', permissions: ['POLICY_READ'] },
        });
        assert.equal(guard.canActivate(ctx), true);
    });

    it('denies when location matches but the user lacks every required permission', () => {
        const handler = withMultipleMetadata([
            ['permissions', ['POLICY_WRITE']],
            ['locations', ['LOCAL']],
        ]);
        const ctx = buildContext(handler, {
            user: { location: 'LOCAL', permissions: ['POLICY_READ'] },
        });
        assert.equal(guard.canActivate(ctx), false);
    });
});
