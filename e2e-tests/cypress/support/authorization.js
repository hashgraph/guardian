import { METHOD } from '../support/api/api-const';
import API from '../support/ApiUrls';
let refreshToken;

export const getAccessToken = (username) => {
    return cy.fixture('credentials').then(({ goodPassword }) => {
        return cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.AccountsLogin,
            body: {
                username,
                password: goodPassword
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
                return 'Bearer ' + response.body.accessToken;
            })
        })
    })
}

export const getAccessTokenWithPass = (username, password) => {
    return cy.request({
        method: METHOD.POST,
        url: API.ApiServer + API.AccountsLogin,
        body: {
            username,
            password
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
            return 'Bearer ' + response.body.accessToken;
        })
    })
}

export const getAccessTokenMGS = (username, tenantId) => {
    return cy.fixture('credentials').then(({ goodPassword }) => {
        return cy.request({
            method: METHOD.POST,
            url: API.ApiMGS + API.AccountsLogin,
            body: {
                username,
                password: goodPassword,
                tenantId
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
                return 'Bearer ' + response.body.accessToken;
            })
        })
    })
}

export const getAccessTokenByRefreshToken = () => {
    return cy.request({
        method: METHOD.POST,
        url: API.ApiServer + API.AccessToken,
        body: {
            refreshToken
        }
    }).then((response) => {
        return 'Bearer ' + response.body.accessToken;
    })
}