import assert from 'node:assert/strict';
import { MessageAPI } from '@guardian/interfaces';
import { Guardians } from '../../dist/helpers/guardians.js';

function make(canned = { ok: true }) {
    const g = new Guardians(undefined);
    const calls = [];
    g.sendMessage = async (subject, data) => {
        calls.push([subject, data]);
        return canned;
    };
    return { g, calls };
}

const owner = { creator: 'did:owner', owner: 'did:owner', id: 'o1' };
const user = { id: 'u1', did: 'did:u' };

describe('@unit Guardians tags', () => {
    it('createTag forwards tag and owner', async () => {
        const { g, calls } = make({ uuid: 'x' });
        const res = await g.createTag({ name: 'T' }, owner);
        assert.deepEqual(res, { uuid: 'x' });
        assert.deepEqual(calls[0], [MessageAPI.CREATE_TAG, { tag: { name: 'T' }, owner }]);
    });

    it('getTags forwards owner entity targets and linkedItems', async () => {
        const { g, calls } = make([{ id: 1 }]);
        const res = await g.getTags(owner, 'PolicyDocument', ['t1', 't2'], ['l1']);
        assert.deepEqual(res, [{ id: 1 }]);
        assert.deepEqual(calls[0], [MessageAPI.GET_TAGS, { owner, entity: 'PolicyDocument', targets: ['t1', 't2'], linkedItems: ['l1'] }]);
    });

    it('getTags sends undefined linkedItems by default', async () => {
        const { g, calls } = make();
        await g.getTags(owner, 'PolicyDocument', ['t1']);
        assert.deepEqual(calls[0], [MessageAPI.GET_TAGS, { owner, entity: 'PolicyDocument', targets: ['t1'], linkedItems: undefined }]);
    });

    it('deleteTag forwards uuid and owner', async () => {
        const { g, calls } = make(true);
        const res = await g.deleteTag('uuid-1', owner);
        assert.equal(res, true);
        assert.deepEqual(calls[0], [MessageAPI.DELETE_TAG, { uuid: 'uuid-1', owner }]);
    });

    it('exportTags forwards owner entity targets and linkedItems', async () => {
        const { g, calls } = make([{ id: 2 }]);
        await g.exportTags(owner, 'PolicyDocument', ['t1'], ['l1']);
        assert.deepEqual(calls[0], [MessageAPI.EXPORT_TAGS, { owner, entity: 'PolicyDocument', targets: ['t1'], linkedItems: ['l1'] }]);
    });

    it('exportTags sends undefined linkedItems by default', async () => {
        const { g, calls } = make();
        await g.exportTags(owner, 'PolicyDocument', ['t1']);
        assert.equal(calls[0][1].linkedItems, undefined);
    });

    it('getTagCache forwards owner entity targets and linkedItems', async () => {
        const { g, calls } = make([{ id: 3 }]);
        await g.getTagCache(owner, 'PolicyDocument', ['t1'], ['l1']);
        assert.deepEqual(calls[0], [MessageAPI.GET_TAG_CACHE, { owner, entity: 'PolicyDocument', targets: ['t1'], linkedItems: ['l1'] }]);
    });

    it('getTagCache sends undefined linkedItems by default', async () => {
        const { g, calls } = make();
        await g.getTagCache(owner, 'PolicyDocument', ['t1']);
        assert.equal(calls[0][1].linkedItems, undefined);
    });

    it('synchronizationTags forwards owner entity target and linkedItems', async () => {
        const { g, calls } = make([{ id: 4 }]);
        await g.synchronizationTags(owner, 'PolicyDocument', 'target-1', ['l1']);
        assert.deepEqual(calls[0], [MessageAPI.GET_SYNCHRONIZATION_TAGS, { owner, entity: 'PolicyDocument', target: 'target-1', linkedItems: ['l1'] }]);
    });

    it('synchronizationTags sends undefined linkedItems by default', async () => {
        const { g, calls } = make();
        await g.synchronizationTags(owner, 'PolicyDocument', 'target-1');
        assert.equal(calls[0][1].linkedItems, undefined);
    });

    it('synchronizationTags uses target singular key not targets', async () => {
        const { g, calls } = make();
        await g.synchronizationTags(owner, 'PolicyDocument', 'target-1');
        assert.equal(calls[0][1].target, 'target-1');
        assert.ok(!('targets' in calls[0][1]));
    });

    it('getTagSchemas forwards owner and paging', async () => {
        const { g, calls } = make({ items: [], count: 0 });
        await g.getTagSchemas(owner, 1, 10);
        assert.deepEqual(calls[0], [MessageAPI.GET_TAG_SCHEMAS, { owner, pageIndex: 1, pageSize: 10 }]);
    });

    it('getTagSchemas sends undefined paging by default', async () => {
        const { g, calls } = make();
        await g.getTagSchemas(owner);
        assert.deepEqual(calls[0], [MessageAPI.GET_TAG_SCHEMAS, { owner, pageIndex: undefined, pageSize: undefined }]);
    });

    it('getTagSchemasV2 forwards fields owner and paging', async () => {
        const { g, calls } = make({ items: [], count: 0 });
        await g.getTagSchemasV2(owner, ['a', 'b'], 2, 20);
        assert.deepEqual(calls[0], [MessageAPI.GET_TAG_SCHEMAS_V2, { fields: ['a', 'b'], owner, pageIndex: 2, pageSize: 20 }]);
    });

    it('getTagSchemasV2 sends undefined paging by default', async () => {
        const { g, calls } = make();
        await g.getTagSchemasV2(owner, ['a']);
        assert.deepEqual(calls[0], [MessageAPI.GET_TAG_SCHEMAS_V2, { fields: ['a'], owner, pageIndex: undefined, pageSize: undefined }]);
    });

    it('createTagSchema forwards item and owner', async () => {
        const { g, calls } = make({ id: 's' });
        await g.createTagSchema({ name: 'S' }, owner);
        assert.deepEqual(calls[0], [MessageAPI.CREATE_TAG_SCHEMA, { item: { name: 'S' }, owner }]);
    });

    it('publishTagSchema forwards id version and owner', async () => {
        const { g, calls } = make({ id: 's' });
        await g.publishTagSchema('s1', '1.0.0', owner);
        assert.deepEqual(calls[0], [MessageAPI.PUBLISH_TAG_SCHEMA, { id: 's1', version: '1.0.0', owner }]);
    });

    it('getPublishedTagSchemas forwards user', async () => {
        const { g, calls } = make([{ id: 's' }]);
        await g.getPublishedTagSchemas(user);
        assert.deepEqual(calls[0], [MessageAPI.GET_PUBLISHED_TAG_SCHEMAS, { user }]);
    });
});

