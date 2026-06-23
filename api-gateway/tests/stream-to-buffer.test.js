import assert from 'node:assert/strict';
import { Readable } from 'stream';
import { streamToBuffer } from '../dist/helpers/stream-to-buffer.js';

describe('streamToBuffer', () => {
    it('concatenates chunks emitted by the stream', async () => {
        const stream = Readable.from([Buffer.from('hello '), Buffer.from('world')]);
        const buf = await streamToBuffer(stream);
        assert.equal(buf.toString('utf8'), 'hello world');
    });

    it('coerces non-Buffer chunks into Buffers', async () => {
        const stream = Readable.from(['ab', 'cd']);
        const buf = await streamToBuffer(stream);
        assert.equal(buf.toString('utf8'), 'abcd');
    });

    it('resolves to an empty Buffer for an empty stream', async () => {
        const stream = Readable.from([]);
        const buf = await streamToBuffer(stream);
        assert.equal(buf.length, 0);
    });

    it('rejects when the stream errors', async () => {
        const stream = new Readable({
            read() {
                this.destroy(new Error('boom'));
            },
        });
        await assert.rejects(streamToBuffer(stream), /boom/);
    });
});
