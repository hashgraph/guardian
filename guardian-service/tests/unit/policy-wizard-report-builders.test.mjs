import assert from 'node:assert/strict';
import { PolicyWizardHelper } from '../../dist/api/helpers/policy-wizard-helper.js';

const helper = () => new PolicyWizardHelper();

describe('PolicyWizardHelper.getApproveRejectButtonsBlock', () => {
    it('is a button block with Approve and Reject buttons', () => {
        const block = helper().getApproveRejectButtonsBlock('SR', 'approveTag', 'rejectTag');
        assert.equal(block.blockType, 'buttonBlock');
        assert.equal(block.uiMetaData.buttons.length, 2);
        assert.equal(block.uiMetaData.buttons[0].name, 'Approve');
        assert.equal(block.uiMetaData.buttons[1].name, 'Reject');
    });

    it('wires run events to the approve and reject targets', () => {
        const block = helper().getApproveRejectButtonsBlock('SR', 'approveTag', 'rejectTag');
        assert.equal(block.events[0].target, 'approveTag');
        assert.equal(block.events[0].output, 'Button_0');
        assert.equal(block.events[1].target, 'rejectTag');
        assert.equal(block.events[1].output, 'Button_1');
    });
});

describe('PolicyWizardHelper.getApproveRejectField', () => {
    it('is an operation block field bound to the block and group', () => {
        const field = helper().getApproveRejectField('bindB', 'bindG');
        assert.equal(field.name, 'option.status');
        assert.equal(field.type, 'block');
        assert.equal(field.bindBlock, 'bindB');
        assert.equal(field.bindGroup, 'bindG');
        assert.equal(field.width, '250px');
    });
});

describe('PolicyWizardHelper.getReportMintItem', () => {
    it('is a report item filtered on the action id', () => {
        const block = helper().getReportMintItem('USER');
        assert.equal(block.blockType, 'reportItemBlock');
        assert.equal(block.title, 'Token');
        assert.equal(block.filters[0].value, 'actionId');
        assert.equal(block.visible, true);
    });
});

describe('PolicyWizardHelper.getReportFirstItem', () => {
    it('returns the block plus a generated variable name', () => {
        const [block, variableName] = helper().getReportFirstItem('USER', 'T', 'D');
        assert.equal(block.blockType, 'reportItemBlock');
        assert.equal(block.title, 'T');
        assert.equal(block.description, 'D');
        assert.match(variableName, /^[0-9a-f-]{36}$/);
        assert.equal(block.variables[0].name, variableName);
    });

    it('filters on documentId', () => {
        const [block] = helper().getReportFirstItem('USER', 'T', 'D');
        assert.equal(block.filters[0].value, 'documentId');
    });
});

describe('PolicyWizardHelper.getReportItem', () => {
    it('filters on the supplied relationships variable name with an "in" match', () => {
        const [block, variableName] = helper().getReportItem('USER', 'T', 'D', 'relVar');
        assert.equal(block.filters[0].type, 'in');
        assert.equal(block.filters[0].value, 'relVar');
        assert.match(variableName, /^[0-9a-f-]{36}$/);
    });

    it('exposes its own generated relationships variable', () => {
        const [block, variableName] = helper().getReportItem('USER', 'T', 'D', 'relVar');
        assert.equal(block.variables[0].name, variableName);
        assert.equal(block.variables[0].value, 'relationships');
    });
});
