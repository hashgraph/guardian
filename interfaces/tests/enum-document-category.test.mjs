import assert from 'node:assert/strict';
import { DocumentCategoryType } from '../dist/type/document-category.type.js';

describe('DocumentCategoryType enum', () => {
    it('exposes mrv / report / mint / integration / retirement / user-role / MULTI_SIGN', () => {
        assert.equal(DocumentCategoryType.MRV, 'mrv');
        assert.equal(DocumentCategoryType.REPORT, 'report');
        assert.equal(DocumentCategoryType.MINT, 'mint');
        assert.equal(DocumentCategoryType.INTEGRATION, 'integration');
        assert.equal(DocumentCategoryType.RETIREMENT, 'retirement');
        assert.equal(DocumentCategoryType.USER_ROLE, 'user-role');
        assert.equal(DocumentCategoryType.MULTI_SIGN, 'MULTI_SIGN');
    });
});
