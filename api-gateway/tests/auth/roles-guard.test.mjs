import assert from 'node:assert/strict';
import { RolesGuard, RolesAndLocationGuard } from '../../dist/auth/roles-guard.js';

const makeContext = (user) => ({
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => 'handler',
    getClass: () => 'class',
});

const makeReflector = (map) => ({ get: (key) => map[key] });

describe('RolesGuard', () => {
    it('allows access when no permissions are required', () => {
        const guard = new RolesGuard(makeReflector({}));
        assert.equal(guard.canActivate(makeContext({ permissions: [] })), true);
    });

    it('allows access when the permissions metadata is an empty array', () => {
        const guard = new RolesGuard(makeReflector({ permissions: [] }));
        assert.equal(guard.canActivate(makeContext({ permissions: ['x'] })), true);
    });

    it('allows access when the user holds a required permission', () => {
        const guard = new RolesGuard(makeReflector({ permissions: ['p_a', 'p_b'] }));
        assert.equal(guard.canActivate(makeContext({ permissions: ['p_b'] })), true);
    });

    it('denies access when the user lacks every required permission', () => {
        const guard = new RolesGuard(makeReflector({ permissions: ['p_a'] }));
        assert.equal(guard.canActivate(makeContext({ permissions: ['p_z'] })), false);
    });

    it('denies access when there is no user', () => {
        const guard = new RolesGuard(makeReflector({ permissions: ['p_a'] }));
        assert.equal(guard.canActivate(makeContext(undefined)), false);
    });

    it('denies access when the user has no permissions array', () => {
        const guard = new RolesGuard(makeReflector({ permissions: ['p_a'] }));
        assert.equal(guard.canActivate(makeContext({})), false);
    });
});

describe('RolesAndLocationGuard', () => {
    it('allows access when neither permissions nor locations are required', () => {
        const guard = new RolesAndLocationGuard(makeReflector({}));
        assert.equal(guard.canActivate(makeContext({})), true);
    });

    it('denies access when there is no user but a requirement exists', () => {
        const guard = new RolesAndLocationGuard(makeReflector({ permissions: ['p'] }));
        assert.equal(guard.canActivate(makeContext(undefined)), false);
    });

    it('denies access when the user location is not in the allowed locations', () => {
        const guard = new RolesAndLocationGuard(makeReflector({ locations: ['LOCAL'], permissions: ['p'] }));
        assert.equal(guard.canActivate(makeContext({ location: 'REMOTE', permissions: ['p'] })), false);
    });

    it('allows access when location matches and permission is held', () => {
        const guard = new RolesAndLocationGuard(makeReflector({ locations: ['LOCAL'], permissions: ['p'] }));
        assert.equal(guard.canActivate(makeContext({ location: 'LOCAL', permissions: ['p'] })), true);
    });

    it('denies access when location matches but permission is missing', () => {
        const guard = new RolesAndLocationGuard(makeReflector({ locations: ['LOCAL'], permissions: ['p'] }));
        assert.equal(guard.canActivate(makeContext({ location: 'LOCAL', permissions: ['other'] })), false);
    });

    it('allows access on a location-only requirement when the location matches', () => {
        const guard = new RolesAndLocationGuard(makeReflector({ locations: ['LOCAL'] }));
        assert.equal(guard.canActivate(makeContext({ location: 'LOCAL' })), true);
    });

    it('denies access on a location-only requirement when the location differs', () => {
        const guard = new RolesAndLocationGuard(makeReflector({ locations: ['LOCAL'] }));
        assert.equal(guard.canActivate(makeContext({ location: 'REMOTE' })), false);
    });

    it('denies access on a permission-only requirement when the user lacks permissions', () => {
        const guard = new RolesAndLocationGuard(makeReflector({ permissions: ['p'] }));
        assert.equal(guard.canActivate(makeContext({})), false);
    });
});
