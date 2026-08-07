import assert from 'node:assert/strict';
import { PolicyConverterUtils } from '../../dist/helpers/import-helpers/policy/policy-converter-utils.js';

describe('PolicyConverterUtils.v1_0_0 block type renames', () => {
    const cases = [
        ['interfaceDocumentsSource', 'interfaceDocumentsSourceBlock'],
        ['requestVcDocument', 'requestVcDocumentBlock'],
        ['sendToGuardian', 'sendToGuardianBlock'],
        ['interfaceAction', 'interfaceActionBlock'],
        ['mintDocument', 'mintDocumentBlock'],
        ['aggregateDocument', 'aggregateDocumentBlock'],
        ['wipeDocument', 'retirementDocumentBlock']
    ];
    for (const [from, to] of cases) {
        it(`renames ${from} to ${to}`, () => {
            const block = PolicyConverterUtils.v1_0_0({ blockType: from });
            assert.equal(block.blockType, to);
        });
    }

    it('leaves an unknown block type unchanged', () => {
        const block = PolicyConverterUtils.v1_0_0({ blockType: 'somethingElse' });
        assert.equal(block.blockType, 'somethingElse');
    });

    it('returns the same object reference', () => {
        const input = { blockType: 'mintDocument' };
        assert.equal(PolicyConverterUtils.v1_0_0(input), input);
    });
});

describe('PolicyConverterUtils.v1_1_0 event generation', () => {
    it('adds an empty events array when missing', () => {
        const block = PolicyConverterUtils.v1_1_0({ blockType: 'x', tag: 't' });
        assert.deepEqual(block.events, []);
    });

    it('creates refresh events from dependencies', () => {
        const block = PolicyConverterUtils.v1_1_0({ blockType: 'x', tag: 'me', dependencies: ['dep1', 'dep2'] });
        assert.equal(block.events.length, 2);
        assert.equal(block.events[0].source, 'dep1');
        assert.equal(block.events[0].target, 'me');
    });

    it('does not overwrite existing events', () => {
        const existing = [{ marker: true }];
        const block = PolicyConverterUtils.v1_1_0({ blockType: 'x', tag: 't', events: existing, dependencies: ['d'] });
        assert.equal(block.events, existing);
        assert.equal(block.events.length, 1);
    });

    it('tags selector options that lack a tag', () => {
        const block = PolicyConverterUtils.v1_1_0({
            blockType: 'interfaceActionBlock', type: 'selector', tag: 'sel',
            uiMetaData: { options: [{ bindBlock: 'b0' }, { tag: 'keep', bindBlock: 'b1' }] }
        });
        assert.equal(block.uiMetaData.options[0].tag, 'Option_0');
        assert.equal(block.uiMetaData.options[1].tag, 'keep');
    });

    it('emits a run event per selector option', () => {
        const block = PolicyConverterUtils.v1_1_0({
            blockType: 'interfaceActionBlock', type: 'selector', tag: 'sel',
            uiMetaData: { options: [{ bindBlock: 'b0' }, { bindBlock: 'b1' }] }
        });
        assert.equal(block.events.length, 2);
        assert.equal(block.events[0].source, 'sel');
        assert.equal(block.events[0].target, 'b0');
    });

    it('emits a dropdown event for dropdown action blocks', () => {
        const block = PolicyConverterUtils.v1_1_0({
            blockType: 'interfaceActionBlock', type: 'dropdown', tag: 'dd', bindBlock: 'target'
        });
        assert.equal(block.events.length, 1);
        assert.equal(block.events[0].target, 'target');
    });

    it('tags switch conditions and emits run events', () => {
        const block = PolicyConverterUtils.v1_1_0({
            blockType: 'switchBlock', tag: 'sw',
            conditions: [{ bindBlock: 'c0' }, { tag: 'named', bindBlock: 'c1' }]
        });
        assert.equal(block.conditions[0].tag, 'Condition_0');
        assert.equal(block.conditions[1].tag, 'named');
        assert.equal(block.events.length, 2);
    });

    it('emits a timer event for aggregate blocks with a timer', () => {
        const block = PolicyConverterUtils.v1_1_0({
            blockType: 'aggregateDocumentBlock', tag: 'agg', timer: 'timer-tag'
        });
        assert.equal(block.events.length, 1);
        assert.equal(block.events[0].source, 'timer-tag');
        assert.equal(block.events[0].target, 'agg');
    });
});

