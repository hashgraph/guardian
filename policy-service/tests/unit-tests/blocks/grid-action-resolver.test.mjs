import { assert } from 'chai';
import moduleAlias from 'module-alias';

moduleAlias.addAliases({
    '@api': `${process.cwd()}/dist/api`,
    '@entity': `${process.cwd()}/dist/entity`,
    '@subscribers': `${process.cwd()}/dist/subscribers`,
    '@helpers': `${process.cwd()}/dist/helpers`,
    '@auth': `${process.cwd()}/dist/auth`,
    '@policy-engine': `${process.cwd()}/dist/policy-engine`,
    '@hedera-modules': `${process.cwd()}/dist/hedera-modules/index`,
    '@document-loader': `${process.cwd()}/dist/document-loader`,
    '@database-modules': `${process.cwd()}/dist/database-modules`,
});

// Loaded lazily after aliases are registered
let GridActionResolver;
let PolicyComponentsUtils;

function makeBlock(overrides = {}) {
    return {
        blockType: 'interfaceDocumentsSourceBlock',
        tag: 'my_grid',
        uuid: 'aaaabbbb-cccc-dddd-eeee-ffffffffffff',
        options: {
            uiMetaData: {
                title: 'My Grid',
                fields: [],
            },
        },
        children: [],
        permissions: [],
        isAvailable: async () => true,
        ...overrides,
    };
}

function makeActionBlock(overrides = {}) {
    return {
        blockType: 'interfaceActionBlock',
        tag: 'approve_action',
        uuid: '11112222-3333-4444-5555-666677778888',
        options: {
            type: 'selector',
            field: 'option.status',
            uiMetaData: {
                options: [
                    { tag: 'approve_action', value: 'Approved' },
                    { tag: 'reject_action', value: 'Rejected' },
                ],
            },
        },
        permissions: ['Standard Registry'],
        isAvailable: async () => true,
        ...overrides,
    };
}

