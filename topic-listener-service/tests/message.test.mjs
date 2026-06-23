import assert from 'node:assert/strict';
import { Message } from '../dist/api/message.js';

const b64 = (s) => Buffer.from(s).toString('base64');

const singleMsg = {
    consensus_timestamp: '1700000000.000000001',
    topic_id: '0.0.1234',
    message: b64('hello'),
    sequence_number: 7,
    payer_account_id: '0.0.42',
};

const chunked = (n, total, valid_start = '1700000000.111111111') => ({
    consensus_timestamp: `170000000${n}.000000000`,
    topic_id: '0.0.5555',
    message: b64(`chunk-${n}`),
    sequence_number: 100 + n,
    payer_account_id: '0.0.99',
    chunk_info: {
        number: n,
        total,
        initial_transaction_id: { transaction_valid_start: valid_start },
    },
});

describe('Message.getChunkId', () => {
    it('returns valid_start when chunk_info is present', () => {
        const m = chunked(1, 2, '1700000000.222222222');
        assert.equal(Message.getChunkId(m), '1700000000.222222222');
    });

    it('returns null when chunk_info is missing', () => {
        assert.equal(Message.getChunkId(singleMsg), null);
    });

    it('returns null on null/undefined input', () => {
        assert.equal(Message.getChunkId(null), null);
        assert.equal(Message.getChunkId(undefined), null);
    });

    it('returns null when initial_transaction_id is missing', () => {
        const m = { chunk_info: { number: 1, total: 1 } };
        assert.equal(Message.getChunkId(m), null);
    });
});

describe('Message.addChunk and compressMessages', () => {
    it('marks a single non-chunked message as COMPRESSED with decoded data', () => {
        const m = new Message();
        m.addChunk(singleMsg);
        assert.equal(m.status, 'COMPRESSED');
        assert.equal(m.data, 'hello');
        assert.equal(m.index, 7);
        assert.equal(m.chunkId, null);
        assert.equal(m.topicId, '0.0.1234');
        assert.equal(m.consensusTimestamp, '1700000000.000000001');
        assert.equal(m.owner, '0.0.42');
    });

    it('stays COMPRESSING until all chunks have arrived, then concatenates', () => {
        const m = new Message();
        m.addChunk(chunked(1, 3));
        assert.equal(m.status, 'COMPRESSING');
        assert.equal(m.data, null);
        assert.equal(m.chunkId, '1700000000.111111111');
        assert.equal(m.index, 101);

        m.addChunk(chunked(2, 3));
        assert.equal(m.status, 'COMPRESSING');
        assert.equal(m.data, null);

        m.addChunk(chunked(3, 3));
        assert.equal(m.status, 'COMPRESSED');
        assert.equal(m.data, 'chunk-1chunk-2chunk-3');
    });

    it('keeps the first chunk metadata as the canonical message attributes', () => {
        const m = new Message();
        const c1 = chunked(1, 2, '1700000000.AAA');
        const c2 = chunked(2, 2, '1700000000.AAA');
        m.addChunk(c1);
        m.addChunk(c2);
        assert.equal(m.index, c1.sequence_number);
        assert.equal(m.chunkId, '1700000000.AAA');
        assert.equal(m.topicId, c1.topic_id);
        assert.equal(m.consensusTimestamp, c1.consensus_timestamp);
        assert.equal(m.owner, c1.payer_account_id);
    });
});

describe('Message.compressData', () => {
    it('returns null when any chunk message is non-string', () => {
        const m = new Message();
        m.addChunk(singleMsg);
        // Inject a non-string payload to simulate a malformed chunk
        m.messages.push({ message: 12345, chunkNumber: 2, chunkTotal: 2 });
        assert.equal(m.compressData(), null);
    });

    it('decodes base64 chunks in array order', () => {
        const m = new Message();
        m.messages = [
            { message: b64('foo') },
            { message: b64('bar') },
            { message: b64('baz') },
        ];
        assert.equal(m.compressData(), 'foobarbaz');
    });
});

describe('Message.toJson', () => {
    it('exposes the canonical message shape', () => {
        const m = new Message();
        m.addChunk(singleMsg);
        assert.deepEqual(m.toJson(), {
            sequenceNumber: 7,
            message: 'hello',
            topicId: '0.0.1234',
            consensusTimestamp: '1700000000.000000001',
            owner: '0.0.42',
        });
    });

    it('returns null message when still compressing', () => {
        const m = new Message();
        m.addChunk(chunked(1, 2));
        const j = m.toJson();
        assert.equal(j.message, null);
        assert.equal(j.sequenceNumber, 101);
    });
});
