/**
 * Guardian block-validator parity for the packaged ACM0010 policy.
 *
 * These assertions mirror the required options enforced by the real Guardian
 * validators in policy-service/src/policy-engine/block-validators/blocks/*.ts.
 * A policy that fails these would be rejected on import even though its JSON
 * is syntactically valid.
 *
 * Read-only, zero dependencies.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { loadSlicePolicy, walkBlocks } from './_artifact.mjs';

const { policy } = loadSlicePolicy();

const nodes = [];
walkBlocks(policy.config, (n) => nodes.push(n));

const byType = (type) => nodes.filter((n) => n.blockType === type);
const tags = new Set(nodes.map((n) => n.tag).filter(Boolean));

const NOTIFICATION_TYPES = ['INFO', 'ERROR', 'WARN', 'SUCCESS'];
const USER_OPTIONS = [
    'ALL', 'CURRENT', 'OWNER', 'DOCUMENT_OWNER',
    'DOCUMENT_ISSUER', 'GROUP_OWNER', 'ROLE',
];
const SOURCE_DATA_TYPES = [
    'vc-documents', 'did-documents', 'vp-documents', 'root-authorities',
    'standard-registries', 'approve', 'source',
];

test('filtersAddon blocks satisfy the Guardian filters validator', () => {
    const filters = byType('filtersAddon');
    assert.ok(filters.length >= 2, 'all filtersAddon blocks must be present');
    for (const block of filters) {
        assert.ok(block.uiMetaData && typeof block.uiMetaData === 'object',
            `${block.tag}: uiMetaData must be an object`);
        assert.ok(['dropdown', 'datepicker', 'input'].includes(block.type),
            `${block.tag}: type must be dropdown|datepicker|input`);
        if (block.type === 'dropdown') {
            for (const key of ['field', 'optionName', 'optionValue']) {
                assert.equal(typeof block[key], 'string',
                    `${block.tag}: dropdown requires ${key}`);
                assert.ok(block[key].length > 0, `${block.tag}: ${key} must not be empty`);
            }
        }
    }
});

test('buttonBlock satisfies the Guardian button validator', () => {
    const buttons = byType('buttonBlock');
    assert.ok(buttons.length >= 1);
    for (const block of buttons) {
        assert.ok(block.uiMetaData && typeof block.uiMetaData === 'object',
            `${block.tag}: uiMetaData must be an object`);
        assert.ok(Array.isArray(block.uiMetaData.buttons),
            `${block.tag}: uiMetaData.buttons must be an array`);
        assert.ok(block.uiMetaData.buttons.length > 0,
            `${block.tag}: at least one button is required`);
        for (const button of block.uiMetaData.buttons) {
            assert.ok(button.tag, `${block.tag}: button tag required`);
            assert.ok(Array.isArray(button.filters),
                `${block.tag}/${button.tag}: filters must be an array`);
            assert.ok(['selector', 'selector-dialog'].includes(button.type),
                `${block.tag}/${button.tag}: invalid button type`);
            if (button.type === 'selector-dialog') {
                assert.ok(button.title, `${block.tag}/${button.tag}: title required`);
                assert.ok(button.description, `${block.tag}/${button.tag}: description required`);
            }
        }
    }
});

test('button events resolve to real targets and declared button outputs', () => {
    for (const block of byType('buttonBlock')) {
        const outputs = new Set((block.uiMetaData.buttons || []).map((b) => b.tag));
        for (const event of block.events || []) {
            assert.equal(event.source, block.tag, `${block.tag}: event source must be itself`);
            assert.ok(tags.has(event.target), `${block.tag}: event target ${event.target} missing`);
            assert.equal(event.input, 'RunEvent', `${block.tag}: event input must be RunEvent`);
            assert.ok(outputs.has(event.output),
                `${block.tag}: event output ${event.output} is not a declared button`);
            assert.equal(event.disabled, false, `${block.tag}: event must be enabled`);
        }
    }
});

test('interfaceActionBlock satisfies the Guardian action validator', () => {
    for (const block of byType('interfaceActionBlock')) {
        assert.ok(block.type, `${block.tag}: type is required`);
        if (block.type === 'selector') {
            assert.ok(block.uiMetaData && typeof block.uiMetaData === 'object',
                `${block.tag}: uiMetaData required`);
            assert.ok(block.field, `${block.tag}: field required`);
            assert.ok(Array.isArray(block.uiMetaData.options),
                `${block.tag}: uiMetaData.options must be an array`);
            const optionTags = block.uiMetaData.options.map((o) => o.tag);
            assert.equal(new Set(optionTags).size, optionTags.length,
                `${block.tag}: option tags must be unique`);
        }
        if (block.type === 'dropdown') {
            assert.ok(block.name, `${block.tag}: dropdown name required`);
            assert.ok(block.value, `${block.tag}: dropdown value required`);
        }
    }
});

test('switchBlock satisfies the Guardian switch validator', () => {
    for (const block of byType('switchBlock')) {
        assert.ok(['firstTrue', 'allTrue'].includes(block.executionFlow),
            `${block.tag}: invalid executionFlow`);
        assert.ok(Array.isArray(block.conditions), `${block.tag}: conditions must be an array`);
        const conditionTags = [];
        for (const condition of block.conditions) {
            assert.ok(['equal', 'not_equal', 'unconditional'].includes(condition.type),
                `${block.tag}: invalid condition type`);
            if (condition.type !== 'unconditional') {
                assert.ok(condition.value, `${block.tag}: condition value required`);
            }
            assert.ok(condition.tag, `${block.tag}: condition tag required`);
            conditionTags.push(condition.tag);
        }
        assert.equal(new Set(conditionTags).size, conditionTags.length,
            `${block.tag}: condition tags must be unique`);
    }
});

test('notificationBlock satisfies the Guardian notification validator', () => {
    for (const block of byType('notificationBlock')) {
        assert.ok(block.title, `${block.tag}: title required`);
        assert.ok(block.message, `${block.tag}: message required`);
        assert.ok(NOTIFICATION_TYPES.includes(block.type),
            `${block.tag}: invalid notification type`);
        assert.ok(USER_OPTIONS.includes(block.user), `${block.tag}: invalid user option`);
        if (block.user === 'ROLE') {
            assert.ok(block.role, `${block.tag}: role required for ROLE notifications`);
        }
    }
});

test('sendToGuardianBlock satisfies the Guardian send validator', () => {
    const sends = byType('sendToGuardianBlock');
    assert.ok(sends.length >= 3, 'expected the PP and VVB save blocks');
    for (const block of sends) {
        if (block.dataType) {
            assert.ok(['vc-documents', 'did-documents', 'approve', 'hedera'].includes(block.dataType),
                `${block.tag}: invalid dataType`);
        } else {
            assert.ok(['auto', 'database', 'hedera'].includes(block.dataSource),
                `${block.tag}: dataSource must be auto|database|hedera`);
        }
    }
});

test('documentsSourceAddon blocks satisfy the Guardian source validator', () => {
    for (const block of byType('documentsSourceAddon')) {
        assert.ok(SOURCE_DATA_TYPES.includes(block.dataType),
            `${block.tag}: invalid dataType ${block.dataType}`);
        assert.ok(typeof block.schema === 'string' && block.schema.startsWith('#'),
            `${block.tag}: schema must be an IRI`);
    }
});

test('requestVcDocumentBlock and revocationBlock satisfy their validators', () => {
    for (const block of byType('requestVcDocumentBlock')) {
        assert.ok(typeof block.schema === 'string' && block.schema.startsWith('#'),
            `${block.tag}: request schema required`);
    }
    for (const block of byType('revocationBlock')) {
        if (block.updatePrevDoc) {
            assert.ok(block.prevDocStatus, `${block.tag}: prevDocStatus required`);
        }
    }
});

test('grid operation bindings resolve to existing blocks', () => {
    for (const block of byType('interfaceDocumentsSourceBlock')) {
        for (const field of (block.uiMetaData && block.uiMetaData.fields) || []) {
            if (field.bindBlock) {
                assert.ok(tags.has(field.bindBlock),
                    `${block.tag}: bindBlock ${field.bindBlock} does not exist`);
            }
        }
        for (const dependency of block.dependencies || []) {
            assert.ok(tags.has(dependency),
                `${block.tag}: dependency ${dependency} does not exist`);
        }
    }
});
