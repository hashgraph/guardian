import assert from 'node:assert/strict';
import esmock from 'esmock';

const state = { constructed: [], emitted: [], closed: 0 };

class Logger {
    constructor(options) { this.options = options; state.constructed.push(options); }
    emit(event) { state.emitted.push(event); }
    close() { state.closed += 1; }
}

const { SeqTransport } = await esmock.strict('../../../dist/helpers/seq-transport.js', {
    'seq-logging': { Logger },
});

function write(transport, log) {
    return new Promise((resolve) => transport._write(typeof log === 'string' ? log : JSON.stringify(log), 'utf8', resolve));
}

describe('@unit SeqTransport constructor', () => {
    beforeEach(() => { state.constructed = []; state.emitted = []; state.closed = 0; });

    it('passes the seq url through as serverUrl', () => {
        new SeqTransport({ seqUrl: 'http://seq:5341' });
        assert.equal(state.constructed[0].serverUrl, 'http://seq:5341');
    });

    it('sets an onError handler', () => {
        new SeqTransport({ seqUrl: 'http://seq' });
        assert.equal(typeof state.constructed[0].onError, 'function');
    });

    it('includes apiKey when a non-empty key is supplied', () => {
        new SeqTransport({ seqUrl: 'http://seq', apiKey: 'abc' });
        assert.equal(state.constructed[0].apiKey, 'abc');
    });

    it('omits apiKey when an empty string is supplied', () => {
        new SeqTransport({ seqUrl: 'http://seq', apiKey: '' });
        assert.equal('apiKey' in state.constructed[0], false);
    });

    it('is an object-mode Writable stream', () => {
        const t = new SeqTransport({ seqUrl: 'http://seq' });
        assert.equal(t.writableObjectMode, true);
    });
});

describe('@unit SeqTransport _write', () => {
    let t;
    beforeEach(() => {
        state.constructed = []; state.emitted = []; state.closed = 0;
        t = new SeqTransport({ seqUrl: 'http://seq' });
    });

    it('maps the pino level to the Seq level name', async () => {
        await write(t, { level: 'error', time: 1, message: 'boom', attributes: ['svc'] });
        assert.equal(state.emitted[0].level, 'Error');
    });

    const cases = [
        ['trace', 'Verbose'], ['debug', 'Debug'], ['info', 'Information'],
        ['warn', 'Warning'], ['error', 'Error'], ['fatal', 'Fatal'],
    ];
    for (const [level, mapped] of cases) {
        it(`maps level "${level}" → "${mapped}"`, async () => {
            await write(t, { level, time: 2, message: 'm', attributes: ['a'] });
            assert.equal(state.emitted[0].level, mapped);
        });
    }

    it('builds the message template from attributes and message', async () => {
        await write(t, { level: 'info', time: 5, message: 'hello', attributes: ['API', 'GW'] });
        assert.equal(state.emitted[0].messageTemplate, '[API, GW]: hello');
    });

    it('forwards timestamp and properties', async () => {
        await write(t, { level: 'info', time: 99, message: 'm', attributes: ['x'] });
        assert.equal(state.emitted[0].timestamp, 99);
        assert.deepEqual(state.emitted[0].properties, { level: 'info', time: 99, attributes: ['x'] });
    });

    it('calls back without error on success', async () => {
        const err = await new Promise((resolve) =>
            t._write(JSON.stringify({ level: 'info', time: 1, message: 'm', attributes: [] }), 'utf8', resolve));
        assert.equal(err, undefined);
    });

    it('calls back with an error on malformed JSON and does not emit', async () => {
        const err = await new Promise((resolve) => t._write('}{not json', 'utf8', resolve));
        assert.ok(err instanceof Error);
        assert.equal(state.emitted.length, 0);
    });
});

describe('@unit SeqTransport _final', () => {
    beforeEach(() => { state.constructed = []; state.emitted = []; state.closed = 0; });

    it('closes the underlying logger and calls back', async () => {
        const t = new SeqTransport({ seqUrl: 'http://seq' });
        const done = await new Promise((resolve) => t._final(() => resolve(true)));
        assert.equal(done, true);
        assert.equal(state.closed, 1);
    });
});
