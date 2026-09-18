import assert from 'node:assert/strict';
import { PolicyCommentsUtils } from '../../dist/policy-engine/policy-comments-utils.js';

describe('PolicyCommentsUtils.isDryRun', () => {
    it('returns the policy id (string) when status is DRY-RUN', () => {
        const policy = { id: { toString: () => 'p-1' }, status: 'DRY-RUN' };
        assert.equal(PolicyCommentsUtils.isDryRun(policy), 'p-1');
    });

    it('returns the policy id when status is DEMO', () => {
        const policy = { id: { toString: () => 'p-2' }, status: 'DEMO' };
        assert.equal(PolicyCommentsUtils.isDryRun(policy), 'p-2');
    });

    it('returns undefined for any other status', () => {
        for (const status of ['DRAFT', 'PUBLISH', 'PUBLISH_ERROR', 'DISCONTINUED', 'VIEW']) {
            assert.equal(PolicyCommentsUtils.isDryRun({ id: { toString: () => 'x' }, status }), undefined, status);
        }
    });
});

describe('PolicyCommentsUtils.generateKey', () => {
    it('returns a non-empty string', () => {
        const key = PolicyCommentsUtils.generateKey();
        assert.equal(typeof key, 'string');
        assert.ok(key.length > 0);
    });

    it('produces different keys across calls (very high probability)', () => {
        const a = PolicyCommentsUtils.generateKey();
        const b = PolicyCommentsUtils.generateKey();
        assert.notEqual(a, b);
    });
});

describe('PolicyCommentsUtils.accessDiscussion', () => {
    const D = (overrides = {}) => ({
        owner: 'did:owner',
        system: false,
        privacy: 'public',
        users: [],
        roles: [],
        ...overrides,
    });

    it('returns false for a missing discussion', () => {
        assert.equal(PolicyCommentsUtils.accessDiscussion(null, 'did:x', 'OWNER'), false);
        assert.equal(PolicyCommentsUtils.accessDiscussion(undefined, 'did:x', 'OWNER'), false);
    });

    it('returns true when the user is the owner', () => {
        assert.equal(PolicyCommentsUtils.accessDiscussion(D(), 'did:owner', 'VIEWER'), true);
    });

    it('returns true for a system discussion regardless of user', () => {
        assert.equal(PolicyCommentsUtils.accessDiscussion(D({ system: true }), 'did:other', 'X'), true);
    });

    it('returns true when privacy=public regardless of user', () => {
        assert.equal(PolicyCommentsUtils.accessDiscussion(D({ privacy: 'public' }), 'did:other', 'X'), true);
    });

    it('users-privacy: returns true when user is in the explicit list', () => {
        const d = D({ privacy: 'users', users: ['did:a', 'did:b'] });
        assert.equal(PolicyCommentsUtils.accessDiscussion(d, 'did:a', 'X'), true);
    });

    it('users-privacy: returns false when user is not in the list', () => {
        const d = D({ privacy: 'users', users: ['did:a'] });
        assert.equal(PolicyCommentsUtils.accessDiscussion(d, 'did:other', 'X'), false);
    });

    it('users-privacy: returns false when users field is missing', () => {
        const d = D({ privacy: 'users', users: undefined });
        assert.equal(PolicyCommentsUtils.accessDiscussion(d, 'did:a', 'X'), false);
    });

    it('roles-privacy: returns true when role is in the explicit list', () => {
        const d = D({ privacy: 'roles', roles: ['OWNER', 'AUDITOR'] });
        assert.equal(PolicyCommentsUtils.accessDiscussion(d, 'did:other', 'OWNER'), true);
    });

    it('roles-privacy: returns false when role is not in the list', () => {
        const d = D({ privacy: 'roles', roles: ['AUDITOR'] });
        assert.equal(PolicyCommentsUtils.accessDiscussion(d, 'did:other', 'OWNER'), false);
    });

    it('returns false for unknown privacy values', () => {
        const d = D({ privacy: 'restricted' });
        assert.equal(PolicyCommentsUtils.accessDiscussion(d, 'did:other', 'OWNER'), false);
    });
});
