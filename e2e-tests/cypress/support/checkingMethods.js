
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

export const whileRetireRequestCreating = (dataToCompare, request, attempts) => {
    if (attempts < 100) {
        attempts++
        cy.wait(3000)
        cy.request(request).then((response) => {
            if (!response?.body?.at(0)?.contractId)
                whileRetireRequestCreating(dataToCompare, request, attempts)
            else {
                let data = response.body.at(0).contractId
                if (data !== dataToCompare)
                    whileRetireRequestCreating(dataToCompare, request, attempts)
            }
        })
    }
}

export const whileApplicationCreating = (dataToCompare, request, attempts) => {
    if (attempts < 100) {
        attempts++
        cy.wait(3000)
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
        cy.wait(3000)
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
        cy.wait(3000)
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
        cy.wait(3000)
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
        cy.wait(3000)
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
        cy.wait(3000)
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

export const whileBalanceVerifying = (dataToCompare, request, attempts) => {
    if (attempts < 100) {
        attempts++
        let balance
        cy.wait(3000)
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