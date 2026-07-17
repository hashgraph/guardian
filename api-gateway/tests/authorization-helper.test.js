import assert from 'node:assert/strict';
import { HttpException, HttpStatus } from '@nestjs/common';
import { checkPermission, permissionHelper } from '../dist/auth/authorization-helper.js';

const STANDARD = 'STANDARD_REGISTRY';
const USER = 'USER';

describe('checkPermission', () => {
    it('returns a function', () => {
        assert.equal(typeof checkPermission(STANDARD), 'function');
    });

    it('resolves silently when the user has one of the allowed roles', async () => {
        const guard = checkPermission(STANDARD, USER);
        await guard({ role: USER });
        await guard({ role: STANDARD });
    });

    it('throws Forbidden (403) when the user has a role not in the list', async () => {
        const guard = checkPermission(STANDARD);
        await assert.rejects(guard({ role: USER }), (err) => {
            assert.ok(err instanceof HttpException);
            assert.equal(err.getStatus(), HttpStatus.FORBIDDEN);
            return true;
        });
    });

    it('throws Forbidden when the user has no role at all', async () => {
        const guard = checkPermission(STANDARD);
        await assert.rejects(guard({}), (err) => {
            assert.equal(err.getStatus(), HttpStatus.FORBIDDEN);
            return true;
        });
    });

    it('throws Unauthorized (401) when the user is missing', async () => {
        const guard = checkPermission(STANDARD);
        await assert.rejects(guard(null), (err) => {
            assert.equal(err.getStatus(), HttpStatus.UNAUTHORIZED);
            return true;
        });
        await assert.rejects(guard(undefined), (err) => {
            assert.equal(err.getStatus(), HttpStatus.UNAUTHORIZED);
            return true;
        });
    });
});

describe('permissionHelper', () => {
    it('calls next() when the user role is allowed', async () => {
        let nextCalled = 0;
        const middleware = permissionHelper(STANDARD, USER);
        await middleware(
            { user: { role: USER } },
            {},
            () => { nextCalled++; }
        );
        assert.equal(nextCalled, 1);
    });

    it('throws Forbidden when role is not in the allowed list', async () => {
        const middleware = permissionHelper(STANDARD);
        await assert.rejects(
            middleware({ user: { role: USER } }, {}, () => {}),
            (err) => {
                assert.equal(err.getStatus(), HttpStatus.FORBIDDEN);
                return true;
            }
        );
    });

    it('throws Forbidden when req.user has no role', async () => {
        const middleware = permissionHelper(STANDARD);
        await assert.rejects(
            middleware({ user: {} }, {}, () => {}),
            (err) => {
                assert.equal(err.getStatus(), HttpStatus.FORBIDDEN);
                return true;
            }
        );
    });

    it('throws Unauthorized when there is no user on the request', async () => {
        const middleware = permissionHelper(STANDARD);
        await assert.rejects(
            middleware({}, {}, () => {}),
            (err) => {
                assert.equal(err.getStatus(), HttpStatus.UNAUTHORIZED);
                return true;
            }
        );
    });

    it('does not call next() when the role check fails', async () => {
        let nextCalled = 0;
        const middleware = permissionHelper(STANDARD);
        await assert.rejects(
            middleware({ user: { role: USER } }, {}, () => { nextCalled++; })
        );
        assert.equal(nextCalled, 0);
    });
});
