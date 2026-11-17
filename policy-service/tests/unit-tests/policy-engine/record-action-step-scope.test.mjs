import { assert } from 'chai';
import { RecordActionStep } from '../../../dist/policy-engine/record-action-step.js';

const link = (source, target, type = 'RunEvent') => ({
    source: { uuid: source, tag: source },
    target: { uuid: target, tag: target },
    type,
});

describe('RecordActionStep.scoped', () => {
    it('lets sibling scopes run the same links, as the chunks of a split do', () => {
        const step = new RecordActionStep(() => undefined);
        const first = step.scoped();
        const second = step.scoped();

        first.checkCycle(link('A', 'B'));

        assert.doesNotThrow(() => second.checkCycle(link('A', 'B')));
    });

    it('still rejects a loop inside one scope', () => {
        const scope = new RecordActionStep(() => undefined).scoped();
        scope.checkCycle(link('A', 'B'));
        scope.checkCycle(link('B', 'C'));

        assert.throws(() => scope.checkCycle(link('C', 'A')), /Cycle detected/);
    });

    it('still rejects a loop back to what ran before the scope was opened', () => {
        const step = new RecordActionStep(() => undefined);
        step.checkCycle(link('A', 'B'));
        const scope = step.scoped();

        assert.throws(() => scope.checkCycle(link('C', 'B')), /Cycle detected/);
    });

    it('does not leak what a scope used into its parent', () => {
        const step = new RecordActionStep(() => undefined);
        step.scoped().checkCycle(link('A', 'B'));

        assert.doesNotThrow(() => step.checkCycle(link('A', 'B')));
    });

    it('shares the counter, the results and the errors with its parent', () => {
        const step = new RecordActionStep(() => undefined, 0, true, true);
        const scope = step.scoped();

        scope.inc();
        scope.saveResult({ n: 1 });
        scope.addError(new Error('boom'));

        assert.equal(step.counter, 1);
        assert.deepEqual(step.getResults(), [{ n: 1 }]);
        assert.equal(step.getErrors()[0].message, 'boom');
    });

    describe('completion', () => {
        const realSetTimeout = globalThis.setTimeout;
        const realClearTimeout = globalThis.clearTimeout;
        let scheduled;

        beforeEach(() => {
            scheduled = [];
            globalThis.setTimeout = (fn) => {
                scheduled.push(fn);
                return scheduled.length;
            };
            globalThis.clearTimeout = (id) => {
                scheduled[id - 1] = null;
            };
        });

        afterEach(() => {
            globalThis.setTimeout = realSetTimeout;
            globalThis.clearTimeout = realClearTimeout;
        });

        it('fires the completion callback of the parent once, when the last scope finishes', () => {
            let fired = 0;
            const step = new RecordActionStep(() => { fired++; }, 2);
            const first = step.scoped();
            const second = step.scoped();

            first.dec();
            second.dec();
            scheduled.forEach((fn) => fn?.());

            assert.equal(fired, 1);
        });
    });

    it('is an action step for code that checks the type', () => {
        const step = new RecordActionStep(() => undefined);

        assert.instanceOf(step.scoped(), RecordActionStep);
    });
});
