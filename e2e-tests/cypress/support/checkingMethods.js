const optionKey = "option";
import { METHOD } from "../support/api/api-const";
import API from "../support/ApiUrls";
import CommonElements from "../support/defaultUIElements";

export const whileWipeRequestCreating = (dataToCompare, request, attempts) => {
    if (attempts < 100) {
        attempts++
        cy.wait(3000)
        cy.request(request).then((response) => {
            if (!response?.body?.at(0)?.contractId)
                whileWipeRequestCreating(dataToCompare, request, attempts)
            else {
                let data = response.body.at(0).contractId
                if (data !== dataToCompare)
                    whileWipeRequestCreating(dataToCompare, request, attempts)
            }
        })
    }
}

export const whileRetireRequestCreating = (dataToCompare, authorization, attempts) => {
    let request = {
        method: METHOD.GET,
        url: API.ApiServer + API.WipeRequests,
        headers: {
            authorization,
        },
        qs: {
            contractId: dataToCompare
        }
    }
    if (attempts < 100) {
        attempts++
        cy.wait(3000)
        cy.request(request).then((response) => {
            if (!response.body?.at(0)?.contractId)
                whileRetireRequestCreating(dataToCompare, authorization, attempts)
            else {
                let data = response.body.at(0).contractId
                if (data !== dataToCompare)
                    whileRetireRequestCreating(dataToCompare, authorization, attempts)
            }
        })
    }
}

export const whileRetireRRequestCreating = (dataToCompare, authorization, attempts) => {

    let request = {
        method: METHOD.GET,
        url: API.ApiServer + API.RetireRequests,
        headers: {
            authorization,
        },
        qs: {
            contractId: dataToCompare
        }
    }

    if (attempts < 100) {
        attempts++
        cy.wait(3000)
        cy.request(request).then((response) => {
            if (!response.body?.at(0)?.contractId)
                whileRetireRRequestCreating(dataToCompare, authorization, attempts)
            else {
                let data = response.body.at(0).contractId
                if (data !== dataToCompare)
                    whileRetireRRequestCreating(dataToCompare, authorization, attempts)
            }
        })
    }
}

export const whileApplicationCreating = (dataToCompare, request, attempts) => {
    if (attempts < 100) {
        attempts++
        cy.wait(30000)
        cy.request(request).then((response) => {
            if (!response?.body?.uiMetaData?.title)
                whileApplicationCreating(dataToCompare, request, attempts)
            else {
                let data = response.body.uiMetaData.title
                if (data !== dataToCompare)
                    whileApplicationCreating(dataToCompare, request, attempts)
            }
        })
    }
}

export const whileApplicationApproving = (dataToCompare, request, attempts) => {
    if (attempts < 100) {
        attempts++
        cy.wait(30000)
        cy.request(request).then((response) => {
            if (!response?.body?.fields)
                whileApplicationApproving(dataToCompare, request, attempts)
            else {
                let data = response.body.fields[0]?.title
                if (data !== dataToCompare)
                    whileApplicationApproving(dataToCompare, request, attempts)
            }
        })
    }
}

export const whileDeviceCreating = (dataToCompare, request, attempts) => {
    if (attempts < 100) {
        attempts++
        cy.wait(30000)
        cy.request(request).then((response) => {
            if (!response?.body?.data)
                whileDeviceCreating(dataToCompare, request, attempts)
            else {
                let data = response.body.data[0]?.[optionKey]?.status
                if (data !== dataToCompare)
                    whileDeviceCreating(dataToCompare, request, attempts)
            }
        })
    }
}

export const whileDeviceApproving = (dataToCompare, request, attempts) => {
    if (attempts < 100) {
        attempts++
        cy.wait(30000)
        cy.request(request).then((response) => {
            if (!response?.body?.data)
                whileDeviceApproving(dataToCompare, request, attempts)
            else {
                let data = response.body.data[0]?.[optionKey]?.status
                if (data !== dataToCompare)
                    whileDeviceApproving(dataToCompare, request, attempts)
            }
        })
    }
}

export const whileIssueRequestCreating = (dataToCompare, request, attempts) => {
    if (attempts < 100) {
        attempts++
        cy.wait(30000)
        cy.request(request).then((response) => {
            if (!response?.body?.data)
                whileIssueRequestCreating(dataToCompare, request, attempts)
            else {
                let data = response.body.data[0]?.[optionKey]?.status
                if (data !== dataToCompare)
                    whileIssueRequestCreating(dataToCompare, request, attempts)
            }
        })
    }
}

export const whileIssueRequestApproving = (dataToCompare, request, attempts) => {
    if (attempts < 100) {
        attempts++
        cy.wait(30000)
        cy.request(request).then((response) => {
            if (!response?.body?.data)
                whileIssueRequestApproving(dataToCompare, request, attempts)
            else {
                let data = response.body.data[0]?.[optionKey]?.status
                if (data !== dataToCompare)
                    whileIssueRequestApproving(dataToCompare, request, attempts)
            }
        })
    }
}

export const whileBalanceVerifying = (dataToCompare, request, attempts, tokenId) => {
    if (attempts < 100) {
        attempts++
        let balance
        cy.wait(30000)
        cy.request(request).then((response) => {
            if (!response?.body)
                whileBalanceVerifying(dataToCompare, request, attempts)
            else {
                for (let i = 0; i < response.body.length; i++) {
                    if (response.body[i].tokenId === tokenId)
                        balance = response.body[i].balance
                }
                if (balance !== dataToCompare)
                    whileBalanceVerifying(dataToCompare, request, attempts)
            }
        })
    }
}

export const whilePolicyTestExecuting = (request, attempts = 0) => {
    if (attempts < 100) {
        attempts++
        let test
        cy.wait(3000)
        cy.request(request).then((response) => {
            test = response.body.tests.at(0)
            if (test.progress != null || test.result == null)
                whilePolicyTestExecuting(request, attempts)
        })
    }
}

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

export const waitForElement = (element, maxAttempts = 200, interval = 2000) => {
    if (maxAttempts > 0) {
        maxAttempts--;
        cy.get('body', { log: false }).then((body) => {
            if (body.find(element).length == 0) {
                cy.log(`Waiting for operation to complete after ${interval/1000} seconds...`);
                cy.wait(interval, { log: false });
                waitForElement(element, maxAttempts, interval);
            }
        })
    }
}
//
export const waitForBalanceIncrease = (balance, username, maxAttempts = 200, interval = 10000) => {
    if (maxAttempts > 0) {
        maxAttempts--;
        cy.get('body', { log: false }).then((body) => {
            if (body.find(`td:contains(${balance})`).length == 0) {
                cy.wait(interval, { log: false });
                cy.contains("td", username).siblings().find(CommonElements.svg).click();
                waitForElement(balance, username, maxAttempts, interval);
            }
        })
    }
}

export const waitForLoading = (maxAttempts = 200, interval = 2000) => {
    if (maxAttempts > 0) {
        maxAttempts--;
        cy.get('body', { log: false }).then((body) => {
            if (body.find("div.loading").length != 0) {
                cy.log(`Waiting for operation with dry-run policy to complete after ${interval/1000} seconds...`);
                cy.wait(interval, { log: false });
                waitForLoading(maxAttempts, interval);
            }
        })
    }
}