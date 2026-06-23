import assert from 'node:assert/strict';
import esmock from 'esmock';

let lastVerifiedToken = null;
let verifyCalls = 0;
let nextVerifyResult = 'OK';

const { JwtServiceAuthGuard } = await esmock('../../../dist/security/jwt-service-auth.guard.js', {
    '@nestjs/common': {
        Injectable: () => () => {},
        CanActivate: class {},
        ExecutionContext: class {},
        ForbiddenException: class ForbiddenException extends Error {
            constructor(msg) { super(msg); this.name = 'ForbiddenException'; }
        },
    },
    '@nestjs/microservices': { NatsContext: class {} },
    '../../../dist/security/jwt-services-validator.js': {
        JwtServicesValidator: {
            async verify(token) {
                verifyCalls += 1;
                lastVerifiedToken = token;
                if (nextVerifyResult === 'OK') return 'AUTH_SERVICE';
                throw new Error(String(nextVerifyResult));
            },
        },
    },
});

function makeCtx({ type = 'rpc', subject = 'allowed.subject', token = 'svc-token', arg1 } = {}) {
    const rawMsg = arg1 !== undefined ? arg1 : {
        getHeaders: () => ({ get: (key) => (key === 'serviceToken' ? token : undefined) }),
    };
    return {
        getType: () => type,
        switchToRpc: () => ({ getContext: () => ({ getSubject: () => subject }) }),
        getArgByIndex: (idx) => (idx === 1 ? rawMsg : null),
    };
}

beforeEach(() => { lastVerifiedToken = null; verifyCalls = 0; nextVerifyResult = 'OK'; });

describe('@unit @security JwtServiceAuthGuard contract', () => {
    describe('non-rpc short-circuit', () => {
        it('returns true for http context without touching ACL or token', async () => {
            const guard = new JwtServiceAuthGuard([]);
            const result = await guard.canActivate(makeCtx({ type: 'http', subject: 'x' }));
            assert.equal(result, true);
            assert.equal(verifyCalls, 0);
            assert.equal(lastVerifiedToken, null);
        });

        it('returns true for ws context without touching ACL or token', async () => {
            const guard = new JwtServiceAuthGuard([]);
            const result = await guard.canActivate(makeCtx({ type: 'ws', subject: 'x' }));
            assert.equal(result, true);
            assert.equal(verifyCalls, 0);
        });

        it('returns true for graphql context regardless of subject', async () => {
            const guard = new JwtServiceAuthGuard(['only.this']);
            const result = await guard.canActivate(makeCtx({ type: 'graphql', subject: 'forbidden' }));
            assert.equal(result, true);
            assert.equal(verifyCalls, 0);
        });
    });

    describe('ACL enforcement', () => {
        it('throws ForbiddenException with the exact NATS ACL message for disallowed subject', async () => {
            const guard = new JwtServiceAuthGuard(['allowed.A']);
            await assert.rejects(
                () => guard.canActivate(makeCtx({ subject: 'forbidden.B' })),
                (err) => {
                    assert.equal(err.name, 'ForbiddenException');
                    assert.equal(err.message, 'NATS ACL: "forbidden.B" not allowed');
                    return true;
                }
            );
            assert.equal(verifyCalls, 0);
        });

        it('does not call verify when the subject is rejected', async () => {
            const guard = new JwtServiceAuthGuard(['x']);
            await assert.rejects(() => guard.canActivate(makeCtx({ subject: 'y' })));
            assert.equal(verifyCalls, 0);
        });

        it('allows any of multiple whitelisted commands', async () => {
            const guard = new JwtServiceAuthGuard(['cmd.one', 'cmd.two', 'cmd.three']);
            assert.equal(await guard.canActivate(makeCtx({ subject: 'cmd.one' })), true);
            assert.equal(await guard.canActivate(makeCtx({ subject: 'cmd.two' })), true);
            assert.equal(await guard.canActivate(makeCtx({ subject: 'cmd.three' })), true);
            assert.equal(verifyCalls, 3);
        });

        it('rejects a near-miss subject (substring is not membership)', async () => {
            const guard = new JwtServiceAuthGuard(['get.user.profile']);
            await assert.rejects(() => guard.canActivate(makeCtx({ subject: 'get.user' })));
        });
    });

    describe('token extraction + verification', () => {
        it('returns true for allowed subject + valid token', async () => {
            const guard = new JwtServiceAuthGuard(['ok.cmd']);
            const result = await guard.canActivate(makeCtx({ subject: 'ok.cmd', token: 'good' }));
            assert.equal(result, true);
            assert.equal(lastVerifiedToken, 'good');
            assert.equal(verifyCalls, 1);
        });

        it('propagates a verify rejection for a garbage token', async () => {
            const guard = new JwtServiceAuthGuard(['ok.cmd']);
            nextVerifyResult = 'Service validator: invalid or expired token';
            await assert.rejects(
                () => guard.canActivate(makeCtx({ subject: 'ok.cmd', token: 'garbage' })),
                /invalid or expired/
            );
            assert.equal(lastVerifiedToken, 'garbage');
        });

        it('passes undefined to verify when serviceToken header is absent', async () => {
            const guard = new JwtServiceAuthGuard(['ok.cmd']);
            const arg1 = { getHeaders: () => ({ get: () => undefined }) };
            const result = await guard.canActivate(makeCtx({ subject: 'ok.cmd', arg1 }));
            assert.equal(result, true);
            assert.equal(lastVerifiedToken, undefined);
        });

        it('passes undefined to verify when getArgByIndex(1) is null (optional chaining)', async () => {
            const guard = new JwtServiceAuthGuard(['ok.cmd']);
            const ctx = {
                getType: () => 'rpc',
                switchToRpc: () => ({ getContext: () => ({ getSubject: () => 'ok.cmd' }) }),
                getArgByIndex: () => null,
            };
            const result = await guard.canActivate(ctx);
            assert.equal(result, true);
            assert.equal(lastVerifiedToken, undefined);
        });

        it('passes undefined to verify when the message has no getHeaders method', async () => {
            const guard = new JwtServiceAuthGuard(['ok.cmd']);
            const result = await guard.canActivate(makeCtx({ subject: 'ok.cmd', arg1: {} }));
            assert.equal(result, true);
            assert.equal(lastVerifiedToken, undefined);
        });

        it('passes undefined to verify when getHeaders() returns null', async () => {
            const guard = new JwtServiceAuthGuard(['ok.cmd']);
            const arg1 = { getHeaders: () => null };
            const result = await guard.canActivate(makeCtx({ subject: 'ok.cmd', arg1 }));
            assert.equal(result, true);
            assert.equal(lastVerifiedToken, undefined);
        });

        it('reads the token from the serviceToken header key specifically', async () => {
            const guard = new JwtServiceAuthGuard(['ok.cmd']);
            const arg1 = {
                getHeaders: () => ({ get: (k) => (k === 'serviceToken' ? 'the-right-one' : 'wrong') }),
            };
            await guard.canActivate(makeCtx({ subject: 'ok.cmd', arg1 }));
            assert.equal(lastVerifiedToken, 'the-right-one');
        });
    });

    describe('empty ACL', () => {
        it('rejects every rpc subject when allowedCommands is empty', async () => {
            const guard = new JwtServiceAuthGuard([]);
            await assert.rejects(() => guard.canActivate(makeCtx({ subject: 'anything' })));
            assert.equal(verifyCalls, 0);
        });
    });
});
