
import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Artifacts", { tags: ['artifacts', 'secondPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const UserUsername = Cypress.env('User');

    const artifactsUrl = `${API.ApiServer}${API.Artifacts}`;

    const getArtifactsWithAuth = (authorization, opts = {}) =>
        cy.request({
            method: METHOD.GET,
            url: artifactsUrl,
            headers: { authorization },
            ...opts,
        });

    const getArtifactsWithoutAuth = (headers = {}) =>
        cy.request({
            method: METHOD.GET,
            url: artifactsUrl,
            headers,
            failOnStatusCode: false,
        });

    it("Get list of artifacts", { tags: ['smoke'] }, () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            getArtifactsWithAuth(authorization).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                expect(response.body.at(0).id).not.null;
                expect(response.body.at(0).uuid).not.null;
                expect(response.body.at(0).owner).not.null;
            });
        });
    });

    it("Get list of artifacts by user - Negative", () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            getArtifactsWithAuth(authorization, { failOnStatusCode: false }).then((response) => {
                expect(response.status).eql(STATUS_CODE.FORBIDDEN);
            });
        });
    });

    it("Get list of artifacts without auth token - Negative", () => {
        getArtifactsWithoutAuth().then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get list of artifacts with invalid auth token - Negative", () => {
        getArtifactsWithoutAuth({ authorization: "Bearer wqe" }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get list of artifacts with empty auth token - Negative", () => {
        getArtifactsWithoutAuth({ authorization: "" }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

});
