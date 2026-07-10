import assert from 'node:assert/strict';
import { REQUIRED_PROPS, UN_REQUIRED_PROPS } from '../../dist/constants/tool.js';

describe('api-gateway tool constants', () => {
    it('REQUIRED_PROPS lists name/topic/owner/messageId fields', () => {
        for (const k of ['DESCRIPTION', 'NAME', 'STATUS', 'TOPIC_ID', 'VERSION', 'MESSAGE_ID', 'OWNER', 'CREATOR', '_ID']) {
            assert.equal(typeof REQUIRED_PROPS[k], 'string');
        }
        assert.equal(REQUIRED_PROPS.MESSAGE_ID, 'messageId');
    });
    it('UN_REQUIRED_PROPS strips the bulky document/context fields', () => {
        assert.equal(UN_REQUIRED_PROPS.DOCUMENT, 'document');
        assert.equal(UN_REQUIRED_PROPS.CONTEXT, 'context');
        assert.equal(UN_REQUIRED_PROPS.DEFS, 'defs');
    });
});
