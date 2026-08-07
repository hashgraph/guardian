import assert from 'node:assert/strict';
import { HttpException, HttpStatus } from '@nestjs/common';
import { UserRole } from '@guardian/interfaces';
import { getParentUser, InternalException, ONLY_SR } from '../../dist/helpers/utils.js';

describe('getParentUser', () => {
    it('is defined', () => {
        assert.equal(typeof getParentUser, 'function');
    });

    it('returns the user did for a STANDARD_REGISTRY user', () => {
        const user = { role: UserRole.STANDARD_REGISTRY, did: 'did:sr:1', parent: 'did:other' };
        assert.equal(getParentUser(user), 'did:sr:1');
    });

    it('returns the parent did for a non-SR user', () => {
        const user = { role: UserRole.USER, did: 'did:user:1', parent: 'did:parent:1' };
        assert.equal(getParentUser(user), 'did:parent:1');
    });

    it('returns undefined parent when a non-SR user has no parent', () => {
        const user = { role: UserRole.USER, did: 'did:user:1' };
        assert.equal(getParentUser(user), undefined);
    });
});

const fakeLogger = () => {
    const calls = [];
    return {
        calls,
        error: async (...args) => { calls.push(args); },
    };
};

describe('InternalException', () => {
    it('is defined', () => {
        assert.equal(typeof InternalException, 'function');
    });

    it('logs the error with the API_GATEWAY tag', async () => {
        const logger = fakeLogger();
        await assert.rejects(() => InternalException('boom', logger));
        assert.equal(logger.calls.length, 1);
        assert.deepEqual(logger.calls[0][1], ['API_GATEWAY']);
    });

    it('passes the userId through to the logger', async () => {
        const logger = fakeLogger();
        await assert.rejects(() => InternalException('boom', logger, 'user-42'));
        assert.equal(logger.calls[0][2], 'user-42');
    });

    it('defaults userId to null when omitted', async () => {
        const logger = fakeLogger();
        await assert.rejects(() => InternalException('boom', logger));
        assert.equal(logger.calls[0][2], null);
    });

    it('re-throws an existing HttpException unchanged', async () => {
        const logger = fakeLogger();
        const original = new HttpException('teapot', 418);
        await assert.rejects(
            () => InternalException(original, logger),
            (err) => {
                assert.equal(err, original);
                assert.equal(err.getStatus(), 418);
                return true;
            }
        );
    });

    it('wraps a string error as a 500 HttpException', async () => {
        const logger = fakeLogger();
        await assert.rejects(
            () => InternalException('plain message', logger),
            (err) => {
                assert.ok(err instanceof HttpException);
                assert.equal(err.getStatus(), HttpStatus.INTERNAL_SERVER_ERROR);
                assert.equal(err.message, 'plain message');
                return true;
            }
        );
    });

    it('uses the error.code as the status when present', async () => {
        const logger = fakeLogger();
        const messageError = Object.assign(new Error('coded'), { code: 409 });
        await assert.rejects(
            () => InternalException(messageError, logger),
            (err) => {
                assert.ok(err instanceof HttpException);
                assert.equal(err.getStatus(), 409);
                assert.equal(err.message, 'coded');
                return true;
            }
        );
    });

    it('falls back to 500 when a MessageError has no code', async () => {
        const logger = fakeLogger();
        const messageError = new Error('uncoded');
        await assert.rejects(
            () => InternalException(messageError, logger),
            (err) => {
                assert.ok(err instanceof HttpException);
                assert.equal(err.getStatus(), HttpStatus.INTERNAL_SERVER_ERROR);
                assert.equal(err.message, 'uncoded');
                return true;
            }
        );
    });
});

describe('ONLY_SR constant', () => {
    it('mentions the Standard Registry role', () => {
        assert.match(ONLY_SR, /Standard Registry/);
    });
});