describe('@unit Guardians themes', () => {
    it('createTheme forwards theme and owner', async () => {
        const { g, calls } = make({ id: 'th' });
        const res = await g.createTheme({ name: 'Th' }, owner);
        assert.deepEqual(res, { id: 'th' });
        assert.deepEqual(calls[0], [MessageAPI.CREATE_THEME, { theme: { name: 'Th' }, owner }]);
    });

    it('updateTheme forwards themeId theme and owner', async () => {
        const { g, calls } = make({ id: 'th' });
        await g.updateTheme('th1', { name: 'Th2' }, owner);
        assert.deepEqual(calls[0], [MessageAPI.UPDATE_THEME, { themeId: 'th1', theme: { name: 'Th2' }, owner }]);
    });

    it('getThemes forwards owner', async () => {
        const { g, calls } = make([{ id: 'th' }]);
        await g.getThemes(owner);
        assert.deepEqual(calls[0], [MessageAPI.GET_THEMES, { owner }]);
    });

    it('getThemeById forwards themeId and owner', async () => {
        const { g, calls } = make({ id: 'th' });
        await g.getThemeById('th1', owner);
        assert.deepEqual(calls[0], [MessageAPI.GET_THEME, { themeId: 'th1', owner }]);
    });

    it('deleteTheme forwards themeId and owner', async () => {
        const { g, calls } = make(true);
        const res = await g.deleteTheme('th1', owner);
        assert.equal(res, true);
        assert.deepEqual(calls[0], [MessageAPI.DELETE_THEME, { themeId: 'th1', owner }]);
    });

    it('importThemeFile forwards zip and owner', async () => {
        const { g, calls } = make({ id: 'th' });
        await g.importThemeFile({ z: 1 }, owner);
        assert.deepEqual(calls[0], [MessageAPI.THEME_IMPORT_FILE, { zip: { z: 1 }, owner }]);
    });

    it('exportThemeFile returns base64 decoded buffer', async () => {
        const b64 = Buffer.from('theme-data').toString('base64');
        const { g, calls } = make(b64);
        const res = await g.exportThemeFile('th1', owner);
        assert.ok(Buffer.isBuffer(res));
        assert.equal(res.toString(), 'theme-data');
        assert.deepEqual(calls[0], [MessageAPI.THEME_EXPORT_FILE, { themeId: 'th1', owner }]);
    });
});

