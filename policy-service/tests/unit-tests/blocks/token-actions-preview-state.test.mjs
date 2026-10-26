import assert from 'node:assert/strict';
import esmock from 'esmock';
import { PinoLogger } from '@guardian/common/helpers/pino-logger';
import { Workers } from '@guardian/common/helpers/workers';
import { WorkerTaskType } from '@guardian/interfaces';
import { createInMemoryDatabaseHelper } from '../../../../common/tests/helpers/in-memory-database-helper.mjs';
import { TokenActionBlock } from '../../../dist/policy-engine/blocks/token-action-block.js';
import { PolicyUtils } from '../../../dist/policy-engine/helpers/utils.js';
import { PolicyComponentsUtils } from '../../../dist/policy-engine/policy-components-utils.js';
import { RecordActionStep } from '../../../dist/policy-engine/record-action-step.js';
import { PreviewScope } from '../../../dist/policy-engine/helpers/preview.js';
import { createPreviewDatabaseServer } from '../../../dist/policy-engine/helpers/preview-database.js';
import { applyPreviewTokenAction, getPreviewTokenAccount } from '../../../dist/policy-engine/helpers/preview-token.js';
import { makeBlock, makeUser, restoreHarness } from './_block-exec-harness.mjs';

const db = createInMemoryDatabaseHelper();
const { DatabaseServer } = await esmock('@guardian/common/database-modules/database-server', {
    '@guardian/common/helpers/db-helper': { DataBaseHelper: db.DataBaseHelper }
});
class DryRun {}
const token = { tokenId: '0.0.9', enableFreeze: true, enableKYC: true };
const step = () => new RecordActionStep(() => {}, 0, true, true, undefined, true);
const originals = [];
const patch = (target, values) => {
    for (const [key, value] of Object.entries(values)) {
        originals.push([target, key, target[key]]);
        target[key] = value;
    }
};

describe('@unit token action state in a preview', () => {
    beforeEach(() => {
        db.reset();
        patch(PinoLogger.prototype, { error: async () => undefined });
        patch(PolicyComponentsUtils, { GetBlockRef: (block) => block, ExternalEventFn: () => undefined, BlockErrorFn: async () => undefined });
        patch(PolicyUtils, {
            getDocumentRelayerAccount: async () => '0.0.5',
            getUserCredentials: async () => ({ loadHederaCredentials: async () => ({ hederaAccountId: '0.0.1' }) })
        });
    });
    afterEach(() => {
        while (originals.length) {
            const [target, key, value] = originals.pop();
            target[key] = value;
        }
    });
    after(() => restoreHarness());

    for (const action of ['freeze', 'unfreeze', 'grantKyc', 'revokeKyc']) {
        it(`takes the same error branch for ${action} of an unassociated token`, async () => {
            const execute = async (preview) => {
                const server = createPreviewDatabaseServer(new DatabaseServer('policy-1'), 'policy-1');
                server.getToken = async () => token;
                const { block } = makeBlock(TokenActionBlock, { options: { action, tokenId: token.tokenId }, componentsOverrides: { databaseServer: server } });
                block._dryRun = 'policy-1';
                const events = [];
                block.triggerEvents = async (type) => { events.push(type); };
                const status = preview ? step() : undefined;
                const run = () => block.runAction({ user: makeUser(), data: { data: { owner: 'did:user' } }, actionStatus: status });
                if (preview) {
                    await PreviewScope.run(status, run);
                    assert.equal(status.getErrors()[0].message, 'Token is not associated');
                } else {
                    await run();
                }
                return events;
            };
            assert.deepEqual(await execute(true), await execute(false));
            assert.deepEqual(await execute(true), ['ErrorEvent']);
            assert.deepEqual(db.records(DryRun), []);
        });
    }

    it('applies all six transitions within one preview and exposes them to later account reads', async () => {
        const server = createPreviewDatabaseServer(new DatabaseServer('policy-1'), 'policy-1');
        const ref = { dryRun: 'policy-1', databaseServer: server };
        await PreviewScope.run(step(), async () => {
            const run = (action) => applyPreviewTokenAction(ref, token, '0.0.5', action, null);
            await run('associate');
            assert.deepEqual((await server.getVirtualHederaAccountInfo('0.0.5'))[token.tokenId], { frozen: false, kyc: false });
            await run('freeze');
            assert.equal((await server.getVirtualHederaAccountInfo('0.0.5'))[token.tokenId].frozen, true);
            await assert.rejects(run('freeze'), /already frozen/);
            await run('unfreeze');
            await run('grantKyc');
            assert.equal((await server.getVirtualHederaAccountInfo('0.0.5'))[token.tokenId].kyc, true);
            await assert.rejects(run('grantKyc'), /already granted/);
            await run('revokeKyc');
            await run('dissociate');
            assert.deepEqual(await server.getVirtualHederaAccountInfo('0.0.5'), {});
        });
        assert.deepEqual(db.records(DryRun), []);
    });

    it('starts from the saved account state and keeps another preview isolated', async () => {
        db.seed(DryRun, [{ dryRunId: 'policy-1', dryRunClass: 'HederaAccountInfo', hederaAccountId: '0.0.5', tokenMap: { [token.tokenId]: { frozen: false, kyc: null } } }]);
        const server = createPreviewDatabaseServer(new DatabaseServer('policy-1'), 'policy-1');
        const ref = { dryRun: 'policy-1', databaseServer: server };
        const first = step();
        await PreviewScope.run(first, async () => {
            await applyPreviewTokenAction(ref, token, '0.0.5', 'freeze', null);
            assert.equal((await server.getVirtualHederaAccountInfo('0.0.5'))[token.tokenId].frozen, true);
        });
        await PreviewScope.run(step(), async () => {
            await applyPreviewTokenAction(ref, token, '0.0.5', 'freeze', null);
            await assert.rejects(applyPreviewTokenAction(ref, token, '0.0.5', 'grantKyc', null), /Can not be granted/);
        });
        assert.equal(db.records(DryRun)[0].tokenMap[token.tokenId].frozen, false);
    });

    it('loads published account state once using only a read task and keeps later changes temporary', async () => {
        const tasks = [];
        patch(Workers.prototype, { addNonRetryableTask: async (task) => {
            tasks.push(task);
            return { [token.tokenId]: { frozen: false, kyc: false, balance: '0' } };
        } });
        const ref = { dryRun: null, mockId: null, databaseServer: {} };
        const status = step();
        await PreviewScope.run(status, async () => {
            await applyPreviewTokenAction(ref, token, '0.0.5', 'freeze', null);
            await applyPreviewTokenAction(ref, token, '0.0.5', 'grantKyc', null);
            assert.equal((await getPreviewTokenAccount(status, '0.0.5'))[token.tokenId].frozen, true);
            assert.equal((await getPreviewTokenAccount(status, '0.0.5'))[token.tokenId].kyc, true);
        });
        assert.deepEqual(tasks.map((task) => task.type), [WorkerTaskType.GET_ACCOUNT_TOKENS_REST]);
        assert.deepEqual(db.records(DryRun), []);
    });
});
