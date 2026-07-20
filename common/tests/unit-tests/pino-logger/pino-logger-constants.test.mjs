import assert from 'node:assert/strict';
import { PinoLogType } from '@guardian/interfaces';
import { levelTypeMapping, MAP_TRANSPORTS } from '../../../dist/helpers/pino-logger.js';

describe('levelTypeMapping', () => {
    it('is an array of three entries (info / warn / error)', () => {
        assert.ok(Array.isArray(levelTypeMapping));
        assert.equal(levelTypeMapping.length, 3);
    });

    it('orders levels INFO -> WARN -> ERROR', () => {
        assert.equal(levelTypeMapping[0], PinoLogType.INFO);
        assert.equal(levelTypeMapping[1], PinoLogType.WARN);
        assert.equal(levelTypeMapping[2], PinoLogType.ERROR);
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
