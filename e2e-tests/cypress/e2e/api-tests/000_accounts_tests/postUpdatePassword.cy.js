import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Update password", { tags: ['accounts', 'firstPool', 'all'] }, () => {

    const name = "TestUserRegistration";

    it("Change password", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ChangePassword,
            body: {
                username: name,
                oldPassword: "test",
                newPassword: "test1"
            }
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
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.AccountsLogin,
                body: {
                    username: name,
                    password: "test"
                },
                failOnStatusCode: false
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
            });
        })
    })

    it("Change password without body - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ChangePassword,
            failOnStatusCode: false
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNPROCESSABLE);
        })
    })

    it("Change password with wrong password body - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ChangePassword,
            body: {
                username: name,
                oldPassword: "test",
                newPassword: "test2"
            },
            failOnStatusCode: false
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        })
    })

    it('Change password without username - Negative', () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ChangePassword,
            body: {
                oldPassword: "test",
                newPassword: "test1"
            },
            failOnStatusCode: false
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNPROCESSABLE);
        })
    })

    it('Change password without old password - Negative', () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ChangePassword,
            body: {
                username: name,
                newPassword: "test1"
            },
            failOnStatusCode: false
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNPROCESSABLE);
        })
    })

    it('Change password with wrong username - Negative', () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ChangePassword,
            body: {
                username: name + "fdsafds",
                oldPassword: "test",
                newPassword: "test1"
            },
            failOnStatusCode: false
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        })
    })

    it('Change password with sql infection - Negative', () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ChangePassword,
            body: {
                username: 'select * from users where id = 1 or 1=1',
                oldPassword: "test",
                newPassword: "test1"
            },
            failOnStatusCode: false
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
        })
    });

    it("Change password with weak password - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.ChangePassword,
            body: {
                username: name,
                oldPassword: "test",
                newPassword: "tt"
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNPROCESSABLE);
            expect(response.body.message).eql(
                "Password must be at least 4 characters long."
            );
        })
    });
});
