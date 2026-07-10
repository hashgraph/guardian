import assert from 'node:assert/strict';
import { PolicyWizardHelper } from '../../dist/api/helpers/policy-wizard-helper.js';

const uuid = /^[0-9a-f-]{36}$/;
const helper = () => new PolicyWizardHelper();

describe('PolicyWizardHelper.getChooseRoleBlock', () => {
    it('excludes OWNER from the role list', () => {
        const block = helper().getChooseRoleBlock(['OWNER', 'USER', 'SR']);
        assert.deepEqual(block.roles, ['USER', 'SR']);
    });

    it('is a policyRolesBlock with NO_ROLE permission', () => {
        const block = helper().getChooseRoleBlock(['USER']);
        assert.equal(block.blockType, 'policyRolesBlock');
        assert.deepEqual(block.permissions, ['NO_ROLE']);
        assert.equal(block.tag, 'choose_role');
    });

    it('has a UUID id and choose-role uiMetaData', () => {
        const block = helper().getChooseRoleBlock(['USER']);
        assert.match(block.id, uuid);
        assert.equal(block.uiMetaData.title, 'Choose role');
    });
});

describe('PolicyWizardHelper.getRoleContainer', () => {
    it('is a tabs container scoped to the role', () => {
        const block = helper().getRoleContainer('SR');
        assert.equal(block.blockType, 'interfaceContainerBlock');
        assert.deepEqual(block.permissions, ['SR']);
        assert.equal(block.uiMetaData.type, 'tabs');
    });

    it('uses an incrementing tag', () => {
        const h = helper();
        assert.equal(h.getRoleContainer('SR').tag, 'SR_interfaceContainerBlock_1');
        assert.equal(h.getRoleContainer('SR').tag, 'SR_interfaceContainerBlock_2');
    });
});

describe('PolicyWizardHelper.getRoleStep', () => {
    it('is an active step block for the role', () => {
        const block = helper().getRoleStep('USER');
        assert.equal(block.blockType, 'interfaceStepBlock');
        assert.equal(block.defaultActive, true);
        assert.deepEqual(block.permissions, ['USER']);
    });
});

describe('PolicyWizardHelper.getTabContainer', () => {
    it('carries the title in blank uiMetaData', () => {
        const block = helper().getTabContainer('USER', 'My Tab');
        assert.equal(block.uiMetaData.type, 'blank');
        assert.equal(block.uiMetaData.title, 'My Tab');
    });
});

describe('PolicyWizardHelper.getDocumentsGrid', () => {
    it('maps field configs into credentialSubject columns plus a document button', () => {
        const block = helper().getDocumentsGrid('USER', [{ field: 'amount', title: 'Amount' }]);
        assert.equal(block.blockType, 'interfaceDocumentsSourceBlock');
        assert.equal(block.uiMetaData.fields[0].name, 'document.credentialSubject.0.amount');
        assert.equal(block.uiMetaData.fields[0].title, 'Amount');
        assert.equal(block.uiMetaData.fields.at(-1).type, 'button');
    });

    it('appends a history addon child', () => {
        const block = helper().getDocumentsGrid('USER', []);
        assert.equal(block.children.length, 1);
        assert.equal(block.children[0].blockType, 'historyAddon');
    });
});

describe('PolicyWizardHelper.getHistoryAddon', () => {
    it('is an inactive history addon for the role', () => {
        const block = helper().getHistoryAddon('USER');
        assert.equal(block.blockType, 'historyAddon');
        assert.equal(block.defaultActive, false);
        assert.deepEqual(block.permissions, ['USER']);
    });
});

describe('PolicyWizardHelper.getChangeDocumentStatusSendBlock', () => {
    it('sends to guardian with the requested status option', () => {
        const block = helper().getChangeDocumentStatusSendBlock('SR', 'Approved');
        assert.equal(block.blockType, 'sendToGuardianBlock');
        assert.deepEqual(block.options, [{ name: 'status', value: 'Approved' }]);
        assert.equal(block.dataSource, 'database');
    });
});

describe('PolicyWizardHelper.getDocumentSendBlock', () => {
    it('has no status option when approval is not needed', () => {
        const block = helper().getDocumentSendBlock('USER', false, false);
        assert.deepEqual(block.options, []);
        assert.equal(block.dataSource, 'auto');
    });

    it('adds a Waiting for approval option when approval is needed', () => {
        const block = helper().getDocumentSendBlock('USER', false, true);
        assert.deepEqual(block.options, [{ name: 'status', value: 'Waiting for approval' }]);
    });

    it('builds run events for the supplied trigger tags', () => {
        const block = helper().getDocumentSendBlock('USER', true, false, undefined, ['t1', 't2']);
        assert.equal(block.events.length, 2);
        assert.equal(block.events[0].target, 't1');
        assert.equal(block.events[0].input, 'RunEvent');
        assert.equal(block.stopPropagation, true);
    });
});

