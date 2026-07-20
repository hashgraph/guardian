import assert from 'node:assert/strict';
import esmock from 'esmock';

const FAKE_PINO_LOGGER = class PinoLogger {};

let mongoInitCalls = [];
let mongoInitResult = { orm: 'mongo' };
let pinoInitCalls = [];
let pinoInitResult = { logger: 'pino' };

let mongoMod;
let pinoMod;

before(async function () {
    this.timeout(60000);
    mongoMod = await esmock('../../dist/helpers/providers/logger-mongo-provider.js', {
        '@guardian/common': {
            mongoForLoggingInitialization: (...args) => {
                mongoInitCalls.push(args);
                return mongoInitResult;
            },
        },
    });
    pinoMod = await esmock('../../dist/helpers/providers/pino-logger-provider.js', {
        '@guardian/common': {
            PinoLogger: FAKE_PINO_LOGGER,
            pinoLoggerInitialization: (...args) => {
                pinoInitCalls.push(args);
                return pinoInitResult;
            },
        },
    });
});

beforeEach(() => {
    mongoInitCalls = [];
    pinoInitCalls = [];
    mongoInitResult = { orm: 'mongo' };
    pinoInitResult = { logger: 'pino' };
});

describe('loggerMongoProvider', () => {
    it('provides under the LOGGER_MONGO_PROVIDER token', () => {
        assert.equal(mongoMod.loggerMongoProvider.provide, 'LOGGER_MONGO_PROVIDER');
    });

    it('exposes an async useFactory', async () => {
        const { loggerMongoProvider } = mongoMod;
        assert.equal(typeof loggerMongoProvider.useFactory, 'function');
        const ret = loggerMongoProvider.useFactory();
        assert.ok(ret instanceof Promise);
        await ret;
    });

    it('delegates to mongoForLoggingInitialization with no arguments', async () => {
        const { loggerMongoProvider } = mongoMod;
        const result = await loggerMongoProvider.useFactory();
        assert.equal(mongoInitCalls.length, 1);
        assert.deepEqual(mongoInitCalls[0], []);
        assert.equal(result, mongoInitResult);
    });

    it('does not declare an inject array', () => {
        assert.equal(mongoMod.loggerMongoProvider.inject, undefined);
    });
});

describe('pinoLoggerProvider', () => {
    it('provides under the PinoLogger class token', () => {
        assert.equal(pinoMod.pinoLoggerProvider.provide, FAKE_PINO_LOGGER);
    });

    it('injects the LOGGER_MONGO_PROVIDER token', () => {
        assert.deepEqual(pinoMod.pinoLoggerProvider.inject, ['LOGGER_MONGO_PROVIDER']);
    });

    it('forwards the injected db to pinoLoggerInitialization', () => {
        const { pinoLoggerProvider } = pinoMod;
        const fakeDb = { driver: 'mongo' };
        const result = pinoLoggerProvider.useFactory(fakeDb);
        assert.equal(pinoInitCalls.length, 1);
        assert.deepEqual(pinoInitCalls[0], [fakeDb]);
        assert.equal(result, pinoInitResult);
    });

    it('passes through whatever pinoLoggerInitialization returns', () => {
        const { pinoLoggerProvider } = pinoMod;
        pinoInitResult = Symbol('logger');
        const result = pinoLoggerProvider.useFactory({});
        assert.equal(result, pinoInitResult);
    });
});