describe('@unit Guardians branding', () => {
    it('setBranding forwards user and config', async () => {
        const { g, calls } = make({ config: '{}' });
        await g.setBranding(user, '{"a":1}');
        assert.deepEqual(calls[0], [MessageAPI.STORE_BRANDING, { user, config: '{"a":1}' }]);
    });

    it('getBranding sends subject with no data and returns result', async () => {
        const { g, calls } = make({ config: '{"a":1}' });
        const res = await g.getBranding();
        assert.deepEqual(res, { config: '{"a":1}' });
        assert.equal(calls[0][0], MessageAPI.GET_BRANDING);
        assert.equal(calls[0][1], undefined);
    });

    it('getBranding passes through null result', async () => {
        const { g } = make(null);
        const res = await g.getBranding();
        assert.equal(res, null);
    });
});

describe('@unit Guardians suggestions', () => {
    it('policySuggestions forwards user and suggestionsInput', async () => {
        const { g, calls } = make({ next: 'a', nested: 'b' });
        const res = await g.policySuggestions({ s: 1 }, user);
        assert.deepEqual(res, { next: 'a', nested: 'b' });
        assert.deepEqual(calls[0], [MessageAPI.SUGGESTIONS, { user, suggestionsInput: { s: 1 } }]);
    });

    it('setPolicySuggestionsConfig forwards items and user', async () => {
        const { g, calls } = make([{ id: 'p' }]);
        await g.setPolicySuggestionsConfig([{ id: 'p' }], user);
        assert.deepEqual(calls[0], [MessageAPI.SET_SUGGESTIONS_CONFIG, { items: [{ id: 'p' }], user }]);
    });

    it('getPolicySuggestionsConfig forwards user', async () => {
        const { g, calls } = make([{ id: 'p' }]);
        await g.getPolicySuggestionsConfig(user);
        assert.deepEqual(calls[0], [MessageAPI.GET_SUGGESTIONS_CONFIG, { user }]);
    });
});

