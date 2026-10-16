import assert from 'node:assert/strict';
import { PolicyVcDocumentsUtils } from '../../../dist/policy-engine/policy-vc-documents-utils.js';
import { PolicyComponentsUtils } from '../../../dist/policy-engine/policy-components-utils.js';
import { GeospatialFileValidator } from '../../../dist/policy-engine/helpers/geospatial-file-validator.js';

describe('PolicyVcDocumentsUtils geospatial validation', function () {
    let getInstance;
    let getRelayer;
    let getSchema;
    let create;
    let validate;

    beforeEach(function () {
        getInstance = PolicyComponentsUtils.GetPolicyInstance;
        getRelayer = PolicyVcDocumentsUtils.getRelayerAccount;
        getSchema = PolicyVcDocumentsUtils.getSchema;
        create = PolicyVcDocumentsUtils.createVerifiableCredential;
        validate = GeospatialFileValidator.validateDocument;
    });

    afterEach(function () {
        PolicyComponentsUtils.GetPolicyInstance = getInstance;
        PolicyVcDocumentsUtils.getRelayerAccount = getRelayer;
        PolicyVcDocumentsUtils.getSchema = getSchema;
        PolicyVcDocumentsUtils.createVerifiableCredential = create;
        GeospatialFileValidator.validateDocument = validate;
    });

    function arrange(oldPlace, updatableFields) {
        const documentRef = {
            document: {
                id: 'urn:uuid:old',
                issuer: 'did:test:issuer',
                credentialSubject: { place: oldPlace }
            }
        };
        const db = { getVcDocument: async () => documentRef };
        const ref = { components: { databaseServer: db } };
        PolicyComponentsUtils.GetPolicyInstance = () => ref;
        PolicyVcDocumentsUtils.getRelayerAccount = async () => '';
        PolicyVcDocumentsUtils.getSchema = async () => ({
            searchFields: () => updatableFields
        });
        let signed = false;
        PolicyVcDocumentsUtils.createVerifiableCredential = async () => {
            signed = true;
            throw new Error('sign reached');
        };
        return { signed: () => signed };
    }

    it('ignores a non-updatable incoming geo value and validates the inherited value', async function () {
        const inherited = {
            type: 'Point', coordinates: [1, 2],
            geoFile: { fileId: 'small', name: 'small.kml', format: 'kml' }
        };
        const incoming = {
            type: 'Point', coordinates: [9, 9],
            geoFile: { fileId: 'large', name: 'large.kml', format: 'kml' }
        };
        const state = arrange(inherited, []);
        let checked;
        GeospatialFileValidator.validateDocument = async subject => {
            checked = subject;
            if (subject.place.geoFile.fileId === 'large') throw new Error('over limit');
        };

        await assert.rejects(
            PolicyVcDocumentsUtils.createNewVersionVcDocuments(
                { did: 'did:test:user', userId: 'user-1' },
                'policy-1',
                { documentId: 'doc-1', document: { place: incoming } }
            ),
            /sign reached/
        );
        assert.equal(checked.place.geoFile.fileId, 'small');
        assert.equal(state.signed(), true);
    });

    it('validates an inherited over-limit link before signing', async function () {
        const inherited = {
            type: 'Point', coordinates: [1, 2],
            geoFile: { fileId: 'large', name: 'large.kml', format: 'kml' }
        };
        const state = arrange(inherited, []);
        GeospatialFileValidator.validateDocument = async subject => {
            if (subject.place.geoFile.fileId === 'large') throw new Error('over limit');
        };

        await assert.rejects(
            PolicyVcDocumentsUtils.createNewVersionVcDocuments(
                { did: 'did:test:user', userId: 'user-1' },
                'policy-1',
                { documentId: 'doc-1', document: {} }
            ),
            /over limit/
        );
        assert.equal(state.signed(), false);
    });

    it('validates an updatable incoming value after it replaces the old value', async function () {
        const state = arrange({ type: 'Point', coordinates: [1, 2] }, [{ path: 'place', isUpdatable: true }]);
        let checked;
        GeospatialFileValidator.validateDocument = async subject => {
            checked = subject;
            throw new Error('checked');
        };
        await assert.rejects(
            PolicyVcDocumentsUtils.createNewVersionVcDocuments(
                { did: 'did:test:user', userId: 'user-1' },
                'policy-1',
                { documentId: 'doc-1', document: { place: { geoFile: { fileId: 'new' } } } }
            ),
            /checked/
        );
        assert.equal(checked.place.geoFile.fileId, 'new');
        assert.equal(state.signed(), false);
    });
});
