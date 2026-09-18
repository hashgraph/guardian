import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { streamToBuffer } from '../../dist/helpers/stream-to-buffer.js';

describe('streamToBuffer', () => {
    it('concatenates string chunks into a Buffer', async () => {
        const stream = Readable.from(['hello', ' ', 'world']);
        const buf = await streamToBuffer(stream);
        assert.ok(Buffer.isBuffer(buf));
        assert.equal(buf.toString('utf8'), 'hello world');
    });

    it('concatenates Buffer chunks', async () => {
        const stream = Readable.from([Buffer.from([0x01, 0x02]), Buffer.from([0x03])]);
        const buf = await streamToBuffer(stream);
        assert.deepEqual([...buf], [1, 2, 3]);
    });

    it('resolves to an empty Buffer for an empty stream', async () => {
        const stream = Readable.from([]);
        const buf = await streamToBuffer(stream);
        assert.equal(buf.length, 0);
    });

    it('rejects when the stream errors', async () => {
        const stream = new Readable({
            read() {
                process.nextTick(() => this.emit('error', new Error('boom')));
            },
        });
        await assert.rejects(streamToBuffer(stream), /boom/);
    });
});
