import assert from 'node:assert/strict';
import { PolicyUtils } from '../../../dist/policy-engine/helpers/utils.js';
import { PolicyActionsUtils } from '../../../dist/policy-engine/policy-actions/utils.js';
import { RecordActionStep } from '../../../dist/policy-engine/record-action-step.js';
import { RequestVcDocumentBlock } from '../../../dist/policy-engine/blocks/request-vc-document-block.js';
import { makeBlock, makeUser, restoreHarness } from './_block-exec-harness.mjs';

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

const previewStep = () => new RecordActionStep(() => {}, 0, true, true, undefined, true);

describe('@unit RequestVcDocumentBlock preview', () => {
    let signed;
    let generated;

    beforeEach(() => {
        signed = 0;
        generated = 0;
        patch(PolicyUtils, {
            getRelationships: async () => null,
            getRelayerAccountAndOwner: async (_ref, user) => ['0.0.1', user],
            setAutoCalculateFields: () => {},
            setGuardianVersion: () => {},
        });
        patch(PolicyActionsUtils, {
            generateId: async () => {
                generated++;
                return 'did:hedera:new';
            },
            signVC: async () => {
                signed++;
                throw new Error('must not sign in preview');
            },
        });
    });

    afterEach(() => restore());
    after(() => restoreHarness());

    const mk = () => {
        const { block } = makeBlock(RequestVcDocumentBlock, { options: { schema: '#S', idType: 'DID' } });
        block._schema = { iri: '#S', fields: [], type: 'TestType', contextURL: 'ctx://x' };
        const events = [];
        block.triggerEvents = async (...args) => { events.push(args); };
        return { block, events };
    };

    it('passes an unsigned document with the user as issuer down the chain without creating a DID or signing', async () => {
        const { block, events } = mk();
        const step = previewStep();
        const item = await block.setData(makeUser({ id: 'u-1', userId: 'uid-1' }), { document: { amount: 5 } }, null, step);
        assert.equal(generated, 0);
        assert.equal(signed, 0);
        assert.equal(item.owner, 'did:user');
        assert.equal(item.document.issuer, 'did:user');
        assert.equal(item.schema, '#S');
        assert.equal(item.relayerAccount, '0.0.1');
        assert.equal(item.document.proof, undefined);
        assert.deepEqual(events.map((event) => event[0]), ['RunEvent']);
        assert.equal(events[0][2].data, item);
        assert.equal(events[0][3], step);
    });

    it('keeps the restore data of the user', async () => {
        const { block } = mk();
        block.state['u-2'] = { restoreData: { old: 1 } };
        await block.setData(makeUser({ id: 'u-2' }), { document: { amount: 5 } }, null, previewStep());
        assert.deepEqual(block.state['u-2'].restoreData, { old: 1 });
    });

    const formSchema = () => ({
        iri: '#S',
        type: 'TestType',
        contextURL: 'ctx://x',
        fields: [
            { name: 'amount', type: 'number', isRef: false, isArray: false },
            { name: 'rate', type: 'number', isRef: false, isArray: false },
            { name: 'total', type: 'number', isRef: false, isArray: false, autocalculate: true, expression: 'amount * rate' }
        ]
    });

    const firstSubject = (item) => Array.isArray(item.document.credentialSubject)
        ? item.document.credentialSubject[0]
        : item.document.credentialSubject;

    it('fills empty fields and records the form source when field discovery is asked', async () => {
        const { block } = mk();
        block._schema = formSchema();
        const step = previewStep();
        const item = await block.setData(makeUser(), { document: { amount: 5 }, previewFields: true }, null, step);
        const subject = firstSubject(item);
        assert.equal(subject.amount, 5);
        assert.equal(subject.rate, 0);
        assert.equal(subject.total, 0);
        assert.deepEqual(step.getPreviewSource(), {
            schema: '#S',
            document: { amount: 5 },
            paths: ['amount', 'rate', 'total'],
            dependencies: { total: ['amount', 'rate'] }
        });
    });

    it('leaves empty fields empty in a normal preview', async () => {
        const { block } = mk();
        block._schema = formSchema();
        const step = previewStep();
        const item = await block.setData(makeUser(), { document: { amount: 5 } }, null, step);
        assert.equal('rate' in firstSubject(item), false);
        assert.deepEqual(step.getPreviewSource().dependencies, { total: ['amount', 'rate'] });
        assert.deepEqual(step.getErrors(), []);
    });
});
