import assert from 'node:assert/strict';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants.js';
import { AuthUser } from '../../dist/auth/authorization-helper.js';

function extractFactory(decoratorFactory) {
    class Probe {
        handler(_param) {}
    }
    const paramDecorator = decoratorFactory('user');
    paramDecorator(Probe.prototype, 'handler', 0);
    const meta = Reflect.getMetadata(ROUTE_ARGS_METADATA, Probe.constructor, 'handler')
        || Reflect.getMetadata(ROUTE_ARGS_METADATA, Probe, 'handler')
        || Reflect.getMetadata(ROUTE_ARGS_METADATA, Probe.prototype.constructor, 'handler');
    const entry = Object.values(meta)[0];
    return entry.factory;
}

function fakeContext(request) {
    return {
        switchToHttp: () => ({ getRequest: () => request }),
    };
}

describe('AuthUser param decorator factory', () => {
    it('returns the request.user from the execution context', () => {
        const factory = extractFactory(AuthUser);
        assert.equal(typeof factory, 'function');
        const user = { id: 'u1', username: 'alice' };
        assert.deepEqual(factory('user', fakeContext({ user })), user);
    });

    it('returns undefined when the request has no user', () => {
        const factory = extractFactory(AuthUser);
        assert.equal(factory('user', fakeContext({})), undefined);
    });

    it('ignores the data argument and always returns request.user', () => {
        const factory = extractFactory(AuthUser);
        const user = { id: 'u2' };
        assert.deepEqual(factory(undefined, fakeContext({ user })), user);
    });
});