describe('@unit Guardians record', () => {
    it('startRecording forwards policyId owner and options', async () => {
        const { g, calls } = make(true);
        await g.startRecording('p1', owner, { o: 1 });
        assert.deepEqual(calls[0], [MessageAPI.START_RECORDING, { policyId: 'p1', owner, options: { o: 1 } }]);
    });

    it('stopRecording returns base64 decoded buffer', async () => {
        const b64 = Buffer.from('record-data').toString('base64');
        const { g, calls } = make(b64);
        const res = await g.stopRecording('p1', owner, { o: 1 });
        assert.ok(Buffer.isBuffer(res));
        assert.equal(res.toString(), 'record-data');
        assert.deepEqual(calls[0], [MessageAPI.STOP_RECORDING, { policyId: 'p1', owner, options: { o: 1 } }]);
    });

    it('getRecordedActions forwards policyId and owner', async () => {
        const { g, calls } = make([{ a: 1 }]);
        await g.getRecordedActions('p1', owner);
        assert.deepEqual(calls[0], [MessageAPI.GET_RECORDED_ACTIONS, { policyId: 'p1', owner }]);
    });

    it('getRecordStatus forwards policyId and owner', async () => {
        const { g, calls } = make({ status: 'RECORDING' });
        await g.getRecordStatus('p1', owner);
        assert.deepEqual(calls[0], [MessageAPI.GET_RECORD_STATUS, { policyId: 'p1', owner }]);
    });

    it('runRecord forwards policyId owner and options', async () => {
        const { g, calls } = make(true);
        await g.runRecord('p1', owner, { o: 1 });
        assert.deepEqual(calls[0], [MessageAPI.RUN_RECORD, { policyId: 'p1', owner, options: { o: 1 } }]);
    });

    it('stopRunning forwards policyId owner and options', async () => {
        const { g, calls } = make(true);
        await g.stopRunning('p1', owner, { o: 1 });
        assert.deepEqual(calls[0], [MessageAPI.STOP_RUNNING, { policyId: 'p1', owner, options: { o: 1 } }]);
    });

    it('getRecordResults forwards policyId and owner', async () => {
        const { g, calls } = make({ r: 1 });
        await g.getRecordResults('p1', owner);
        assert.deepEqual(calls[0], [MessageAPI.GET_RECORD_RESULTS, { policyId: 'p1', owner }]);
    });

    it('getRecordDetails forwards policyId and owner', async () => {
        const { g, calls } = make({ d: 1 });
        await g.getRecordDetails('p1', owner);
        assert.deepEqual(calls[0], [MessageAPI.GET_RECORD_DETAILS, { policyId: 'p1', owner }]);
    });

    it('getRecordActionDocuments forwards policyId recordActionId and owner', async () => {
        const { g, calls } = make([{ doc: 1 }]);
        await g.getRecordActionDocuments('p1', 'ra1', owner);
        assert.deepEqual(calls[0], [MessageAPI.GET_RECORD_ACTION_DOCUMENTS, { policyId: 'p1', recordActionId: 'ra1', owner }]);
    });

    it('fastForward forwards policyId owner and options', async () => {
        const { g, calls } = make(true);
        await g.fastForward('p1', owner, { o: 1 });
        assert.deepEqual(calls[0], [MessageAPI.FAST_FORWARD, { policyId: 'p1', owner, options: { o: 1 } }]);
    });

    it('retryStep forwards policyId owner and options', async () => {
        const { g, calls } = make(true);
        await g.retryStep('p1', owner, { o: 1 });
        assert.deepEqual(calls[0], [MessageAPI.RECORD_RETRY_STEP, { policyId: 'p1', owner, options: { o: 1 } }]);
    });

    it('skipStep forwards policyId owner and options', async () => {
        const { g, calls } = make(true);
        await g.skipStep('p1', owner, { o: 1 });
        assert.deepEqual(calls[0], [MessageAPI.RECORD_SKIP_STEP, { policyId: 'p1', owner, options: { o: 1 } }]);
    });
});

describe('@unit Guardians record return-value pass-through', () => {
    it('startRecording returns the canned send result', async () => {
        const { g } = make({ started: true });
        const res = await g.startRecording('p1', owner, {});
        assert.deepEqual(res, { started: true });
    });

    it('runRecord returns the canned send result', async () => {
        const { g } = make({ running: true });
        const res = await g.runRecord('p1', owner, {});
        assert.deepEqual(res, { running: true });
    });

    it('fastForward returns the canned send result', async () => {
        const { g } = make({ ff: 1 });
        const res = await g.fastForward('p1', owner, {});
        assert.deepEqual(res, { ff: 1 });
    });

    it('retryStep returns the canned send result', async () => {
        const { g } = make({ retried: true });
        const res = await g.retryStep('p1', owner, {});
        assert.deepEqual(res, { retried: true });
    });

    it('skipStep returns the canned send result', async () => {
        const { g } = make({ skipped: true });
        const res = await g.skipStep('p1', owner, {});
        assert.deepEqual(res, { skipped: true });
    });
});

