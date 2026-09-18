import { assert } from 'chai';
import { PolicyModule } from '../../../dist/entity/module.js';
import { PolicyTool } from '../../../dist/entity/tool.js';
import { Policy } from '../../../dist/entity/policy.js';
import { PolicyAction } from '../../../dist/entity/policy-action.js';
import { Artifact } from '../../../dist/entity/artifact.js';
import { ExternalPolicy } from '../../../dist/entity/external-policy.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe('PolicyModule.setDefaults (no config)', () => {
    it('sets status/uuid/codeVersion/type defaults', async () => {
        const m = new PolicyModule();
        await m.setDefaults();
        assert.equal(m.status, 'DRAFT');
        assert.match(m.uuid, UUID_RE);
        assert.equal(m.codeVersion, '1.0.0');
        assert.equal(m.type, 'CUSTOM');
    });

    it('preserves provided fields', async () => {
        const m = new PolicyModule();
        m.status = 'PUBLISHED';
        m.uuid = 'fixed';
        m.codeVersion = '2.0.0';
        m.type = 'PRESET';
        await m.setDefaults();
        assert.equal(m.status, 'PUBLISHED');
        assert.equal(m.uuid, 'fixed');
        assert.equal(m.codeVersion, '2.0.0');
        assert.equal(m.type, 'PRESET');
    });
});

describe('PolicyTool.setDefaults (no config)', () => {
    it('sets status/uuid/codeVersion defaults', async () => {
        const t = new PolicyTool();
        await t.setDefaults();
        assert.equal(t.status, 'DRAFT');
        assert.match(t.uuid, UUID_RE);
        assert.equal(t.codeVersion, '1.0.0');
    });
});

describe('Policy.setDefaults (no config)', () => {
    it('sets location/status/availability/uuid/codeVersion defaults', async () => {
        const p = new Policy();
        await p.setDefaults();
        assert.equal(p.locationType, 'local');
        assert.equal(p.status, 'DRAFT');
        assert.equal(p.availability, 'private');
        assert.match(p.uuid, UUID_RE);
        assert.equal(p.codeVersion, '1.0.0');
    });

    it('clears registeredUsers', async () => {
        const p = new Policy();
        p.registeredUsers = { a: 1 };
        await p.setDefaults();
        assert.isUndefined(p.registeredUsers);
    });

    it('preserves provided status/availability', async () => {
        const p = new Policy();
        p.status = 'PUBLISH';
        p.availability = 'public';
        await p.setDefaults();
        assert.equal(p.status, 'PUBLISH');
        assert.equal(p.availability, 'public');
    });
});

describe('PolicyAction.setDefaults (no document)', () => {
    it('sets uuid/status and mirrors lastStatus from status', async () => {
        const a = new PolicyAction();
        await a.setDefaults();
        assert.match(a.uuid, UUID_RE);
        assert.equal(a.status, 'NEW');
        assert.equal(a.lastStatus, 'NEW');
    });

    it('keeps an explicit lastStatus', async () => {
        const a = new PolicyAction();
        a.status = 'COMPLETED';
        a.lastStatus = 'NEW';
        await a.setDefaults();
        assert.equal(a.status, 'COMPLETED');
        assert.equal(a.lastStatus, 'NEW');
    });
});

describe('Artifact.setDefaults', () => {
    it('generates a uuid when missing', () => {
        const a = new Artifact();
        a.setDefaults();
        assert.match(a.uuid, UUID_RE);
    });

    it('keeps an existing uuid', () => {
        const a = new Artifact();
        a.uuid = 'keep';
        a.setDefaults();
        assert.equal(a.uuid, 'keep');
    });
});

describe('ExternalPolicy.setDefaults', () => {
    it('sets NEW status when missing', () => {
        const e = new ExternalPolicy();
        e.setDefaults();
        assert.equal(e.status, 'NEW');
    });

    it('keeps an existing status', () => {
        const e = new ExternalPolicy();
        e.status = 'APPROVED';
        e.setDefaults();
        assert.equal(e.status, 'APPROVED');
    });
});
