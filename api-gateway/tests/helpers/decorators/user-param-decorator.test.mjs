import 'reflect-metadata';
import assert from 'node:assert/strict';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants.js';
import { User } from '../../../dist/helpers/decorators/user.js';

const extractFactory = (paramDecorator) => {
    class Probe { handler(arg) { return arg; } }
    paramDecorator()(Probe.prototype, 'handler', 0);
    const meta = Reflect.getOwnMetadata(ROUTE_ARGS_METADATA, Probe, 'handler');
    const key = Object.keys(meta)[0];
    return meta[key].factory;
};

const ctxWith = (request) => ({ switchToHttp: () => ({ getRequest: () => request }) });

describe('User param decorator factory', () => {
    const factory = extractFactory(User);

    it('returns request.user from the http context', () => {
        const user = { id: 'u1', role: 'USER' };
        assert.deepEqual(factory(undefined, ctxWith({ user })), user);
    });

    it('returns undefined when the request has no user', () => {
        assert.equal(factory(undefined, ctxWith({})), undefined);
    });

    it('returns null when request.user is null', () => {
        assert.equal(factory(undefined, ctxWith({ user: null })), null);
    });

    it('ignores the data argument and returns the same user', () => {
        const user = { id: 'u2' };
        assert.deepEqual(factory('whatever', ctxWith({ user })), user);
    });

    it('reads the request via switchToHttp().getRequest()', () => {
        let called = 0;
        const ctx = { switchToHttp: () => { called++; return { getRequest: () => ({ user: { id: 9 } }) }; } };
        assert.deepEqual(factory(undefined, ctx), { id: 9 });
        assert.equal(called, 1);
    });
});
