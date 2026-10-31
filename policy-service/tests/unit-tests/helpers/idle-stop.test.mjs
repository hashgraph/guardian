import { expect } from 'chai';
import { IdleStop, getDiscontinuedIdleMs } from '../../../dist/helpers/idle-stop.js';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

describe('IdleStop', () => {
    it('calls back once after the idle time', async () => {
        let calls = 0;
        const idle = new IdleStop(40, () => { calls++; }, 10);
        idle.start();
        await wait(120);
        expect(calls).to.equal(1);
    });

    it('is kept alive by touch', async () => {
        let calls = 0;
        const idle = new IdleStop(60, () => { calls++; }, 10);
        idle.start();
        for (let i = 0; i < 6; i++) {
            await wait(20);
            idle.touch();
        }
        expect(calls).to.equal(0);
        idle.stop();
    });

    it('does nothing after stop', async () => {
        let calls = 0;
        const idle = new IdleStop(20, () => { calls++; }, 5);
        idle.start();
        idle.stop();
        await wait(60);
        expect(calls).to.equal(0);
    });

    it('reads the idle time from the environment with a default', () => {
        const saved = process.env.POLICY_DISCONTINUED_IDLE_MS;
        try {
            delete process.env.POLICY_DISCONTINUED_IDLE_MS;
            expect(getDiscontinuedIdleMs()).to.equal(15 * 60 * 1000);
            process.env.POLICY_DISCONTINUED_IDLE_MS = '1234';
            expect(getDiscontinuedIdleMs()).to.equal(1234);
        } finally {
            if (saved === undefined) {
                delete process.env.POLICY_DISCONTINUED_IDLE_MS;
            } else {
                process.env.POLICY_DISCONTINUED_IDLE_MS = saved;
            }
        }
    });
});
