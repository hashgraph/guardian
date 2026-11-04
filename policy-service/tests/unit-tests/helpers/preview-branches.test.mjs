import assert from 'node:assert/strict';
import { RecordActionStep } from '../../../dist/policy-engine/record-action-step.js';
import { PolicyLink } from '../../../dist/policy-engine/interfaces/policy-event.js';
import { PreviewBranches } from '../../../dist/policy-engine/helpers/preview-branches.js';
import { recordPreviewWait } from '../../../dist/policy-engine/helpers/preview.js';

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

    it('finishes a chain step that completes without passing anything further', async () => {
        const branches = new PreviewBranches();
        await branches.run(async () => {
            branches.save('output');
            await branches.run(() => undefined, true);
        }, true);
        assert.deepEqual([...branches.getFinalIds()], ['output']);
    });

    it('does not finish a chain step that passes its document to a further step', async () => {
        const branches = new PreviewBranches();
        await branches.run(async () => {
            branches.save('middle');
            await branches.run(() => branches.save('last'), true);
        }, true);
        assert.deepEqual([...branches.getFinalIds()], ['last']);
    });

    it('does not finish a quietly stopped chain step that failed', async () => {
        const branches = new PreviewBranches();
        await branches.run(() => { branches.save('reported'); branches.fail(); }, true);
        await assert.rejects(branches.run(() => {
            branches.save('thrown');
            throw new Error('failed');
        }, true), /failed/);
        assert.deepEqual([...branches.getFinalIds()], []);
    });

    it('does not count a non-step child as passing the document further', async () => {
        const branches = new PreviewBranches();
        await branches.run(async () => {
            branches.save('output');
            await branches.run(() => branches.save('refreshed'));
        }, true);
        assert.deepEqual([...branches.getFinalIds()], ['output']);
    });

    it('ignores an explicit end inside a display branch and below it', async () => {
        const branches = new PreviewBranches();
        await branches.run(async () => {
            branches.save('refreshed');
            branches.finish();
            await branches.run(() => { branches.save('below'); branches.finish(); }, true);
        }, false, true);
        assert.deepEqual([...branches.getFinalIds()], []);
    });

    it('keeps an explicit chain end without adding it twice', async () => {
        const branches = new PreviewBranches();
        await branches.run(() => { branches.save('output'); branches.finish(); }, true);
        assert.deepEqual([...branches.getFinalIds()], ['output']);
        assert.equal(Reflect.get(branches, 'ends').length, 1);
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

        it(`finishes a branch stopped quietly after an actual RunEvent ${method} dispatch`, async () => {
            const step = new RecordActionStep(() => {}, 0, true, true, undefined, true);
            const source = { policyId: 'policy', tag: 'source', uuid: 'source' };
            const quiet = new PolicyLink('RunEvent', 'RunEvent', source, { tag: 'quiet', uuid: 'quiet' }, '', async () => undefined);
            const save = new PolicyLink('RunEvent', 'RunEvent', source, { tag: 'save', uuid: 'save' }, '', async (event) => {
                event.actionStatus.previewBranches.save('output');
                await quiet[method]({}, {}, event.actionStatus);
            });
            await save[method]({}, {}, step);
            assert.deepEqual([...step.previewBranches.getFinalIds()], ['output']);
            assert.equal(step.counter, 0);
        });

        it(`treats a Switch condition output as a chain step in ${method} dispatch`, async () => {
            const step = new RecordActionStep(() => {}, 0, true, true, undefined, true);
            const source = { policyId: 'policy', tag: 'source', uuid: 'source' };
            const branch = new PolicyLink('RunEvent', 'Ex Post', source, { tag: 'calculation', uuid: 'calculation' }, '', async (event) => {
                event.actionStatus.previewBranches.save('output');
            });
            const save = new PolicyLink('RunEvent', 'RunEvent', source, { tag: 'save', uuid: 'save' }, '', async (event) => {
                event.actionStatus.previewBranches.save('intermediate');
                await branch[method]({}, {}, event.actionStatus);
            });
            await save[method]({}, {}, step);
            assert.deepEqual([...step.previewBranches.getFinalIds()], ['output']);
        });

        it(`never finishes a branch entered by a refresh, explicitly or further down, in ${method} dispatch`, async () => {
            const step = new RecordActionStep(() => {}, 0, true, true, undefined, true);
            const source = { policyId: 'policy', tag: 'source', uuid: 'source' };
            const next = new PolicyLink('RunEvent', 'RunEvent', source, { tag: 'next', uuid: 'next' }, '', async (event) => {
                event.actionStatus.previewBranches.save('after-refresh');
            });
            const refresh = new PolicyLink('RefreshEvent', 'RefreshEvent', source, { tag: 'save', uuid: 'save' }, '', async (event) => {
                event.actionStatus.previewBranches.save('refreshed');
                event.actionStatus.addPreviewDocument('save', null, { data: { id: 'refreshed' } });
                await next[method]({}, {}, event.actionStatus);
            });
            const release = new PolicyLink('ReleaseEvent', 'ReleaseEvent', source, { tag: 'released', uuid: 'released' }, '', async (event) => {
                event.actionStatus.previewBranches.save('released');
                event.actionStatus.addPreviewDocument('released', null, { data: { id: 'released' } });
            });
            await refresh[method]({}, {}, step);
            await release[method]({}, {}, step);
            assert.deepEqual([...step.previewBranches.getFinalIds()], []);
        });

        it(`does not finish the failed path through a quiet error handler in ${method} dispatch`, async () => {
            const step = new RecordActionStep(() => {}, 0, true, true, undefined, true);
            const source = { policyId: 'policy', tag: 'source', uuid: 'source' };
            const handler = new PolicyLink('RunEvent', 'ErrorEvent', source, { tag: 'handler', uuid: 'handler' }, '', async () => undefined);
            const failing = new PolicyLink('RunEvent', 'RunEvent', source, { tag: 'failing', uuid: 'failing' }, '', async (event) => {
                event.actionStatus.previewBranches.save('failed-output');
                event.actionStatus.addError(new Error('failed'), 'customLogicBlock');
                await handler[method]({}, {}, event.actionStatus);
            });
            await failing[method]({}, {}, step);
            assert.deepEqual([...step.previewBranches.getFinalIds()], []);
        });

        for (const end of ['explicit', 'quiet']) {
            const handlerEnd = (event, quiet) => end === 'explicit'
                ? recordPreviewWait(event, { tag: 'handler', blockType: 'buttonBlock' })
                : quiet[method]({}, {}, event.actionStatus);

            it(`does not make the failed save final through the error handler's ${end} end in ${method} dispatch`, async () => {
                const step = new RecordActionStep(() => {}, 0, true, true, undefined, true);
                const source = { policyId: 'policy', tag: 'source', uuid: 'source' };
                const quiet = new PolicyLink('RunEvent', 'RunEvent', source, { tag: 'quiet', uuid: 'quiet' }, '', async () => undefined);
                const handler = new PolicyLink('RunEvent', 'ErrorEvent', source, { tag: 'handler', uuid: 'handler' }, '', async (event) => {
                    await handlerEnd(event, quiet);
                });
                const failing = new PolicyLink('RunEvent', 'RunEvent', source, { tag: 'failing', uuid: 'failing' }, '', async (event) => {
                    event.actionStatus.previewBranches.save('failed-output');
                    event.actionStatus.addError(new Error('failed'), 'customLogicBlock');
                    await handler[method]({}, { data: { id: 'failed-output' } }, event.actionStatus);
                });
                await failing[method]({}, {}, step);
                assert.deepEqual([...step.previewBranches.getFinalIds()], []);
            });

            it(`keeps a new error-handler save final through the handler's ${end} end in ${method} dispatch`, async () => {
                const step = new RecordActionStep(() => {}, 0, true, true, undefined, true);
                const source = { policyId: 'policy', tag: 'source', uuid: 'source' };
                const quiet = new PolicyLink('RunEvent', 'RunEvent', source, { tag: 'quiet', uuid: 'quiet' }, '', async () => undefined);
                const handler = new PolicyLink('RunEvent', 'ErrorEvent', source, { tag: 'handler', uuid: 'handler' }, '', async (event) => {
                    event.actionStatus.previewBranches.save('recovered');
                    await handlerEnd(event, quiet);
                });
                const failing = new PolicyLink('RunEvent', 'RunEvent', source, { tag: 'failing', uuid: 'failing' }, '', async (event) => {
                    event.actionStatus.previewBranches.save('failed-output');
                    event.actionStatus.addError(new Error('failed'), 'customLogicBlock');
                    await handler[method]({}, { data: { id: 'failed-output' } }, event.actionStatus);
                });
                await failing[method]({}, {}, step);
                assert.deepEqual([...step.previewBranches.getFinalIds()], ['recovered']);
            });
        }

        it(`does not finish a branch reached only by a refresh ${method} dispatch`, async () => {
            const step = new RecordActionStep(() => {}, 0, true, true, undefined, true);
            const source = { policyId: 'policy', tag: 'source', uuid: 'source' };
            const refresh = new PolicyLink('RefreshEvent', 'RefreshEvent', source, { tag: 'grid', uuid: 'grid' }, '', async (event) => {
                event.actionStatus.previewBranches.save('refreshed');
            });
            await refresh[method]({}, {}, step);
            assert.deepEqual([...step.previewBranches.getFinalIds()], []);
        });
    }

});
