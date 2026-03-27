const optionKey = "option";
import { STATUS_CODE, METHOD } from "../support/api/api-const";
import API from "../support/ApiUrls";
import CommonElements from "../support/defaultUIElements";

export const whileRequestProccessing = (request, dataToCompare, source, attempts = 0) => {
    if (attempts < 100) {
        attempts++
        cy.wait(3000)
        cy.request(request).then((response) => {
            let start = response.body;
            source.split('.').forEach(part => {
                start = start?.[part]
            })
            if (start !== dataToCompare)
                whileRequestProccessing(request, dataToCompare, source, attempts)
        })
    }
    else {
        throw new Error(`Failed after ${attempts}`)
    }
}

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

export const whileRequestAppear = (authorization, attempts = 0) => {
    if (attempts < 150) {
        attempts++
        cy.wait(3000)
        cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.ExternalPolicyRequests,
            qs: {
                status: "NEW",
                type: "REQUEST"
            },
            headers: {
                authorization,
            },
            timeout: 180000,
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.OK);
            if (response.body.length != 0) {
                if (response.body[0].loaded == false) {
                    cy.request({
                        method: METHOD.PUT,
                        url: API.ApiServer + API.ExternalPolicyRequests + response.body[0].messageId + '/' + API.Reload,
                        headers: {
                            authorization,
                        },
                        timeout: 180000,
                    }).then((response) => {
                        expect(response.status).to.eq(STATUS_CODE.OK);
                        whileRequestAppear(authorization, attempts)
                    })
                }
                else {
                    cy.request({
                        method: METHOD.PUT,
                        url: API.ApiServer + API.ExternalPolicyRequests + response.body[0].messageId + '/' + API.Approve,
                        headers: {
                            authorization,
                        },
                        timeout: 180000,
                    }).then((response) => {
                        expect(response.status).to.eq(STATUS_CODE.OK);
                        cy.task('log', "Request approved")
                    })
                }
            }
            else whileRequestAppear(authorization, attempts)
        })
    }
    else {
        throw new Error(`Failed after ${attempts}`)
    }
}

export const whileIPFSProcessingFile = (request, attempts = 0) => {
    if (attempts < 100) {
        attempts++
        cy.wait(10000)
        cy.request(request).then((response) => {
            if (response.status != 200)
                whileIPFSProcessingFile(request, attempts)
        })
    }
    else {
        throw new Error(`IPFS check failed after ${attempts}`)
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
        cy.get('body').then((body) => {
            cy.log(body.find(element));
            if (body.find(element).length == 0) {
                cy.log(`Waiting for ${element} to complete after ${interval / 1000} seconds...`);
                cy.wait(interval, { log: false });
                waitForElement(element, maxAttempts, interval);
            }
        })
    }
    else
        throw new Error(`${element} doesn't exist after a few attempts...`)
}

export const waitForTaskComplete = (maxAttempts = 200, interval = 2000) => {
    cy.wait(1000);
    if (maxAttempts > 0) {
        maxAttempts--;
        cy.get('body').then((body) => {
            cy.log(body.find("div.task-viewer"));
            if (body.find("div.task-viewer").length != 0) {
                cy.log(`Waiting for operation to complete after ${interval / 1000} seconds...`);
                cy.wait(interval - 1000);
                waitForTaskComplete(maxAttempts, interval);
            }
        })
    }
}

export const waitForBalanceIncrease = (balance, username, maxAttempts = 200, interval = 10000) => {
    if (maxAttempts > 0) {
        maxAttempts--;
        cy.get('body', { log: false }).then((body) => {
            cy.log(body.find(`td:contains(${balance})`));
            if (body.find(`td:contains(${balance})`).length == 0) {
                cy.contains("td", username).siblings().find(CommonElements.svg).click();
                cy.wait(interval, { log: false });
                waitForBalanceIncrease(balance, username, maxAttempts, interval);
            }
        })
    }
}

export const waitForLoading = (maxAttempts = 200, interval = 2000) => {
    if (maxAttempts > 0) {
        maxAttempts--;
        cy.get('body').then((body) => {
            if (body.find("div.loading").length != 0) {
                cy.log(`Waiting for operation to complete after ${interval / 1000} seconds...`);
                cy.wait(interval);
                waitForLoading(maxAttempts, interval);
            }
        })
    }
}