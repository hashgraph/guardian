import assert from 'node:assert/strict';
import { HttpException } from '@nestjs/common';
import { UserRole } from '@guardian/interfaces';
import {
    ONLY_SR,
    getParentUser,
    parseSavepointIdsJson,
    InternalException,
} from '../../dist/helpers/utils.js';

describe('ONLY_SR constant', () => {
    it('describes the Standard Registry restriction', () => {
        assert.match(ONLY_SR, /Standard Registry role/);
    });
});

describe('getParentUser', () => {
    it('returns the user did for a Standard Registry', () => {
        assert.equal(getParentUser({ role: UserRole.STANDARD_REGISTRY, did: 'did:sr', parent: 'p' }), 'did:sr');
    });

    it('returns the parent for a non-SR user', () => {
        assert.equal(getParentUser({ role: UserRole.USER, did: 'did:u', parent: 'p' }), 'p');
    });

    it('returns undefined parent when a non-SR user has no parent', () => {
        assert.equal(getParentUser({ role: UserRole.USER, did: 'did:u' }), undefined);
    });
});

describe('parseSavepointIdsJson', () => {
    it('returns undefined for missing input', () => {
        assert.equal(parseSavepointIdsJson(), undefined);
        assert.equal(parseSavepointIdsJson(undefined), undefined);
    });

    it('returns undefined for an empty string', () => {
        assert.equal(parseSavepointIdsJson(''), undefined);
    });

    it('parses a JSON array of strings', () => {
        assert.deepEqual(parseSavepointIdsJson('["a","b"]'), ['a', 'b']);
    });

    it('deduplicates repeated ids', () => {
        assert.deepEqual(parseSavepointIdsJson('["a","b","a"]'), ['a', 'b']);
    });

    it('drops empty and whitespace-only and non-string entries', () => {
        assert.deepEqual(parseSavepointIdsJson('["a","","  ",1,null]'), ['a']);
    });

    it('returns undefined when the array has no usable strings', () => {
        assert.equal(parseSavepointIdsJson('[]'), undefined);
        assert.equal(parseSavepointIdsJson('["",1]'), undefined);
    });

    it('throws a 400 when the JSON is invalid', () => {
        assert.throws(() => parseSavepointIdsJson('not json'), (e) => e instanceof HttpException && e.getStatus() === 400);
    });

    it('throws a 400 when the JSON is not an array', () => {
        assert.throws(() => parseSavepointIdsJson('"x"'), (e) => e instanceof HttpException && e.getStatus() === 400);
        assert.throws(() => parseSavepointIdsJson('{"a":1}'), (e) => e instanceof HttpException && e.getStatus() === 400);
    });
});

describe('InternalException', () => {
    const makeLogger = () => {
        const calls = [];
        return { calls, error: async (...args) => { calls.push(args); } };
    };

    it('logs and rethrows an existing HttpException unchanged', async () => {
        const logger = makeLogger();
        const original = new HttpException('orig', 400);
        await assert.rejects(InternalException(original, logger), (e) => e === original);
        assert.equal(logger.calls.length, 1);
    });

    it('wraps a string error as a 500 HttpException', async () => {
        const logger = makeLogger();
        await assert.rejects(InternalException('boom', logger), (e) => e instanceof HttpException && e.getStatus() === 500 && e.message === 'boom');
    });

    it('uses the error code when present', async () => {
        const logger = makeLogger();
        await assert.rejects(InternalException({ name: 'E', message: 'm', code: 418 }, logger), (e) => e instanceof HttpException && e.getStatus() === 418);
    });

    it('falls back to 500 when no code is present', async () => {
        const logger = makeLogger();
        await assert.rejects(InternalException({ name: 'E', message: 'm' }, logger), (e) => e instanceof HttpException && e.getStatus() === 500);
    });

    it('forwards the userId to the logger', async () => {
        const logger = makeLogger();
        await assert.rejects(InternalException('boom', logger, 'user-1'));
        assert.equal(logger.calls[0][2], 'user-1');
    });
});
