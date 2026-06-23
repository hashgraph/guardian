import { assert } from 'chai';
import { ReportBlock } from '../../../dist/policy-engine/blocks/report-block.js';
import { PolicyComponentsUtils } from '../../../dist/policy-engine/policy-components-utils.js';

const origGetRef = PolicyComponentsUtils.GetBlockRef;
const origExt = PolicyComponentsUtils.ExternalEventFn;

const rawSetData = Object.getPrototypeOf(ReportBlock.prototype).setData;

function mk() {
    const b = Object.create(ReportBlock.prototype);
    b.state = {};
    return b;
}

function makeRef(overrides = {}) {
    const calls = { externals: [], backups: 0, vc: [], vp: [] };
    const ref = {
        uuid: 'rep-uuid',
        blockType: 'reportBlock',
        actionType: 'local',
        policyId: 'p1',
        async getOptions() { return { uiMetaData: { vpSectionHeader: 'H' } }; },
        getItems() { return []; },
        databaseServer: {
            async getVcDocument() { return null; },
            async getVcDocuments() { return []; },
            async getVpDocument() { return null; },
            async getVpDocuments() { return []; },
            async getVPMintInformation() { return {}; },
        },
        backup() { calls.backups++; },
        ...overrides,
    };
    return { ref, calls };
}

function withRef(ref, calls, fn) {
    PolicyComponentsUtils.GetBlockRef = () => ref;
    PolicyComponentsUtils.ExternalEventFn = (e) => { calls.externals.push(e); };
    return fn();
}

after(() => {
    PolicyComponentsUtils.GetBlockRef = origGetRef;
    PolicyComponentsUtils.ExternalEventFn = origExt;
});

describe('ReportBlock runtime — getUserName', () => {
    it('returns null for a falsy did', async () => {
        const block = mk();
        assert.isNull(await block.getUserName(null, {}, 'uid'));
    });

    it('returns a cached username from the map', async () => {
        const block = mk();
        const map = { 'did:1': 'alice' };
        assert.equal(await block.getUserName('did:1', map, 'uid'), 'alice');
    });
});

describe('ReportBlock runtime — addReportByVC', () => {
    it('builds the vcDocument and records variable ids', async () => {
        const block = mk();
        const vc = {
            tag: 't', hash: 'h', owner: 'did:o',
            document: { id: 'docId', credentialSubject: [{ id: 'subjId' }] },
        };
        const report = {};
        const variables = {};
        const out = await block.addReportByVC(report, variables, vc);
        assert.equal(out.vcDocument.type, 'VC');
        assert.equal(out.vcDocument.hash, 'h');
        assert.equal(out.vcDocument.issuer, 'did:o');
        assert.equal(variables.documentId, 'docId');
        assert.equal(variables.documentSubjectId, 'subjId');
    });
});

describe('ReportBlock runtime — addReportByVCs', () => {
    it('separates impacts and plain documents and sets variable ids', async () => {
        const block = mk();
        const { ref } = makeRef();
        const vcs = [
            { id: 'plain1', credentialSubject: [{ id: 's1', type: 'Foo' }] },
            {
                id: 'impact1',
                credentialSubject: [{ id: 's2', type: 'ActivityImpact', impactType: 'CO2', label: 'L', amount: 1 }],
            },
            { id: 'mint', credentialSubject: [{ id: 'm' }] },
        ];
        const report = {};
        const variables = {};
        const out = await withRef(ref, {}, () =>
            block.addReportByVCs(report, variables, vcs, { tag: 'tg', owner: 'did:o' }));
        assert.lengthOf(out.impacts, 1);
        assert.equal(out.impacts[0].impactType, 'CO2');
        assert.deepEqual(variables.documentIds, ['plain1']);
        assert.deepEqual(variables.documentSubjectIds, ['s1']);
    });

    it('does not set impacts when there are none', async () => {
        const block = mk();
        const { ref } = makeRef();
        const vcs = [
            { id: 'plain1', credentialSubject: [{ id: 's1', type: 'Foo' }] },
            { id: 'mint', credentialSubject: [{ id: 'm' }] },
        ];
        const report = {};
        const out = await withRef(ref, {}, () =>
            block.addReportByVCs(report, {}, vcs, { tag: 'tg', owner: 'o' }));
        assert.isUndefined(out.impacts);
    });
});

describe('ReportBlock runtime — addReportByVP', () => {
    it('builds vpDocument and mintDocument from the presentation', async () => {
        const block = mk();
        const { ref } = makeRef();
        const vp = {
            tag: 'tg', hash: 'h', owner: 'did:o',
            messageId: 'm1', mainDocument: 'm1',
            amount: 5, mintAmount: 5, transferAmount: 0,
            mintExpected: 5, transferExpected: 0, wasTransferNeeded: false,
            tokenIds: ['0.0.1'],
            document: {
                verifiableCredential: [
                    { id: 'vc1', credentialSubject: [{ id: 's1', type: 'Foo' }] },
                    { id: 'mint', credentialSubject: [{ id: 'm', date: '2021', amount: 5 }] },
                ],
            },
        };
        const out = await withRef(ref, {}, () => block.addReportByVP({}, {}, vp));
        assert.equal(out.vpDocument.type, 'VP');
        assert.equal(out.vpDocument.hash, 'h');
        assert.equal(out.mintDocument.type, 'VC');
        assert.equal(out.mintDocument.tokenId, '0.0.1');
        assert.isNull(out.mintDocument.mainDocument);
    });
});

describe('ReportBlock runtime — reportUserMap', () => {
    it('resolves usernames for each present section', async () => {
        const block = mk();
        const { ref } = makeRef({});
        const report = {
            vpDocument: { username: 'did:1' },
            vcDocument: { username: 'did:2' },
            mintDocument: null,
            policyDocument: null,
            policyCreatorDocument: null,
            documents: null,
        };
        const map = { 'did:1': 'one', 'did:2': 'two' };
        block.getUserName = async (did) => map[did] || did;
        const out = await withRef(ref, {}, () => block.reportUserMap(report, 'uid'));
        assert.equal(out.vpDocument.username, 'one');
        assert.equal(out.vcDocument.username, 'two');
    });
});

describe('ReportBlock runtime — getData (no stored hash)', () => {
    it('returns an empty report shell when there is no lastValue', async () => {
        const block = mk();
        const { ref } = makeRef();
        const data = await withRef(ref, {}, () => block.getData({ id: 'u', location: 'local' }));
        assert.isNull(data.hash);
        assert.isNull(data.data);
        assert.deepEqual(data.uiMetaData, { vpSectionHeader: 'H' });
    });
});

describe('ReportBlock runtime — setData', () => {
    it('stores the filterValue as lastValue, emits external Set, backs up', async () => {
        const block = mk();
        const { ref, calls } = makeRef();
        await withRef(ref, calls, () => rawSetData.call(block, { id: 'u' }, { filterValue: 'hash-x' }));
        assert.equal(block.state.u.lastValue, 'hash-x');
        assert.lengthOf(calls.externals, 1);
        assert.equal(calls.backups, 1);
    });
});
