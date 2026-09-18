import assert from 'node:assert/strict';
import { REQUIRED_PROPS, UN_REQUIRED_PROPS } from '../../dist/constants/module.js';

describe('api-gateway module constants', () => {
    it('REQUIRED_PROPS lists the import-time fields', () => {
        assert.equal(REQUIRED_PROPS.NAME, 'name');
        assert.equal(REQUIRED_PROPS.OWNER, 'owner');
        assert.equal(REQUIRED_PROPS.CREATOR, 'creator');
        assert.equal(REQUIRED_PROPS.STATUS, 'status');
        assert.equal(REQUIRED_PROPS.UUID, 'uuid');
    });
    it('UN_REQUIRED_PROPS includes config + createDate + id-style fields', () => {
        assert.equal(UN_REQUIRED_PROPS.CONFIG, 'config');
        assert.equal(UN_REQUIRED_PROPS.CREATE_DATE, 'createdDate');
        assert.equal(UN_REQUIRED_PROPS.UPDATE_DATE, 'updateDate');
        assert.equal(UN_REQUIRED_PROPS.TYPE, 'type');
    });
});
