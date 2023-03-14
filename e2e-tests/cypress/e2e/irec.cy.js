import { METHOD, STATUS_CODE } from "../support/api/api-const";
import API from "../support/ApiUrls";

context("IREC e2e test", { tags: "@e2e" }, () => {
    var accessToken;
    var rootUserDid;
    const name = Math.floor(Math.random() * 99999) + "test001SR";

    it("register a new root user and login with it", () => {
        cy.request("POST", API.ApiServer + "accounts/register", {
            username: name,
            password: "test",
            role: "STANDARD_REGISTRY",
        })
            .should((response) => {
                expect(response.status).to.eq(201);
                expect(response.body).to.have.property("username", name);
                expect(response.body).to.have.property(
                    "role",
                    "STANDARD_REGISTRY"
                );
                expect(response.body).to.have.property("id");
            })
            .then(() => {
                cy.request("POST", API.ApiServer + "accounts/login", {
                    username: name,
                    password: "test",
                }).should((response) => {
                    expect(response.status).to.eq(200);
                    expect(response.body).to.have.property("username", name);
                    expect(response.body).to.have.property(
                        "role",
                        "STANDARD_REGISTRY"
                    );

                    accessToken = "bearer " + response.body.accessToken;

                    cy.request({
                        method: METHOD.GET,
                        url: API.ApiServer + "demo/randomKey",
                        headers: {},
                    }).then((resp) => {
                        expect(resp.status).eql(STATUS_CODE.OK);

                        const rootHederaAccountId = resp.body.id;
                        const rootHederaAccountKey = resp.body.key;

                        cy.request({
                            method: "PUT",
                            url: API.ApiServer + "profiles/" + name,
                            headers: {
                                authorization: accessToken,
                            },
                            body: {
                                hederaAccountId: rootHederaAccountId,
                                hederaAccountKey: rootHederaAccountKey,
                                vcDocument: {
                                    geography: "testGeography",
                                    law: "testLaw",
                                    tags: "testTags",
                                    type: "StandardRegistry",
                                    "@context": [],
                                },
                            },
                            timeout: 200000,
                        }).then((resp) => {
                            expect(resp.status).eql(STATUS_CODE.OK);

                            cy.request({
                                method: "GET",
                                url: API.ApiServer + "profiles/" + name,
                                headers: {
                                    authorization: accessToken,
                                },
                            }).should((response) => {
                                expect(response.status).to.eq(200);
                                expect(response.body).to.have.property(
                                    "confirmed"
                                );
                                expect(response.body).to.have.property(
                                    "did"
                                );
                                expect(response.body).to.have.property(
                                    "username",
                                    name
                                );
                                expect(response.body).to.have.property(
                                    "role",
                                    "STANDARD_REGISTRY"
                                );

                                rootUserDid = response.body.did;
                            });
                        });
                    });
                });
            });
    });

    it("Policy", () => {
        cy.request({
            method: "POST",
            url: API.ApiServer + "policies/import/message",
            body: { messageId: "1678461680.254393969" }, //iRec
            headers: {
                authorization: accessToken,
            },
            timeout: 180000,
        }).then((response) => {
            expect(response.status).to.eq(201);

            let firstPolicyId = response.body[0].id;
            let firstPolicyStatus = response.body[0].status;
            expect(firstPolicyStatus).to.equal("DRAFT");
            cy.request({
                method: "PUT",
                url: API.ApiServer + "policies/" + firstPolicyId + "/publish",
                body: { policyVersion: "1.2.5" },
                headers: { authorization: accessToken },
                timeout: 600000,
            }).should((response) => {
                let secondPolicyId = response.body.policies[0].id;
                let policyStatus = response.body.policies[0].status;
                expect(response.status).to.eq(200);
                expect(response.body).to.not.be.oneOf([null, ""]);
                expect(firstPolicyId).to.equal(secondPolicyId);
                expect(policyStatus).to.equal("PUBLISH");
            });
        });
    });

    it("Tokens", () => {
        const installer = Math.floor(Math.random() * 99999) + "test001User";

        cy.request("POST", API.ApiServer + "accounts/register", {
            username: installer,
            password: "test",
            role: "USER",
        }) .then(() => {
        cy.request({
            method: "POST",
            url: API.ApiServer + "accounts/login",
            body: {
                username: installer,
                password: "test",
            },
        })
            .as("requestToken")
            .then((response) => {
                const accessTokenInstaller = "bearer " + response.body.accessToken;

                    cy.request({
                        method: METHOD.GET,
                        url: API.ApiServer + "demo/randomKey",
                        headers: {},
                    }).then((resp) => {
                        expect(resp.status).eql(STATUS_CODE.OK);

                        const userHederaAccountId = resp.body.id;
                        const userHederaAccountKey = resp.body.key;

                        cy.request({
                            method: "PUT",
                            url: API.ApiServer + "profiles/" + installer,
                            headers: {
                                authorization: accessTokenInstaller,
                            },
                            body: {
                                hederaAccountId: userHederaAccountId,
                                hederaAccountKey: userHederaAccountKey,
                                parent: rootUserDid
                            },
                            timeout: 200000,
                        }).then((resp) => {
                            expect(resp.status).eql(STATUS_CODE.OK);

                            cy.request({
                                method: "GET",
                                url: API.ApiServer + "profiles/" + installer,
                                headers: {
                                    authorization: accessTokenInstaller,
                                },
                            }).should((response) => {
                                expect(response.status).to.eq(200);
                                expect(response.body).to.have.property(
                                    "confirmed"
                                );
                                expect(response.body).to.have.property(
                                    "username",
                                    installer
                                );
                                expect(response.body).to.have.property(
                                    "role",
                                    "USER"
                                );
                            });
                        });
                    });

                    cy.request({
                        method: METHOD.GET,
                        url: API.ApiServer + API.ListOfTokens,
                        headers: {
                            authorization: accessTokenInstaller,
                        },
                    }).then((resp) => {
                        expect(resp.status).eql(STATUS_CODE.OK);
                        expect(resp.body[0]).to.have.property("tokenId");
                        expect(resp.body[0]).to.have.property("tokenName");

                        const tokenId = resp.body[0].tokenId;

                        cy.request({
                            method: "PUT",
                            url:
                                API.ApiServer +
                                "tokens/" +
                                tokenId +
                                "/associate",
                            headers: {
                                authorization: accessTokenInstaller,
                            },
                        }).then((response) => {
                            expect(response.status).to.eq(200);
                            cy.request({
                                method: METHOD.PUT,
                                url:
                                    API.ApiServer +
                                    API.ListOfTokens +
                                    tokenId +
                                    "/" +
                                    name +
                                    "/grantKyc",
                                headers: {
                                    authorization: accessToken,
                                },
                            }).then((resp) => {
                                expect(resp.status).eql(STATUS_CODE.OK);

                                let token = resp.body.tokenId;
                                let kyc = resp.body.kyc;

                                expect(token).to.deep.equal(tokenId);
                                expect(kyc).to.be.true;
                            });
                        });
                    });
                });
            });
    });

    // it("Blocks", () => {
    //     cy.request({
    //         method: METHOD.GET,
    //         url: API.ApiServer + API.Policies,
    //         headers: {
    //             authorization: accessToken,
    //         },
    //     }).then((resp) => {
    //         expect(resp.status).eql(STATUS_CODE.OK);

    //         const policyId = resp.body.id;

    //         cy.request({
    //             method: METHOD.GET,
    //             url:
    //                 API.ApiServer + "policies/" + policyId + "/tag/choose_role",
    //             headers: {
    //                 authorization: accessToken,
    //             },
    //         }).then((response) => {
    //             expect(response.status).to.eq(200);

    //             const roleUuid = response.body.id;

    //             cy.request({
    //                 method: METHOD.POST,
    //                 url:
    //                     API.ApiServer +
    //                     "policies/" +
    //                     policyId +
    //                     "/blocks/" +
    //                     roleUuid,
    //                 headers: {
    //                     authorization: accessToken,
    //                 },
    //             }).then((resp) => {
    //                 expect(resp.status).eql(STATUS_CODE.OK);

    //                 cy.request({
    //                     method: METHOD.GET,
    //                     url:
    //                         API.ApiServer +
    //                         "policies/" +
    //                         policyId +
    //                         "/tag/create_application",
    //                     headers: {
    //                         authorization: accessToken,
    //                     },
    //                 }).then((resp) => {
    //                     expect(resp.status).eql(STATUS_CODE.OK);

    //                     const applicationId = resp.body.id;

    //                     cy.request({
    //                         method: METHOD.GET,
    //                         url:
    //                             API.ApiServer +
    //                             "policies/" +
    //                             policyId +
    //                             "/block/" +
    //                             applicationId,
    //                         headers: {
    //                             authorization: accessToken,
    //                         },
    //                     }).then((resp) => {
    //                         expect(resp.status).eql(STATUS_CODE.OK);

    //                         cy.request({
    //                             method: METHOD.POST,
    //                             url:
    //                                 API.ApiServer +
    //                                 "policies/" +
    //                                 policyId +
    //                                 "/block/" +
    //                                 applicationId,
    //                             headers: {
    //                                 authorization: accessToken,
    //                             },
    //                             body: {
    //                                 type: "{{registrant_schema_type}}",
    //                                 "@context": [
    //                                     "{{registrant_schema_context}}",
    //                                 ],
    //                                 field0: "2022-05-11",
    //                                 field1: {
    //                                     type: "{{registrant_schema_field1_type}}",
    //                                     "@context": [
    //                                         "{{registrant_schema_field1_context}}",
    //                                     ],
    //                                     field0: "Applicant Legal Name",
    //                                     field1: "Registered address line 1",
    //                                     field2: "Registered address line 2",
    //                                     field3: "Registered address line 3",
    //                                     field4: "Postal (ZIP) code",
    //                                     field5: "Country",
    //                                     field6: "Legal Status",
    //                                     field7: "Country of company registration/private residence",
    //                                     field8: "Corporate registration number/passport number",
    //                                     field9: "VAT number",
    //                                     field10: "Website URL",
    //                                     field11:
    //                                         "Main business (e.g. food retailer)",
    //                                     field12: 1,
    //                                     field13: 1,
    //                                     field14:
    //                                         "Name of the Chief Executive Officer/General Manager",
    //                                     field15:
    //                                         "Chief Executive Officer/General Manager passport number",
    //                                     field16:
    //                                         "Please state in which countries the organization is active",
    //                                     field17:
    //                                         "Please list the main (>10%) shareholders",
    //                                     field18: 1,
    //                                     field19: "email@email.com",
    //                                 },
    //                                 field2: {
    //                                     type: "{{registrant_schema_field2_type}}",
    //                                     "@context": [
    //                                         "{{registrant_schema_field2_context}}",
    //                                     ],
    //                                     field0: "Organization Name",
    //                                     field1: "Address line 1",
    //                                     field2: "Address line 2",
    //                                     field3: "Address line 3",
    //                                     field4: "Postal code",
    //                                     field5: "Country",
    //                                     field6: "Contact person",
    //                                     field7: "email@email.com",
    //                                     field8: "123456789",
    //                                     field9: "Fax",
    //                                     field10:
    //                                         "Existing I-REC Registry organization(s) to become subsidiary",
    //                                 },
    //                                 field3: {
    //                                     type: "{{registrant_schema_field3_type}}",
    //                                     "@context": [
    //                                         "{{registrant_schema_field3_context}}",
    //                                     ],
    //                                     field0: "Family Name (surname)",
    //                                     field1: "Other (Given) Names",
    //                                     field2: "Title",
    //                                     field3: "email@email.com",
    //                                     field4: "123456789",
    //                                     field5: "Fax",
    //                                 },
    //                             },
    //                         }).then((resp) => {
    //                             expect(resp.status).eql(STATUS_CODE.OK);
    //                         });
    //                     });
    //                 });
    //             });
    //         });
    //     });
    // });
});
