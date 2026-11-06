import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import { PinoLogger, resolveLogLevel } from '../../../dist/helpers/pino-logger.js';

describe('logger thresholds', () => {
    for (const value of ['debug', 'info', 'warn', 'error']) {
        it(`resolves ${value} by name`, () => assert.equal(resolveLogLevel(value), value));
    }
    for (const value of [undefined, '', '2', '0', 'DEBUG', 'verbose', 'trace', 'fatal', 5]) {
        it(`defaults ${String(value)} to info`, () => assert.equal(resolveLogLevel(value), 'info'));
    }
    for (const level of ['debug', 'info', 'warn', 'error', undefined]) {
        it(`delivers the ${String(level)} threshold to every output`, async () => {
            const outputs = [];
            class Capture extends Writable {
                constructor() { super(); this.entries = []; outputs.push(this.entries); }
                _write(chunk, encoding, done) { this.entries.push(JSON.parse(chunk.toString())); done(); }
            }
            const logger = new PinoLogger().init({ logLevel: level, transports: 'A,B,C', mapTransports: { A: Capture, B: Capture, C: Capture } });
            for (const method of ['debug', 'info', 'warn', 'error']) await logger[method](method, ['test'], 'user');
            const methods = ['debug', 'info', 'warn', 'error'].slice(['debug', 'info', 'warn', 'error'].indexOf(level ?? 'info'));
            for (const entries of outputs) {
                assert.deepEqual(entries.map(entry => entry.message), methods);
                assert.deepEqual(entries.map(entry => entry.type), methods.map(method => method.toUpperCase()));
            }
            assert.equal(outputs.length, 3);
        });
    }
});