describe('PolicyConverterUtils.v1_2_0 selector to button', () => {
    it('converts a selector action block to a buttonBlock', () => {
        const block = PolicyConverterUtils.v1_2_0({
            blockType: 'interfaceActionBlock', type: 'selector', field: 'f',
            uiMetaData: { options: [{ tag: 'o1', name: 'n1', value: 'v1' }] }
        });
        assert.equal(block.blockType, 'buttonBlock');
        assert.equal(block.uiMetaData.buttons.length, 1);
        assert.equal(block.uiMetaData.buttons[0].tag, 'o1');
        assert.equal(block.uiMetaData.buttons[0].type, 'selector');
    });

    it('removes the legacy options after conversion', () => {
        const block = PolicyConverterUtils.v1_2_0({
            blockType: 'interfaceActionBlock', type: 'selector',
            uiMetaData: { options: [{ tag: 'o' }] }
        });
        assert.equal(block.uiMetaData.options, undefined);
    });

    it('creates an empty buttons array when there are no options', () => {
        const block = PolicyConverterUtils.v1_2_0({
            blockType: 'interfaceActionBlock', type: 'selector'
        });
        assert.deepEqual(block.uiMetaData.buttons, []);
    });

    it('leaves non-selector action blocks unchanged', () => {
        const block = PolicyConverterUtils.v1_2_0({ blockType: 'interfaceActionBlock', type: 'dropdown' });
        assert.equal(block.blockType, 'interfaceActionBlock');
    });
});

describe('PolicyConverterUtils.v1_3_0 accountType defaults', () => {
    it('defaults accountType for mint blocks', () => {
        assert.equal(PolicyConverterUtils.v1_3_0({ blockType: 'mintDocumentBlock' }).accountType, 'default');
    });

    it('defaults accountType for retirement blocks', () => {
        assert.equal(PolicyConverterUtils.v1_3_0({ blockType: 'retirementDocumentBlock' }).accountType, 'default');
    });

    it('keeps an existing accountType', () => {
        assert.equal(PolicyConverterUtils.v1_3_0({ blockType: 'mintDocumentBlock', accountType: 'custom' }).accountType, 'custom');
    });

    it('does not add accountType to other blocks', () => {
        assert.equal(PolicyConverterUtils.v1_3_0({ blockType: 'other' }).accountType, undefined);
    });
});

describe('PolicyConverterUtils.v1_5_0 history addon', () => {
    it('ignores non documents-source blocks', () => {
        const block = PolicyConverterUtils.v1_5_0({ blockType: 'other', children: [] });
        assert.equal(block.blockType, 'other');
    });

    it('adds a historyAddon child when a source addon has viewHistory', () => {
        const block = PolicyConverterUtils.v1_5_0({
            blockType: 'interfaceDocumentsSourceBlock',
            children: [{ blockType: 'documentsSourceAddon', viewHistory: true }]
        });
        assert.ok(block.children.some(c => c.blockType === 'historyAddon'));
    });

    it('strips viewHistory from source addons', () => {
        const block = PolicyConverterUtils.v1_5_0({
            blockType: 'interfaceDocumentsSourceBlock',
            children: [{ blockType: 'documentsSourceAddon', viewHistory: true }]
        });
        const addon = block.children.find(c => c.blockType === 'documentsSourceAddon');
        assert.equal(addon.viewHistory, undefined);
    });

    it('does not add a history addon when none requested', () => {
        const block = PolicyConverterUtils.v1_5_0({
            blockType: 'interfaceDocumentsSourceBlock',
            children: [{ blockType: 'documentsSourceAddon', viewHistory: false }]
        });
        assert.ok(!block.children.some(c => c.blockType === 'historyAddon'));
    });
});

describe('PolicyConverterUtils.v1_5_1 revoke block', () => {
    it('ignores non revoke blocks', () => {
        const block = PolicyConverterUtils.v1_5_1({}, { blockType: 'other' });
        assert.equal(block.blockType, 'other');
    });

    it('converts a revokeBlock to a revocation block and lifts uiMetaData fields', () => {
        const root = { blockType: 'root', children: [] };
        const block = PolicyConverterUtils.v1_5_1(root, {
            blockType: 'revokeBlock', tag: 'rev',
            uiMetaData: { updatePrevDoc: true, prevDocStatus: 'Revoked' }
        });
        assert.equal(block.updatePrevDoc, true);
        assert.equal(block.prevDocStatus, 'Revoked');
        assert.equal(block.uiMetaData, undefined);
        assert.notEqual(block.blockType, 'revokeBlock');
    });
});
