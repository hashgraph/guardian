
import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Modules", { tags: ['modules', 'thirdPool', 'all'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const UserUsername = Cypress.env('User');

    const profilesUrl = `${API.ApiServer}${API.Profiles}`;
    const importMessageUrl = `${API.ApiServer}${API.ListOfAllModules}${API.ImportMessage}`;

    let did;

    const getProfileWithAuth = (authorization, username) =>
        cy.request({
            method: METHOD.GET,
            url: profilesUrl + username,
            headers: { authorization },
        });

    const postImportMessageWithAuth = (authorization, body, opts = {}) =>
        cy.request({
            method: METHOD.POST,
            url: importMessageUrl,
            headers: { authorization },
            body,
            timeout: opts.timeout ?? 180000,
            failOnStatusCode: opts.failOnStatusCode ?? true,
        });

    const postImportMessageWithoutAuth = (body, headers = {}, opts = {}) =>
        cy.request({
            method: METHOD.POST,
            url: importMessageUrl,
            headers,
            body,
            timeout: opts.timeout,
            failOnStatusCode: opts.failOnStatusCode ?? false,
        });

    before("Get user data", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            getProfileWithAuth(authorization, SRUsername).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                did = response.body.did;
            });
        });
    });

    it("Imports new module and all associated artifacts from IPFS into the local DB", { tags: ['smoke'] }, () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            postImportMessageWithAuth(authorization, { messageId: Cypress.env('module_for_import') }).then((response) => {
                expect(response.status).eql(STATUS_CODE.SUCCESS);

                expect(response.body).to.have.property("_id");
                expect(response.body).to.have.property("configFileId");
                expect(response.body).to.have.property("createDate");
                expect(response.body).to.have.property("id");
                expect(response.body).to.have.property("updateDate");
                expect(response.body).to.have.property("uuid");
                expect(response.body._id).eql(response.body.id);

                expect(response.body.codeVersion).eql("1.0.0");
                expect(response.body.config).eql({
                    artifacts: [],
                    blockType: "module",
                    children: [],
                    events: [],
                    innerEvents: [],
                    inputEvents: [],
                    outputEvents: [],
                    permissions: [],
                    variables: [],
                });
                expect(response.body.creator).eql(did);
                expect(response.body.description).eql("");
                expect(response.body.name).eql("ComparedModuleIPFS");
                expect(response.body.owner).eql(did);
                expect(response.body.status).eql("DRAFT");
                expect(response.body.type).eql("CUSTOM");
            });
        });
    });

    it("Imports new module and all associated artifacts from IPFS into the local DB as User - Negative", () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            postImportMessageWithAuth(
                authorization,
                { messageId: Cypress.env('module_for_import') },
                { failOnStatusCode: false }
            ).then((response) => {
                expect(response.status).eql(STATUS_CODE.FORBIDDEN);
            });
        });
    });

    it("Imports new module and all associated artifacts from IPFS into the local DB without auth token - Negative", () => {
        postImportMessageWithoutAuth({ messageId: Cypress.env('module_for_import') }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Imports new module and all associated artifacts from IPFS into the local DB with invalid auth token - Negative", () => {
        postImportMessageWithoutAuth(
            { messageId: Cypress.env('module_for_import') },
            { authorization: "Bearer wqe" }
        ).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Imports new module and all associated artifacts from IPFS into the local DB with empty auth token - Negative", () => {
        postImportMessageWithoutAuth(
            { messageId: Cypress.env('module_for_import') },
            { authorization: "" }
        ).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Imports new module and all associated artifacts from IPFS into the local DB with invalid message id - Negative", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            postImportMessageWithAuth(
                authorization,
                { messageId: Cypress.env('module_for_import') + "777121" },
                { timeout: 240000, failOnStatusCode: false }
            ).then((response) => {
                expect(response.status).eql(STATUS_CODE.ERROR);
                expect(response.body.message).eql("Cannot read properties of null (reading 'type')");
            });
        });
    });

    it("Imports new module and all associated artifacts from IPFS into the local DB with empty message id - Negative", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            postImportMessageWithAuth(
                authorization,
                undefined,
                { failOnStatusCode: false }
            ).then((response) => {
                expect(response.status).eql(STATUS_CODE.UNPROCESSABLE);
                expect(response.body.message).eql("Message ID in body is empty");
            });
        });
    });

});
