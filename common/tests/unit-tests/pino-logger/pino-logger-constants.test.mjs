import assert from 'node:assert/strict';
import { PinoLogType } from '@guardian/interfaces';
import { levelTypeMapping, MAP_TRANSPORTS } from '../../../dist/helpers/pino-logger.js';

describe('levelTypeMapping', () => {
    it('is an array of four entries (debug / info / warn / error)', () => {
        assert.ok(Array.isArray(levelTypeMapping));
        assert.equal(levelTypeMapping.length, 4);
    });

    it('orders levels DEBUG -> INFO -> WARN -> ERROR', () => {
        assert.deepEqual(levelTypeMapping, [PinoLogType.DEBUG, PinoLogType.INFO, PinoLogType.WARN, PinoLogType.ERROR]);
    });
});

describe('MAP_TRANSPORTS registry', () => {
    it('exposes the four built-in transports as constructor classes', () => {
        for (const name of ['CONSOLE', 'MONGO', 'FILE', 'SEQ']) {
            assert.equal(typeof MAP_TRANSPORTS[name], 'function', `${name} should be a class`);
            assert.ok(MAP_TRANSPORTS[name].prototype, `${name}.prototype should exist`);
        }
    });

    it('does not include unknown transports', () => {
        assert.equal(MAP_TRANSPORTS.OTLP, undefined);
        assert.equal(MAP_TRANSPORTS.STDOUT, undefined);
    });
});
