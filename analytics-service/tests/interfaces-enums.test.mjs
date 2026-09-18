import assert from 'node:assert/strict';
import { ReportStatus } from '../dist/interfaces/report-status.type.js';
import { ReportSteep } from '../dist/interfaces/report-steep.type.js';
import { DocumentType } from '../dist/interfaces/document.type.js';
import { UserType } from '../dist/interfaces/user.type.js';

describe('@unit ReportStatus enum', () => {
    it('has exactly the documented values', () => {
        assert.deepEqual(
            Object.keys(ReportStatus).sort(),
            ['ERROR', 'FINISHED', 'NONE', 'PROGRESS'],
        );
    });

    it('NONE is empty string (sentinel for "no status yet")', () => {
        assert.equal(ReportStatus.NONE, '');
    });

    it('non-NONE values are all uppercase strings matching the key', () => {
        for (const [key, value] of Object.entries(ReportStatus)) {
            if (key === 'NONE') continue;
            assert.equal(value, key);
        }
    });

    it('NONE is falsy, all others are truthy (used in `if (status)` checks)', () => {
        assert.equal(Boolean(ReportStatus.NONE), false);
        assert.equal(Boolean(ReportStatus.PROGRESS), true);
        assert.equal(Boolean(ReportStatus.FINISHED), true);
        assert.equal(Boolean(ReportStatus.ERROR), true);
    });
});

describe('@unit ReportSteep enum', () => {
    it('contains the 5 phases of a report lifecycle', () => {
        assert.deepEqual(
            Object.keys(ReportSteep).sort(),
            ['DOCUMENTS', 'INSTANCES', 'POLICIES', 'STANDARD_REGISTRY', 'TOKENS'],
        );
    });

    it('values match keys (string enum convention)', () => {
        for (const [k, v] of Object.entries(ReportSteep)) assert.equal(v, k);
    });

    it('values are unique', () => {
        const values = Object.values(ReportSteep);
        assert.equal(values.length, new Set(values).size);
    });
});

describe('@unit DocumentType enum', () => {
    it('contains NONE + VC/VP/DID/ROLE', () => {
        assert.deepEqual(
            Object.keys(DocumentType).sort(),
            ['DID', 'NONE', 'ROLE', 'VC', 'VP'],
        );
    });

    it('NONE is "NONE" (NOT the empty string — ReportStatus.NONE is "")', () => {
        assert.equal(DocumentType.NONE, 'NONE');
        assert.notEqual(DocumentType.NONE, '');
    });
});

describe('@unit UserType enum', () => {
    it('contains only STANDARD_REGISTRY and USER', () => {
        assert.deepEqual(
            Object.keys(UserType).sort(),
            ['STANDARD_REGISTRY', 'USER'],
        );
    });

    it('values match keys', () => {
        assert.equal(UserType.STANDARD_REGISTRY, 'STANDARD_REGISTRY');
        assert.equal(UserType.USER, 'USER');
    });

    it('does NOT include AUDITOR or ADMIN', () => {
        assert.equal(UserType.AUDITOR, undefined);
        assert.equal(UserType.ADMIN, undefined);
    });
});

describe('@unit enum-vs-enum invariants', () => {
    it('ReportStatus.NONE !== DocumentType.NONE', () => {
        assert.notEqual(ReportStatus.NONE, DocumentType.NONE);
    });

    it('UserType.STANDARD_REGISTRY === ReportSteep.STANDARD_REGISTRY', () => {
        assert.equal(UserType.STANDARD_REGISTRY, ReportSteep.STANDARD_REGISTRY);
    });
});
