/**
 * ACM0010 VVB workflow and permission regression.
 *
 * Read-only. Verifies that the packaged ACM0010.policy exposes the VVB
 * verification workflow with least-privilege permissions:
 *   - the VVB stage and every block beneath it are VVB-only;
 *   - VVB navigation resolves to existing VVB blocks;
 *   - VVB cannot reach Project Proponent submission/calculation blocks;
 *   - VVB document sources read monitoring reports only;
 *   - the Project Proponent keeps the "assign VVB" action.
 *
 * Zero dependencies. Helpers are reused from ./_artifact.mjs.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { loadSlicePolicy, walkBlocks } from './_artifact.mjs';

const { policy } = loadSlicePolicy();

const VVB_STAGE = 'acm0010_stage_vvb';
const VVB_VERIFY = 'acm0010_vvb_verify_report';
const VVB_NAV_STEPS = [
    'acm0010_vvb_verify_report',
    'acm0010_vvb_report_verified',
    'acm0010_vvb_report_rejected',
];

function blocksByTag() {
    const map = new Map();
    walkBlocks(policy.config, (n) => {
        if (n.tag) map.set(n.tag, n);
    });
    return map;
}

const byTag = blocksByTag();
const vvbStage = byTag.get(VVB_STAGE);

function collectSubtree(root) {
    const nodes = [];
    walkBlocks(root, (n) => nodes.push(n));
    return nodes;
}

// ---------------------------------------------------------------------------
// Stage and permission boundary
// ---------------------------------------------------------------------------

test('the VVB stage exists and is VVB-only', () => {
    assert.ok(vvbStage, 'VVB stage must exist');
    assert.equal(vvbStage.blockType, 'interfaceContainerBlock');
    assert.deepEqual(vvbStage.permissions, ['VVB']);
});

test('every block beneath the VVB stage is VVB-only', () => {
    const nodes = collectSubtree(vvbStage);
    assert.ok(nodes.length > 0, 'VVB stage must contain blocks');
    for (const node of nodes) {
        assert.deepEqual(node.permissions, ['VVB'],
            `VVB block ${node.tag} must be restricted to VVB, got ${JSON.stringify(node.permissions)}`);
    }
});

test('no VVB block is granted to Project Proponent or ANY_ROLE', () => {
    for (const node of collectSubtree(vvbStage)) {
        assert.ok(!node.permissions.includes('Project Proponent'),
            `VVB block ${node.tag} must not grant Project Proponent`);
        assert.ok(!node.permissions.includes('ANY_ROLE'),
            `VVB block ${node.tag} must not grant ANY_ROLE`);
    }
});

test('non-VVB Project Proponent blocks never grant VVB', () => {
    walkBlocks(policy.config, (n) => {
        if (!n.tag || n.tag === VVB_STAGE) return;
        const insideVvb = collectSubtree(vvbStage).includes(n);
        if (insideVvb) return;
        if (Array.isArray(n.permissions) && n.permissions.includes('VVB')) {
            assert.fail(`block ${n.tag} outside the VVB stage grants VVB`);
        }
    });
});

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

test('VVB navigation exposes the verify/verified/rejected workflow', () => {
    const vvb = (policy.policyNavigation || []).find((r) => r.role === 'VVB');
    assert.ok(vvb, 'VVB navigation entry must exist');
    const blocks = (vvb.steps || []).map((s) => s.block);
    for (const tag of VVB_NAV_STEPS) {
        assert.ok(blocks.includes(tag), `VVB navigation must reference ${tag}`);
    }
});

test('every VVB navigation target exists and is VVB-only', () => {
    const vvb = (policy.policyNavigation || []).find((r) => r.role === 'VVB');
    for (const step of vvb.steps || []) {
        const node = byTag.get(step.block);
        assert.ok(node, `VVB navigation target ${step.block} must exist`);
        assert.deepEqual(node.permissions, ['VVB'],
            `VVB navigation target ${step.block} must be VVB-only`);
    }
});

test('Project Proponent navigation does not expose the VVB stage or its blocks', () => {
    const pp = (policy.policyNavigation || []).find((r) => r.role === 'Project Proponent');
    assert.ok(pp, 'Project Proponent navigation must exist');
    const referenced = new Set((pp.steps || []).map((s) => s.block));
    assert.ok(!referenced.has(VVB_STAGE), 'PP navigation must not expose the VVB stage');
    for (const node of collectSubtree(vvbStage)) {
        assert.ok(!referenced.has(node.tag), `PP navigation must not expose VVB block ${node.tag}`);
    }
});

test('VVB navigation does not expose Project Proponent submission or calculation blocks', () => {
    const vvb = (policy.policyNavigation || []).find((r) => r.role === 'VVB');
    const referenced = new Set((vvb.steps || []).map((s) => s.block));
    for (const tag of ['acm0010_project_description', 'acm0010_calculation_record', 'acm0010_monitoring_report']) {
        assert.ok(!referenced.has(tag), `VVB navigation must not expose PP block ${tag}`);
    }
});

// ---------------------------------------------------------------------------
// Verification document flow
// ---------------------------------------------------------------------------

test('VVB status sources read monitoring reports, filter options read project descriptions', () => {
    const sources = collectSubtree(vvbStage).filter((n) => n.blockType === 'documentsSourceAddon');
    const statusSources = sources.filter((s) => /^acm0010_vvb_(waiting|verified|rejected)_reports$/.test(s.tag));
    assert.equal(statusSources.length, 3, 'VVB stage must expose the three status sources');
    for (const source of statusSources) {
        assert.equal(source.schema, '#monitoring-report',
            `VVB source ${source.tag} must read #monitoring-report`);
    }
    const optionSources = sources.filter((s) => s.tag === 'acm0010_vvb_project_filter_source');
    assert.equal(optionSources.length, 1, 'the project filter must have one option source');
    assert.equal(optionSources[0].schema, '#project-description',
        'the project filter options must come from project descriptions');
});

test('VVB stage has waiting, verified and rejected groups, a project filter and history', () => {
    const tags = collectSubtree(vvbStage).map((n) => n.tag);
    for (const tag of [
        'acm0010_vvb_waiting_reports', 'acm0010_vvb_verified_reports',
        'acm0010_vvb_rejected_reports', 'acm0010_vvb_project_filter',
        'acm0010_vvb_history',
    ]) {
        assert.ok(tags.includes(tag), `VVB stage must expose ${tag}`);
    }
});

test('VVB stage exposes verify, approve and save decisions', () => {
    assert.ok(byTag.get(VVB_VERIFY), 'VVB verify container must exist');
    const approve = byTag.get('acm0010_vvb_approve_report_btn');
    const saveVerified = byTag.get('acm0010_vvb_save_verified_report');
    const saveRejected = byTag.get('acm0010_vvb_save_rejected_report');
    assert.equal(approve && approve.blockType, 'buttonBlock');
    assert.equal(saveVerified && saveVerified.blockType, 'sendToGuardianBlock');
    assert.equal(saveRejected && saveRejected.blockType, 'sendToGuardianBlock');
    assert.ok(byTag.get('acm0010_vvb_report_verified'), 'verified report block must exist');
    assert.ok(byTag.get('acm0010_vvb_report_rejected'), 'rejected report block must exist');
});

test('Project Proponent retains the monitoring-report VVB assignment action', () => {
    const assign = byTag.get('acm0010_mr_assign_vvb');
    assert.ok(assign, 'assign-VVB action must exist for the Project Proponent');
    assert.deepEqual(assign.permissions, ['Project Proponent']);
    assert.equal(assign.blockType, 'interfaceActionBlock');
});

// ---------------------------------------------------------------------------
// Role access simulation (permission arrays, no runtime required)
// ---------------------------------------------------------------------------

function accessibleBy(role, node) {
    const permissions = node.permissions || [];
    return permissions.includes(role) || permissions.includes('ANY_ROLE');
}

function allBlocks() {
    const nodes = [];
    walkBlocks(policy.config, (n) => nodes.push(n));
    return nodes;
}

test('VVB access cannot reach any Project Proponent operation block', () => {
    const ppOps = allBlocks().filter((n) =>
        n.blockType !== 'interfaceContainerBlock' &&
        Array.isArray(n.permissions) &&
        n.permissions.includes('Project Proponent'));
    assert.ok(ppOps.length > 0, 'Project Proponent operation blocks must exist');
    for (const node of ppOps) {
        assert.ok(!accessibleBy('VVB', node),
            `VVB must not access Project Proponent block ${node.tag}`);
    }
});

test('Project Proponent access cannot reach any VVB verification or decision block', () => {
    const vvbBlocks = allBlocks().filter((n) =>
        Array.isArray(n.permissions) && n.permissions.includes('VVB'));
    assert.ok(vvbBlocks.length > 0, 'VVB blocks must exist');
    for (const node of vvbBlocks) {
        assert.ok(!accessibleBy('Project Proponent', node),
            `Project Proponent must not access VVB block ${node.tag}`);
    }
});

test('VVB access reaches its own verification and decision operations', () => {
    for (const tag of [
        'acm0010_vvb_verify_report',
        'acm0010_vvb_approve_report_btn',
        'acm0010_vvb_save_verified_report',
        'acm0010_vvb_save_rejected_report',
    ]) {
        const node = byTag.get(tag);
        assert.ok(node && accessibleBy('VVB', node), `VVB must be able to access ${tag}`);
    }
});
