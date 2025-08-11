import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Update password", { tags: ['accounts', 'firstPool', 'all'] }, () => {

    const name = "TestUserRegistration";

    it("Change password", () => {
        Authorization.getAccessToken(name).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.ChangePassword,
                body: {
                    username: name,
                    oldPassword: "test",
                    newPassword: "test1"
                },
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                expect(response.body).to.have.property("username", name);
                expect(response.body).to.have.property("role", "USER");
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.AccountsLogin,
                    body: {
                        username: name,
                        password: "test1"
                    }
                }).then((response) => {
                    expect(response.status).to.eq(STATUS_CODE.OK);
                    expect(response.body).to.have.property("username", name);
                    expect(response.body).to.have.property("role", "USER");
                });
            })
        })
    })

    it("Change password without body - Negative", () => {
        Authorization.getAccessTokenWithPass(name, "test1").then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.ChangePassword,
                failOnStatusCode: false,
                headers: {
                    authorization,
                }
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.UNPROCESSABLE);
            })
        })
    })

    it("Change password with wrong password body - Negative", () => {
        Authorization.getAccessTokenWithPass(name, "test1").then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.ChangePassword,
                body: {
                    username: name,
                    oldPassword: "test",
                    newPassword: "test2"
                },
                headers: {
                    authorization,
                },
                failOnStatusCode: false
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
            })
        })
    })

    it('Change password without username - Negative', () => {
        Authorization.getAccessTokenWithPass(name, "test1").then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.ChangePassword,
                body: {
                    oldPassword: "test",
                    newPassword: "test1"
                },
                headers: {
                    authorization,
                },
                failOnStatusCode: false
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.UNPROCESSABLE);
            })
        })
    })

    it('Change password without old password - Negative', () => {
        Authorization.getAccessTokenWithPass(name, "test1").then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.ChangePassword,
                body: {
                    username: name,
                    newPassword: "test1"
                },
                headers: {
                    authorization,
                },
                failOnStatusCode: false
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.UNPROCESSABLE);
            })
        })
    })

    it('Change password with wrong username - Negative', () => {
        Authorization.getAccessTokenWithPass(name, "test1").then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.ChangePassword,
                body: {
                    username: name + "fdsafds",
                    oldPassword: "test",
                    newPassword: "test1"
                },
                headers: {
                    authorization,
                },
                failOnStatusCode: false
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
            })
        })
    })

    it('Change password with sql infection - Negative', () => {
        Authorization.getAccessTokenWithPass(name, "test1").then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.ChangePassword,
                body: {
                    username: 'select * from users where id = 1 or 1=1',
                    oldPassword: "test",
                    newPassword: "test1"
                },
                headers: {
                    authorization,
                },
                failOnStatusCode: false
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
            })
        });
    })

    it("Change password with weak password - Negative", () => {
        Authorization.getAccessTokenWithPass(name, "test1").then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.ChangePassword,
                body: {
                    username: name,
                    oldPassword: "test1",
                    newPassword: "tt"
                },
                headers: {
                    authorization,
                },
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.UNPROCESSABLE);
                expect(response.body.message).eql(
                    "Password must be at least 4 characters long."
                );
            })
        });
    })

    it("Get list of users without auth - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ChangePassword,
            body: {
                username: name,
                oldPassword: "test1",
                newPassword: "test"
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get list of users with incorrect auth - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ChangePassword,
            headers: {
                authorization: "bearer 11111111111111111111@#$",
                body: {
                    username: name,
                    oldPassword: "test1",
                    newPassword: "test"
                },
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get list of users with empty auth - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ChangePassword,
            body: {
                username: name,
                oldPassword: "test1",
                newPassword: "test"
            },
            headers: {
                authorization: "",
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });
});
