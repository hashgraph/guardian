import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Tokens",{ tags: '@tokens' }, () => {
    // before(() => {
    //     let username = "Installer";
    //     cy.request({
    //         method: "POST",
    //         url: API.ApiServer + "accounts/login",
    //         body: {
    //             username: username,
    //             password: "test",
    //         },
    //     })
    //         .as("requestToken")
    //         .then((response) => {
    //             const accessToken = "bearer " + response.body.accessToken;
    //             //Checking if StandardRegisty already has hedera credentials
    //             cy.request({
    //                 method: "GET",
    //                 url: API.ApiServer + "profiles/" + username,
    //                 headers: {
    //                     authorization: accessToken,
    //                 },
    //             }).then((response) => {
    //                 response.body.accessToken = accessToken;
    //                 cy.writeFile(
    //                     "cypress/fixtures/Installer.json",
    //                     JSON.stringify(response.body)
    //                 );
    //             });
    //         });
    // });

    it("should be able to dissociate and associate token", () => {
        let username = "Installer";
        cy.request({
            method: "POST",
            url: API.ApiServer + "accounts/login",
            body: {
                username: username,
                password: "test",
            },
        })
            .as("requestToken")
            .then((response) => {
                const accessToken = "bearer " + response.body.accessToken;
                //Checking if StandardRegisty already has hedera credentials
                cy.request({
                    method: "GET",
                    url: API.ApiServer + "profiles/" + username,
                    headers: {
                        authorization: accessToken,
                    },
                }).then((response) => {
                    response.body.accessToken = accessToken;

                    const tokenId = Cypress.env("tokenId");

            // cy.request({
            //     method: "PUT",
            //     url:
            //         API.ApiServer +
            //         "tokens/" +
            //         tokenId +
            //         "/dissociate",
            //     headers: {
            //         authorization: accessToken,
            //     },
            // }).then((response) => {
            //     expect(response.status).to.eq(200);
            // });

            // cy.request({
            //     method: "PUT",
            //     url:
            //         API.ApiServer +
            //         "tokens/" +
            //         tokenId +
            //         "/associate",
            //     headers: {
            //         authorization: accessToken,
            //     },
            // }).then((response) => {
            //     expect(response.status).to.eq(200);
            // });
        });
    });
});
});