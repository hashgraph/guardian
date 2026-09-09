import assert from 'node:assert/strict';
import { AccessType } from '@guardian/interfaces';
import { resolvePolicyAccessCode, PolicyAccessCode } from '../../dist/policy-engine/policy-engine.js';

// resolvePolicyAccessCode is the pure decision core extracted from
// PolicyEngine.accessPolicyCode: given the AccessType, whether the policy is
// published, and whether the user is "assigned" (personally OR via their
// organization — that resolution happens before this function is called), it
// returns the PolicyAccessCode. Every branch below mirrors the original inline
// switch statement byte-for-byte.
describe('resolvePolicyAccessCode', () => {
    it('AccessType.ALL is always AVAILABLE regardless of published/isAssigned', () => {
        for (const published of [true, false]) {
            for (const isAssigned of [true, false]) {
                assert.equal(
                    resolvePolicyAccessCode(AccessType.ALL, published, isAssigned),
                    PolicyAccessCode.AVAILABLE
                );
            }
        }
    });

    it('AccessType.NONE is always UNAVAILABLE regardless of published/isAssigned', () => {
        for (const published of [true, false]) {
            for (const isAssigned of [true, false]) {
                assert.equal(
                    resolvePolicyAccessCode(AccessType.NONE, published, isAssigned),
                    PolicyAccessCode.UNAVAILABLE
                );
            }
        }
    });

    it('an unknown/default access value is always UNAVAILABLE', () => {
        for (const published of [true, false]) {
            for (const isAssigned of [true, false]) {
                assert.equal(
                    resolvePolicyAccessCode('SOME_UNKNOWN_ACCESS_TYPE', published, isAssigned),
                    PolicyAccessCode.UNAVAILABLE
                );
            }
        }
    });

    describe('AccessType.PUBLISHED', () => {
        it('AVAILABLE when published, regardless of isAssigned', () => {
            assert.equal(resolvePolicyAccessCode(AccessType.PUBLISHED, true, true), PolicyAccessCode.AVAILABLE);
            assert.equal(resolvePolicyAccessCode(AccessType.PUBLISHED, true, false), PolicyAccessCode.AVAILABLE);
        });
        it('UNAVAILABLE when not published, regardless of isAssigned', () => {
            assert.equal(resolvePolicyAccessCode(AccessType.PUBLISHED, false, true), PolicyAccessCode.UNAVAILABLE);
            assert.equal(resolvePolicyAccessCode(AccessType.PUBLISHED, false, false), PolicyAccessCode.UNAVAILABLE);
        });
    });

    describe('AccessType.ASSIGNED', () => {
        it('AVAILABLE when isAssigned, regardless of published', () => {
            assert.equal(resolvePolicyAccessCode(AccessType.ASSIGNED, true, true), PolicyAccessCode.AVAILABLE);
            assert.equal(resolvePolicyAccessCode(AccessType.ASSIGNED, false, true), PolicyAccessCode.AVAILABLE);
        });
        it('UNAVAILABLE when not isAssigned, regardless of published', () => {
            assert.equal(resolvePolicyAccessCode(AccessType.ASSIGNED, true, false), PolicyAccessCode.UNAVAILABLE);
            assert.equal(resolvePolicyAccessCode(AccessType.ASSIGNED, false, false), PolicyAccessCode.UNAVAILABLE);
        });
    });

    describe('AccessType.ASSIGNED_OR_PUBLISHED', () => {
        it('AVAILABLE when published OR isAssigned (or both)', () => {
            assert.equal(resolvePolicyAccessCode(AccessType.ASSIGNED_OR_PUBLISHED, true, true), PolicyAccessCode.AVAILABLE);
            assert.equal(resolvePolicyAccessCode(AccessType.ASSIGNED_OR_PUBLISHED, true, false), PolicyAccessCode.AVAILABLE);
            assert.equal(resolvePolicyAccessCode(AccessType.ASSIGNED_OR_PUBLISHED, false, true), PolicyAccessCode.AVAILABLE);
        });
        it('UNAVAILABLE when neither published nor isAssigned', () => {
            assert.equal(resolvePolicyAccessCode(AccessType.ASSIGNED_OR_PUBLISHED, false, false), PolicyAccessCode.UNAVAILABLE);
        });
    });

    describe('AccessType.ASSIGNED_AND_PUBLISHED', () => {
        it('AVAILABLE only when both published AND isAssigned', () => {
            assert.equal(resolvePolicyAccessCode(AccessType.ASSIGNED_AND_PUBLISHED, true, true), PolicyAccessCode.AVAILABLE);
        });
        it('UNAVAILABLE when published but not isAssigned', () => {
            assert.equal(resolvePolicyAccessCode(AccessType.ASSIGNED_AND_PUBLISHED, true, false), PolicyAccessCode.UNAVAILABLE);
        });
        it('UNAVAILABLE when isAssigned but not published', () => {
            assert.equal(resolvePolicyAccessCode(AccessType.ASSIGNED_AND_PUBLISHED, false, true), PolicyAccessCode.UNAVAILABLE);
        });
        it('UNAVAILABLE when neither published nor isAssigned', () => {
            assert.equal(resolvePolicyAccessCode(AccessType.ASSIGNED_AND_PUBLISHED, false, false), PolicyAccessCode.UNAVAILABLE);
        });
    });
});
