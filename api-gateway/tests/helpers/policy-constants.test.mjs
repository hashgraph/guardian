import assert from 'node:assert/strict';
import { REQUIRED_PROPS, UN_REQUIRED_PROPS } from '../../dist/constants/policy.js';

describe('api-gateway policy constants', () => {
    it('REQUIRED_PROPS lists identity + lifecycle fields', () => {
        for (const k of ['_ID', 'UUID', 'NAME', 'DESCRIPTION', 'STATUS', 'TOPIC_ID', 'INSTANCE_TOPIC_ID',
                          'VERSION', 'OWNER', 'CREATOR', 'MESSAGE_ID', 'AVAILABILITY']) {
            assert.equal(typeof REQUIRED_PROPS[k], 'string');
        }
        assert.equal(REQUIRED_PROPS.UUID, 'uuid');
        assert.equal(REQUIRED_PROPS.AVAILABILITY, 'availability');
    });
    it('UN_REQUIRED_PROPS strips owner/createDate/id-style fields on import', () => {
        assert.equal(UN_REQUIRED_PROPS.CREATE_DATE, 'createDate');
        assert.equal(UN_REQUIRED_PROPS.OWNER, 'owner');
        assert.equal(UN_REQUIRED_PROPS.ID, 'id');
    });
});
