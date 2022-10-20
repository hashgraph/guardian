import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";


context("Accounts", { tags: "@accounts" }, () => {
    it("register a new user and login with it", () => {
        const name = Math.floor(Math.random() * 999) + "test001";
        cy.request("POST", API.ApiServer + "accounts/register", {
            username: name,
            password: "test",
        })
            .should((response) => {
                expect(response.status).to.eq(201);
                expect(response.body).to.have.property("username", name);
                expect(response.body).to.have.property("did", null);
                expect(response.body).to.have.property("role", "USER");
                expect(response.body).to.have.property("id");
            })
            .then(() => {
                cy.request(
                    "POST",
                    API.ApiServer + "accounts/login",
                    {
                        username: name,
                        password: "test",
                    }
                ).should((response) => {
                    expect(response.status).to.eq(200);
                    expect(response.body).to.have.property("username", name);
                    expect(response.body).to.have.property("role", "USER");
                });
            });
    });

    //Negative

    it("should attempt to register a user with no body", () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.AccountRegister,
            headers: {
            },
            failOnStatusCode:false,
        }).then((resp) => {
            expect(resp.status).eql(STATUS_CODE.ERROR);
        });
    });


    it('should attempt to register a user with missing fields - username', () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.AccountRegister,
            headers: {
                password: "test",
            },
            failOnStatusCode:false,
        }).then(resp => {
            expect(resp.status).eql(STATUS_CODE.ERROR);
        });
    });

    it('should attempt to register a user with missing fields - password', () => {
        const name = Math.floor(Math.random() * 999) + "test001";
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.AccountRegister,
            headers: {
                username: name,
            },
            failOnStatusCode:false,
        }).then(resp => {
            expect(resp.status).eql(STATUS_CODE.ERROR);
        });
    });


    it('should attempt to register a user with invalid type', () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.AccountRegister,
            headers: {
                username: true,
                password: "test",
            },
            failOnStatusCode:false,
        }).then(response => {
            expect(response.status).eql(STATUS_CODE.ERROR);
        });
    });

    it('should attempt to create a user with invalid input', () => {
        const name = Math.floor(Math.random() * 999) + "test001";
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.AccountRegister,
            headers: {
                username: name,
                name: "test",
            },
            failOnStatusCode:false,
        }).then(response => {
            expect(response.status).eql(STATUS_CODE.ERROR);
        });
    });

    it('should attempt to register a user with invalid request method', () => {
        const name = Math.floor(Math.random() * 999) + "test001";
        cy.request({
            method: METHOD.PUT,
            url: API.ApiServer + API.AccountRegister,
            headers: {
                username: name,
                password: "test",
            },
            failOnStatusCode:false,
        }).then(response => {
            expect(response.status).eql(STATUS_CODE.NOT_FOUND);
        });
    });

    it('should attempt to register a user with invalid endpoint', () => {
        const name = Math.floor(Math.random() * 999) + "test001";
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.AccountRegister + "test",
            headers: {
                username: name,
                password: "test",
            },
            failOnStatusCode:false,
        }).then(response => {
            expect(response.status).eql(STATUS_CODE.NOT_FOUND);
        });
    });


    it('should attempt to register a user with extra data', () => {
        const name = Math.floor(Math.random() * 999) + "test001";
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.AccountRegister,
            headers: {
                username: name,
                password: "test",
                status: "Draft",
            },
            failOnStatusCode:false,
        }).then(response => {
            expect(response.status).eql(STATUS_CODE.ERROR);
        });
    });

    it('should attempt to put sql injection', () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.AccountRegister,
            headers: {
                username: 'select * from users where id = 1 or 1=1',
                password: "test",
            },
            failOnStatusCode:false,
        }).should(response => {
            expect(response.status).eql(STATUS_CODE.ERROR);
        });
    });

});
