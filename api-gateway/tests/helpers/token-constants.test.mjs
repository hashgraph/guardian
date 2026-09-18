import assert from 'node:assert/strict';
import { REQUIRED_PROPS } from '../../dist/constants/token.js';

describe('api-gateway token constants', () => {
    it('REQUIRED_PROPS exposes the minimal token-import surface', () => {
        assert.equal(REQUIRED_PROPS.TOKEN_ID, 'tokenId');
        assert.equal(REQUIRED_PROPS.TOKEN, 'tokenName');
        assert.equal(REQUIRED_PROPS.TOKEN_SYMBOL, 'tokenSymbol');
        assert.equal(REQUIRED_PROPS.TOKEN_TYPE, 'tokenType');
        assert.equal(REQUIRED_PROPS.ENABLE_ADMIN, 'enableAdmin');
        assert.equal(REQUIRED_PROPS.POLICY_ID, 'policyId');
        assert.equal(REQUIRED_PROPS.DRAFT_TOKEN, 'draftToken');
        assert.equal(REQUIRED_PROPS._ID, '_id');
    });
});
