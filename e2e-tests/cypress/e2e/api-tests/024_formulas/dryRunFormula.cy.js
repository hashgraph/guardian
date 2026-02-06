
import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Put formula in Dry Run status and get formula data", { tags: ['formulas', 'firstPool', 'all'] }, () => {
    const SRUsername = Cypress.env('SRUser');

    let firstFormula, documentId;

    const getFormulas = (authorization, failOnStatusCode = true) =>
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Formulas,
            headers: authorization ? { authorization } : {},
            failOnStatusCode,
        });

    const getPolicyApplications = (authorization, policyId, failOnStatusCode = true) =>
        cy.request({
            method: METHOD.GET,
            url: `${API.ApiServer}${API.Policies}${policyId}/${API.GetApplications}`,
            headers: authorization ? { authorization } : {},
            failOnStatusCode,
        });

    const postFormulaData = (
        authorization,
        { documentId, policyId, schemaId },
        failOnStatusCode = true
    ) =>
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.Formulas + API.Data,
            body: { documentId, policyId, schemaId },
            headers: authorization ? { authorization } : {},
            failOnStatusCode,
        });

    const dryRunFormula = (authorization, formulaId, failOnStatusCode = true) =>
        cy.request({
            method: METHOD.PUT,
            url: `${API.ApiServer}${API.Formulas}${formulaId}/${API.DryRun}`,
            headers: authorization ? { authorization } : {},
            failOnStatusCode,
        });

    const draftFormula = (authorization, formulaId, failOnStatusCode = true) =>
        cy.request({
            method: METHOD.PUT,
            url: `${API.ApiServer}${API.Formulas}${formulaId}/${API.Draft}`,
            headers: authorization ? { authorization } : {},
            failOnStatusCode,
        });


    before("Get policy, document and schema id", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            getFormulas(authorization).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                firstFormula = response.body.at(0);
                dryRunFormula(authorization, firstFormula.id).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    getPolicyApplications(authorization, firstFormula.policyId).then((appsRes) => {
                        expect(appsRes.status).eql(STATUS_CODE.OK);
                        documentId = appsRes.body.data.at(0).id;
                    });
                })
            });
        });
    });

    it("Get formula data", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            postFormulaData(
                authorization,
                {
                    documentId,
                    policyId: firstFormula.policyId,
                    schemaId: firstFormula.config.formulas.at(0).link.entityId,
                },
                true
            ).then((response) => {
                expect(response.status).eql(STATUS_CODE.SUCCESS);
                expect(response.body).to.have.property("document");
                expect(response.body).to.have.property("relationships");
                expect(response.body).to.have.property("schemas");

                // Formula echoes should match the first formula fetched
                expect(response.body.formulas.at(0).config).eql(firstFormula.config);
                expect(response.body.formulas.at(0).creator).eql(firstFormula.creator);
                expect(response.body.formulas.at(0).id).eql(firstFormula.id);
                expect(response.body.formulas.at(0).description).eql(firstFormula.description);
                expect(response.body.formulas.at(0).name).eql(firstFormula.name);
                expect(response.body.formulas.at(0).owner).eql(firstFormula.owner);
                expect(response.body.formulas.at(0).policyId).eql(firstFormula.policyId);
                expect(response.body.formulas.at(0).policyInstanceTopicId).eql(firstFormula.policyInstanceTopicId);
                expect(response.body.formulas.at(0).policyTopicId).eql(firstFormula.policyTopicId);
                expect(response.body.formulas.at(0).status).eql("DRY_RUN");
            });
        });
    });


    it("Draft formula and check that formula isn't displayed", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            draftFormula(authorization, firstFormula.id).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                postFormulaData(
                    authorization,
                    {
                        documentId,
                        policyId: firstFormula.policyId,
                        schemaId: firstFormula.config.formulas.at(0).link.entityId,
                    },
                    true
                ).then((response) => {
                    expect(response.status).eql(STATUS_CODE.SUCCESS);
                    expect(response.body).eql(null);
                });
            })
        });
    });
});
