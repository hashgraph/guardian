import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Register", { tags: ['accounts', 'firstPool', 'all'] }, () => {

    const name = "TestUserRegistration";
    const SRUsername = Cypress.env('SRUser');

    it("Register and login as new user", { tags: ['smoke'] }, () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.AccountRegister,
            body: {
                username: name,
                password: "test",
                password_confirmation: "test",
                role: "USER",
            }
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.SUCCESS);
            expect(response.body).to.have.property("username", name);
            expect(response.body).to.have.property("id");
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.AccountsLogin,
                body: {
                    username: name,
                    password: "test"
                }
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                expect(response.body).to.have.property("username", name);
                expect(response.body).to.have.property("role", "USER");
                expect(response.body).to.have.property("weakPassword", false);
            });
        });
    });

    it("Register without body - Negative", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.AccountRegister,
            body: {
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNPROCESSABLE);
        });
    });

    it('Register without username - Negative', () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.AccountRegister,
            body: {
                password: "test",
            },
            failOnStatusCode: false,
        }).then(response => {
            expect(response.status).eql(STATUS_CODE.UNPROCESSABLE);
        });
    });

    it('Register without password - Negative', () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.AccountRegister,
            body: {
                username: name,
            },
            failOnStatusCode: false,
        }).then(response => {
            expect(response.status).eql(STATUS_CODE.UNPROCESSABLE);
        });
    });

    it('Register with invalid type of username - Negative', () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.AccountRegister,
            body: {
                username: true,
                password: "test",
            },
            failOnStatusCode: false,
        }).then(response => {
            expect(response.status).eql(STATUS_CODE.UNPROCESSABLE);
        });
    });

    it('Register with invalid input data - Negative', () => {
        const name = Math.floor(Math.random() * 999) + "test001";
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.AccountRegister,
            body: {
                username: name,
                name: "test",
            },
            failOnStatusCode: false,
        }).then(response => {
            expect(response.status).eql(STATUS_CODE.UNPROCESSABLE);
        });
    });

    it('Register with wrong method - Negative', () => {
        const name = Math.floor(Math.random() * 999) + "test001";
        cy.request({
            method: METHOD.PUT,
            url: API.ApiServer + API.AccountRegister,
            body: {
                username: name,
                password: "test",
            },
            failOnStatusCode: false,
        }).then(response => {
            expect(response.status).eql(STATUS_CODE.NOT_FOUND);
        });
    });

    it('Register with wrong URL - Negative', () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.AccountRegister + "wrong",
            body: {
                username: name,
                password: "test",
            },
            failOnStatusCode: false,
        }).then(response => {
            expect(response.status).eql(STATUS_CODE.NOT_FOUND);
        });
    });

    it('Register with extra data - Negative', () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.AccountRegister,
            body: {
                username: name,
                password: "test",
                status: "Draft",
            },
            failOnStatusCode: false,
        }).then(response => {
            expect(response.status).eql(STATUS_CODE.UNPROCESSABLE);
        });
    });

    it('Register with sql infection - Negative', () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.AccountRegister,
            body: {
                username: 'select * from users where id = 1 or 1=1',
                password: "test",
            },
            failOnStatusCode: false,
        }).should(response => {
            expect(response.status).eql(STATUS_CODE.UNPROCESSABLE);
        });
    });

    it('Register with already registered username - Negative', () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.AccountRegister,
            body: {
                username: SRUsername,
                password: "test",
                password_confirmation: "test",
                role: "USER"
            },
            failOnStatusCode: false,
        }).then(response => {
            expect(response.status).eql(STATUS_CODE.CONFLICT);
            expect(response.body.message).eql("An account with the same name already exists.");
        });
    });

    it('Register with user password mismatch - Negative', () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.AccountRegister,
            body: {
                username: name,
                password: "test",
                password_confirmation: "testtest",
                role: "USER"
            },
            failOnStatusCode: false,
        }).then(response => {
            cy.log(response)
            expect(response.status).eql(STATUS_CODE.UNPROCESSABLE);
            expect(response.body.message).eql([
                "Passwords must match"
            ]);
        });
    });

    //password validation sets to easy + 4 length for CICD, so we cannot get weak password
    it('Register user with weak password - Negative', () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.AccountRegister,
            body: {
                username: name + 'test',
                password: "tt",
                password_confirmation: "tt",
                role: "USER"
            },
            failOnStatusCode: false,
        }).then(response => {
            cy.log(response)
            expect(response.status).eql(STATUS_CODE.UNPROCESSABLE);
            expect(response.body.message).eql(
                "Password must be at least 4 characters long."
            );
        });
    });
});
