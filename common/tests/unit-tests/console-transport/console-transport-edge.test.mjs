import assert from 'node:assert/strict';
import esmock from 'esmock';
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

describe('@unit ConsoleTransport (edge)', () => {
    it('throws synchronously from _write on malformed JSON', () => {
        const t = new ConsoleTransport({});
        assert.throws(() => t._write(Buffer.from('not-json{'), 'utf8', () => {}));
    });

    it('does not invoke the callback when _write parsing fails', () => {
        const t = new ConsoleTransport({});
        let called = false;
        try {
            t._write(Buffer.from('{bad'), 'utf8', () => { called = true; });
        } catch {
            // expected
        }
        assert.equal(called, false);
    });

    it('renders an empty attributes array as an empty bracket prefix', (done) => {
        const cap = captureConsole();
        const t = new ConsoleTransport({});
        t.log({ type: 'INFO', message: 'm', attributes: [] }, () => {
            cap.restore();
            assert.ok(cap.calls.info[0][0].includes('[]:'));
            done();
        });
    });

    it('passes through an undefined message unchanged', (done) => {
        const cap = captureConsole();
        const t = new ConsoleTransport({});
        t.log({ type: 'INFO', attributes: ['svc'] }, () => {
            cap.restore();
            assert.equal(cap.calls.info.length, 1);
            assert.equal(cap.calls.info[0][1], undefined);
            done();
        });
    });

    it('renders the literal "undefined" attribute join when attributes is missing', (done) => {
        const cap = captureConsole();
        const t = new ConsoleTransport({});
        t.log({ type: 'WARN', message: 'm' }, () => {
            cap.restore();
            assert.ok(cap.calls.warn[0][0].includes('[undefined]:'));
            done();
        });
    });

    it('routes a lowercase "info" type to console.log (unknown level)', (done) => {
        const cap = captureConsole();
        const t = new ConsoleTransport({});
        t.log({ type: 'info', message: 'm', attributes: [] }, () => {
            cap.restore();
            assert.equal(cap.calls.log.length, 1);
            assert.equal(cap.calls.info.length, 0);
            done();
        });
    });

    it('routes a missing type to console.log (unknown level)', (done) => {
        const cap = captureConsole();
        const t = new ConsoleTransport({});
        t.log({ message: 'm', attributes: [] }, () => {
            cap.restore();
            assert.equal(cap.calls.log.length, 1);
            done();
        });
    });

    it('preserves multi-line messages without altering line breaks', (done) => {
        const cap = captureConsole();
        const t = new ConsoleTransport({});
        const multi = 'line-1\nline-2\nline-3';
        t.log({ type: 'ERROR', message: multi, attributes: ['svc'] }, () => {
            cap.restore();
            assert.equal(cap.calls.error[0][1], multi);
            done();
        });
    });

    it('invokes the _write callback exactly once for a valid chunk', () => {
        const cap = captureConsole();
        const t = new ConsoleTransport({});
        let count = 0;
        const chunk = Buffer.from(JSON.stringify({ type: 'INFO', message: 'x', attributes: [] }));
        t._write(chunk, 'utf8', () => { count += 1; });
        cap.restore();
        assert.equal(count, 1);
    });

    it('joins a single empty-string attribute into an empty token', (done) => {
        const cap = captureConsole();
        const t = new ConsoleTransport({});
        t.log({ type: 'INFO', message: 'm', attributes: [''] }, () => {
            cap.restore();
            assert.ok(cap.calls.info[0][0].includes('[]:'));
            done();
        });
    });
});

const loadPinoTransport = async (spies) => {
    const writes = [];
    const opened = [];
    const made = [];
    const existing = spies.existing || new Set();

    const fsStub = {
        existsSync: (p) => existing.has(p),
        mkdirSync: (p) => { made.push(p); },
        openSync: (p) => { opened.push(p); return 1; },
    };
    const pinoStub = {
        default: {
            destination: () => ({
                write: (line) => { writes.push(line); },
            }),
        },
    };

    const { PinoFileTransport } = await esmock(
        '../../../dist/helpers/pino-file-transport.js',
        {
            fs: fsStub,
            pino: pinoStub,
        },
    );
    return { PinoFileTransport, writes, opened, made };
};

describe('@unit PinoFileTransport (edge)', () => {
    it('creates the directory and opens the file when neither exists', async () => {
        const { PinoFileTransport, opened, made } = await loadPinoTransport({});
        new PinoFileTransport({ filePath: '/var/log/app/out.log' });
        assert.equal(made.length, 1);
        assert.equal(opened.length, 1);
    });

    it('does not mkdir or openSync when the directory and file already exist', async () => {
        const existing = new Set(['/var/log/app', '/var/log/app/out.log']);
        const { PinoFileTransport, opened, made } = await loadPinoTransport({ existing });
        new PinoFileTransport({ filePath: '/var/log/app/out.log' });
        assert.equal(made.length, 0);
        assert.equal(opened.length, 0);
    });

    it('creates the file only when the directory exists but the file is missing', async () => {
        const existing = new Set(['/var/log/app']);
        const { PinoFileTransport, opened, made } = await loadPinoTransport({ existing });
        new PinoFileTransport({ filePath: '/var/log/app/out.log' });
        assert.equal(made.length, 0);
        assert.equal(opened.length, 1);
    });

    it('re-serializes the parsed object, stripping incidental whitespace', async () => {
        const { PinoFileTransport, writes } = await loadPinoTransport({});
        const t = new PinoFileTransport({ filePath: '/tmp/x.log' });
        t.write('{ "b" : 2 ,  "a" : 1 }');
        assert.equal(writes.length, 1);
        assert.equal(writes[0], '{"b":2,"a":1}\n');
    });

    it('terminates each written entry with exactly one newline', async () => {
        const { PinoFileTransport, writes } = await loadPinoTransport({});
        const t = new PinoFileTransport({ filePath: '/tmp/x.log' });
        t.write(JSON.stringify({ message: 'hello' }));
        assert.ok(writes[0].endsWith('\n'));
        assert.equal(writes[0].endsWith('\n\n'), false);
    });

    it('preserves a multi-line message value through the round-trip', async () => {
        const { PinoFileTransport, writes } = await loadPinoTransport({});
        const t = new PinoFileTransport({ filePath: '/tmp/x.log' });
        t.write(JSON.stringify({ message: 'a\nb\nc' }));
        const parsed = JSON.parse(writes[0]);
        assert.equal(parsed.message, 'a\nb\nc');
    });

    it('throws and writes nothing when given an empty string', async () => {
        const { PinoFileTransport, writes } = await loadPinoTransport({});
        const t = new PinoFileTransport({ filePath: '/tmp/x.log' });
        assert.throws(() => t.write(''));
        assert.equal(writes.length, 0);
    });

    it('serializes a JSON null payload to the literal "null" line', async () => {
        const { PinoFileTransport, writes } = await loadPinoTransport({});
        const t = new PinoFileTransport({ filePath: '/tmp/x.log' });
        t.write('null');
        assert.equal(writes[0], 'null\n');
    });
});
