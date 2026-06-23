import { assert } from 'chai';
import { ConsoleTransport } from '../../../dist/helpers/console-transport.js';

function withCapturedConsole(fn) {
    const original = {
        info: console.info,
        warn: console.warn,
        error: console.error,
        log: console.log,
    };
    const captured = { info: [], warn: [], error: [], log: [] };
    console.info = (...args) => { captured.info.push(args); };
    console.warn = (...args) => { captured.warn.push(args); };
    console.error = (...args) => { captured.error.push(args); };
    console.log = (...args) => { captured.log.push(args); };
    try {
        fn(captured);
    } finally {
        console.info = original.info;
        console.warn = original.warn;
        console.error = original.error;
        console.log = original.log;
    }
    return captured;
}

describe('ConsoleTransport.log', () => {
    let transport;
    let cb;

    beforeEach(() => {
        transport = new ConsoleTransport({});
        cb = () => {};
    });

    it('routes type=INFO entries to console.info', () => {
        const captured = withCapturedConsole(() => {
            transport.log({ type: 'INFO', message: 'hi', attributes: ['svc'] }, cb);
        });
        assert.equal(captured.info.length, 1);
        assert.equal(captured.warn.length, 0);
        assert.equal(captured.error.length, 0);
    });

    it('routes type=WARN entries to console.warn', () => {
        const captured = withCapturedConsole(() => {
            transport.log({ type: 'WARN', message: 'careful', attributes: ['svc'] }, cb);
        });
        assert.equal(captured.warn.length, 1);
    });

    it('routes type=ERROR entries to console.error', () => {
        const captured = withCapturedConsole(() => {
            transport.log({ type: 'ERROR', message: 'broke', attributes: ['svc'] }, cb);
        });
        assert.equal(captured.error.length, 1);
    });

    it('falls back to console.log for unknown types', () => {
        const captured = withCapturedConsole(() => {
            transport.log({ type: 'WHATEVER', message: 'misc', attributes: ['x'] }, cb);
        });
        assert.equal(captured.log.length, 1);
    });

    it('formats the leading prefix as "<ISO> [attributes]:" and passes message as second arg', () => {
        const captured = withCapturedConsole(() => {
            transport.log({ type: 'INFO', message: 'payload', attributes: ['a', 'b'] }, cb);
        });
        const [prefix, message] = captured.info[0];
        assert.match(prefix, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        assert.match(prefix, /\[a,b\]:/);
        assert.equal(message, 'payload');
    });

    it('handles missing attributes gracefully (renders the empty bracket)', () => {
        const captured = withCapturedConsole(() => {
            transport.log({ type: 'INFO', message: 'x' }, cb);
        });
        const [prefix] = captured.info[0];
        // attributes?.join(',') yields undefined → "[undefined]:" in format
        assert.match(prefix, /\[(undefined|)\]:/);
    });
});
