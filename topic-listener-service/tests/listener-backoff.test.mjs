import assert from 'node:assert/strict';
import { Listener } from '../dist/api/listener.js';

const b64 = (s) => Buffer.from(s).toString('base64');

const makeChannel = () => {
    const calls = { subscribe: [], publish: [] };
    return {
        calls,
        subscribe(subject, cb) {
            calls.subscribe.push({ subject, cb });
            return { closed: false, unsubscribe() { this.closed = true; } };
        },
        async publish(subject, data) {
            calls.publish.push({ subject, data });
        },
    };
};

const makeListener = (overrides = {}, channel = makeChannel()) => new Listener(channel, {
    id: 'listener-1',
    name: 'my-listener',
    topicId: '0.0.5005',
    searchIndex: 10,
    sendIndex: 10,
    ...overrides,
});

const topicMessage = (sequence, text, chunk = null) => ({
    consensus_timestamp: `170000000${sequence}.000000001`,
    topic_id: '0.0.5005',
    message: b64(text),
    sequence_number: sequence,
    payer_account_id: '0.0.42',
    chunk_info: chunk,
});

const chunkInfo = (validStart, number, total) => ({
    initial_transaction_id: {
        account_id: '0.0.42',
        transaction_valid_start: validStart,
    },
    number,
    total,
});

const throttled = (retryAfter) => {
    const error = new Error('Request failed with status code 429');
    error.response = { status: 429, headers: retryAfter ? { 'retry-after': retryAfter } : {} };
    return error;
};

describe('Listener adaptive polling', () => {
    it('is due immediately when freshly constructed', () => {
        assert.equal(makeListener().isPollDue(), true);
    });

    it('backs off further on each empty poll, then resets when a message arrives', () => {
        const listener = makeListener();

        listener.onPollSuccess(false);
        const first = listener._nextPollAt;
        assert.equal(listener.isPollDue(), false);

        listener.onPollSuccess(false);
        assert.ok(listener._nextPollAt > first, 'second empty poll should wait longer');

        listener.onPollSuccess(true);
        assert.equal(listener._idleCount, 0);
        assert.equal(listener.isPollDue(), true);
    });

    it('caps the idle backoff', () => {
        const listener = makeListener();
        for (let i = 0; i < 20; i++) {
            listener.onPollSuccess(false);
        }
        const delay = listener._nextPollAt - Date.now();
        assert.ok(delay <= Listener.IDLE_BACKOFF_MAX_MS, `idle backoff ${delay} exceeded cap`);
        assert.ok(delay >= Listener.IDLE_BACKOFF_MAX_MS * 0.75, `idle backoff ${delay} below floor`);
    });

    it('grows the error backoff exponentially and caps it', () => {
        const listener = makeListener();

        const first = listener.onPollError(new Error('boom'));
        const second = listener.onPollError(new Error('boom'));
        assert.ok(second > first, 'second failure should wait longer');

        for (let i = 0; i < 20; i++) {
            listener.onPollError(new Error('boom'));
        }
        assert.ok(
            listener.onPollError(new Error('boom')) <= Listener.ERROR_BACKOFF_MAX_MS,
            'error backoff exceeded cap'
        );
    });

    it('honours Retry-After in seconds', () => {
        assert.equal(makeListener().onPollError(throttled('30')), 30000);
    });

    it('honours Retry-After as an http date', () => {
        const delay = makeListener().onPollError(throttled(new Date(Date.now() + 45000).toUTCString()));
        assert.ok(delay > 40000 && delay <= 45000, `unexpected delay ${delay}`);
    });

    it('falls back to exponential backoff for an unusable Retry-After', () => {
        assert.ok(makeListener().onPollError(throttled('not-a-date')) > 0);
    });

    it('skips the mirror node call while backing off', async () => {
        const listener = makeListener();
        let calls = 0;
        listener.getMessages = async () => {
            calls++;
            throw throttled('30');
        };

        assert.equal(await listener.search(), true);
        assert.equal(calls, 1);
        assert.equal(listener.isPollDue(), false);

        assert.equal(await listener.search(), false, 'search must not call while backing off');
        assert.equal(calls, 1, 'no mirror node call while backing off');
    });
});

describe('Listener chunk handling', () => {
    it('advances searchIndex when appending to an existing chunk group', () => {
        const listener = makeListener();
        listener.addMessages(topicMessage(11, 'foo', chunkInfo('1-1', 1, 2)));
        assert.equal(listener._searchIndex, 11);
        listener.addMessages(topicMessage(12, 'bar', chunkInfo('1-1', 2, 2)));
        assert.equal(listener._searchIndex, 12);
    });

    it('ignores a re-fetched chunk instead of overshooting chunkTotal', () => {
        const listener = makeListener();
        listener.addMessages(topicMessage(11, 'foo', chunkInfo('1-1', 1, 2)));
        listener.addMessages(topicMessage(12, 'bar', chunkInfo('1-1', 2, 2)));
        listener.addMessages(topicMessage(12, 'bar', chunkInfo('1-1', 2, 2)));
        assert.equal(listener._messages.length, 1);
        assert.equal(listener._messages[0].messages.length, 2);
        assert.equal(listener._messages[0].status, 'COMPRESSED');
        assert.equal(listener._messages[0].data, 'foobar');
    });

    it('reassembles chunks that arrive out of order', () => {
        const listener = makeListener();
        listener.addMessages(topicMessage(12, 'bar', chunkInfo('1-1', 2, 2)));
        listener.addMessages(topicMessage(11, 'foo', chunkInfo('1-1', 1, 2)));
        assert.equal(listener._messages.length, 1);
        assert.equal(listener._messages[0].data, 'foobar');
    });
});
