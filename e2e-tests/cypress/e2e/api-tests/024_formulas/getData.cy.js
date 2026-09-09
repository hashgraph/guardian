
import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';

context('Get formula data', { tags: ['formulas', 'firstPool', 'all', 'all-no-mgs'] }, () => {
    const SRUsername = Cypress.env('SRUser');

    let firstFormula; let documentId;

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

    const publishFormula = (authorization, formulaId, failOnStatusCode = true) =>
        cy.request({
            method: METHOD.PUT,
            url: `${API.ApiServer}${API.Formulas}${formulaId}/${API.Publish}`,
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

    before('Get policy, document and schema id', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            getFormulas(authorization).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                const formulaId = response.body.at(0).id;
                publishFormula(authorization, formulaId).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    //Publishing changes the formula, so it is read back afterwards: comparing the
                    //echo below against the values it had before publishing does not match
                    getFormulas(authorization).then((listRes) => {
                        expect(listRes.status).eql(STATUS_CODE.OK);
                        firstFormula = listRes.body.find((item) => item.id === formulaId);
                        expect(firstFormula, `formula ${formulaId}`).to.not.be.undefined;
                        getPolicyApplications(authorization, firstFormula.policyId).then((appsRes) => {
                            expect(appsRes.status).eql(STATUS_CODE.OK);
                            documentId = appsRes.body.data.at(0).id;
                        });
                    });
                })
            });
        });
    });

    it('Get formula data', () => {
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
                expect(response.body).to.have.property('document');
                expect(response.body).to.have.property('relationships');
                expect(response.body).to.have.property('schemas');

                // Formula echoes should match the formula published in the setup. The echoed
                // list holds the formulas of earlier runs too, so it is matched on the id
                const echoed = response.body.formulas.find((item) => item.id === firstFormula.id);
                expect(echoed, `formula ${firstFormula.id} in the answer`).to.not.be.undefined;
                expect(echoed.config).eql(firstFormula.config);
                expect(echoed.creator).eql(firstFormula.creator);
                expect(echoed.id).eql(firstFormula.id);
                expect(echoed.description).eql(firstFormula.description);
                expect(echoed.name).eql(firstFormula.name);
                expect(echoed.owner).eql(firstFormula.owner);
                expect(echoed.policyId).eql(firstFormula.policyId);
                expect(echoed.policyInstanceTopicId).eql(firstFormula.policyInstanceTopicId);
                expect(echoed.policyTopicId).eql(firstFormula.policyTopicId);
                expect(echoed.status).eql('PUBLISHED');
            });
        });
    });

    it('Get formula data without auth - Negative', () => {
        postFormulaData(
            undefined,
            {
                documentId,
                policyId: firstFormula.policyId,
                schemaId: firstFormula.config.formulas.at(0).link.entityId,
            },
            false
        ).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Get formula data with incorrect auth - Negative', () => {
        postFormulaData(
            'bearer 11111111111111111111@#$',
            {
                documentId,
                policyId: firstFormula.policyId,
                schemaId: firstFormula.config.formulas.at(0).link.entityId,
            },
            false
        ).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Get formula data with empty auth - Negative', () => {
        postFormulaData(
            '',
            {
                documentId,
                policyId: firstFormula.policyId,
                schemaId: firstFormula.config.formulas.at(0).link.entityId,
            },
            false
        ).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });
});