describe('PolicyWizardHelper.getDocumentsSourceAddon', () => {
    it('carries schema, filters and onlyOwnDocuments flags', () => {
        const filters = [{ field: 'type', value: 'x', type: 'equal' }];
        const block = helper().getDocumentsSourceAddon('USER', '#schema', true, filters, 'vp-documents');
        assert.equal(block.blockType, 'documentsSourceAddon');
        assert.equal(block.schema, '#schema');
        assert.equal(block.onlyOwnDocuments, true);
        assert.equal(block.dataType, 'vp-documents');
        assert.deepEqual(block.filters, filters);
    });

    it('defaults to vc-documents and no filters', () => {
        const block = helper().getDocumentsSourceAddon('USER', '#schema');
        assert.equal(block.dataType, 'vc-documents');
        assert.deepEqual(block.filters, []);
        assert.equal(block.onlyOwnDocuments, false);
    });
});

describe('PolicyWizardHelper.getDialogRequestDocumentBlock', () => {
    it('is active when there is no dependency schema', () => {
        const block = helper().getDialogRequestDocumentBlock('USER', '#s', false, 'My Schema');
        assert.equal(block.blockType, 'requestVcDocumentBlock');
        assert.equal(block.defaultActive, true);
        assert.equal(block.uiMetaData.content, 'Create My Schema');
    });

    it('is inactive and uses link style for a dependency schema', () => {
        const block = helper().getDialogRequestDocumentBlock('USER', '#s', true);
        assert.equal(block.defaultActive, false);
        assert.equal(block.uiMetaData.buttonClass, 'link');
        assert.equal(block.uiMetaData.content, 'Create');
    });
});

describe('PolicyWizardHelper.getRequestDocumentBlock', () => {
    it('is a page request bound to the schema', () => {
        const block = helper().getRequestDocumentBlock('USER', '#s');
        assert.equal(block.blockType, 'requestVcDocumentBlock');
        assert.equal(block.uiMetaData.type, 'page');
        assert.equal(block.schema, '#s');
    });
});

describe('PolicyWizardHelper.getInfoBlock', () => {
    it('renders a text information block with title and description', () => {
        const block = helper().getInfoBlock('USER', 'T', 'D');
        assert.equal(block.blockType, 'informationBlock');
        assert.equal(block.uiMetaData.title, 'T');
        assert.equal(block.uiMetaData.description, 'D');
        assert.equal(block.stopPropagation, true);
    });
});

describe('PolicyWizardHelper.getReportBlock', () => {
    it('is an empty report container', () => {
        const block = helper().getReportBlock('USER');
        assert.equal(block.blockType, 'reportBlock');
        assert.deepEqual(block.children, []);
    });
});

describe('PolicyWizardHelper.getMintBlock', () => {
    it('carries tokenId and rule with default account type', () => {
        const block = helper().getMintBlock('USER', '0.0.1', 'rule-x');
        assert.equal(block.blockType, 'mintDocumentBlock');
        assert.equal(block.tokenId, '0.0.1');
        assert.equal(block.rule, 'rule-x');
        assert.equal(block.accountType, 'default');
    });
});

describe('PolicyWizardHelper.getCreateDependencySchemaColumn', () => {
    it('is a block column bound to the target block and group', () => {
        const col = helper().getCreateDependencySchemaColumn('Title', 'bindB', 'bindG');
        assert.equal(col.type, 'block');
        assert.equal(col.title, 'Title');
        assert.equal(col.bindBlock, 'bindB');
        assert.equal(col.bindGroup, 'bindG');
    });
});

describe('PolicyWizardHelper.getSetRelationshipsBlock', () => {
    it('wraps a documents source addon with a type filter when approval is enabled', () => {
        const block = helper().getSetRelationshipsBlock('USER', '#s', true);
        assert.equal(block.blockType, 'setRelationshipsBlock');
        assert.equal(block.children.length, 1);
        assert.equal(block.children[0].filters.length, 1);
    });

    it('uses an unfiltered addon when approval is disabled', () => {
        const block = helper().getSetRelationshipsBlock('USER', '#s', false);
        assert.deepEqual(block.children[0].filters, []);
    });
});

describe('PolicyWizardHelper.addRefreshEvent', () => {
    it('appends refresh events to each block targeting the given tags', () => {
        const blocks = [{ tag: 'b1' }, { tag: 'b2', events: [{ existing: true }] }];
        helper().addRefreshEvent(blocks, ['target']);
        assert.equal(blocks[0].events.length, 1);
        assert.equal(blocks[0].events[0].source, 'b1');
        assert.equal(blocks[0].events[0].input, 'RefreshEvent');
        assert.equal(blocks[1].events.length, 2);
    });

    it('handles multiple target tags', () => {
        const blocks = [{ tag: 'b1' }];
        helper().addRefreshEvent(blocks, ['t1', 't2', 't3']);
        assert.equal(blocks[0].events.length, 3);
    });
});
