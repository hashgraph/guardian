import { assert } from 'chai';
import { Token } from '../../../dist/entity/token.js';
import { PolicyRoles } from '../../../dist/entity/policy-roles.js';
import { PolicyInvitations } from '../../../dist/entity/policy-invitations.js';
import { Schema } from '../../../dist/entity/schema.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe('Token.createDocument', () => {
    it('computes propHash and empty docHash', async () => {
        const t = new Token();
        t.tokenId = '0.0.1';
        t.tokenName = 'T';
        await t.createDocument();
        assert.equal(t._propHash.length, 32);
        assert.equal(t._docHash, '');
    });

    it('hash reflects a property change', async () => {
        const t = new Token();
        t.tokenName = 'A';
        await t.createDocument();
        const before = t._propHash;
        t.tokenName = 'B';
        await t.createDocument();
        assert.notEqual(t._propHash, before);
    });
});

describe('PolicyRoles.createDocument', () => {
    it('defaults active to true and computes hashes', async () => {
        const r = new PolicyRoles();
        await r.createDocument();
        assert.equal(r.active, true);
        assert.equal(r._propHash.length, 32);
        assert.equal(r._docHash, '');
    });

    it('respects active === false', async () => {
        const r = new PolicyRoles();
        r.active = false;
        await r.createDocument();
        assert.equal(r.active, false);
    });
});

describe('PolicyInvitations.createDocument', () => {
    it('defaults active to true and computes hashes', async () => {
        const i = new PolicyInvitations();
        await i.createDocument();
        assert.equal(i.active, true);
        assert.equal(i._propHash.length, 32);
        assert.equal(i._docHash, '');
    });

    it('respects active === false', async () => {
        const i = new PolicyInvitations();
        i.active = false;
        await i.createDocument();
        assert.equal(i.active, false);
    });
});

describe('Schema.setDefaults (no document/context)', () => {
    it('applies entity/status/uuid/iri defaults', async () => {
        const s = new Schema();
        await s.setDefaults();
        assert.equal(s.entity, 'NONE');
        assert.equal(s.status, 'DRAFT');
        assert.match(s.uuid, UUID_RE);
        assert.equal(s.iri, s.uuid);
        assert.equal(s.readonly, false);
        assert.equal(s.system, false);
        assert.equal(s.active, false);
        assert.equal(s.codeVersion, '1.2.0');
    });

    it('nulls messageId for DRAFT status', async () => {
        const s = new Schema();
        s.messageId = 'm-1';
        await s.setDefaults();
        assert.isNull(s.messageId);
    });

    it('category defaults to POLICY when not readonly', async () => {
        const s = new Schema();
        await s.setDefaults();
        assert.equal(s.category, 'POLICY');
    });

    it('category defaults to SYSTEM when readonly', async () => {
        const s = new Schema();
        s.readonly = true;
        await s.setDefaults();
        assert.equal(s.category, 'SYSTEM');
    });

    it('keeps an explicit iri', async () => {
        const s = new Schema();
        s.iri = '#custom';
        await s.setDefaults();
        assert.equal(s.iri, '#custom');
    });
});
