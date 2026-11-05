import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import esmock from 'esmock';
import { installCredentialPreparation } from '../helpers/credential-preparation-stubs.mjs';
import { createPreviewDocument } from '../helpers/preview-document-fixture.mjs';
import { createInMemoryDatabaseHelper } from '../helpers/in-memory-database-helper.mjs';
import { PolicyUtils } from '../../../dist/policy-engine/helpers/utils.js';
import { PolicyActionsUtils } from '../../../dist/policy-engine/policy-actions/utils.js';
import { PolicyComponentsUtils } from '../../../dist/policy-engine/policy-components-utils.js';
import { RecordActionStep } from '../../../dist/policy-engine/record-action-step.js';
import { PreviewScope, buildPreviewResponse } from '../../../dist/policy-engine/helpers/preview.js';
import { createPreviewDatabaseServer } from '../../../dist/policy-engine/helpers/preview-database.js';
import { SendToGuardianBlock } from '../../../dist/policy-engine/blocks/send-to-guardian-block.js';
import { PolicyLink } from '../../../dist/policy-engine/interfaces/policy-event.js';
import { DocumentType } from '../../../dist/policy-engine/interfaces/document.type.js';
import { makeBlock, makeComponents, makeUser, restoreHarness } from './_block-exec-harness.mjs';

const db = createInMemoryDatabaseHelper();
const { DatabaseServer } = await esmock('@guardian/common/database-modules/database-server', {
    '@guardian/common/helpers/db-helper': { DataBaseHelper: db.DataBaseHelper }
});

const originals = [];
const patch = (target, map) => {
    for (const [key, value] of Object.entries(map)) {
        originals.push([target, key, target[key]]);
        target[key] = value;
    }
};
const restore = () => {
    while (originals.length) {
        const [target, key, value] = originals.pop();
        target[key] = value;
    }
};

const previewStep = () => new RecordActionStep(() => undefined, 0, true, true, undefined, true);
const vcJson = (subject) => ({
    ...createPreviewDocument({ policyId: 'policy-1', tag: 't' }, null,
        { id: 'did:subject', type: 'Plot', ...subject }, null, 'did:user', null).document,
    id: `urn:uuid:${randomUUID()}`
});
const saveBlock = () => {
    const server = createPreviewDatabaseServer(new DatabaseServer(null), null);
    return makeBlock(SendToGuardianBlock, {
        options: { dataSource: 'database', skipSaveState: true },
        components: makeComponents({ databaseServer: server })
    }).block;
};
const finalIds = (step) => buildPreviewResponse(step, {}).documents.filter((item) => item.final).map((item) => String(item.document.id));

describe('@unit Preview final document through real Save paths', () => {
    let releaseCredentials;
    beforeEach(() => {
        db.reset();
        releaseCredentials = installCredentialPreparation();
        patch(PolicyComponentsUtils, { GetBlockRef: (block) => block, ExternalEventFn: () => undefined });
        patch(PolicyUtils, {
            getDocumentOwner: async () => makeUser(),
            getBlockTags: async () => [],
            getDocumentRelayerAccount: async () => '0.0.1',
            getUserByIssuer: async () => ({ hederaAccountId: '0.0.1', roleMessage: null }),
            getUserCredentials: async (ref, did) => ({ did, location: 'local' }),
            encryptVC: async (ref, document) => document
        });
        patch(PolicyActionsUtils, { needKey: () => false });
    });
    afterEach(() => {
        restore();
        releaseCredentials();
    });
    after(() => restoreHarness());

    it('makes a credential final when the last Save rewrites it after another save', async () => {
        const block = saveBlock();
        let passed;
        block.triggerEvents = async (type, user, data) => {
            if (type === 'RunEvent') {
                passed = data.data;
            }
        };
        const step = previewStep();
        await PreviewScope.run(step, async () => {
            await block.runAction({ user: makeUser(), data: { data: { policyId: 'policy-1', owner: 'did:user', document: vcJson({ area: 7 }) } }, actionStatus: step });
            const first = structuredClone(passed);
            await block.runAction({ user: makeUser(), data: { data: { policyId: 'policy-1', owner: 'did:user', document: vcJson({ area: 9 }) } }, actionStatus: step });
            const second = structuredClone(passed);
            await block.runAction({ user: makeUser(), data: { data: first }, actionStatus: step });
            assert.deepEqual(step.getErrors(), []);
            assert.equal(String(passed.id), String(first.id));
            assert.notEqual(String(second.id), String(first.id));
            step.addPreviewDocument('last_save', null, { data: passed });
            assert.deepEqual(finalIds(step), [String(first.id)]);
        });
    });

    it('makes a presentation final when the last Save rewrites it after another save', async () => {
        const block = saveBlock();
        const step = previewStep();
        await PreviewScope.run(step, async () => {
            const vp = (hash) => ({ policyId: 'policy-1', owner: 'did:user', hash, document: { id: `urn:${hash}`, type: ['VerifiablePresentation'] } });
            const first = await block.sendToDatabase(vp('vp-a'), DocumentType.VerifiablePresentation, block, null);
            const second = await block.sendToDatabase(vp('vp-b'), DocumentType.VerifiablePresentation, block, null);
            const rewritten = await block.sendToDatabase(vp('vp-a'), DocumentType.VerifiablePresentation, block, null);
            assert.equal(String(rewritten.id), String(first.id));
            assert.notEqual(String(second.id), String(first.id));
            step.addPreviewDocument('last_save', null, { data: rewritten });
            assert.deepEqual(finalIds(step), [String(first.id)]);
        });
    });

    it('does not make a Save reached only by a refresh final', async () => {
        const block = saveBlock();
        const step = previewStep();
        const source = { policyId: 'policy-1', tag: 'source', uuid: 'source' };
        const link = new PolicyLink('RunEvent', 'RefreshEvent', source, block, '', block.runAction);
        await PreviewScope.run(step, () => link.runSync(makeUser(), { data: { policyId: 'policy-1', owner: 'did:user', document: vcJson({ area: 5 }) } }, step));
        assert.deepEqual(step.getErrors(), []);
        assert.equal(buildPreviewResponse(step, {}).documents.length > 0, true);
        assert.deepEqual(finalIds(step), []);
    });
});
