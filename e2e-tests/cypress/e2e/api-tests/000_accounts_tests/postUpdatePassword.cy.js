
import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Authorization from "../../../support/authorization";

context("Update password", { tags: ['accounts', 'firstPool', 'all'] }, () => {

    const name = "TestUserRegistration";
    const changePasswordUrl = `${API.ApiServer}${API.ChangePassword}`;
    const loginUrl = `${API.ApiServer}${API.AccountsLogin}`;

    const changePasswordWithAuth = (authorization, body, failOnStatusCode = true) =>
        cy.request({
            method: METHOD.POST,
            url: changePasswordUrl,
            headers: { authorization },
            body,
            failOnStatusCode,
        });

    const changePassword = (body, headers = {}, failOnStatusCode = false) =>
        cy.request({
            method: METHOD.POST,
            url: changePasswordUrl,
            headers,
            body,
            failOnStatusCode,
        });

    const login = (username, password, failOnStatusCode = true) =>
        cy.request({
            method: METHOD.POST,
            url: loginUrl,
            body: { username, password },
            failOnStatusCode,
        });

    it("Change password", () => {
        Authorization.getAccessToken(name).then((authorization) => {
            changePasswordWithAuth(authorization, {
                username: name,
                oldPassword: "test",
                newPassword: "test1",
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK);
                expect(response.body).to.have.property("username", name);
                expect(response.body).to.have.property("role", "USER");

                // Verify new password works
                login(name, "test1").then((loginRes) => {
                    expect(loginRes.status).to.eq(STATUS_CODE.OK);
                    expect(loginRes.body).to.have.property("username", name);
                    expect(loginRes.body).to.have.property("role", "USER");
                });
            });
        });
    });

    it("Change password without body - Negative", () => {
        Authorization.getAccessTokenWithPass(name, "test1").then((authorization) => {
            changePasswordWithAuth(authorization, undefined, false).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.UNPROCESSABLE);
            });
        });
    });

    it("Change password with wrong password body - Negative", () => {
        Authorization.getAccessTokenWithPass(name, "test1").then((authorization) => {
            changePasswordWithAuth(authorization, {
                username: name,
                oldPassword: "test", // wrong old password
                newPassword: "test2",
            }, false).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
            });
        });
    });

    it('Change password without username - Negative', () => {
        Authorization.getAccessTokenWithPass(name, "test1").then((authorization) => {
            changePasswordWithAuth(authorization, {
                oldPassword: "test",
                newPassword: "test1",
            }, false).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.UNPROCESSABLE);
            });
        });
    });

    it('Change password without old password - Negative', () => {
        Authorization.getAccessTokenWithPass(name, "test1").then((authorization) => {
            changePasswordWithAuth(authorization, {
                username: name,
                newPassword: "test1",
            }, false).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.UNPROCESSABLE);
            });
        });
    });

    it('Change password with wrong username - Negative', () => {
        Authorization.getAccessTokenWithPass(name, "test1").then((authorization) => {
            changePasswordWithAuth(authorization, {
                username: `${name}fdsafds`,
                oldPassword: "test",
                newPassword: "test1",
            }, false).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
            });
        });
    });

    it('Change password with sql infection - Negative', () => {
        Authorization.getAccessTokenWithPass(name, "test1").then((authorization) => {
            changePasswordWithAuth(authorization, {
                username: 'select * from users where id = 1 or 1=1',
                oldPassword: "test",
                newPassword: "test1",
            }, false).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.UNAUTHORIZED);
            });
        });
    });

    it("Change password with weak password - Negative", () => {
        Authorization.getAccessTokenWithPass(name, "test1").then((authorization) => {
            changePasswordWithAuth(authorization, {
                username: name,
                oldPassword: "test1",
                newPassword: "tt",
            }, false).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.UNPROCESSABLE);
                expect(response.body.message).eql(
                    "Password must be at least 4 characters long."
                );
            });
        });
    });

    it("Get list of users without auth - Negative", () => {
        changePassword({
            username: name,
            oldPassword: "test1",
            newPassword: "test",
        }, /* headers */ {}, /* failOnStatusCode */ false).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get list of users with incorrect auth - Negative", () => {
        changePassword({
            username: name,
            oldPassword: "test1",
            newPassword: "test",
        }, { authorization: "bearer 11111111111111111111@#$" }, false).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it("Get list of users with empty auth - Negative", () => {
        changePassword({
            username: name,
            oldPassword: "test1",
            newPassword: "test",
        }, { authorization: "" }, false).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });
});
