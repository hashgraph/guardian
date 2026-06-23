import assert from 'node:assert/strict';
import esmock from 'esmock';

let lastVerifiedToken = null;
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
                lastVerifiedToken = token;
                if (nextVerifyResult === 'OK') return 'AUTH_SERVICE';
                throw new Error(String(nextVerifyResult));
            },
        },
    },
});

function makeCtx({ type = 'rpc', subject = 'allowed.subject', token = 'svc-token' } = {}) {
    const rawMsg = {
        getHeaders: () => ({ get: (key) => key === 'serviceToken' ? token : undefined }),
    };
    return {
        getType: () => type,
        switchToRpc: () => ({
            getContext: () => ({ getSubject: () => subject }),
        }),
        getArgByIndex: (idx) => idx === 1 ? rawMsg : null,
    };
}

beforeEach(() => { lastVerifiedToken = null; nextVerifyResult = 'OK'; });

describe('@unit @security JwtServiceAuthGuard.canActivate', () => {
    it('returns true for non-RPC contexts without checking ACL or token', async () => {
        const guard = new JwtServiceAuthGuard(['allowed']);
        const ctx = makeCtx({ type: 'http' });
        const result = await guard.canActivate(ctx);
        assert.equal(result, true);
        assert.equal(lastVerifiedToken, null);
    });

    it('returns true for whitelisted RPC subject with valid serviceToken', async () => {
        const guard = new JwtServiceAuthGuard(['my.allowed.command']);
        const ctx = makeCtx({ subject: 'my.allowed.command', token: 'good-token' });
        const result = await guard.canActivate(ctx);
        assert.equal(result, true);
        assert.equal(lastVerifiedToken, 'good-token');
    });

    it('throws ForbiddenException for subjects outside the ACL', async () => {
        const guard = new JwtServiceAuthGuard(['allowed.A']);
        const ctx = makeCtx({ subject: 'forbidden.B' });
        await assert.rejects(() => guard.canActivate(ctx), /forbidden\.B.*not allowed/);
        assert.equal(lastVerifiedToken, null);
    });

    it('propagates verify rejection', async () => {
        const guard = new JwtServiceAuthGuard(['x']);
        nextVerifyResult = 'invalid or expired token';
        const ctx = makeCtx({ subject: 'x' });
        await assert.rejects(() => guard.canActivate(ctx), /invalid or expired/);
    });

    it('extracts the token from the serviceToken header specifically', async () => {
        const guard = new JwtServiceAuthGuard(['x']);
        const ctx = makeCtx({ subject: 'x', token: 'header-specific-token' });
        await guard.canActivate(ctx);
        assert.equal(lastVerifiedToken, 'header-specific-token');
    });

    it('passes undefined token to verify when message is missing', async () => {
        const guard = new JwtServiceAuthGuard(['x']);
        const ctx = {
            getType: () => 'rpc',
            switchToRpc: () => ({ getContext: () => ({ getSubject: () => 'x' }) }),
            getArgByIndex: () => null,
        };
        await guard.canActivate(ctx);
        assert.equal(lastVerifiedToken, undefined);
    });

    it('empty allowedCommands array rejects everything', async () => {
        const guard = new JwtServiceAuthGuard([]);
        await assert.rejects(() => guard.canActivate(makeCtx({ subject: 'anything' })));
    });

    it('case-sensitive subject matching', async () => {
        const guard = new JwtServiceAuthGuard(['get.user']);
        await assert.rejects(() => guard.canActivate(makeCtx({ subject: 'Get.User' })));
        await assert.rejects(() => guard.canActivate(makeCtx({ subject: 'GET.USER' })));
    });
});
