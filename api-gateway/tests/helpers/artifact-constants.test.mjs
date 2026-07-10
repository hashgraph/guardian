import assert from 'node:assert/strict';
import { REQUIRED_PROPS, UN_REQUIRED_PROPS } from '../../dist/constants/artifact.js';

describe('api-gateway artifact constants', () => {
    it('REQUIRED_PROPS lists fields that must be present on a saved artifact', () => {
        assert.equal(REQUIRED_PROPS.EXTENTION, 'extention');
        assert.equal(REQUIRED_PROPS.NAME, 'name');
        assert.equal(REQUIRED_PROPS.POLICY_ID, 'policyId');
        assert.equal(REQUIRED_PROPS.TYPE, 'type');
        assert.equal(REQUIRED_PROPS.UUID, 'uuid');
        assert.equal(REQUIRED_PROPS._ID, '_id');
    });
    it('UN_REQUIRED_PROPS lists optional fields stripped on import', () => {
        assert.equal(UN_REQUIRED_PROPS.CATEGORY, 'category');
        assert.equal(UN_REQUIRED_PROPS.OWNER, 'owner');
        assert.equal(UN_REQUIRED_PROPS.CREATE_DATE, 'createdDate');
        assert.equal(UN_REQUIRED_PROPS.UPDATE_DATE, 'updateDate');
        assert.equal(UN_REQUIRED_PROPS.ID, 'id');
    });
});
