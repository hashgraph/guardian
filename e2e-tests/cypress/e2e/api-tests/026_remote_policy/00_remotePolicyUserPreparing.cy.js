import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Policies", { tags: ['remote_policy', 'secondPool', 'all'] }, () => {

    const MainSRUsername = Cypress.env('MainSRUser');
    const MainUserUsername = Cypress.env('MainUser');
    const DepSRUsername = Cypress.env('DepSRUser');
    const DepUserUsername = Cypress.env('DepUser');
    const MGSAdminUsername = Cypress.env('MGSAdmin');
    const password = Cypress.env('Password');
    const tenantName = "testTenantFromOS";
    const email = "apitestosnna@envisionblockchain.com";

    let depUserData, tenantId;

    it("Create dependent users (Local Server)", () => {
        // 1. Ensure Local Users exist
        cy.registerIfMissing(DepSRUsername, password, 'STANDARD_REGISTRY');
        cy.registerIfMissing(DepUserUsername, password, 'USER');

        // 2. Setup DepSR Profile
        Authorization.getAccessToken(DepSRUsername).then((auth) => {
            const srProfileBody = {
                useFireblocksSigning: false,
                vcDocument: {
                    geography: "testGeography",
                    law: "testLaw",
                    tags: "testTags",
                    type: "StandardRegistry",
                    "@context": [],
                }
            };
            cy.setupLocalProfile(DepSRUsername, auth, srProfileBody);
        });

        // 3. Setup DepUser Profile linked to DepSR
        Authorization.getAccessToken(DepUserUsername).then((auth) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + 'accounts/standard-registries/aggregated',
                headers: { authorization: auth }
            }).then((res) => {
                const srDid = res.body.find(u => u.username === DepSRUsername)?.did;
                cy.setupLocalProfile(DepUserUsername, auth, { parent: srDid });
            });
        });

        // 4. Store DepUser data for later "Remote" linking
        Authorization.getAccessToken(DepUserUsername).then((auth) => {
            cy.getUserProfile(auth, DepUserUsername).then((data) => {
                depUserData = data;
            });
        });
    });

    it("Create main users (MGS Tenant Flow)", () => {
        // 1. Setup Tenant and SR User
        Authorization.getAccessTokenMGS(MGSAdminUsername, null).then((adminAuth) => {
            cy.setupMGSTenantAndUser(adminAuth, tenantName, MainSRUsername, password, "STANDARD_REGISTRY")
                .then(({ tenantId: id }) => {
                    tenantId = id;

                    // 2. Get Keys and Update SR Profile in MGS
                    Authorization.getAccessToken(DepSRUsername).then((localAuth) => {
                        cy.getHederaKeys(localAuth).then((keys) => {
                            Authorization.getAccessTokenMGS(MainSRUsername, tenantId).then((srAuth) => {
                                // Accept Terms
                                cy.request({
                                    method: METHOD.POST,
                                    url: API.ApiMGS + API.TermsAgree,
                                    headers: { authorization: srAuth },
                                    body: { terms: "MGS.v2" }
                                });

                                // Setup Profile
                                cy.setupProfile(srAuth, MainSRUsername, {
                                    hederaAccountId: keys.id,
                                    hederaAccountKey: keys.key,
                                    vcDocument: { OrganizationName: "g", City: "g", Country: "g" }, // ... shortened for brevity
                                    useFireblocksSigning: false
                                });
                            });
                        });
                    });
                });
        });

        // 3. Setup Main User and Link as REMOTE
        Authorization.getAccessTokenMGS(MGSAdminUsername, null).then((adminAuth) => {
            cy.setupMGSTenantAndUser(adminAuth, tenantName, MainUserUsername, password, "USER").then(() => {
                Authorization.getAccessTokenMGS(MainUserUsername, tenantId).then((userAuth) => {
                    // Accept Terms
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiMGS + API.TermsAgree,
                        headers: { authorization: userAuth },
                        body: { terms: "MGS.v2" }
                    });

                    // Link Remote Profile using stored depUserData
                    cy.request({
                        method: METHOD.GET,
                        url: API.ApiMGS + 'accounts/standard-registries',
                        headers: { authorization: userAuth }
                    }).then((res) => {
                        const mainSRDid = res.body.find(u => u.username === MainSRUsername)?.did;
                        
                        cy.request({
                            method: METHOD.PUT,
                            url: API.ApiMGS + API.Profiles + MainUserUsername,
                            headers: { authorization: userAuth },
                            body: {
                                didDocument: depUserData.didDocument.document,
                                hederaAccountId: depUserData.hederaAccountId,
                                parent: mainSRDid,
                                topicId: depUserData.topicId,
                                type: "remote"
                            },
                            timeout: 180000
                        });
                    });
                });
            });
        });
    });
    
});