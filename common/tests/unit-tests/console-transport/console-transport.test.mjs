import assert from 'node:assert/strict';
import { ConsoleTransport } from '../../../dist/helpers/console-transport.js';

const captureConsole = () => {
    const calls = { info: [], warn: [], error: [], log: [] };
    const original = {
        info: console.info,
        warn: console.warn,
        error: console.error,
        log: console.log,
    };
    console.info = (...args) => calls.info.push(args);
    console.warn = (...args) => calls.warn.push(args);
    console.error = (...args) => calls.error.push(args);
    console.log = (...args) => calls.log.push(args);
    const restore = () => {
        console.info = original.info;
        console.warn = original.warn;
        console.error = original.error;
        console.log = original.log;
    };
    return { calls, restore };
};

describe('ConsoleTransport.log (direct)', () => {
    it('routes INFO entries to console.info', (done) => {
        const cap = captureConsole();
        const t = new ConsoleTransport({});
        t.log({ type: 'INFO', message: 'hello', attributes: ['svc'] }, () => {
            cap.restore();
            assert.equal(cap.calls.info.length, 1);
            assert.ok(cap.calls.info[0][0].includes('[svc]:'));
            assert.equal(cap.calls.info[0][1], 'hello');
            assert.equal(cap.calls.warn.length, 0);
            assert.equal(cap.calls.error.length, 0);
            done();
        });
    });

    it('routes WARN entries to console.warn', (done) => {
        const cap = captureConsole();
        const t = new ConsoleTransport({});
        t.log({ type: 'WARN', message: 'warn-msg', attributes: ['a', 'b'] }, () => {
            cap.restore();
            assert.equal(cap.calls.warn.length, 1);
            assert.ok(cap.calls.warn[0][0].includes('[a,b]:'));
            assert.equal(cap.calls.warn[0][1], 'warn-msg');
            done();
        });
    });

    it('routes ERROR entries to console.error', (done) => {
        const cap = captureConsole();
        const t = new ConsoleTransport({});
        t.log({ type: 'ERROR', message: 'boom', attributes: ['svc'] }, () => {
            cap.restore();
            assert.equal(cap.calls.error.length, 1);
            assert.equal(cap.calls.error[0][1], 'boom');
            done();
        });
    });

    it('falls through to console.log for unknown types', (done) => {
        const cap = captureConsole();
        const t = new ConsoleTransport({});
        t.log({ type: 'TRACE', message: 'trace', attributes: [] }, () => {
            cap.restore();
            assert.equal(cap.calls.log.length, 1);
            done();
        });
    });

    it('joins attributes with comma in the prefix', (done) => {
        const cap = captureConsole();
        const t = new ConsoleTransport({});
        t.log({ type: 'INFO', message: 'm', attributes: ['x', 'y', 'z'] }, () => {
            cap.restore();
            assert.ok(cap.calls.info[0][0].includes('[x,y,z]:'));
            done();
        });
    });

    it('handles missing attributes safely', (done) => {
        const cap = captureConsole();
        const t = new ConsoleTransport({});
        t.log({ type: 'INFO', message: 'm' }, () => {
            cap.restore();
            assert.equal(cap.calls.info.length, 1);
            done();
        });
    });

    it('prefix begins with an ISO timestamp', (done) => {
        const cap = captureConsole();
        const t = new ConsoleTransport({});
        t.log({ type: 'INFO', message: 'x', attributes: [] }, () => {
            cap.restore();
            assert.match(cap.calls.info[0][0], /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z /);
            done();
        });
    });
});

describe('ConsoleTransport pino adapter (_write)', () => {
    it('parses a JSON chunk and forwards to log()', () => {
        const cap = captureConsole();
        const t = new ConsoleTransport({});
        const chunk = Buffer.from(JSON.stringify({
            type: 'INFO',
            message: 'wired',
            attributes: ['pino'],
        }));
        t._write(chunk, 'utf8', () => {
            cap.restore();
            assert.equal(cap.calls.info.length, 1);
            assert.equal(cap.calls.info[0][1], 'wired');
        });
    });

    it('writes via the Writable stream interface', (done) => {
        const cap = captureConsole();
        const t = new ConsoleTransport({});
        t.write(JSON.stringify({ type: 'WARN', message: 'streamed', attributes: [] }), 'utf8', () => {
            cap.restore();
            assert.equal(cap.calls.warn.length, 1);
            assert.equal(cap.calls.warn[0][1], 'streamed');
            done();
        });
    });
});