function installPCUMock(tagMap, blockMap) {
    PolicyComponentsUtils.GetTagBlockMap = () => tagMap;
    PolicyComponentsUtils.GetBlockByUUID = (uuid) => blockMap.get(uuid) ?? null;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GridActionResolver', function () {
    before(async function () {
        this.timeout(300000);
        const resolverMod = await import('../../../dist/policy-engine/external/grid-action-resolver.js');
        GridActionResolver = resolverMod.GridActionResolver;

        const pcuMod = await import('../../../dist/policy-engine/policy-components-utils.js');
        PolicyComponentsUtils = pcuMod.PolicyComponentsUtils;
    });

    // ── computeGridId ─────────────────────────────────────────────────────────

    describe('computeGridId', function () {
        it('uses block tag when present', function () {
            const block = makeBlock({ tag: 'my_grid_tag' });
            assert.equal(GridActionResolver.computeGridId(block), 'my_grid_tag');
        });

        it('falls back to 16-char hex when tag is absent', function () {
            const block = makeBlock({ tag: undefined, uuid: 'aaaabbbb-cccc-dddd-eeee-ffffffffffff' });
            const id = GridActionResolver.computeGridId(block);
            assert.match(id, /^[0-9a-f]{16}$/, 'hash fallback must be 16 lowercase hex chars');
        });

        it('produces deterministic hash fallback for same uuid', function () {
            const block = makeBlock({ tag: undefined, uuid: 'deadbeef-dead-beef-dead-beefdeadbeef' });
            const id1 = GridActionResolver.computeGridId(block);
            const id2 = GridActionResolver.computeGridId(block);
            assert.equal(id1, id2, 'hash must be deterministic');
        });

        it('produces different hashes for different uuids', function () {
            const b1 = makeBlock({ tag: undefined, uuid: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' });
            const b2 = makeBlock({ tag: undefined, uuid: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' });
            assert.notEqual(GridActionResolver.computeGridId(b1), GridActionResolver.computeGridId(b2));
        });
    });

    // ── buildGridDescriptor ───────────────────────────────────────────────────

    describe('buildGridDescriptor', function () {
        it('maps tag to gridId', function () {
            const block = makeBlock({ tag: 'installer_grid' });
            const desc = GridActionResolver.buildGridDescriptor(block);
            assert.equal(desc.gridId, 'installer_grid');
        });

        it('maps uiMetaData title', function () {
            const block = makeBlock();
            block.options.uiMetaData.title = 'My Title';
            const desc = GridActionResolver.buildGridDescriptor(block);
            assert.equal(desc.title, 'My Title');
        });

        it('defaults title to block tag when uiMetaData title is absent', function () {
            const block = makeBlock({ tag: 'fallback_grid' });
            delete block.options.uiMetaData.title;
            const desc = GridActionResolver.buildGridDescriptor(block);
            assert.equal(desc.title, 'fallback_grid');
        });

        it('maps fields to columnSchema', function () {
            const block = makeBlock();
            block.options.uiMetaData.fields = [
                { name: 'col1', title: 'Column 1', type: 'text', bindBlocks: ['act1'] },
            ];
            const desc = GridActionResolver.buildGridDescriptor(block);
            assert.deepEqual(desc.columnSchema, [
                { name: 'col1', title: 'Column 1', type: 'text', bindActions: ['act1'] },
            ]);
        });

        it('includes singular bindBlock in columnSchema bindActions', function () {
            const block = makeBlock();
            block.options.uiMetaData.fields = [
                { name: 'op', title: 'Operation', type: 'block', bindBlock: 'approve_btn' },
            ];
            const desc = GridActionResolver.buildGridDescriptor(block);
            assert.deepEqual(desc.columnSchema[0].bindActions, ['approve_btn']);
        });

        it('builds filterSchema from filtersAddon children', function () {
            const block = makeBlock();
            block.children = [
                {
                    blockType: 'filtersAddon',
                    tag: 'date_filter',
                    uuid: 'filter-uuid-1',
                    options: {
                        field: 'document.date',
                        type: 'datepicker',
                        uiMetaData: { title: 'Date' },
                    },
                },
            ];
            const desc = GridActionResolver.buildGridDescriptor(block);
            assert.equal(desc.filterSchema.length, 1);
            assert.equal(desc.filterSchema[0].field, 'document.date');
            assert.equal(desc.filterSchema[0].type, 'datepicker');
            assert.equal(desc.filterSchema[0].title, 'Date');
            assert.isArray(desc.filterSchema[0].operators);
            assert.include(desc.filterSchema[0].operators, 'eq');
        });

        it('ignores non-filtersAddon children', function () {
            const block = makeBlock();
            block.children = [
                { blockType: 'someOtherBlock', tag: 'other', uuid: 'other-uuid', options: {}, permissions: [] },
            ];
            const desc = GridActionResolver.buildGridDescriptor(block);
            assert.equal(desc.filterSchema.length, 0);
        });

        it('produces empty arrays when no fields or children', function () {
            const block = makeBlock();
            const desc = GridActionResolver.buildGridDescriptor(block);
            assert.deepEqual(desc.filterSchema, []);
            assert.deepEqual(desc.columnSchema, []);
        });
    });

    // ── resolveGridBlock ──────────────────────────────────────────────────────

    describe('resolveGridBlock', function () {
        it('resolves via tag map (fast path)', function () {
            const block = makeBlock({ tag: 'test_grid', blockType: 'interfaceDocumentsSourceBlock' });
            const tagMap = new Map([['test_grid', 'uuid-1']]);
            const blockMap = new Map([['uuid-1', block]]);
            installPCUMock(tagMap, blockMap);

            const result = GridActionResolver.resolveGridBlock('policy-1', 'test_grid');
            assert.strictEqual(result, block);
        });

        it('returns null when policyId has no tag map', function () {
            PolicyComponentsUtils.GetTagBlockMap = () => null;
            const result = GridActionResolver.resolveGridBlock('missing-policy', 'any_grid');
            assert.isNull(result);
        });

        it('returns null when gridId is not a grid block type', function () {
            const block = makeBlock({ tag: 'not_a_grid', blockType: 'someOtherBlock' });
            const tagMap = new Map([['not_a_grid', 'uuid-x']]);
            const blockMap = new Map([['uuid-x', block]]);
            installPCUMock(tagMap, blockMap);

            const result = GridActionResolver.resolveGridBlock('policy-1', 'not_a_grid');
            assert.isNull(result);
        });

        it('resolves via hash fallback scan', function () {
            const block = makeBlock({ tag: undefined, uuid: 'scan-uuid', blockType: 'interfaceDocumentsSourceBlock' });
            const stableId = GridActionResolver.computeGridId(block);
            const tagMap = new Map([['some_tag', 'scan-uuid']]);
            const blockMap = new Map([['scan-uuid', block]]);
            installPCUMock(tagMap, blockMap);

            const result = GridActionResolver.resolveGridBlock('policy-1', stableId);
            assert.strictEqual(result, block);
        });
    });

    // ── resolveAction ─────────────────────────────────────────────────────────

    describe('resolveAction', function () {
        function setupGridWithAction(gridBlock, actionBlock) {
            gridBlock.options.uiMetaData.fields = [
                { name: 'status', bindBlocks: [actionBlock.tag] },
            ];
            const tagMap = new Map([
                [gridBlock.tag, 'grid-uuid'],
                [actionBlock.tag, 'action-uuid'],
            ]);
            const blockMap = new Map([
                ['grid-uuid', gridBlock],
                ['action-uuid', actionBlock],
            ]);
            installPCUMock(tagMap, blockMap);
        }

        it('resolves selector option by option.tag', function () {
            const gridBlock = makeBlock({ tag: 'my_grid' });
            const actionBlock = makeActionBlock();
            setupGridWithAction(gridBlock, actionBlock);

            const result = GridActionResolver.resolveAction('policy-1', 'my_grid', 'approve_action');
            assert.isNotNull(result);
            assert.equal(result.actionType, 'selector');
            assert.equal(result.optionValue, 'Approved');
            assert.equal(result.field, 'option.status');
        });

        it('resolves second selector option', function () {
            const gridBlock = makeBlock({ tag: 'my_grid' });
            const actionBlock = makeActionBlock();
            setupGridWithAction(gridBlock, actionBlock);

            const result = GridActionResolver.resolveAction('policy-1', 'my_grid', 'reject_action');
            assert.isNotNull(result);
            assert.equal(result.actionType, 'selector');
            assert.equal(result.optionValue, 'Rejected');
        });

        it('resolves button block by stable id', function () {
            const gridBlock = makeBlock({ tag: 'my_grid' });
            const buttonBlock = {
                blockType: 'buttonBlock',
                tag: 'submit_btn',
                uuid: 'btn-uuid',
                options: { uiMetaData: { title: 'Submit' } },
                permissions: [],
                isAvailable: async () => true,
            };
            gridBlock.options.uiMetaData.fields = [
                { name: 'action', bindBlocks: ['submit_btn'] },
            ];
            const tagMap = new Map([
                ['my_grid', 'grid-uuid'],
                ['submit_btn', 'btn-uuid'],
            ]);
            const blockMap = new Map([
                ['grid-uuid', gridBlock],
                ['btn-uuid', buttonBlock],
            ]);
            installPCUMock(tagMap, blockMap);

            const result = GridActionResolver.resolveAction('policy-1', 'my_grid', 'submit_btn');
            assert.isNotNull(result);
            assert.equal(result.actionType, 'button');
        });

        it('resolves selector option bound via singular bindBlock', function () {
            const gridBlock = makeBlock({ tag: 'my_grid' });
            const actionBlock = makeActionBlock();
            gridBlock.options.uiMetaData.fields = [
                { name: 'status', type: 'block', bindBlock: actionBlock.tag },
            ];
            const tagMap = new Map([
                [gridBlock.tag, 'grid-uuid'],
                [actionBlock.tag, 'action-uuid'],
            ]);
            const blockMap = new Map([
                ['grid-uuid', gridBlock],
                ['action-uuid', actionBlock],
            ]);
            installPCUMock(tagMap, blockMap);

            const result = GridActionResolver.resolveAction('policy-1', 'my_grid', 'approve_action');
            assert.isNotNull(result);
            assert.equal(result.actionType, 'selector');
            assert.equal(result.optionValue, 'Approved');
        });

        it('resolves individual buttons of a buttonBlock by button tag', function () {
            const gridBlock = makeBlock({ tag: 'my_grid' });
            const buttonBlock = {
                blockType: 'buttonBlock',
                tag: 'approve_btn_block',
                uuid: 'btn-uuid',
                options: {
                    uiMetaData: {
                        buttons: [
                            { tag: 'Option_0', name: 'Approve', type: 'selector', field: 'option.status', value: 'Approved' },
                            { tag: 'Option_1', name: 'Reject', type: 'selector', field: 'option.status', value: 'Rejected' },
                        ],
                    },
                },
                permissions: [],
                isAvailable: async () => true,
            };
            gridBlock.options.uiMetaData.fields = [
                { name: 'operation', type: 'block', bindBlock: 'approve_btn_block' },
            ];
            const tagMap = new Map([
                ['my_grid', 'grid-uuid'],
                ['approve_btn_block', 'btn-uuid'],
            ]);
            const blockMap = new Map([
                ['grid-uuid', gridBlock],
                ['btn-uuid', buttonBlock],
            ]);
            installPCUMock(tagMap, blockMap);

            const result = GridActionResolver.resolveAction('policy-1', 'my_grid', 'Option_1');
            assert.isNotNull(result);
            assert.equal(result.actionType, 'button');
            assert.equal(result.field, 'option.status');
            assert.equal(result.optionValue, 'Rejected');
            assert.equal(result.buttonTag, 'Option_1');
        });

        it('resolves a requestVcDocumentBlock as a request action', function () {
            const gridBlock = makeBlock({ tag: 'my_grid' });
            const requestBlock = {
                blockType: 'requestVcDocumentBlock',
                tag: 'final_mint_button',
                uuid: 'req-uuid',
                options: {
                    schema: '#SubmitFinalAmount',
                    uiMetaData: { type: 'dialog', title: 'Submit Final Token Amount', content: 'Submit Final Amount' },
                },
                permissions: ['ANY_ROLE'],
                isAvailable: async () => true,
            };
            gridBlock.options.uiMetaData.fields = [
                { name: '', type: 'block', bindBlock: 'final_mint_button' },
            ];
            const tagMap = new Map([
                ['my_grid', 'grid-uuid'],
                ['final_mint_button', 'req-uuid'],
            ]);
            const blockMap = new Map([
                ['grid-uuid', gridBlock],
                ['req-uuid', requestBlock],
            ]);
            installPCUMock(tagMap, blockMap);

            const result = GridActionResolver.resolveAction('policy-1', 'my_grid', 'final_mint_button');
            assert.isNotNull(result);
            assert.equal(result.actionType, 'request');
            assert.strictEqual(result.actionBlock, requestBlock);
        });

        it('resolves a dropdown interfaceActionBlock capturing its field', function () {
            const gridBlock = makeBlock({ tag: 'my_grid' });
            const dropdownBlock = {
                blockType: 'interfaceActionBlock',
                tag: 'assign_vvb',
                uuid: 'dd-uuid',
                options: {
                    type: 'dropdown',
                    field: 'assignedTo',
                    name: 'document.credentialSubject.0.name',
                    value: 'document.credentialSubject.0.id',
                    uiMetaData: { content: 'VVB' },
                },
                permissions: ['PROJECT_DEVELOPER'],
                isAvailable: async () => true,
            };
            gridBlock.options.uiMetaData.fields = [
                { name: 'assignedTo', type: 'block', bindBlock: 'assign_vvb' },
            ];
            const tagMap = new Map([
                ['my_grid', 'grid-uuid'],
                ['assign_vvb', 'dd-uuid'],
            ]);
            const blockMap = new Map([
                ['grid-uuid', gridBlock],
                ['dd-uuid', dropdownBlock],
            ]);
            installPCUMock(tagMap, blockMap);

            const result = GridActionResolver.resolveAction('policy-1', 'my_grid', 'assign_vvb');
            assert.isNotNull(result);
            assert.equal(result.actionType, 'dropdown');
            assert.equal(result.field, 'assignedTo');
        });

        it('returns null for unknown actionId', function () {
            const gridBlock = makeBlock({ tag: 'my_grid' });
            const actionBlock = makeActionBlock();
            gridBlock.options.uiMetaData.fields = [
                { name: 'status', bindBlocks: [actionBlock.tag] },
            ];
            const tagMap = new Map([
                ['my_grid', 'grid-uuid'],
                ['approve_action', 'action-uuid'],
            ]);
            const blockMap = new Map([
                ['grid-uuid', gridBlock],
                ['action-uuid', actionBlock],
            ]);
            installPCUMock(tagMap, blockMap);

            const result = GridActionResolver.resolveAction('policy-1', 'my_grid', 'nonexistent_action');
            assert.isNull(result);
        });

        it('returns null for unknown gridId', function () {
            installPCUMock(new Map(), new Map());
            const result = GridActionResolver.resolveAction('policy-1', 'ghost_grid', 'any_action');
            assert.isNull(result);
        });
    });

    // ── getGrids ──────────────────────────────────────────────────────────────

    describe('getGrids', function () {
        it('returns grid descriptor for each visible grid block', async function () {
            const grid1 = makeBlock({ tag: 'grid_a' });
            const grid2 = makeBlock({ tag: 'grid_b' });
            const tagMap = new Map([['grid_a', 'uuid-a'], ['grid_b', 'uuid-b']]);
            const blockMap = new Map([['uuid-a', grid1], ['uuid-b', grid2]]);
            installPCUMock(tagMap, blockMap);

            const mockUser = {};
            const results = await GridActionResolver.getGrids('policy-1', mockUser);
            assert.equal(results.length, 2);
            const ids = results.map((g) => g.gridId);
            assert.include(ids, 'grid_a');
            assert.include(ids, 'grid_b');
        });

        it('excludes grids not available to the user', async function () {
            const visibleGrid = makeBlock({ tag: 'visible_grid', isAvailable: async () => true });
            const hiddenGrid = makeBlock({ tag: 'hidden_grid', isAvailable: async () => false });
            const tagMap = new Map([['visible_grid', 'uuid-v'], ['hidden_grid', 'uuid-h']]);
            const blockMap = new Map([['uuid-v', visibleGrid], ['uuid-h', hiddenGrid]]);
            installPCUMock(tagMap, blockMap);

            const results = await GridActionResolver.getGrids('policy-1', {});
            assert.equal(results.length, 1);
            assert.equal(results[0].gridId, 'visible_grid');
        });

        it('skips non-grid block types', async function () {
            const nonGrid = { ...makeBlock({ tag: 'a_step' }), blockType: 'interfaceStepBlock' };
            const tagMap = new Map([['a_step', 'step-uuid']]);
            const blockMap = new Map([['step-uuid', nonGrid]]);
            installPCUMock(tagMap, blockMap);

            const results = await GridActionResolver.getGrids('policy-1', {});
            assert.equal(results.length, 0);
        });

        it('deduplicates blocks that appear under multiple tags', async function () {
            const sharedBlock = makeBlock({ tag: 'shared_grid' });
            const tagMap = new Map([['shared_grid', 'shared-uuid'], ['alias_tag', 'shared-uuid']]);
            const blockMap = new Map([['shared-uuid', sharedBlock]]);
            installPCUMock(tagMap, blockMap);

            const results = await GridActionResolver.getGrids('policy-1', {});
            assert.equal(results.length, 1);
        });

        it('returns empty array when policy has no tag map', async function () {
            PolicyComponentsUtils.GetTagBlockMap = () => null;
            const results = await GridActionResolver.getGrids('unknown-policy', {});
            assert.deepEqual(results, []);
        });
    });

    // ── getActions ────────────────────────────────────────────────────────────

    describe('getActions', function () {
        function setupSelectorGrid() {
            const gridBlock = makeBlock({ tag: 'g' });
            const actionBlock = makeActionBlock({ tag: 'approve_action', permissions: ['Standard Registry'] });
            gridBlock.options.uiMetaData.fields = [
                { name: 'status', bindBlocks: ['approve_action'] },
            ];
            const tagMap = new Map([['g', 'g-uuid'], ['approve_action', 'act-uuid']]);
            const blockMap = new Map([['g-uuid', gridBlock], ['act-uuid', actionBlock]]);
            installPCUMock(tagMap, blockMap);
        }

        it('returns actions for visible action blocks', async function () {
            setupSelectorGrid();
            const actions = await GridActionResolver.getActions('policy-1', 'g', {});
            assert.isAbove(actions.length, 0);
            const ids = actions.map((a) => a.actionId);
            assert.include(ids, 'approve_action');
            assert.include(ids, 'reject_action');
        });

        it('action descriptor has required fields', async function () {
            setupSelectorGrid();
            const actions = await GridActionResolver.getActions('policy-1', 'g', {});
            const approve = actions.find((a) => a.actionId === 'approve_action');
            assert.exists(approve);
            assert.equal(approve.appliesTo, 'row');
            assert.isArray(approve.requiredRoles);
            assert.isObject(approve.inputSchema);
        });

        it('returns actions bound via singular bindBlock', async function () {
            const gridBlock = makeBlock({ tag: 'g_single' });
            const actionBlock = makeActionBlock({ tag: 'approve_action' });
            gridBlock.options.uiMetaData.fields = [
                { name: 'status', type: 'block', bindBlock: 'approve_action' },
            ];
            const tagMap = new Map([['g_single', 'gs-uuid'], ['approve_action', 'act-uuid']]);
            const blockMap = new Map([['gs-uuid', gridBlock], ['act-uuid', actionBlock]]);
            installPCUMock(tagMap, blockMap);

            const actions = await GridActionResolver.getActions('policy-1', 'g_single', {});
            const ids = actions.map((a) => a.actionId);
            assert.include(ids, 'approve_action');
            assert.include(ids, 'reject_action');
        });

        it('lists each button of a buttonBlock as a separate action', async function () {
            const gridBlock = makeBlock({ tag: 'g_btns' });
            const buttonBlock = {
                blockType: 'buttonBlock',
                tag: 'approve_btn_block',
                uuid: 'bb-uuid',
                options: {
                    uiMetaData: {
                        buttons: [
                            { tag: 'Option_0', name: 'Approve', type: 'selector', field: 'option.status', value: 'Approved' },
                            { tag: 'Option_1', name: 'Reject', type: 'selector', field: 'option.status', value: 'Rejected' },
                        ],
                    },
                },
                permissions: ['Standard Registry'],
                isAvailable: async () => true,
            };
            gridBlock.options.uiMetaData.fields = [
                { name: 'operation', type: 'block', bindBlock: 'approve_btn_block' },
            ];
            const tagMap = new Map([['g_btns', 'gb-uuid'], ['approve_btn_block', 'bb-uuid']]);
            const blockMap = new Map([['gb-uuid', gridBlock], ['bb-uuid', buttonBlock]]);
            installPCUMock(tagMap, blockMap);

            const actions = await GridActionResolver.getActions('policy-1', 'g_btns', {});
            assert.equal(actions.length, 2);
            const labels = actions.map((a) => a.label);
            assert.include(labels, 'Approve');
            assert.include(labels, 'Reject');
            const ids = actions.map((a) => a.actionId);
            assert.include(ids, 'Option_0');
            assert.include(ids, 'Option_1');
        });

        it('lists a requestVcDocumentBlock as an action labeled by uiMetaData content', async function () {
            const gridBlock = makeBlock({ tag: 'g_req' });
            const requestBlock = {
                blockType: 'requestVcDocumentBlock',
                tag: 'final_mint_button',
                uuid: 'req-uuid',
                options: {
                    schema: '#SubmitFinalAmount',
                    uiMetaData: { type: 'dialog', title: 'Submit Final Token Amount', content: 'Submit Final Amount' },
                },
                permissions: ['ANY_ROLE'],
                isAvailable: async () => true,
            };
            gridBlock.options.uiMetaData.fields = [
                { name: '', type: 'block', bindBlock: 'final_mint_button' },
            ];
            const tagMap = new Map([['g_req', 'gr-uuid'], ['final_mint_button', 'req-uuid']]);
            const blockMap = new Map([['gr-uuid', gridBlock], ['req-uuid', requestBlock]]);
            installPCUMock(tagMap, blockMap);

            const actions = await GridActionResolver.getActions('policy-1', 'g_req', {});
            assert.equal(actions.length, 1);
            assert.equal(actions[0].actionId, 'final_mint_button');
            assert.equal(actions[0].label, 'Submit Final Amount');
            assert.include(actions[0].requiredRoles, 'ANY_ROLE');
            assert.deepEqual(actions[0].inputSchema.required, ['document']);
            assert.property(actions[0].inputSchema.properties, 'document');
        });

        it('lists both a buttonBlock button and a requestVcDocumentBlock (real-grid shape)', async function () {
            // Mirrors registry_MRs: bb_issueToken (button "Reject") + final_mint_button (request "Submit Final Amount")
            const gridBlock = makeBlock({ tag: 'registry_MRs' });
            const buttonBlock = {
                blockType: 'buttonBlock',
                tag: 'bb_issueToken',
                uuid: 'bb-uuid',
                options: { uiMetaData: { buttons: [{ tag: 'btn_reject', name: 'Reject', type: 'selector' }] } },
                permissions: ['OWNER'],
                isAvailable: async () => true,
            };
            const requestBlock = {
                blockType: 'requestVcDocumentBlock',
                tag: 'final_mint_button',
                uuid: 'req-uuid',
                options: { schema: '#Final', uiMetaData: { type: 'dialog', content: 'Submit Final Amount' } },
                permissions: ['ANY_ROLE'],
                isAvailable: async () => true,
            };
            gridBlock.options.uiMetaData.fields = [
                { title: 'Action1', name: '', type: 'block', bindBlock: 'bb_issueToken' },
                { title: 'Action2', name: '', type: 'block', bindBlock: 'final_mint_button' },
            ];
            const tagMap = new Map([
                ['registry_MRs', 'grid-uuid'],
                ['bb_issueToken', 'bb-uuid'],
                ['final_mint_button', 'req-uuid'],
            ]);
            const blockMap = new Map([
                ['grid-uuid', gridBlock],
                ['bb-uuid', buttonBlock],
                ['req-uuid', requestBlock],
            ]);
            installPCUMock(tagMap, blockMap);

            const actions = await GridActionResolver.getActions('policy-1', 'registry_MRs', {});
            const labels = actions.map((a) => a.label);
            assert.include(labels, 'Reject');
            assert.include(labels, 'Submit Final Amount');
        });

        it('lists a dropdown interfaceActionBlock with resolvable options as an enum', async function () {
            const gridBlock = makeBlock({ tag: 'g_dropdown' });
            const dropdownBlock = {
                blockType: 'interfaceActionBlock',
                tag: 'assign_vvb',
                uuid: 'dd-uuid',
                options: {
                    type: 'dropdown',
                    field: 'assignedTo',
                    name: 'document.credentialSubject.0.name',
                    value: 'document.credentialSubject.0.id',
                    uiMetaData: { content: 'VVB' },
                },
                permissions: ['PROJECT_DEVELOPER'],
                isAvailable: async () => true,
            };
            gridBlock.options.uiMetaData.fields = [
                { name: 'assignedTo', type: 'block', bindBlock: 'assign_vvb' },
            ];
            const tagMap = new Map([['g_dropdown', 'gd-uuid'], ['assign_vvb', 'dd-uuid']]);
            const blockMap = new Map([['gd-uuid', gridBlock], ['dd-uuid', dropdownBlock]]);
            installPCUMock(tagMap, blockMap);
            PolicyComponentsUtils.blockGetData = async () => ({
                body: {
                    options: [
                        { name: 'Xeno VVB', value: 'did:hedera:xeno-vvb' },
                        { name: 'Acme VVB', value: 'did:hedera:acme-vvb' },
                    ],
                },
            });

            const actions = await GridActionResolver.getActions('policy-1', 'g_dropdown', {});
            assert.equal(actions.length, 1);
            assert.equal(actions[0].actionId, 'assign_vvb');
            assert.equal(actions[0].label, 'VVB');
            assert.deepEqual(actions[0].inputSchema.required, ['value']);
            assert.deepEqual(actions[0].inputSchema.properties.value.enum, [
                'did:hedera:xeno-vvb',
                'did:hedera:acme-vvb',
            ]);
        });

        it('ignores empty-string bindBlock', async function () {
            const gridBlock = makeBlock({ tag: 'g_empty' });
            gridBlock.options.uiMetaData.fields = [
                { name: 'status', type: 'text', bindBlock: '' },
            ];
            const tagMap = new Map([['g_empty', 'ge-uuid']]);
            const blockMap = new Map([['ge-uuid', gridBlock]]);
            installPCUMock(tagMap, blockMap);

            const actions = await GridActionResolver.getActions('policy-1', 'g_empty', {});
            assert.equal(actions.length, 0);
        });

        it('deduplicates a tag present in both bindBlock and bindBlocks', async function () {
            const gridBlock = makeBlock({ tag: 'g_dup' });
            const actionBlock = makeActionBlock({ tag: 'approve_action' });
            gridBlock.options.uiMetaData.fields = [
                { name: 'status', bindBlock: 'approve_action', bindBlocks: ['approve_action'] },
            ];
            const tagMap = new Map([['g_dup', 'gd-uuid'], ['approve_action', 'act-uuid']]);
            const blockMap = new Map([['gd-uuid', gridBlock], ['act-uuid', actionBlock]]);
            installPCUMock(tagMap, blockMap);

            const actions = await GridActionResolver.getActions('policy-1', 'g_dup', {});
            const approveCount = actions.filter((a) => a.actionId === 'approve_action').length;
            assert.equal(approveCount, 1);
        });

        it('excludes actions whose block is not available', async function () {
            const gridBlock = makeBlock({ tag: 'g2' });
            const actionBlock = makeActionBlock({
                tag: 'hidden_action',
                isAvailable: async () => false,
            });
            gridBlock.options.uiMetaData.fields = [
                { name: 'col', bindBlocks: ['hidden_action'] },
            ];
            const tagMap = new Map([['g2', 'g2-uuid'], ['hidden_action', 'ha-uuid']]);
            const blockMap = new Map([['g2-uuid', gridBlock], ['ha-uuid', actionBlock]]);
            installPCUMock(tagMap, blockMap);

            const actions = await GridActionResolver.getActions('policy-1', 'g2', {});
            assert.equal(actions.length, 0);
        });

        it('throws 404 for unknown gridId', async function () {
            installPCUMock(new Map(), new Map());
            try {
                await GridActionResolver.getActions('policy-1', 'ghost_grid', {});
                assert.fail('expected an error');
            } catch (err) {
                assert.equal(err.code, 404);
            }
        });

        it('throws 503 when grid is not available to user', async function () {
            const gridBlock = makeBlock({ tag: 'restricted_g', isAvailable: async () => false });
            const tagMap = new Map([['restricted_g', 'rg-uuid']]);
            const blockMap = new Map([['rg-uuid', gridBlock]]);
            installPCUMock(tagMap, blockMap);

            try {
                await GridActionResolver.getActions('policy-1', 'restricted_g', {});
                assert.fail('expected an error');
            } catch (err) {
                assert.equal(err.code, 503);
            }
        });

        it('does not include download-type actions', async function () {
            const gridBlock = makeBlock({ tag: 'g3' });
            const downloadBlock = {
                blockType: 'interfaceActionBlock',
                tag: 'dl_action',
                uuid: 'dl-uuid',
                options: { type: 'download', uiMetaData: { title: 'Download' } },
                permissions: [],
                isAvailable: async () => true,
            };
            gridBlock.options.uiMetaData.fields = [
                { name: 'col', bindBlocks: ['dl_action'] },
            ];
            const tagMap = new Map([['g3', 'g3-uuid'], ['dl_action', 'dl-uuid']]);
            const blockMap = new Map([['g3-uuid', gridBlock], ['dl-uuid', downloadBlock]]);
            installPCUMock(tagMap, blockMap);

            const actions = await GridActionResolver.getActions('policy-1', 'g3', {});
            assert.equal(actions.length, 0);
        });
    });

    // ── getRecords ────────────────────────────────────────────────────────────

    describe('getRecords', function () {
        function stubGetRecordsDeps(gridBlock, docs) {
            const tagMap = new Map([[gridBlock.tag, 'gr-uuid']]);
            const blockMap = new Map([['gr-uuid', gridBlock]]);
            installPCUMock(tagMap, blockMap);

            PolicyComponentsUtils.isAvailableGetData = async () => null;
            PolicyComponentsUtils.blockGetData = async () => ({
                body: {
                    data: docs,
                    page: 1,
                    pageSize: 20,
                    totalCount: docs.length,
                    hasNextPage: false,
                    hasPreviousPage: false,
                },
            });
        }

        it('annotates each record with _actions', async function () {
            const gridBlock = makeBlock({ tag: 'record_grid' });
            gridBlock.options.uiMetaData.fields = [];
            const docs = [{ id: 'doc1', owner: 'did:hedera:...' }];
            stubGetRecordsDeps(gridBlock, docs);

            const result = await GridActionResolver.getRecords('policy-1', 'record_grid', {}, {});
            assert.isArray(result.data);
            assert.property(result.data[0], '_actions');
            assert.isArray(result.data[0]._actions);
        });

        it("translates external page/pageSize into the block's page/itemsPerPage contract", async function () {
            const gridBlock = makeBlock({ tag: 'paged_grid' });
            const tagMap = new Map([['paged_grid', 'pg-uuid']]);
            const blockMap = new Map([['pg-uuid', gridBlock]]);
            installPCUMock(tagMap, blockMap);
            PolicyComponentsUtils.isAvailableGetData = async () => null;

            let receivedParams = null;
            PolicyComponentsUtils.blockGetData = async (_block, _user, params) => {
                receivedParams = params;
                return {
                    body: {
                        data: [],
                        page: 2, // 0-based internal value corresponding to external page=3
                        pageSize: 10,
                        totalCount: 25,
                        hasNextPage: true,
                        hasPreviousPage: true,
                    },
                };
            };

            const result = await GridActionResolver.getRecords('policy-1', 'paged_grid', {}, { page: 3, pageSize: 10 });

            assert.equal(receivedParams.page, 2, 'external page=3 (1-based) must become internal page=2 (0-based)');
            assert.equal(receivedParams.itemsPerPage, 10);
            assert.isUndefined(receivedParams.pageSize, 'pageSize must not leak into block params (would be misread as a filterId)');
            assert.equal(result.page, 3, 'internal 0-based page=2 must be translated back to external 1-based page=3');
        });

        it("trusts the pagination addon's own totalCount/hasNextPage/hasPreviousPage when it reports a numeric page", async function () {
            const gridBlock = makeBlock({ tag: 'addon_grid' });
            const tagMap = new Map([['addon_grid', 'ad-uuid']]);
            const blockMap = new Map([['ad-uuid', gridBlock]]);
            installPCUMock(tagMap, blockMap);
            PolicyComponentsUtils.isAvailableGetData = async () => null;

            // The addon already counted/sliced using our own translated page/pageSize
            // (see pagination-addon.ts's getState(), which counts via a real DB query) —
            // these values must pass through as-is, not be recomputed from data.length.
            PolicyComponentsUtils.blockGetData = async () => ({
                body: { data: [{ id: 'doc-20' }], page: 1, pageSize: 10, totalCount: 999, hasNextPage: true, hasPreviousPage: true },
            });

            const result = await GridActionResolver.getRecords('policy-1', 'addon_grid', {}, { page: 2, pageSize: 10 });

            assert.equal(result.page, 2);
            assert.equal(result.totalCount, 999, 'must trust the addon\'s DB-computed count, not data.length');
            assert.isTrue(result.hasNextPage);
            assert.isTrue(result.hasPreviousPage);
        });

        it('applies default page/pageSize (1-based page 1, size 20) when the caller omits them', async function () {
            const gridBlock = makeBlock({ tag: 'no_page_grid' });
            const tagMap = new Map([['no_page_grid', 'np-uuid']]);
            const blockMap = new Map([['np-uuid', gridBlock]]);
            installPCUMock(tagMap, blockMap);
            PolicyComponentsUtils.isAvailableGetData = async () => null;

            let receivedParams = null;
            PolicyComponentsUtils.blockGetData = async (_block, _user, params) => {
                receivedParams = params;
                return { body: { data: [] } };
            };

            await GridActionResolver.getRecords('policy-1', 'no_page_grid', {}, {});

            assert.equal(receivedParams.page, 0, 'defaults to external page 1 → internal 0-based page 0');
            assert.equal(receivedParams.itemsPerPage, 20, 'defaults to POLICY_DATA_DEFAULT_PAGE_SIZE');
        });

        it('clamps an oversized pageSize to POLICY_DATA_MAX_PAGE_SIZE', async function () {
            const gridBlock = makeBlock({ tag: 'huge_page_grid' });
            const tagMap = new Map([['huge_page_grid', 'hp-uuid']]);
            const blockMap = new Map([['hp-uuid', gridBlock]]);
            installPCUMock(tagMap, blockMap);
            PolicyComponentsUtils.isAvailableGetData = async () => null;

            let receivedParams = null;
            PolicyComponentsUtils.blockGetData = async (_block, _user, params) => {
                receivedParams = params;
                return { body: { data: [] } };
            };

            await GridActionResolver.getRecords('policy-1', 'huge_page_grid', {}, { page: 1, pageSize: 99999 });

            assert.equal(receivedParams.itemsPerPage, 200);
        });

        it('falls back to defaults instead of NaN when page/pageSize are non-numeric strings', async function () {
            const gridBlock = makeBlock({ tag: 'nan_grid' });
            const tagMap = new Map([['nan_grid', 'nan-uuid']]);
            const blockMap = new Map([['nan-uuid', gridBlock]]);
            installPCUMock(tagMap, blockMap);
            PolicyComponentsUtils.isAvailableGetData = async () => null;

            let receivedParams = null;
            PolicyComponentsUtils.blockGetData = async (_block, _user, params) => {
                receivedParams = params;
                return { body: { data: [] } };
            };

            await GridActionResolver.getRecords('policy-1', 'nan_grid', {}, { page: 'abc', pageSize: 'xyz' });

            assert.equal(receivedParams.page, 0, 'non-numeric page must default to 1 (0-based 0), never NaN');
            assert.equal(receivedParams.itemsPerPage, 20, 'non-numeric pageSize must default to POLICY_DATA_DEFAULT_PAGE_SIZE, never NaN');
            assert.isFalse(Number.isNaN(receivedParams.page));
            assert.isFalse(Number.isNaN(receivedParams.itemsPerPage));
        });

        it('clamps a negative pageSize to a minimum of 1 instead of leaving it negative', async function () {
            const gridBlock = makeBlock({ tag: 'neg_grid' });
            const tagMap = new Map([['neg_grid', 'neg-uuid']]);
            const blockMap = new Map([['neg-uuid', gridBlock]]);
            installPCUMock(tagMap, blockMap);
            PolicyComponentsUtils.isAvailableGetData = async () => null;

            let receivedParams = null;
            PolicyComponentsUtils.blockGetData = async (_block, _user, params) => {
                receivedParams = params;
                return { body: { data: [] } };
            };

            await GridActionResolver.getRecords('policy-1', 'neg_grid', {}, { page: -5, pageSize: -50 });

            assert.equal(receivedParams.page, 0, 'negative page must clamp to 1 (0-based 0)');
            assert.equal(receivedParams.itemsPerPage, 1, 'negative pageSize must clamp to a minimum of 1');
        });

        it('enforces pagination itself when the grid has no pagination addon configured', async function () {
            const gridBlock = makeBlock({ tag: 'unpaginated_grid' });
            const tagMap = new Map([['unpaginated_grid', 'up-uuid']]);
            const blockMap = new Map([['up-uuid', gridBlock]]);
            installPCUMock(tagMap, blockMap);
            PolicyComponentsUtils.isAvailableGetData = async () => null;

            const allDocs = Array.from({ length: 25 }, (_, i) => ({ id: `doc-${i}` }));
            PolicyComponentsUtils.blockGetData = async () => ({ body: { data: allDocs } });

            const result = await GridActionResolver.getRecords(
                'policy-1', 'unpaginated_grid', {}, { page: 2, pageSize: 10 }
            );

            assert.equal(result.data.length, 10);
            assert.equal(result.data[0].id, 'doc-10');
            assert.equal(result.page, 2);
            assert.equal(result.pageSize, 10);
            assert.equal(result.totalCount, 25);
            assert.isTrue(result.hasPreviousPage);
            assert.isTrue(result.hasNextPage);
        });

        it('reports hasNextPage=false on the last unenforced page', async function () {
            const gridBlock = makeBlock({ tag: 'last_page_grid' });
            const tagMap = new Map([['last_page_grid', 'lp-uuid']]);
            const blockMap = new Map([['lp-uuid', gridBlock]]);
            installPCUMock(tagMap, blockMap);
            PolicyComponentsUtils.isAvailableGetData = async () => null;

            const allDocs = Array.from({ length: 25 }, (_, i) => ({ id: `doc-${i}` }));
            PolicyComponentsUtils.blockGetData = async () => ({ body: { data: allDocs } });

            const result = await GridActionResolver.getRecords(
                'policy-1', 'last_page_grid', {}, { page: 3, pageSize: 10 }
            );

            assert.equal(result.data.length, 5);
            assert.isFalse(result.hasNextPage);
            assert.isTrue(result.hasPreviousPage);
        });

        it('enforces default pagination (page 1, size 20) when the caller supplies no params at all and the grid has no addon', async function () {
            const gridBlock = makeBlock({ tag: 'defaulted_grid' });
            const tagMap = new Map([['defaulted_grid', 'df-uuid']]);
            const blockMap = new Map([['df-uuid', gridBlock]]);
            installPCUMock(tagMap, blockMap);
            PolicyComponentsUtils.isAvailableGetData = async () => null;

            const allDocs = Array.from({ length: 45 }, (_, i) => ({ id: `doc-${i}` }));
            PolicyComponentsUtils.blockGetData = async () => ({ body: { data: allDocs } });

            const result = await GridActionResolver.getRecords('policy-1', 'defaulted_grid', {}, {});

            assert.equal(result.data.length, 20);
            assert.equal(result.page, 1);
            assert.equal(result.pageSize, 20);
            assert.equal(result.totalCount, 45);
            assert.isFalse(result.hasPreviousPage);
            assert.isTrue(result.hasNextPage);
        });

        it('throws 404 when gridId is unknown', async function () {
            installPCUMock(new Map(), new Map());
            try {
                await GridActionResolver.getRecords('policy-1', 'no_such_grid', {}, {});
                assert.fail('expected error');
            } catch (err) {
                assert.equal(err.code, 404);
            }
        });

        it('propagates availability error from isAvailableGetData', async function () {
            const gridBlock = makeBlock({ tag: 'unavail_grid' });
            const tagMap = new Map([['unavail_grid', 'ug-uuid']]);
            const blockMap = new Map([['ug-uuid', gridBlock]]);
            installPCUMock(tagMap, blockMap);
            PolicyComponentsUtils.isAvailableGetData = async () => ({ message: 'Block Unavailable', code: 503 });

            try {
                await GridActionResolver.getRecords('policy-1', 'unavail_grid', {}, {});
                assert.fail('expected error');
            } catch (err) {
                assert.equal(err.code, 503);
            }
        });
    });

    // ── executeAction ────────────────────────────────────────────────────────

    describe('executeAction', function () {
        function setupExecutableGrid(recordActionStep) {
            const gridBlock = makeBlock({ tag: 'exec_grid' });
            const actionBlock = makeActionBlock();
            gridBlock.options.uiMetaData.fields = [
                { name: 'status', bindBlocks: [actionBlock.tag] },
            ];
            gridBlock.databaseServer = {
                getVcDocument: async () => ({ id: 'target-doc', option: { status: 'Submitted' } }),
            };

            const tagMap = new Map([
                [gridBlock.tag, 'grid-uuid'],
                [actionBlock.tag, 'action-uuid'],
            ]);
            const blockMap = new Map([
                ['grid-uuid', gridBlock],
                ['action-uuid', actionBlock],
            ]);
            installPCUMock(tagMap, blockMap);

            PolicyComponentsUtils.isAvailableSetData = async () => null;
            PolicyComponentsUtils.isAvailableGetData = async () => null;

            return { gridBlock, actionBlock, recordActionStep };
        }

        it('resolves the action internally when no pre-resolved resolution is passed, and 404s on an unknown actionId without touching blockGetData/blockSetData', async function () {
            setupExecutableGrid();

            let blockGetDataCalled = false;
            let blockSetDataCalled = false;
            PolicyComponentsUtils.blockGetData = async () => { blockGetDataCalled = true; return { body: { data: [] } }; };
            PolicyComponentsUtils.blockSetData = async () => { blockSetDataCalled = true; return { body: {} }; };

            try {
                await GridActionResolver.executeAction(
                    'policy-1', 'exec_grid', 'target-doc', 'no_such_action', {}, {}, {}
                );
                assert.fail('expected error');
            } catch (err) {
                assert.equal(err.code, 404);
            }
            assert.isFalse(blockGetDataCalled, 'must not query the grid for an unresolvable action');
            assert.isFalse(blockSetDataCalled, 'must not execute for an unresolvable action');
        });

        it("404s when the record exists but isn't in the grid's scoped result set (record-scope authorization)", async function () {
            setupExecutableGrid();
            const resolution = GridActionResolver.resolveAction('policy-1', 'exec_grid', 'approve_action');
            assert.isNotNull(resolution);

            PolicyComponentsUtils.blockGetData = async () => ({
                body: { data: [{ id: 'some-other-doc' }] }, // does not include 'target-doc'
            });
            let blockSetDataCalled = false;
            PolicyComponentsUtils.blockSetData = async () => { blockSetDataCalled = true; return { body: {} }; };

            try {
                await GridActionResolver.executeAction(
                    'policy-1', 'exec_grid', 'target-doc', 'approve_action', {}, {}, {}, resolution
                );
                assert.fail('expected error');
            } catch (err) {
                assert.equal(err.code, 404);
            }
            assert.isFalse(blockSetDataCalled, 'must not execute against a record outside the grid\'s visible scope');
        });

        it("executes when the record is within the grid's scoped result set (no pagination addon: single call, no `page` field in the response)", async function () {
            setupExecutableGrid();
            const resolution = GridActionResolver.resolveAction('policy-1', 'exec_grid', 'approve_action');
            assert.isNotNull(resolution);

            let scopeCallCount = 0;
            let receivedScopeParams = null;
            PolicyComponentsUtils.blockGetData = async (_block, _user, params) => {
                scopeCallCount++;
                receivedScopeParams = params;
                // No `page` field — this is how a grid without a pagination addon responds
                // (see documents-source.ts, which only sets `page` when an addon exists).
                return { body: { data: [{ id: 'target-doc' }, { id: 'other-doc' }] } };
            };
            let receivedPayload = null;
            PolicyComponentsUtils.blockSetData = async (_block, _user, payload) => {
                receivedPayload = payload;
                return { body: { ok: true } };
            };

            const result = await GridActionResolver.executeAction(
                'policy-1', 'exec_grid', 'target-doc', 'approve_action', {}, {}, {}, resolution
            );

            assert.equal(scopeCallCount, 1, 'no `page` field in the response means the grid already returned everything — no second call needed');
            assert.equal(receivedScopeParams.page, 0);
            assert.equal(receivedScopeParams.itemsPerPage, 200, 'POLICY_DATA_MAX_PAGE_SIZE');
            assert.equal(receivedPayload.option.status, 'Approved', 'selector action sets the resolved field/value on the document');
            assert.deepEqual(result, { ok: true });
        });

        it("pages through in POLICY_DATA_MAX_PAGE_SIZE-sized chunks to authorize a record beyond the first page on a grid with a real pagination addon", async function () {
            setupExecutableGrid();
            const resolution = GridActionResolver.resolveAction('policy-1', 'exec_grid', 'approve_action');
            assert.isNotNull(resolution);

            // 300 rows, chunk size 200 (POLICY_DATA_MAX_PAGE_SIZE) — the target only appears on
            // the *second* chunk (index 250), proving real multi-page iteration, not a single
            // oversized fetch, and not a fixed cap that would miss it. Including a numeric `page`
            // field in the response is what signals "this grid really paginates" (same signal
            // getRecords uses), so the loop knows to keep going instead of stopping after page 0.
            const allDocs = Array.from({ length: 300 }, (_, i) => ({ id: i === 250 ? 'target-doc' : `doc-${i}` }));
            const receivedPages = [];
            PolicyComponentsUtils.blockGetData = async (_block, _user, params) => {
                receivedPages.push(params.page);
                const start = params.page * params.itemsPerPage;
                const slice = allDocs.slice(start, start + params.itemsPerPage);
                return { body: { data: slice, page: params.page, hasNextPage: start + params.itemsPerPage < allDocs.length } };
            };
            let blockSetDataCalled = false;
            PolicyComponentsUtils.blockSetData = async () => { blockSetDataCalled = true; return { body: { ok: true } }; };

            await GridActionResolver.executeAction(
                'policy-1', 'exec_grid', 'target-doc', 'approve_action', {}, {}, {}, resolution
            );

            assert.isTrue(blockSetDataCalled, 'must authorize a record found on a later chunk');
            assert.deepEqual(receivedPages, [0, 1], 'must page through chunk 0 then chunk 1 to find the record, never fetching everything at once');
        });

        it('stops paging (unauthorized) once a paginated grid reports no more pages, without scanning forever', async function () {
            setupExecutableGrid();
            const resolution = GridActionResolver.resolveAction('policy-1', 'exec_grid', 'approve_action');
            assert.isNotNull(resolution);

            let scopeCallCount = 0;
            PolicyComponentsUtils.blockGetData = async (_block, _user, params) => {
                scopeCallCount++;
                // Numeric `page` field signals a real paginated grid; hasNextPage: false says stop.
                return { body: { data: [{ id: 'some-other-doc' }], page: params.page, hasNextPage: false } };
            };
            let blockSetDataCalled = false;
            PolicyComponentsUtils.blockSetData = async () => { blockSetDataCalled = true; return { body: {} }; };

            try {
                await GridActionResolver.executeAction(
                    'policy-1', 'exec_grid', 'target-doc', 'approve_action', {}, {}, {}, resolution
                );
                assert.fail('expected error');
            } catch (err) {
                assert.equal(err.code, 404);
            }
            assert.equal(scopeCallCount, 1, 'must stop after the first page once hasNextPage is false');
            assert.isFalse(blockSetDataCalled);
        });

        it('reports a distinct 500 (not a 404) when a grid has more pages than the safety ceiling can scan', async function () {
            setupExecutableGrid();
            const resolution = GridActionResolver.resolveAction('policy-1', 'exec_grid', 'approve_action');
            assert.isNotNull(resolution);

            // Always claims another page exists and never contains the target — simulates a
            // grid whose real record count exceeds MAX_PAGES * POLICY_DATA_MAX_PAGE_SIZE
            // (1000 * 200 = 200k), so the record could be legitimately in-scope just beyond
            // where scanning stops. That must surface as "couldn't verify", not "not found".
            const fullPage = Array.from({ length: 200 }, (_, i) => ({ id: `doc-${i}` })); // full page — not the last one
            let scopeCallCount = 0;
            PolicyComponentsUtils.blockGetData = async (_block, _user, params) => {
                scopeCallCount++;
                return { body: { data: fullPage, page: params.page, hasNextPage: true } };
            };
            let blockSetDataCalled = false;
            PolicyComponentsUtils.blockSetData = async () => { blockSetDataCalled = true; return { body: {} }; };

            try {
                await GridActionResolver.executeAction(
                    'policy-1', 'exec_grid', 'target-doc', 'approve_action', {}, {}, {}, resolution
                );
                assert.fail('expected error');
            } catch (err) {
                assert.equal(err.code, 500, 'must not be reported as a 404 — we never actually confirmed the record is absent');
            }
            assert.equal(scopeCallCount, 1000, 'must stop scanning at the MAX_PAGES safety ceiling');
            assert.isFalse(blockSetDataCalled);
        });
    });
});
