import { METHOD } from "../support/api/api-const";
import API from "../support/ApiUrls";
let refreshToken;

export const getAccessToken = (username) => {
    return cy.request({
        method: METHOD.POST,
        url: API.ApiServer + API.AccountsLogin,
        body: {
            username: username,
            password: "test"
        }
    }).then((response) => {
        //Get AT
        refreshToken = response.body.refreshToken
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.AccessToken,
            body: {
                refreshToken: response.body.refreshToken
            }
        }).then((response) => {
            return "Bearer " + response.body.accessToken;
        })
    })
}

export const getAccessTokenWithPass = (username, password) => {
    return cy.request({
        method: METHOD.POST,
        url: API.ApiServer + API.AccountsLogin,
        body: {
            username: username,
            password: password
        }
    }).then((response) => {
        //Get AT
        refreshToken = response.body.refreshToken
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.AccessToken,
            body: {
                refreshToken: response.body.refreshToken
            }
        }).then((response) => {
            return "Bearer " + response.body.accessToken;
        })
    })
}

export const getAccessTokenMGS = (username, tenantId) => {
    return cy.request({
        method: METHOD.POST,
        url: API.ApiMGS + API.AccountsLogin,
        body: {
            username: username,
            password: "test",
            tenantId: tenantId
        }
    }).then((response) => {
        //Get AT
        refreshToken = response.body.refreshToken
        cy.request({
            method: METHOD.POST,
            url: API.ApiMGS + API.AccessToken,
            body: {
                refreshToken: response.body.refreshToken
            }
        }).then((response) => {
            return "Bearer " + response.body.accessToken;
        })
    })
}

export const getAccessTokenByRefreshToken = () => {
    return cy.request({
        method: METHOD.POST,
        url: API.ApiServer + API.AccessToken,
        body: {
            refreshToken: refreshToken
        }
    }).then((response) => {
        return "Bearer " + response.body.accessToken;
    })
}