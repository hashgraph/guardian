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
});
