import assert from 'node:assert/strict';
import esmock from 'esmock';
import { Token } from '@guardian/common/entity/token';
import { createInMemoryDatabaseHelper } from '../helpers/in-memory-database-helper.mjs';
import { MintBlock } from '../../../dist/policy-engine/blocks/mint-block.js';
import { RetirementBlock } from '../../../dist/policy-engine/blocks/retirement-block.js';
import { TokenActionBlock } from '../../../dist/policy-engine/blocks/token-action-block.js';
import { PolicyComponentsUtils } from '../../../dist/policy-engine/policy-components-utils.js';
import { RecordActionStep } from '../../../dist/policy-engine/record-action-step.js';
import { PreviewScope } from '../../../dist/policy-engine/helpers/preview.js';
import { createPreviewDatabaseServer } from '../../../dist/policy-engine/helpers/preview-database.js';
import { makeBlock, makeUser, restoreHarness } from './_block-exec-harness.mjs';

const db = createInMemoryDatabaseHelper();
const { DatabaseServer } = await esmock('@guardian/common/database-modules/database-server', {
    '@guardian/common/helpers/db-helper': { DataBaseHelper: db.DataBaseHelper }
});

const previewStep = () => new RecordActionStep(() => {}, 0, true, true, undefined, true);
const docs = (tokenId) => [{ owner: 'did:user', tokens: { main: tokenId } }];
const options = { useTemplate: true, template: 'main' };

describe('@unit token created in a preview of a published policy', () => {
    let originalGetBlockRef;
    beforeEach(() => {
        db.reset();
        originalGetBlockRef = PolicyComponentsUtils.GetBlockRef;
        PolicyComponentsUtils.GetBlockRef = (block) => block;
    });
    afterEach(() => {
        PolicyComponentsUtils.GetBlockRef = originalGetBlockRef;
    });
    after(() => restoreHarness());

    for (const [name, BlockClass] of [['Mint', MintBlock], ['Retirement', RetirementBlock]]) {
        it(`${name} finds the token that Create Token made earlier in the same preview`, async () => {
            const server = createPreviewDatabaseServer(new DatabaseServer(null), null);
            const { block } = makeBlock(BlockClass, { options, componentsOverrides: { databaseServer: server } });
            block._dryRun = null;
            await PreviewScope.run(previewStep(), async () => {
                await server.createToken({ tokenId: '0.0.700', tokenName: 'Preview' });
                const token = await block.getToken(block, docs('0.0.700'), makeUser());
                assert.equal(token.tokenId, '0.0.700');
            });
            assert.deepEqual(db.records(Token), []);
        });

        it(`${name} still reads a stored token in an ordinary published run`, async () => {
            const server = new DatabaseServer(null);
            await server.createToken({ tokenId: '0.0.701', tokenName: 'Stored' });
            const { block } = makeBlock(BlockClass, { options, componentsOverrides: { databaseServer: server } });
            block._dryRun = null;
            const token = await block.getToken(block, docs('0.0.701'), makeUser());
            assert.equal(token.tokenId, '0.0.701');
        });
    }

    it('Token Action finds the token that Create Token made earlier in the same preview', async () => {
        const server = createPreviewDatabaseServer(new DatabaseServer(null), null);
        const { block } = makeBlock(TokenActionBlock, { options: { ...options, action: 'associate', accountId: 'account' }, componentsOverrides: { databaseServer: server } });
        block._dryRun = null;
        const step = previewStep();
        await PreviewScope.run(step, async () => {
            await server.createToken({ tokenId: '0.0.702', tokenName: 'Preview' });
            await block.runAction({ user: makeUser(), data: { data: docs('0.0.702')[0] }, actionStatus: step }).catch(() => undefined);
        });
        assert.equal(step.getErrors().some((error) => /Bad token id/.test(error.message)), false);
    });
});
