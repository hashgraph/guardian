import { describe, expect, it, jest, afterEach } from '@jest/globals';
import { CircuitBreaker } from '@worker/project-mapper/resolvers/circuit-breaker';

describe('CircuitBreaker', () => {
    afterEach(() => { jest.restoreAllMocks(); });

    it('runs fn and returns its result when closed', async () => {
        const cb = new CircuitBreaker('t', 3, 1000);
        const fn = jest.fn(async () => 'ok');
        await expect(cb.run(fn, 'fb')).resolves.toBe('ok');
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it('absorbs a thrown fn as the fallback (never rethrows)', async () => {
        const cb = new CircuitBreaker('t', 3, 1000);
        const fn = jest.fn(async () => { throw new Error('boom'); });
        await expect(cb.run(fn, 'fb')).resolves.toBe('fb');
    });

    it('opens after `threshold` consecutive failures and short-circuits without calling fn', async () => {
        const cb = new CircuitBreaker('t', 2, 10_000);
        const failing = jest.fn(async () => { throw new Error('x'); });
        await cb.run(failing, 'fb');
        await cb.run(failing, 'fb');
        const probe = jest.fn(async () => 'live');
        await expect(cb.run(probe, 'fb')).resolves.toBe('fb');
        expect(probe).not.toHaveBeenCalled();
    });

    it('half-opens after cooldown, probes, and closes on success', async () => {
        const nowSpy = jest.spyOn(Date, 'now');
        nowSpy.mockReturnValue(1_000);
        const cb = new CircuitBreaker('t', 1, 5_000);
        await cb.run(async () => { throw new Error('x'); }, 'fb');   // opens at t=1000
        nowSpy.mockReturnValue(2_000);                               // still in cooldown
        const blocked = jest.fn(async () => 'live');
        await expect(cb.run(blocked, 'fb')).resolves.toBe('fb');
        expect(blocked).not.toHaveBeenCalled();
        nowSpy.mockReturnValue(7_001);                              // cooldown elapsed
        const probe = jest.fn(async () => 'live');
        await expect(cb.run(probe, 'fb')).resolves.toBe('live');
        expect(probe).toHaveBeenCalledTimes(1);
        const after = jest.fn(async () => 'ok2');                   // closed: counter reset
        await expect(cb.run(after, 'fb')).resolves.toBe('ok2');
        expect(after).toHaveBeenCalledTimes(1);
    });

    it('uses a null sentinel: a circuit opened at Date.now()===0 is still OPEN', async () => {
        jest.spyOn(Date, 'now').mockReturnValue(0);
        const cb = new CircuitBreaker('t', 2, 1_000);
        const failing = async () => { throw new Error('x'); };
        await cb.run(failing, 'fb');   // failure 1 at t=0
        await cb.run(failing, 'fb');   // failure 2 at t=0 → openedAt = 0
        const probe = jest.fn(async () => 'live');
        // 0 - 0 = 0 < cooldown. A `0` sentinel would read as "closed" and call probe.
        await expect(cb.run(probe, 'fb')).resolves.toBe('fb');
        expect(probe).not.toHaveBeenCalled();
    });
});
