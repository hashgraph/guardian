import assert from 'node:assert/strict';
import { PREFIXES } from '../../dist/constants/routes.js';

describe('api-gateway route prefix constants', () => {
    it('exposes the full set of resource path prefixes', () => {
        assert.equal(PREFIXES.ACCOUNTS, 'accounts');
        assert.equal(PREFIXES.ARTIFACTS, '/artifacts/');
        assert.equal(PREFIXES.MODULES, '/modules/');
        assert.equal(PREFIXES.SCHEMES, '/schemas/');
        assert.equal(PREFIXES.TOOLS, '/tools/');
        assert.equal(PREFIXES.POLICIES, '/policies/');
        assert.equal(PREFIXES.CONTRACTS, '/contracts/');
        assert.equal(PREFIXES.TAGS, '/tags/');
        assert.equal(PREFIXES.IPFS, 'ipfs');
        assert.equal(PREFIXES.PROFILES, 'profiles');
        assert.equal(PREFIXES.POLICY_COMMENTS, '/policy-comments/');
    });
});