describe('@unit Guardians tags/themes options forwarding edge cases', () => {
    it('createTag passes object reference through unchanged', async () => {
        const { g, calls } = make();
        const tag = { name: 'T', target: 'x' };
        await g.createTag(tag, owner);
        assert.equal(calls[0][1].tag, tag);
    });

    it('getTags forwards empty targets array', async () => {
        const { g, calls } = make([]);
        await g.getTags(owner, 'PolicyDocument', []);
        assert.deepEqual(calls[0][1].targets, []);
    });

    it('updateTheme passes theme reference through unchanged', async () => {
        const { g, calls } = make();
        const theme = { name: 'Th', rules: [] };
        await g.updateTheme('th1', theme, owner);
        assert.equal(calls[0][1].theme, theme);
    });

    it('importThemeFile passes zip reference through unchanged', async () => {
        const { g, calls } = make();
        const zip = { buf: 1 };
        await g.importThemeFile(zip, owner);
        assert.equal(calls[0][1].zip, zip);
    });

    it('setPolicySuggestionsConfig forwards empty items array', async () => {
        const { g, calls } = make([]);
        await g.setPolicySuggestionsConfig([], user);
        assert.deepEqual(calls[0][1].items, []);
    });

    it('policySuggestions passes suggestionsInput reference through unchanged', async () => {
        const { g, calls } = make({});
        const input = { a: 1 };
        await g.policySuggestions(input, user);
        assert.equal(calls[0][1].suggestionsInput, input);
    });
});

describe('@unit Guardians single-call discipline', () => {
    const cases = [
        ['createTag', g => g.createTag({}, owner)],
        ['getTags', g => g.getTags(owner, 'e', [])],
        ['deleteTag', g => g.deleteTag('u', owner)],
        ['exportTags', g => g.exportTags(owner, 'e', [])],
        ['getTagCache', g => g.getTagCache(owner, 'e', [])],
        ['synchronizationTags', g => g.synchronizationTags(owner, 'e', 't')],
        ['getTagSchemas', g => g.getTagSchemas(owner)],
        ['getTagSchemasV2', g => g.getTagSchemasV2(owner, [])],
        ['createTagSchema', g => g.createTagSchema({}, owner)],
        ['publishTagSchema', g => g.publishTagSchema('i', 'v', owner)],
        ['getPublishedTagSchemas', g => g.getPublishedTagSchemas(user)],
        ['createTheme', g => g.createTheme({}, owner)],
        ['updateTheme', g => g.updateTheme('i', {}, owner)],
        ['getThemes', g => g.getThemes(owner)],
        ['getThemeById', g => g.getThemeById('i', owner)],
        ['deleteTheme', g => g.deleteTheme('i', owner)],
        ['importThemeFile', g => g.importThemeFile({}, owner)],
        ['setBranding', g => g.setBranding(user, '{}')],
        ['getBranding', g => g.getBranding()],
        ['policySuggestions', g => g.policySuggestions({}, user)],
        ['setPolicySuggestionsConfig', g => g.setPolicySuggestionsConfig([], user)],
        ['getPolicySuggestionsConfig', g => g.getPolicySuggestionsConfig(user)],
        ['startRecording', g => g.startRecording('p', owner, {})],
        ['getRecordedActions', g => g.getRecordedActions('p', owner)],
        ['getRecordStatus', g => g.getRecordStatus('p', owner)],
        ['runRecord', g => g.runRecord('p', owner, {})],
        ['stopRunning', g => g.stopRunning('p', owner, {})],
        ['getRecordResults', g => g.getRecordResults('p', owner)],
        ['getRecordDetails', g => g.getRecordDetails('p', owner)],
        ['getRecordActionDocuments', g => g.getRecordActionDocuments('p', 'ra', owner)],
        ['fastForward', g => g.fastForward('p', owner, {})],
        ['retryStep', g => g.retryStep('p', owner, {})],
        ['skipStep', g => g.skipStep('p', owner, {})]
    ];

    for (const [name, invoke] of cases) {
        it(`${name} issues exactly one sendMessage`, async () => {
            const { g, calls } = make('YQ==');
            await invoke(g);
            assert.equal(calls.length, 1);
        });
    }
});
