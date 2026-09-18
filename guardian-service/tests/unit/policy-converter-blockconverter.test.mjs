import assert from 'node:assert/strict';
import { PolicyConverterUtils } from '../../dist/helpers/import-helpers/policy/policy-converter-utils.js';

describe('PolicyConverterUtils.BlockConverter', () => {
    it('renames legacy block types when policyVersion is below 1.0.0', () => {
        const root = { blockType: 'mintDocument' };
        const result = PolicyConverterUtils.BlockConverter(root, root, '0.0.1');
        assert.equal(result.blockType, 'mintDocumentBlock');
    });

    it('does not apply v1_0_0 rename when policyVersion is already 1.0.0', () => {
        const root = { blockType: 'mintDocument' };
        const result = PolicyConverterUtils.BlockConverter(root, root, '1.0.0');
        assert.equal(result.blockType, 'mintDocument');
    });

    it('recurses into children and converts them', () => {
        const root = {
            blockType: 'root',
            children: [{ blockType: 'wipeDocument' }, { blockType: 'sendToGuardian' }]
        };
        const result = PolicyConverterUtils.BlockConverter(root, root, '0.0.1');
        assert.equal(result.children[0].blockType, 'retirementDocumentBlock');
        assert.equal(result.children[1].blockType, 'sendToGuardianBlock');
    });

    it('defaults accountType for mint blocks when below 1.3.0', () => {
        const root = { blockType: 'mintDocumentBlock' };
        const result = PolicyConverterUtils.BlockConverter(root, root, '1.2.0');
        assert.equal(result.accountType, 'default');
    });

    it('leaves a modern block untouched when policyVersion is current', () => {
        const root = { blockType: 'someModernBlock', children: [] };
        const result = PolicyConverterUtils.BlockConverter(root, root, PolicyConverterUtils.VERSION);
        assert.equal(result.blockType, 'someModernBlock');
    });

    it('returns the same root object reference', () => {
        const root = { blockType: 'root', children: [] };
        assert.equal(PolicyConverterUtils.BlockConverter(root, root, '0.0.1'), root);
    });
});

describe('PolicyConverterUtils.PolicyConverter end to end', () => {
    it('upgrades codeVersion to the current VERSION', () => {
        const policy = { codeVersion: '0.0.1', config: { blockType: 'root', children: [] } };
        const result = PolicyConverterUtils.PolicyConverter(policy);
        assert.equal(result.codeVersion, PolicyConverterUtils.VERSION);
    });

    it('converts the config block tree', () => {
        const policy = {
            codeVersion: '0.0.1',
            config: { blockType: 'root', children: [{ blockType: 'mintDocument' }] }
        };
        const result = PolicyConverterUtils.PolicyConverter(policy);
        assert.equal(result.config.children[0].blockType, 'mintDocumentBlock');
    });

    it('short circuits when already at the current version', () => {
        const policy = { codeVersion: PolicyConverterUtils.VERSION, config: { blockType: 'mintDocument' } };
        const result = PolicyConverterUtils.PolicyConverter(policy);
        assert.equal(result.config.blockType, 'mintDocument');
    });

    it('returns the same policy reference', () => {
        const policy = { codeVersion: '0.0.1', config: { blockType: 'root', children: [] } };
        assert.equal(PolicyConverterUtils.PolicyConverter(policy), policy);
    });
});
