import assert from 'node:assert/strict';
import { PolicyWizardHelper } from '../../dist/api/helpers/policy-wizard-helper.js';

const helper = () => new PolicyWizardHelper();

describe('PolicyWizardHelper.getVpGrid', () => {
    it('is a documents viewer with HASH, Date, Token Id, Serials and TrustChain columns', () => {
        const block = helper().getVpGrid('USER', 'tc-tag', false);
        assert.equal(block.blockType, 'interfaceDocumentsSourceBlock');
        const titles = block.uiMetaData.fields.map(f => f.title);
        assert.deepEqual(titles, ['HASH', 'Date', 'Token Id', 'Serials', 'TrustChain']);
    });

    it('binds the TrustChain button to the trust chain tag', () => {
        const block = helper().getVpGrid('USER', 'tc-tag', false);
        const trustChain = block.uiMetaData.fields.find(f => f.title === 'TrustChain');
        assert.equal(trustChain.bindBlock, 'tc-tag');
        assert.equal(trustChain.action, 'link');
    });

    it('embeds a vp-documents source addon honouring onlyOwnDocuments', () => {
        const block = helper().getVpGrid('USER', 'tc-tag', true);
        assert.equal(block.children.length, 1);
        assert.equal(block.children[0].dataType, 'vp-documents');
        assert.equal(block.children[0].onlyOwnDocuments, true);
    });

    it('scopes the grid to the requested role', () => {
        const block = helper().getVpGrid('AUDITOR', 'tc-tag', false);
        assert.deepEqual(block.permissions, ['AUDITOR']);
    });
});

describe('PolicyWizardHelper.createVPGrid', () => {
    it('pushes a vp grid into the container and returns both', () => {
        const container = { children: [] };
        const [returnedContainer, vpGrid] = helper().createVPGrid(
            { role: 'USER', viewOnlyOwnDocuments: false }, 'tc-tag', container);
        assert.equal(returnedContainer, container);
        assert.equal(container.children.length, 1);
        assert.equal(container.children[0], vpGrid);
        assert.equal(vpGrid.blockType, 'interfaceDocumentsSourceBlock');
    });

    it('forwards viewOnlyOwnDocuments to the embedded addon', () => {
        const container = { children: [] };
        const [, vpGrid] = helper().createVPGrid(
            { role: 'USER', viewOnlyOwnDocuments: true }, 'tc-tag', container);
        assert.equal(vpGrid.children[0].onlyOwnDocuments, true);
    });
});
