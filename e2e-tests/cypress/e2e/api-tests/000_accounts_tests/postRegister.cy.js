import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";

context("Register", { tags: ['accounts', 'firstPool', 'all'] }, () => {

    const name = "TestUserRegistration";
    const SRUsername = Cypress.env('SRUser');

    const postRegister = (body = {}, failOnStatusCode = false) => {
        return cy.request({
            method: METHOD.POST,
            url: `${API.ApiServer}${API.AccountRegister}`,
            body,
            failOnStatusCode,
        });
    };

    it("Register and login as new user", { tags: ['smoke'] }, () => {
        postRegister({
            username: name,
            password: "test",
            password_confirmation: "test",
            role: "USER",
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.SUCCESS);
            expect(response.body).to.have.property("username", name);
            expect(response.body).to.have.property("id");
            cy.request({
                method: METHOD.POST,
                url: `${API.ApiServer}${API.AccountsLogin}`,
                body: {
                    username: name,
                    password: "test"
                }
            }).then((loginRes) => {
                expect(loginRes.status).to.eq(STATUS_CODE.OK);
                expect(loginRes.body).to.have.property("username", name);
                expect(loginRes.body).to.have.property("role", "USER");
            });
        });
    });

    it("Register without body - Negative", () => {
        postRegister({}).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNPROCESSABLE);
        });
    });

    it('Register without username - Negative', () => {
        postRegister({ password: 'test' }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNPROCESSABLE);
        });
    });

    it('Register without password - Negative', () => {
        postRegister({ username: name }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNPROCESSABLE);
        });
    });

    it('Register with invalid type of username - Negative', () => {
        postRegister({ username: true, password: 'test' }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNPROCESSABLE);
        });
    });

    it('Register with invalid input data - Negative', () => {
        const randomName = `${Math.floor(Math.random() * 999)}test001`;
        postRegister({ username: randomName, name: 'test' }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNPROCESSABLE);
        });
    });

    it('Register with wrong method - Negative', () => {
        cy.request({
            method: METHOD.PUT,
            url: `${API.ApiServer}${API.AccountRegister}`,
            body: { username: name, password: "test" },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.NOT_FOUND);
        });
    });

    it('Register with wrong URL - Negative', () => {
        cy.request({
            method: METHOD.POST,
            url: `${API.ApiServer}${API.AccountRegister}wrong`,
            body: { username: name, password: "test" },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.NOT_FOUND);
        });
    });

    it('Register with extra data - Negative', () => {
        postRegister({
            username: name,
            password: 'test',
            status: 'Draft'
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNPROCESSABLE);
        });
    });

    it('Register with sql injection - Negative', () => {
        postRegister({
            username: 'select * from users where id = 1 or 1=1',
            password: 'test',
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNPROCESSABLE);
        });
    });

    it('Register with already registered username - Negative', () => {
        postRegister({
            username: SRUsername,
            password: 'test',
            password_confirmation: 'test',
            role: 'USER',
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.CONFLICT);
            expect(response.body.message).to.eq('An account with the same name already exists.');
        });
    });

    it('Register with user password mismatch - Negative', () => {
        postRegister({
            username: name,
            password: 'test',
            password_confirmation: 'testtest',
            role: 'USER',
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.UNPROCESSABLE);
            expect(response.body.message).to.deep.eq(['Passwords must match']);
        });
    });

    // password validation sets to easy + 4 length for CICD, so we cannot get weak password
    it.skip('Register user with weak password - Negative', () => {
        postRegister({
            username: name + 'test',
            password: "tt",
            password_confirmation: "tt",
            role: "USER"
        }).then(response => {
            expect(response.status).to.eq(STATUS_CODE.UNPROCESSABLE);
            expect(response.body.message).to.eq("Password must be at least 4 characters long.");
        });
    });

});