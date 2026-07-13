import assert from 'node:assert/strict';
import esmock from 'esmock';
import { LogType } from '@guardian/interfaces';

const state = {
    pinoCalls: [],
    multistreamCalls: [],
    logged: { debug: [], info: [], warn: [], error: [] },
};

function makeLogger() {
    return {
        debug(obj) { state.logged.debug.push(obj); },
        info(obj) { state.logged.info.push(obj); },
        warn(obj) { state.logged.warn.push(obj); },
        error(obj) { state.logged.error.push(obj); },
    };
}

function pinoFactory(options, stream) {
    state.pinoCalls.push({ options, stream });
    return makeLogger();
}
pinoFactory.multistream = (streams, opts) => {
    state.multistreamCalls.push({ streams, opts });
    return { __multistream: true, streams, opts };
};

class FakeConsole { constructor(o) { this.kind = 'CONSOLE'; this.options = o; } }
class FakeMongo { constructor(o) { this.kind = 'MONGO'; this.options = o; } }
class FakeFile { constructor(o) { this.kind = 'FILE'; this.options = o; } }
class FakeSeq { constructor(o) { this.kind = 'SEQ'; this.options = o; } }

const { PinoLogger, MAP_TRANSPORTS, levelTypeMapping } = await esmock.strict('../../../dist/helpers/pino-logger.js', {
    pino: { default: pinoFactory },
    '../../../dist/helpers/console-transport.js': { ConsoleTransport: FakeConsole },
    '../../../dist/helpers/mongo-transport.js': { MongoTransport: FakeMongo },
    '../../../dist/helpers/pino-file-transport.js': { PinoFileTransport: FakeFile },
    '../../../dist/helpers/seq-transport.js': { SeqTransport: FakeSeq },
});

const FAKE_MAP = {
    CONSOLE: FakeConsole,
    MONGO: FakeMongo,
    FILE: FakeFile,
    SEQ: FakeSeq,
};

function reset() {
    state.pinoCalls = [];
    state.multistreamCalls = [];
    state.logged = { debug: [], info: [], warn: [], error: [] };
}

function build(transports, extra = {}) {
    reset();
    const options = {
        logLevel: LogType.INFO,
        collectionName: 'logs',
        transports,
        mapTransports: FAKE_MAP,
        ...extra,
    };
    const logger = new PinoLogger().init(options);
    return logger;
}

describe('@unit PinoLogger.init transport selection', () => {
    it('uses the mapTransports from the supplied options', () => {
        build('CONSOLE');
        const streams = state.multistreamCalls[0].streams;
        assert.equal(streams.length, 1);
        assert.equal(streams[0].stream.kind, 'CONSOLE');
    });

    it('selects a single known transport', () => {
        build('MONGO');
        const kinds = state.multistreamCalls[0].streams.map((s) => s.stream.kind);
        assert.deepEqual(kinds, ['MONGO']);
    });

    it('selects multiple comma-separated transports in order', () => {
        build('CONSOLE,MONGO,SEQ');
        const kinds = state.multistreamCalls[0].streams.map((s) => s.stream.kind);
        assert.deepEqual(kinds, ['CONSOLE', 'MONGO', 'SEQ']);
    });

    it('trims whitespace around transport names', () => {
        build(' CONSOLE , FILE ');
        const kinds = state.multistreamCalls[0].streams.map((s) => s.stream.kind);
        assert.deepEqual(kinds, ['CONSOLE', 'FILE']);
    });

    it('silently drops unknown transport names', () => {
        build('CONSOLE,OTLP,MONGO');
        const kinds = state.multistreamCalls[0].streams.map((s) => s.stream.kind);
        assert.deepEqual(kinds, ['CONSOLE', 'MONGO']);
    });

    it('produces an empty stream list when no name is known', () => {
        build('NOPE,STDOUT');
        assert.deepEqual(state.multistreamCalls[0].streams, []);
    });

    it('produces an empty stream list for an empty transports string', () => {
        build('');
        assert.deepEqual(state.multistreamCalls[0].streams, []);
    });

    it('keeps duplicate transports when listed twice', () => {
        build('CONSOLE,CONSOLE');
        const kinds = state.multistreamCalls[0].streams.map((s) => s.stream.kind);
        assert.deepEqual(kinds, ['CONSOLE', 'CONSOLE']);
    });

    it('is case-sensitive: lowercase names are not matched', () => {
        build('console,mongo');
        assert.deepEqual(state.multistreamCalls[0].streams, []);
    });

    it('passes the full options object to each transport constructor', () => {
        const logger = build('MONGO');
        const stream = state.multistreamCalls[0].streams[0].stream;
        assert.equal(stream.options.collectionName, 'logs');
        assert.equal(stream.options.transports, 'MONGO');
        assert.equal(logger instanceof PinoLogger, true);
    });

    it('returns the logger instance from init', () => {
        const logger = build('CONSOLE');
        assert.equal(typeof logger.info, 'function');
    });
});

