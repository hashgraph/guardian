
import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';
import { randomInt } from '../../../support/random';
import { TIMEOUTS } from '../../../support/CustomHelpers/timeouts';

context('Artifacts', { tags: ['artifacts', 'secondPool', 'api-all', 'all', 'all-no-mgs'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const UserUsername = Cypress.env('User');

    const artifactsUrl = `${API.ApiServer}${API.Artifacts}`;

    const policiesUrl = `${API.ApiServer}${API.Policies}`;
    const policyName = `PolicyForArtifactDelete_${randomInt(999999)}`;

    let policyId; let artifactId; let artifactId2;

    const listArtifactsWithAuth = (authorization) =>
        cy.request({
            method: METHOD.GET,
            url: artifactsUrl,
            headers: { authorization },
        });

    const deleteArtifactWithAuth = (authorization, id, failOnStatusCode = true) =>
        cy.request({
            method: METHOD.DELETE,
            url: artifactsUrl + id,
            headers: { authorization },
            failOnStatusCode,
        });

    const deleteArtifactWithoutAuth = (id, headers = {}) =>
        cy.request({
            method: METHOD.DELETE,
            url: artifactsUrl + id,
            headers,
            failOnStatusCode: false,
        });

    // Only the artifacts of a DRAFT policy can be deleted, and the policies other specs leave at the
    // top of the list are not guaranteed to be DRAFT, so the spec provisions its own policy.
    const uploadArtifact = (authorization, filename) =>
        cy.fixture('artifactsImport.policy', 'binary').then((file) => {
            const formData = new FormData();
            formData.append('artifacts', Cypress.Blob.binaryStringToBlob(file), filename);
            return cy.request({
                method: METHOD.POST,
                url: artifactsUrl + policyId,
                headers: { authorization, 'Content-Type': 'multipart/form-data' },
                body: formData,
            });
        });

    before(() => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: policiesUrl,
                headers: { authorization },
                body: { name: policyName, policyTag: policyName },
                timeout: TIMEOUTS.backend,
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.SUCCESS);
                policyId = response.body.find((policy) => policy.name === policyName).id;
            });
            uploadArtifact(authorization, 'artifactToDelete.policy');
            uploadArtifact(authorization, 'artifactToKeep.policy');
            listArtifactsWithAuth(authorization).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                const policyArtifacts = response.body.filter((artifact) => artifact.policyId === policyId);
                expect(policyArtifacts, 'artifacts of the provisioned policy').to.have.length(2);
                artifactId = policyArtifacts[0].id;
                artifactId2 = policyArtifacts[1].id;
            });
        });
    });

    after(() => {
        if (!policyId) {return;}
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.DELETE,
                url: `${policiesUrl}${API.Async}${policyId}`,
                headers: { authorization },
                failOnStatusCode: false,
            });
        });
    });

    it('Delete artifact', { tags: ['smoke'] }, () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            deleteArtifactWithAuth(authorization, artifactId).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
            });
        });
    });

    it('Delete already deleted artifact - Negative', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            deleteArtifactWithAuth(authorization, artifactId, false).then((response) => {
                expect(response.status).eql(STATUS_CODE.ERROR);
                expect(response.body.message).eql("Cannot read properties of null (reading 'policyId')");
            });
        });
    });

    it('Delete artifact with invalid artifact id - Negative', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            deleteArtifactWithAuth(authorization, '21231231321321321', false).then((response) => {
                expect(response.status).eql(STATUS_CODE.ERROR);
                expect(response.body.message).eql("Cannot read properties of null (reading 'policyId')");
            });
        });
    });

    it('Delete artifact without auth token - Negative', () => {
        deleteArtifactWithoutAuth(artifactId2).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Delete artifact with invalid auth token - Negative', () => {
        deleteArtifactWithoutAuth(artifactId2, { authorization: 'Bearer wqe' }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Delete artifact with empty auth token - Negative', () => {
        deleteArtifactWithoutAuth(artifactId2, { authorization: '' }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Delete artifact by user - Negative', () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            deleteArtifactWithAuth(authorization, artifactId2, false).then((response) => {
                expect(response.status).eql(STATUS_CODE.FORBIDDEN);
            });
        });
    });

});
