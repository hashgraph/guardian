import assert from 'node:assert/strict';
import { RequestVcDocumentBlockAddon } from '../../../dist/policy-engine/blocks/request-vc-document-block-addon.js';
import { GeospatialFileValidator } from '../../../dist/policy-engine/helpers/geospatial-file-validator.js';
import { PolicyActionsUtils } from '../../../dist/policy-engine/policy-actions/utils.js';

describe('RequestVcDocumentBlockAddon geospatial validation', function () {
    let validate;
    let sign;

    beforeEach(function () {
        validate = GeospatialFileValidator.validateDocument;
        sign = PolicyActionsUtils.signVC;
    });

    afterEach(function () {
        GeospatialFileValidator.validateDocument = validate;
        PolicyActionsUtils.signVC = sign;
    });

    it('rejects the credential subject before signing', async function () {
        let signed = false;
        GeospatialFileValidator.validateDocument = async () => { throw new Error('geo rejected'); };
        PolicyActionsUtils.signVC = async () => { signed = true; };
        const block = Object.create(RequestVcDocumentBlockAddon.prototype);

        await assert.rejects(
            block.createVerifiableCredential({
                ref: {},
                credentialSubject: { place: { geoFile: {} } },
                user: { did: 'did:test:1', userId: 'user-1' },
                relayerAccount: '',
                options: {}
            }),
            /geo rejected/
        );
        assert.equal(signed, false);
    });
});