describe('@unit PinoLogger.init pino configuration', () => {
    it('configures pino with base null and disabled timestamp', () => {
        build('CONSOLE');
        const opts = state.pinoCalls[0].options;
        assert.equal(opts.base, null);
        assert.equal(opts.timestamp, false);
    });

    it('uses a log formatter that spreads the object through unchanged', () => {
        build('CONSOLE');
        const fmt = state.pinoCalls[0].options.formatters.log;
        const input = { message: 'hi', attributes: ['a'], level: 30 };
        const out = fmt(input);
        assert.deepEqual(out, input);
        assert.notEqual(out, input);
    });

    it('passes the multistream result as the second pino argument', () => {
        build('CONSOLE');
        assert.equal(state.pinoCalls[0].stream.__multistream, true);
    });

    it('enables dedupe on the multistream', () => {
        build('CONSOLE');
        assert.deepEqual(state.multistreamCalls[0].opts, { dedupe: true });
    });
});

describe('@unit PinoLogger log methods', () => {
    it('debug logs message/attributes/userId with INFO type', async () => {
        const logger = build('CONSOLE');
        await logger.debug('msg', ['A'], 'user-1');
        const entry = state.logged.debug[0];
        assert.equal(entry.message, 'msg');
        assert.deepEqual(entry.attributes, ['A']);
        assert.equal(entry.type, LogType.INFO);
        assert.equal(entry.userId, 'user-1');
        assert.ok(entry.datetime instanceof Date);
    });

    it('info logs with INFO type and defaults userId to null', async () => {
        const logger = build('CONSOLE');
        await logger.info('hello', ['GW']);
        const entry = state.logged.info[0];
        assert.equal(entry.message, 'hello');
        assert.equal(entry.type, LogType.INFO);
        assert.equal(entry.userId, null);
    });

    it('warn logs with WARN type', async () => {
        const logger = build('CONSOLE');
        await logger.warn('careful', null, 'u');
        const entry = state.logged.warn[0];
        assert.equal(entry.message, 'careful');
        assert.equal(entry.attributes, null);
        assert.equal(entry.type, LogType.WARN);
        assert.equal(entry.userId, 'u');
    });

    it('error logs a string error verbatim with ERROR type', async () => {
        const logger = build('CONSOLE');
        await logger.error('boom', ['svc']);
        const entry = state.logged.error[0];
        assert.equal(entry.message, 'boom');
        assert.equal(entry.type, LogType.ERROR);
        assert.equal(entry.userId, null);
    });

    it('error uses the stack of an Error instance', async () => {
        const logger = build('CONSOLE');
        const err = new Error('kaboom');
        await logger.error(err, null);
        assert.equal(state.logged.error[0].message, err.stack);
    });

    it('error falls back to "Unknown error" for falsy input', async () => {
        const logger = build('CONSOLE');
        await logger.error('', null);
        assert.equal(state.logged.error[0].message, 'Unknown error');
    });

    it('error treats null as "Unknown error"', async () => {
        const logger = build('CONSOLE');
        await logger.error(null, null);
        assert.equal(state.logged.error[0].message, 'Unknown error');
    });
});

describe('@unit PinoLogger esmocked constants', () => {
    it('still exposes the level mapping and transport registry', () => {
        assert.equal(levelTypeMapping.length, 3);
        assert.deepEqual(Object.keys(MAP_TRANSPORTS).sort(), ['CONSOLE', 'FILE', 'MONGO', 'SEQ']);
    });
});
