
import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';
import { createDraftPolicy, deleteDraftPolicy } from '../../../support/api/policies';
import { randomInt } from '../../../support/random';

context('Artifacts', { tags: ['artifacts', 'secondPool', 'api-all', 'all', 'all-no-mgs'] }, () => {
    const SRUsername = Cypress.expose('SRUser');

    const artifactsUrl = `${API.ApiServer}${API.Artifacts}`;
    // Artifacts go to a DRAFT policy of the spec's own: the newest policy in the list may be
    // published, or belong to another registry, depending on the spec folders run before.
    const policyName = `PolicyForArtifactUpload_${randomInt(999999)}`;

    let policyId;

    const uploadArtifactWithAuth = (authorization, policyId, formdata, headers = { authorization, 'Content-Type': 'multipart/form-data' }, opts = {}) =>
        cy.request({
            method: METHOD.POST,
            url: artifactsUrl + policyId,
            headers,
            body: formdata,
            failOnStatusCode: opts.failOnStatusCode ?? true,
        });

    const uploadArtifactWithoutAuth = (policyId, headers = {}) =>
        cy.request({
            method: METHOD.POST,
            url: artifactsUrl + policyId,
            headers,
            failOnStatusCode: false,
        });

    const readFixtureBlob = (fixtureName) =>
        cy.fixture(fixtureName, 'binary')
            .then((file) => Cypress.Blob.binaryStringToBlob(file));

    const buildFormData = (blob, filename) => {
        const fd = new FormData();
        fd.append('artifacts', blob, filename);
        return fd;
    };

    before(() => {
        Authorization.getAccessToken(SRUsername).then((authorization) =>
            createDraftPolicy(authorization, policyName).then((id) => {
                policyId = id;
            }));
    });

    after(() => {
        if (!policyId) {
            return;
        }
        Authorization.getAccessToken(SRUsername).then((authorization) => deleteDraftPolicy(authorization, policyId));
    });

    it('Upload artifact', { tags: ['smoke'] }, () => {
        Authorization.getAccessToken(SRUsername).then((authorization) =>
            readFixtureBlob('artifactsImport.policy')
                .then((blob) => buildFormData(blob, 'artifactsImport.policy'))
                .then((formdata) =>
                    uploadArtifactWithAuth(authorization, policyId, formdata, { authorization, 'Content-Type': 'multipart/form-data' })
                )
                .then((res) => {
                    expect(res.status).to.eq(STATUS_CODE.SUCCESS);
                }));
    });

    it('Upload artifact without auth token - Negative', () => {
        uploadArtifactWithoutAuth(policyId).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Upload artifact with invalid auth token - Negative', () => {
        uploadArtifactWithoutAuth(policyId, { authorization: 'Bearer wqe' }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Upload artifact with empty auth token - Negative', () => {
        uploadArtifactWithoutAuth(policyId, { authorization: '' }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Upload artifact without file - Negative', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) =>
            uploadArtifactWithAuth(
                authorization,
                policyId,
                undefined,
                { Authorization: authorization, 'content-type': 'multipart/form-data' },
                { failOnStatusCode: false }
            ).then((res) => {
                expect(res.status).to.eq(STATUS_CODE.BAD_REQUEST);
                // expect(res.status).to.eq(STATUS_CODE.UNPROCESSABLE);
                // expect(res.body.message).to.eq("There are no files to upload");
            }));
    });

    it('Upload artifact with invalid policy id - Negative', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) =>
            readFixtureBlob('remoteWorkGHGPolicy.policy')
                .then((blob) => buildFormData(blob, 'remoteWorkGHGPolicy.policy'))
                .then((formdata) =>
                    uploadArtifactWithAuth(
                        authorization,
                        '-----',
                        formdata,
                        { Authorization: authorization, 'content-type': 'multipart/form-data' },
                        { failOnStatusCode: false }
                    )
                )
                .then((res) => {
                    expect(res.status).to.eq(STATUS_CODE.UNPROCESSABLE);
                    // expect(res.body.message).to.eq("There is no appropriate policy or policy is not in DRAFT status");
                }));
    });

});
