import assert from 'node:assert/strict';
import { DocumentStatus } from '../dist/type/document-status.type.js';
import { DidDocumentStatus } from '../dist/type/did-status.type.js';
import { ApproveStatus } from '../dist/type/approve-status.type.js';
import { SchemaStatus } from '../dist/type/schema-status.type.js';

const enums = {
    DocumentStatus,
    DidDocumentStatus,
    ApproveStatus,
    SchemaStatus,
};

describe('document-state enums — key/value identity', () => {
    for (const [name, e] of Object.entries(enums)) {
        it(`${name} maps every key to a string value equal to the key`, () => {
            for (const [k, v] of Object.entries(e)) {
                assert.equal(typeof v, 'string');
                assert.equal(k, v);
            }
        });
    }
});

describe('document-state enums — value uniqueness', () => {
    for (const [name, e] of Object.entries(enums)) {
        it(`${name} has no duplicate values`, () => {
            const values = Object.values(e);
            assert.equal(new Set(values).size, values.length);
        });
    }
});

describe('document-state enums — reverse lookup', () => {
    for (const [name, e] of Object.entries(enums)) {
        it(`${name} resolves each value back to itself`, () => {
            for (const v of Object.values(e)) {
                assert.equal(e[v], v);
            }
        });
    }
});

describe('DocumentStatus membership', () => {
    const expected = ['NEW', 'ISSUE', 'REVOKE', 'SUSPEND', 'RESUME', 'FAILED'];
    it('contains exactly the expected members', () => {
        assert.deepEqual(Object.values(DocumentStatus).sort(), [...expected].sort());
    });
    for (const m of expected) {
        it(`includes ${m}`, () => assert.ok(Object.values(DocumentStatus).includes(m)));
    }
    it('starts a new document at NEW', () => {
        assert.equal(DocumentStatus.NEW, 'NEW');
    });
});

describe('DidDocumentStatus membership and lifecycle ordering', () => {
    const expected = ['NEW', 'CREATE', 'UPDATE', 'DELETE', 'FAILED'];
    it('contains exactly the expected members', () => {
        assert.deepEqual(Object.values(DidDocumentStatus).sort(), [...expected].sort());
    });
    for (const m of expected) {
        it(`includes ${m}`, () => assert.ok(Object.values(DidDocumentStatus).includes(m)));
    }
    it('the createDocument default (NEW) is a valid member', () => {
        assert.ok(Object.values(DidDocumentStatus).includes(DidDocumentStatus.NEW));
    });
    it('terminal-ish states CREATE/UPDATE/DELETE are distinct from NEW', () => {
        for (const s of [DidDocumentStatus.CREATE, DidDocumentStatus.UPDATE, DidDocumentStatus.DELETE]) {
            assert.notEqual(s, DidDocumentStatus.NEW);
        }
    });
});

describe('ApproveStatus membership and transitions', () => {
    const expected = ['NEW', 'APPROVED', 'REJECTED'];
    it('contains exactly the expected members', () => {
        assert.deepEqual(Object.values(ApproveStatus).sort(), [...expected].sort());
    });
    for (const m of expected) {
        it(`includes ${m}`, () => assert.ok(Object.values(ApproveStatus).includes(m)));
    }
    it('the approval-document default is NEW', () => {
        assert.equal(ApproveStatus.NEW, 'NEW');
    });
    it('APPROVED and REJECTED are the two terminal outcomes', () => {
        assert.notEqual(ApproveStatus.APPROVED, ApproveStatus.REJECTED);
        assert.notEqual(ApproveStatus.APPROVED, ApproveStatus.NEW);
        assert.notEqual(ApproveStatus.REJECTED, ApproveStatus.NEW);
    });
});

describe('SchemaStatus membership', () => {
    const expected = ['DRAFT', 'PUBLISHED', 'UNPUBLISHED', 'ERROR', 'DEMO', 'VIEW'];
    it('contains exactly the expected members', () => {
        assert.deepEqual(Object.values(SchemaStatus).sort(), [...expected].sort());
    });
    for (const m of expected) {
        it(`includes ${m}`, () => assert.ok(Object.values(SchemaStatus).includes(m)));
    }
    it('a draft schema is not published', () => {
        assert.notEqual(SchemaStatus.DRAFT, SchemaStatus.PUBLISHED);
    });
});

describe('document-state enums — cross-enum NEW alignment', () => {
    it('DocumentStatus, DidDocumentStatus and ApproveStatus all start at NEW', () => {
        assert.equal(DocumentStatus.NEW, 'NEW');
        assert.equal(DidDocumentStatus.NEW, 'NEW');
        assert.equal(ApproveStatus.NEW, 'NEW');
    });
    it('all four enums share the FAILED/ERROR error concept where defined', () => {
        assert.equal(DocumentStatus.FAILED, 'FAILED');
        assert.equal(DidDocumentStatus.FAILED, 'FAILED');
        assert.equal(SchemaStatus.ERROR, 'ERROR');
    });
    it('an unknown value is not a member of any document-state enum', () => {
        for (const e of Object.values(enums)) {
            assert.ok(!Object.values(e).includes('NOT_A_REAL_STATUS'));
        }
    });
});

describe('document-state enums — frozen-shape guards', () => {
    for (const [name, e] of Object.entries(enums)) {
        it(`${name} exposes only string members`, () => {
            assert.ok(Object.values(e).every((v) => typeof v === 'string'));
        });
        it(`${name} has at least three members`, () => {
            assert.ok(Object.values(e).length >= 3);
        });
    }
});
