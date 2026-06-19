import assert from 'node:assert/strict';
import { PolicyCategoryType } from '../dist/type/policy-category-type.js';

describe('PolicyCategoryType enum', () => {
    it('exposes the five MRV taxonomy facets', () => {
        for (const k of ['SECTORAL_SCOPE', 'PROJECT_SCALE', 'APPLIED_TECHNOLOGY_TYPE', 'MITIGATION_ACTIVITY_TYPE', 'SUB_TYPE']) {
            assert.equal(PolicyCategoryType[k], k);
        }
        assert.equal(Object.keys(PolicyCategoryType).length, 5);
    });
});
