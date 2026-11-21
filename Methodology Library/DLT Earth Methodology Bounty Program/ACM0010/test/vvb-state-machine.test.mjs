/**
 * ACM0010 VVB state-machine wiring.
 *
 * Proves the submission -> assignment -> verification/rejection -> save path is
 * actually connected, not just that the blocks exist:
 *
 *   PP request block --RunEvent--> PP save (status "Waiting for Verification")
 *   VVB approve button --Button_0--> save verified (status "Verified")
 *                      --Button_1--> save rejected (status "REJECTED")
 *   each status source filters the matching option.status value.
 *
 * Read-only, zero dependencies.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { loadSlicePolicy, walkBlocks } from './_artifact.mjs';

const { policy, schemas } = loadSlicePolicy();

const byTag = new Map();
walkBlocks(policy.config, (n) => {
    if (n.tag) byTag.set(n.tag, n);
});

const get = (tag) => {
    const node = byTag.get(tag);
    assert.ok(node, `block ${tag} must exist`);
    return node;
};

const statusFilter = (block) => {
    const filter = (block.filters || []).find((f) => f.field === 'option.status');
    assert.ok(filter, `${block.tag}: must filter on option.status`);
    return filter;
};

const statusOption = (block) => {
    const option = (block.options || []).find((o) => o.name === 'status');
    assert.ok(option, `${block.tag}: must set status`);
    return option;
};

// ---------------------------------------------------------------------------
// PP submission enters the VVB queue
// ---------------------------------------------------------------------------

test('the Project Proponent submission saves the report as waiting for verification', () => {
    const save = get('acm0010_mr_save_report');
    assert.equal(save.blockType, 'sendToGuardianBlock');
    assert.equal(statusOption(save).value, 'Waiting for Verification');
    assert.equal(save.dataType, '');
    assert.equal(save.entityType, 'report');
    assert.equal(save.dataSource, 'database');
    assert.equal(save.documentType, 'vc');
    assert.deepEqual(save.permissions, ['Project Proponent']);
});

test('the monitoring request block triggers the PP save on submit', () => {
    const request = get('acm0010_monitoring_report');
    const event = (request.events || []).find((e) => e.target === 'acm0010_mr_save_report');
    assert.ok(event, 'request block must target the save block');
    assert.equal(event.source, 'acm0010_monitoring_report');
    assert.equal(event.input, 'RunEvent');
    assert.equal(event.output, 'RunEvent');
});

test('the VVB waiting queue filters exactly the submitted status', () => {
    const source = get('acm0010_vvb_waiting_reports');
    const filter = statusFilter(source);
    assert.equal(filter.value, 'Waiting for Verification');
    assert.equal(filter.type, 'equal');
    assert.equal(source.onlyAssignDocuments, true);
});

test('the VVB grid exposes status sources as direct children (runtime fetch path)', () => {
    const grid = get('acm0010_vvb_report_grid');
    const childTags = (grid.children || []).map((child) => child.tag);
    for (const tag of [
        'acm0010_vvb_waiting_reports',
        'acm0010_vvb_verified_reports',
        'acm0010_vvb_rejected_reports',
    ]) {
        assert.ok(childTags.includes(tag),
            `${tag} must be a direct child of the grid, not nested under an addon`);
    }
    const filter = (grid.children || []).find((child) => child.tag === 'acm0010_vvb_project_filter');
    assert.ok(filter, 'the grid must expose a project filter');
    const optionSource = (filter.children || []).find(
        (child) => child.tag === 'acm0010_vvb_project_filter_source'
    );
    assert.ok(optionSource, 'the project filter must declare its option source');
    assert.equal(optionSource.schema, '#project-description');
});

test('the Project Proponent VVB assignment persists assignedTo through DropdownEvent', () => {
    const assign = get('acm0010_mr_assign_vvb');
    assert.equal(assign.bindBlock, 'acm0010_mr_save_assign_vvb');
    const event = (assign.events || []).find(
        (e) => e.target === 'acm0010_mr_save_assign_vvb'
    );
    assert.ok(event, 'assignment must target its persistence block');
    assert.equal(event.input, 'RunEvent');
    assert.equal(event.output, 'DropdownEvent');
    const save = get('acm0010_mr_save_assign_vvb');
    assert.equal(save.blockType, 'sendToGuardianBlock');
    assert.equal(save.entityType, 'report');
    assert.equal(save.dataSource, 'database');
    assert.equal(save.documentType, 'vc');
    assert.equal(save.stopPropagation, true);
    assert.deepEqual(save.permissions, ['Project Proponent']);
    const refresh = (save.events || []).find(
        (e) => e.target === 'acm0010_vvb_report_grid'
    );
    assert.ok(refresh, 'assignment save must refresh the VVB grid');
    assert.equal(refresh.output, 'RefreshEvent');
});

// ---------------------------------------------------------------------------
// VVB decisions
// ---------------------------------------------------------------------------

test('the approval button exposes verify and reject decisions', () => {
    const button = get('acm0010_vvb_approve_report_btn');
    const buttons = button.uiMetaData.buttons;
    assert.equal(buttons.length, 2);

    const verify = buttons.find((b) => b.tag === 'Button_0');
    const reject = buttons.find((b) => b.tag === 'Button_1');
    assert.ok(verify && reject);

    assert.equal(verify.type, 'selector');
    assert.equal(verify.field, 'option.status');
    assert.equal(verify.value, 'Verified');

    assert.equal(reject.type, 'selector-dialog');
    assert.equal(reject.field, 'option.status');
    assert.equal(reject.value, 'REJECTED');
});

test('verify and reject map to the matching save blocks', () => {
    const button = get('acm0010_vvb_approve_report_btn');
    const events = button.events || [];

    const verify = events.find((e) => e.output === 'Button_0');
    const reject = events.find((e) => e.output === 'Button_1');
    assert.ok(verify && reject);

    assert.equal(verify.target, 'acm0010_vvb_save_verified_report');
    assert.equal(reject.target, 'acm0010_vvb_save_rejected_report');
    for (const event of events) {
        assert.equal(event.source, 'acm0010_vvb_approve_report_btn');
        assert.equal(event.input, 'RunEvent');
    }
});

test('the verified save block persists a verified report', () => {
    const save = get('acm0010_vvb_save_verified_report');
    assert.equal(save.blockType, 'sendToGuardianBlock');
    assert.equal(statusOption(save).value, 'Verified');
    assert.equal(save.dataType, '');
    assert.equal(save.entityType, 'report');
    assert.equal(save.dataSource, 'database');
    assert.equal(save.documentType, 'vc');
    assert.deepEqual(save.permissions, ['VVB']);
});

test('the rejected save block persists a rejected report', () => {
    const save = get('acm0010_vvb_save_rejected_report');
    assert.equal(save.blockType, 'sendToGuardianBlock');
    assert.equal(statusOption(save).value, 'REJECTED');
    assert.equal(save.dataType, '');
    assert.equal(save.entityType, 'report');
    assert.equal(save.dataSource, 'database');
    assert.equal(save.documentType, 'vc');
    assert.deepEqual(save.permissions, ['VVB']);
});

test('verified and rejected queues filter the decision statuses', () => {
    assert.equal(statusFilter(get('acm0010_vvb_verified_reports')).value, 'Verified');
    assert.equal(statusFilter(get('acm0010_vvb_rejected_reports')).value, 'REJECTED');
});

test('the VVB grid binds the operation button and refreshes on both saves', () => {
    const grid = get('acm0010_vvb_report_grid');
    const operation = grid.uiMetaData.fields.find(
        (f) => f.type === 'block' && f.bindBlock === 'acm0010_vvb_approve_report_btn');
    assert.ok(operation, 'grid must bind the approve button');
    assert.equal(operation.bindGroup, 'acm0010_vvb_waiting_reports');

    for (const dependency of [
        'acm0010_vvb_save_verified_report',
        'acm0010_vvb_save_rejected_report',
    ]) {
        assert.ok((grid.dependencies || []).includes(dependency),
            `grid must depend on ${dependency}`);
    }
});

// ---------------------------------------------------------------------------
// Assignment
// ---------------------------------------------------------------------------

test('the Project Proponent assigns a VVB from the packaged VVB registry schema', () => {
    const assign = get('acm0010_mr_assign_vvb');
    assert.equal(assign.type, 'dropdown');
    assert.equal(assign.field, 'assignedTo');
    assert.equal(assign.name, 'document.credentialSubject.0.field0');
    assert.equal(assign.value, 'document.credentialSubject.0.id');
    assert.deepEqual(assign.permissions, ['Project Proponent']);

    const source = (assign.children || []).find((c) => c.blockType === 'documentsSourceAddon');
    assert.ok(source, 'assign action must have a document source');
    assert.equal(source.schema, '#vvb');
    const approved = (source.filters || []).find((f) => f.field === 'option.status');
    assert.ok(approved, 'the VVB assignment source must filter on option.status');
    assert.equal(approved.value, 'APPROVED');
    assert.equal(approved.type, 'equal');
});

test('the packaged VVB schema declares the assignment fields', () => {
    const schema = schemas.get('#vvb');
    assert.ok(schema, 'schemas/#vvb must be packaged');
    const subject = schema.document.$defs['#vvb-subject'];
    assert.ok(subject, 'VVB schema must define a credentialSubject item');
    for (const field of ['id', 'field0']) {
        assert.ok(subject.properties[field], `VVB schema must declare ${field}`);
        assert.ok(subject.required.includes(field), `VVB schema must require ${field}`);
    }
});

// ---------------------------------------------------------------------------
// Negative boundaries
// ---------------------------------------------------------------------------

test('the Project Proponent cannot execute VVB decisions', () => {
    for (const tag of [
        'acm0010_vvb_approve_report_btn',
        'acm0010_vvb_save_verified_report',
        'acm0010_vvb_save_rejected_report',
    ]) {
        assert.ok(!get(tag).permissions.includes('Project Proponent'),
            `PP must not access ${tag}`);
    }
});

test('the VVB cannot submit or assign reports', () => {
    for (const tag of ['acm0010_monitoring_report', 'acm0010_mr_save_report', 'acm0010_mr_assign_vvb']) {
        assert.ok(!get(tag).permissions.includes('VVB'), `VVB must not access ${tag}`);
    }
});
