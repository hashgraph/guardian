import assert from 'node:assert/strict';
import { RecordActionStep } from '../../../dist/policy-engine/record-action-step.js';
import { PolicyLink } from '../../../dist/policy-engine/interfaces/policy-event.js';
import { PreviewBranches } from '../../../dist/policy-engine/helpers/preview-branches.js';

describe('@unit preview branch saves', () => {
    it('selects only the last saved document at a completed end', async () => {
        const branches = new PreviewBranches();
        await branches.run(async () => {
            branches.save('first');
            branches.save('last');
            branches.finish();
        });
        assert.deepEqual([...branches.getFinalIds()], ['last']);
    });

    it('does not make a save final without a completed end', async () => {
        const branches = new PreviewBranches();
        await branches.run(() => branches.save('saved'));
        assert.deepEqual([...branches.getFinalIds()], []);
    });

    it('isolates sibling saves and failures, including overlapping execution', async () => {
        const branches = new PreviewBranches();
        let release;
        const ready = new Promise((resolve) => { release = resolve; });
        await Promise.all([
            branches.run(async () => {
                branches.save('success');
                release();
                await new Promise((resolve) => setTimeout(resolve, 5));
                branches.finish();
            }),
            branches.run(async () => {
                await ready;
                branches.save('failed');
                branches.fail();
                branches.finish();
            })
        ]);
        assert.deepEqual([...branches.getFinalIds()], ['success']);
    });

    it('inherits ancestor saves without leaking a sibling save', async () => {
        const branches = new PreviewBranches();
        await branches.run(async () => {
            branches.save('ancestor');
            await branches.run(() => { branches.save('child'); branches.finish(); });
            await branches.run(() => branches.finish());
        });
        assert.deepEqual([...branches.getFinalIds()], ['child', 'ancestor']);
    });

    it('drops a completed end if the same invocation subsequently fails', async () => {
        const branches = new PreviewBranches();
        await assert.rejects(branches.run(() => {
            branches.save('saved');
            branches.finish();
            throw new Error('failed');
        }), /failed/);
        assert.deepEqual([...branches.getFinalIds()], []);
    });

    it('allows an error-handler child to complete without making the failed path final', async () => {
        const branches = new PreviewBranches();
        await branches.run(async () => {
            branches.save('failed');
            branches.fail();
            await branches.run(() => { branches.save('recovered'); branches.finish(); });
            branches.finish();
        });
        assert.deepEqual([...branches.getFinalIds()], ['recovered']);
    });

    it('keeps separate previews isolated', () => {
        const first = new PreviewBranches();
        const second = new PreviewBranches();
        first.save('first'); first.finish();
        assert.deepEqual([...second.getFinalIds()], []);
    });
    for (const method of ['run', 'runSync']) {
        it(`isolates saves and errors through actual event ${method} dispatch`, async () => {
            const step = new RecordActionStep(() => {}, 0, true, true, undefined, true);
            const source = { policyId: 'policy', tag: 'source', uuid: 'source' };
            const success = new PolicyLink('RunEvent', 'Calculated', source, { tag: 'success', uuid: 'success' }, '', async (event) => {
                event.actionStatus.previewBranches.save('successful-output');
                event.actionStatus.addPreviewDocument('success', null, { data: { id: 'successful-output' } });
            });
            const failure = new PolicyLink('RunEvent', 'Calculated', source, { tag: 'failure', uuid: 'failure' }, '', async (event) => {
                event.actionStatus.previewBranches.save('failed-output');
                event.actionStatus.addError(new Error('failed'), 'customLogicBlock');
            });
            await success[method]({}, {}, step);
            await failure[method]({}, {}, step);
            assert.deepEqual([...step.previewBranches.getFinalIds()], ['successful-output']);
            assert.equal(step.counter, 0);
        });
    }

});
