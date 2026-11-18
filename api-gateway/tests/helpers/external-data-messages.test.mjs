import assert from 'node:assert/strict';
import { PolicyEngine } from '../../dist/helpers/policy-engine.js';
import { PolicyEngineEvents } from '@guardian/interfaces';

describe('external data messages', () => {
    for (const custom of [false, true]) {
        const name = custom ? 'custom' : 'tag';
        const run = (engine, sync, history, strict) => custom
            ? engine.receiveExternalDataCustom({ document: {} }, 'policy', 'external', sync, history, strict)
            : engine.receiveExternalData({ document: {} }, sync, history, strict);
        const expected = (syncEvents, history) => ({
            data: { document: {} }, ...(custom ? { policyId: 'policy', blockTag: 'external' } : {}), syncEvents, history,
        });

        it(`passes strict mode to the ${name} receiver`, async () => {
            const engine = new PolicyEngine();
            let message;
            engine.sendMessage = async (event, data) => { message = { event, data }; return { retrying: true }; };
            assert.deepEqual(await run(engine, false, false, true), { retrying: true });
            assert.deepEqual(message, {
                event: custom ? PolicyEngineEvents.RECEIVE_EXTERNAL_DATA_CUSTOM : PolicyEngineEvents.RECEIVE_EXTERNAL_DATA,
                data: { ...expected(false, false), strict: true },
            });
        });

        for (const [sync, history, strict] of [[undefined, undefined, undefined], [false, false, false], [true, true, true]]) {
            it(`keeps the ${name} legacy payload for flags ${JSON.stringify([sync, history, strict])}`, async () => {
                const engine = new PolicyEngine();
                let message;
                engine.sendMessage = async (_event, data) => { message = data; return true; };
                assert.equal(await run(engine, sync, history, strict), true);
                assert.deepEqual(message, expected(sync ?? false, history ?? false));
            });
        }
    }
});
