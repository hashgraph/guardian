import assert from 'node:assert/strict';
import { REQUIRED_PROPS, UN_REQUIRED_PROPS } from '../../dist/constants/schema.js';

describe('api-gateway schema constants', () => {
    it('REQUIRED_PROPS exposes IRI/UUID/messageId/version among others', () => {
        for (const k of ['ACTIVE', 'ENTITY', 'NAME', 'OWNER', 'STATUS', 'TOPIC_ID', '_ID', 'CREATOR',
                          'IRI', 'UUID', 'MESSAGE_ID', 'DESCRIPTION', 'VERSION']) {
            assert.equal(typeof REQUIRED_PROPS[k], 'string');
        }
        assert.equal(REQUIRED_PROPS.IRI, 'iri');
        assert.equal(REQUIRED_PROPS.MESSAGE_ID, 'messageId');
    });
    it('UN_REQUIRED_PROPS includes the heavy document/context fields stripped before listing', () => {
        assert.equal(UN_REQUIRED_PROPS.DOCUMENT, 'document');
        assert.equal(UN_REQUIRED_PROPS.CONTEXT, 'context');
    });
});
