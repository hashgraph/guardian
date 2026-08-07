import assert from 'node:assert/strict';
import { TokenType } from '../dist/type/token.type.js';

describe('interfaces TokenType enum', () => {
    it('uses kebab-case non-fungible/fungible (NOT the Hedera enum names)', () => {
        assert.equal(TokenType.NON_FUNGIBLE, 'non-fungible');
        assert.equal(TokenType.FUNGIBLE, 'fungible');
    });
});
