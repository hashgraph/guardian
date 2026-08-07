import { assert } from 'chai';

import { DocumentService } from '../../../../../dist/hedera-modules/vcjs/did/components/document-service.js';

describe('DocumentService', function () {
    const svc = {
        id: 'did:hedera:testnet:abc#service-1',
        type: 'LinkedDomains',
        serviceEndpoint: 'https://example.com'
    };

    it('from builds service', function () {
        const s = DocumentService.from(svc);
        assert.instanceOf(s, DocumentService);
    });

    it('from + toObject round-trip', function () {
        const s = DocumentService.from(svc);
        assert.deepEqual(s.toObject(), svc);
    });

    it('fromArray builds list', function () {
        const list = DocumentService.fromArray([svc, { ...svc, id: 'x#service-2' }]);
        assert.lengthOf(list, 2);
        assert.instanceOf(list[0], DocumentService);
        assert.equal(list[1].toObject().id, 'x#service-2');
    });

    it('fromArray empty', function () {
        assert.deepEqual(DocumentService.fromArray([]), []);
    });

    it('toObject preserves serviceEndpoint object', function () {
        const s = DocumentService.from({ id: 'i', type: 't', serviceEndpoint: { origins: ['a'] } });
        assert.deepEqual(s.toObject().serviceEndpoint, { origins: ['a'] });
    });
});
