import { STATUS_CODE } from "../../../support/api/api-const";
import * as Authorization from "../../../support/authorization";

context("Create policy labels", { tags: ['policy_labels', 'firstPool', 'all'] }, () => {
    const UserUsername = Cypress.env('User');
    const labelName = "testPolicyLabelAPI";
    const labelDesc = `${labelName} desc`;

    let policy, did, SRDid, labelId;

    before("Setup Policy and User Data", () => {
        Authorization.getAccessToken(UserUsername).then((auth) => {
            cy.getPolicyByName(auth, "iRec_4").then((p) => { policy = p; });
            cy.getUserProfile(auth, UserUsername).then((profile) => {
                did = profile.did;
                SRDid = profile.parent;
            });
        });
    });

    it("Create policy labels", () => {
        Authorization.getAccessToken(UserUsername).then((auth) => {
            cy.createPolicyLabel(auth, policy, labelName, labelDesc).then(({ body, status }) => {
                expect(status).eql(STATUS_CODE.SUCCESS);
                labelId = body.id;
                
                expect(body.creator).eql(did);
                expect(body.owner).eql(SRDid);
                expect(body.name).eql(labelName);
            });
        });
    });

    it("Create policy labels without auth - Negative", () => {
        cy.createPolicyLabel(null, policy, labelName, labelDesc)
            .its('status').should('eq', STATUS_CODE.UNAUTHORIZED);
    });

    it("Get policy label", () => {
        Authorization.getAccessToken(UserUsername).then((auth) => {
            cy.getPolicyLabel(auth, labelId).then(({ body, status }) => {
                expect(status).eql(STATUS_CODE.OK);
                expect(body.id).eql(labelId);
                expect(body.description).eql(labelDesc);
            });
        });
    });

    it("Get policy label with incorrect auth - Negative", () => {
        cy.getPolicyLabel("bearer invalid", labelId)
            .its('status').should('eq', STATUS_CODE.UNAUTHORIZED);
    });
    
});