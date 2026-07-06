import { assert } from 'chai';

import { DidDocumentProperties } from '../../../../../dist/hedera-modules/vcjs/did/types/did-document-properties.js';
import { VerificationMethodProperties } from '../../../../../dist/hedera-modules/vcjs/did/types/verification-method-properties.js';
import { ServiceProperties } from '../../../../../dist/hedera-modules/vcjs/did/types/service-properties.js';

describe('DidDocumentProperties enum', function () {
    const expected = {
        CONTEXT: '@context',
        ID: 'id',
        ALSO_KNOWN_AS: 'alsoKnownAs',
        CONTROLLER: 'controller',
        VERIFICATION_METHOD: 'verificationMethod',
        AUTHENTICATION: 'authentication',
        ASSERTION_METHOD: 'assertionMethod',
        KEY_AGREEMENT: 'keyAgreement',
        CAPABILITY_INVOCATION: 'capabilityInvocation',
        CAPABILITY_DELEGATION: 'capabilityDelegation',
        SERVICE: 'service',
    };

    for (const [key, value] of Object.entries(expected)) {
        it(`${key} maps to "${value}"`, function () {
            assert.equal(DidDocumentProperties[key], value);
        });
    }

    it('exposes exactly the expected number of members', function () {
        assert.equal(Object.keys(expected).length, 11);
        for (const key of Object.keys(expected)) {
            assert.property(DidDocumentProperties, key);
        }
    });
});

describe('VerificationMethodProperties enum', function () {
    const expected = {
        ID: 'id',
        CONTROLLER: 'controller',
        TYPE: 'type',
        PUBLIC_KEY_JWK: 'publicKeyJwk',
        PUBLIC_KEY_MULTIBASE: 'publicKeyMultibase',
        PUBLIC_KEY_BASE58: 'publicKeyBase58',
        PRIVATE_KEY_JWK: 'privateKeyJwk',
        PRIVATE_KEY_MULTIBASE: 'privateKeyMultibase',
        PRIVATE_KEY_BASE58: 'privateKeyBase58',
    };

    for (const [key, value] of Object.entries(expected)) {
        it(`${key} maps to "${value}"`, function () {
            assert.equal(VerificationMethodProperties[key], value);
        });
    }

    it('public and private key constants are distinct', function () {
        assert.notEqual(VerificationMethodProperties.PUBLIC_KEY_BASE58, VerificationMethodProperties.PRIVATE_KEY_BASE58);
        assert.notEqual(VerificationMethodProperties.PUBLIC_KEY_JWK, VerificationMethodProperties.PRIVATE_KEY_JWK);
    });
});

describe('ServiceProperties enum', function () {
    it('ID maps to "id"', function () {
        assert.equal(ServiceProperties.ID, 'id');
    });

    it('TYPE maps to "type"', function () {
        assert.equal(ServiceProperties.TYPE, 'type');
    });

    it('SERVICE_ENDPOINT maps to "serviceEndpoint"', function () {
        assert.equal(ServiceProperties.SERVICE_ENDPOINT, 'serviceEndpoint');
    });

    it('has exactly three members', function () {
        assert.lengthOf(Object.keys(ServiceProperties), 3);
    });
});
