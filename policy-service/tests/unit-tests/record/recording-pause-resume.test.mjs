import { assert } from 'chai';
import esmock from 'esmock';

const rows = [];
const messages = [];

const { Recording } = await esmock.strict(
    '../../../dist/policy-engine/record/recording.js',
    {
        '@guardian/common': {
            DatabaseServer: class {
                static async createRecord(row) {
                    rows.push(row);
                }
            },
        },
        '../../../dist/policy-engine/block-tree-generator.js': {
            BlockTreeGenerator: class {
                sendMessage(event, payload) {
                    messages.push({ event, payload });
                }
            },
        },
    },
);

describe('@unit Recording pause and resume', () => {
    const realNow = Date.now;
    let now;

    beforeEach(() => {
        rows.length = 0;
        messages.length = 0;
        now = 1000;
        Date.now = () => now;
    });

    afterEach(() => {
        Date.now = realNow;
    });

    it('writes STOP at the remembered pause boundary', async () => {
        const recording = new Recording('policy-1', 'did:owner');
        await recording.start();
        now = 2000;
        assert.equal(await recording.pause(), true);
        now = 9000;
        assert.equal(await recording.stop(), true);
        assert.equal(rows.at(-1).method, 'STOP');
        assert.equal(rows.at(-1).time, 2000);
    });

    it('does not append actions while paused', async () => {
        const recording = new Recording('policy-1', 'did:owner');
        await recording.start();
        await recording.pause();
        await recording.selectGroup({ did: 'did:user' }, 'group-1');
        assert.deepEqual(rows.map((row) => row.method), ['START']);
    });

    it('resumes the same controller and accepts later actions', async () => {
        const recording = new Recording('policy-1', 'did:owner');
        const uuid = recording.uuid;
        await recording.start();
        await recording.pause();
        assert.equal(await recording.resume(), true);
        await recording.selectGroup({ did: 'did:user' }, 'group-1');
        assert.equal(recording.uuid, uuid);
        assert.deepEqual(rows.map((row) => row.method), ['START', 'ACTION']);
    });

    it('keeps ordinary stop behavior when no pause occurred', async () => {
        const recording = new Recording('policy-1', 'did:owner');
        await recording.start();
        now = 7000;
        await recording.stop();
        assert.equal(rows.at(-1).time, 7000);
    });

    it('does not pause or interrupt automatic recording', async () => {
        const recording = new Recording('policy-1', 'did:owner', { mode: 'auto' });
        assert.equal(await recording.pause(), false);
        assert.equal(await recording.resume(), false);
        await recording.selectGroup({ did: 'did:user' }, 'group-1');
        assert.equal(
            messages.some((message) => message.event === 'RECORD_PERSIST_STEP'),
            true
        );
    });

    it('reports the pause boundary in the status', async () => {
        const recording = new Recording('policy-1', 'did:owner');
        await recording.start();
        assert.equal(recording.getStatus().pausedAt, null);
        now = 2000;
        await recording.pause();
        assert.equal(recording.getStatus().pausedAt, 2000);
        now = 5000;
        await recording.resume();
        assert.equal(recording.getStatus().pausedAt, null);
    });

    it('keeps wall-clock time and records the paused total on a later action', async () => {
        const recording = new Recording('policy-1', 'did:owner');
        await recording.start();
        now = 1500;
        await recording.selectGroup({ did: 'did:user' }, 'group-1');
        now = 2000;
        await recording.pause();
        now = 5000;
        await recording.resume();
        now = 6000;
        await recording.selectGroup({ did: 'did:user' }, 'group-2');
        assert.equal(rows.at(-2).time, 1500);
        assert.equal(rows.at(-2).pausedOffset, 0);
        assert.equal(rows.at(-1).time, 6000);
        assert.equal(rows.at(-1).pausedOffset, 3000);
    });

    it('accumulates several paused intervals', async () => {
        const recording = new Recording('policy-1', 'did:owner');
        await recording.start();
        now = 2000;
        await recording.pause();
        now = 3000;
        await recording.resume();
        now = 4000;
        await recording.selectGroup({ did: 'did:user' }, 'group-1');
        now = 5000;
        await recording.pause();
        now = 6000;
        await recording.resume();
        now = 7000;
        await recording.selectGroup({ did: 'did:user' }, 'group-2');
        assert.equal(rows.at(-2).pausedOffset, 1000);
        assert.equal(rows.at(-1).pausedOffset, 2000);
    });

    it('records the paused total on the final stop', async () => {
        const recording = new Recording('policy-1', 'did:owner');
        await recording.start();
        now = 2000;
        await recording.pause();
        now = 5000;
        await recording.resume();
        now = 8000;
        await recording.pause();
        now = 9000;
        await recording.stop();
        assert.equal(rows.at(-1).method, 'STOP');
        assert.equal(rows.at(-1).time, 8000);
        assert.equal(rows.at(-1).pausedOffset, 3000);
    });

    it('uses the offset that applied when a deferred action started', async () => {
        const recording = new Recording('policy-1', 'did:owner');
        await recording.start();
        now = 2000;
        await recording.pause();
        now = 5000;
        await recording.resume();
        now = 6000;
        await recording.externalData({ payload: 1 }, 'ra-1', 1500);
        assert.equal(rows.at(-1).time, 1500);
        assert.equal(rows.at(-1).pausedOffset, 0);
    });

    it('counts only the pause elapsed before an action that started inside it', async () => {
        const recording = new Recording('policy-1', 'did:owner');
        await recording.start();
        now = 2000;
        await recording.pause();
        now = 5000;
        await recording.resume();
        now = 6000;
        await recording.externalData({ payload: 1 }, 'ra-1', 3000);
        assert.equal(rows.at(-1).time, 3000);
        assert.equal(rows.at(-1).pausedOffset, 1000);
    });

    it('leaves the paused total at zero when no pause was canceled', async () => {
        const recording = new Recording('policy-1', 'did:owner');
        await recording.start();
        now = 4000;
        await recording.selectGroup({ did: 'did:user' }, 'group-1');
        now = 7000;
        await recording.stop();
        assert.equal(rows.at(-2).time, 4000);
        assert.equal(rows.at(-2).pausedOffset, 0);
        assert.equal(rows.at(-1).time, 7000);
        assert.equal(rows.at(-1).pausedOffset, 0);
    });

    it('clears the pause boundary in the status after stop', async () => {
        const recording = new Recording('policy-1', 'did:owner');
        await recording.start();
        now = 3000;
        await recording.pause();
        now = 8000;
        await recording.stop();
        assert.equal(recording.getStatus().pausedAt, null);
    });
});
