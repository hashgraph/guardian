
import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Artifacts", { tags: ['artifacts', 'secondPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const UserUsername = Cypress.env('User');

    const artifactsUrl = `${API.ApiServer}${API.Artifacts}`;

    let artifactId, artifactId2;

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

    before(() => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            listArtifactsWithAuth(authorization).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                artifactId = response.body.at(0).id;
                artifactId2 = response.body.at(1).id;
            });
        });
    });

    it("Delete artifact", { tags: ['smoke'] }, () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            deleteArtifactWithAuth(authorization, artifactId).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
            });
        });
    });

    it("Delete already deleted artifact - Negative", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            deleteArtifactWithAuth(authorization, artifactId, false).then((response) => {
                expect(response.status).eql(STATUS_CODE.ERROR);
                expect(response.body.message).eql("Cannot read properties of null (reading 'policyId')");
            });
        });
    });

    it("Delete artifact with invalid artifact id - Negative", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            deleteArtifactWithAuth(authorization, "21231231321321321", false).then((response) => {
                expect(response.status).eql(STATUS_CODE.ERROR);
                expect(response.body.message).eql("Cannot read properties of null (reading 'policyId')");
            });
        });
    });

    it("Delete artifact without auth token - Negative", () => {
        deleteArtifactWithoutAuth(artifactId2).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Delete artifact with invalid auth token - Negative", () => {
        deleteArtifactWithoutAuth(artifactId2, { authorization: "Bearer wqe" }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Delete artifact with empty auth token - Negative", () => {
        deleteArtifactWithoutAuth(artifactId2, { authorization: "" }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Delete artifact by user - Negative", () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            deleteArtifactWithAuth(authorization, artifactId2, false).then((response) => {
                expect(response.status).eql(STATUS_CODE.FORBIDDEN);
            });
        });
    });

});
