import assert from 'node:assert/strict';
import { RequestVcDocumentBlock } from '../../../dist/policy-engine/blocks/request-vc-document-block.js';
import { GeospatialFileValidator } from '../../../dist/policy-engine/helpers/geospatial-file-validator.js';
import { PolicyActionsUtils } from '../../../dist/policy-engine/policy-actions/utils.js';

describe('RequestVcDocumentBlock geospatial validation', function () {
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

    it('rejects a final subject before signing', async function () {
        let signed = false;
        GeospatialFileValidator.validateDocument = async () => { throw new Error('geo rejected'); };
        PolicyActionsUtils.signVC = async () => { signed = true; };
        const block = Object.create(RequestVcDocumentBlock.prototype);

        await assert.rejects(
            block.createVerifiableCredential(
                { userId: 'user-1' }, {}, '', { place: { geoFile: {} } }, '', undefined, true
            ),
            /geo rejected/
        );
        assert.equal(signed, false);
    });

});
