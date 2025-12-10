import CommonElements from "../../../support/defaultUIElements";
import * as Checks from "../../../support/checkingMethods";

const d = new Date(2022, 3, 3);

const UserPoliciesPageLocators = {
    roleSelect: '[formcontrolname="roleOrGroup"]',
    role: (roleName) => `li[aria-label="${roleName}"]`,
    nextButton: "button[label='Next']",
    requestDocumentBlock: "request-document-block",
    nextButtonInApplicationRegister: "button:contains('Next ')",
    submitButton: "button:contains('Submit ')",
    divTitle: "div.title",
    waitingForApprovalTitle: "span[title='Waiting for approval']",
    signedStatus: "div.status-SIGNED",
    deviceTab: "Devices",
    issueRequestsTab: "Issue Requests",
    createDeviceButton: " Create New Device ",
    createIssueRequestButton: " Create Issue Request ",
    createButton: 'button:contains("Create")',
    requiredFillDateLabel: "Please make sure the field contain a valid date value",
    requiredFillNumberLabel: "Please make sure the field contain a valid number value",
    signButton: 'div.btn-SIGN',
    vvbName: 'div:contains(" VVB Name ")',
    ppName: 'h1:contains("New PP")',
    newVerraProjectButton: 'button:contains(" New Project ")',
    newProjectButton: 'button:contains(" New project ")',
    enterTextInput: '[placeholder="Please enter text here"]',
    enterNumInput: '[placeholder="123"]',
    enterEmailInput: '[placeholder="example@email.com"]',
    chooseOptionInput: '[placeholder="Not selected"] span:contains("Not selected")',
    enterPosInputVerra: '[placeholder="[1.23,4.56]"]',
    enterPosInput: '[id="coordinatesInput"]',
    waitingForAdded: "span[title='Waiting to be Added']",
    ddAssignName: "p-dropdown[optionlabel='name']",
    projectTab: "Projects",
    validated: "span[title='Validated']",
    verified: "span[title='Verified']",
    approveButton: 'div.btn-approve',
    createReportButton: "button:contains(' Add Report ')",
    monitoringReports: "p:contains('Monitoring reports')",
    revokeButton: "button-block div:contains(' Revoke ')",
    waitingForValidation: "span[title = 'Waiting for Validation']",
    waitingForVerification: "span[title = 'Waiting for Verification']",
    IPFSInput: "div.ipfs-url input",
    IPFSErrorLabel: " Invalid IPFS CID/URL ",
    addLocButton: "button.add-btn",
    addGeoButton: "Add Geometry",
    geoJSONTypeDropdown: "p-dropdown[id='typeDropdown']",
    geoJSONTypeDropdownList: "p-dropdown[id='typeDropdown'] li",
    geoJSONErrorLabel: "A GeoJSON object is required",
    switchButtonGeoJSONInput: "switch-button",
    includeAllButton: "Include all",
    clearButton: "Clear",
    locationPanel: "div.location-control",
    largeFileLabelHeader: "This file is too large to view.",
    largeFileLabelHeaderJSON: "File was imported successfully, but it’s too large to view.",
    largeFileLabel: "largeGeoJSON.kml (32 MB) exceeds in-browser preview limits.",

    policiesList: "/api/v1/policies?pageIndex=0&pageSize=10",
    passInput: '[formcontrolname="password"]',
    submitBtn: '[type="submit"]',
    applicationRegBtns: 'div.page-btns',
    appRegistrantDetails: "/api/v1/profiles/Registranttt",
    tokensWaiter: "/api/v1/tokens",
    inputGroupLabel: '[formcontrolname="groupLabel"]',
    profileTab: "Profile",
    tokensBtn: "TOKENS",
    createIsssueRequestBtn: "Create Issue Request",
    hederaId: "HEDERA ID",
    profileValue: "div.account-item-value",
    profilePage: '/api/v1/schemas/system/entity/USER',
    balance: '/api/v1/profiles/Registrant/balance',
    approvalLabel: 'app-information-block',
    tokenId: 'hedera-explorer > a',
    tokenIdByHistory: 'td.cdk-column-1',
};


export class UserPoliciesPage {

    openPoliciesTab() {
        cy.get(CommonElements.navBar).should('exist')
        cy.get("body").then(($body) => {
            if ($body.find(`span:contains(${CommonElements.userPoliciesTab})`).length == 0)
                cy.get(CommonElements.navBar).contains(CommonElements.mainPoliciesTab).click();
        })
        cy.get(CommonElements.navBar).contains(CommonElements.userPoliciesTab).click();
    }

    registerInPolicy(role = "Registrant") {
        cy.get(UserPoliciesPageLocators.roleSelect).should('be.visible').click();
        cy.get(UserPoliciesPageLocators.role(role)).click();
        cy.get(UserPoliciesPageLocators.nextButton).click();
        if (role == "Registrant") {
            Checks.waitForElement(UserPoliciesPageLocators.requestDocumentBlock);
            cy.get(UserPoliciesPageLocators.nextButtonInApplicationRegister).click();
            cy.get(UserPoliciesPageLocators.nextButtonInApplicationRegister).click();
            cy.get(UserPoliciesPageLocators.submitButton).click();
            Checks.waitForElement(UserPoliciesPageLocators.divTitle);
        }
        if (role == "Project_Proponent") {
            Checks.waitForElement(UserPoliciesPageLocators.requestDocumentBlock);
            cy.get(UserPoliciesPageLocators.newVerraProjectButton).click();
            cy.get(UserPoliciesPageLocators.enterTextInput).then((els) => {
                [...els].forEach((el) =>
                    cy.wrap(el).type("Test text", { force: true })
                );
            });
            cy.get(UserPoliciesPageLocators.enterNumInput).then((els) => {
                [...els].forEach((el) => cy.wrap(el).type("123", { force: true }));
            });
            cy.get('input[aria-haspopup="dialog"]').then((els) => {
                [...els].forEach((el) =>
                    cy.wrap(el).type(d.toLocaleDateString("en-GB"))
                );
            });
            cy.get('input[aria-haspopup="dialog"]').then((els) => {
                [...els].forEach((el) =>
                    cy.wrap(el).type(d.toLocaleDateString("ipfs://ba"))
                );
            });
            cy.get(UserPoliciesPageLocators.enterEmailInput).then((els) => {
                [...els].forEach((el) =>
                    cy.wrap(el).type("asd@dsa.dsa")
                );
            });
            cy.get(UserPoliciesPageLocators.chooseOptionInput).then((els) => {
                [...els].forEach((el) => {
                    cy.wrap(el).click();
                    cy.get(CommonElements.dropdownOption);
                });
            });
            cy.get(UserPoliciesPageLocators.enterPosInput).then((els) => {
                [...els].forEach((el) => {
                    cy.wrap(el).type("[1.23,4.56]")
                });
            });
            cy.get(UserPoliciesPageLocators.createButton).click();
            Checks.waitForElement(UserPoliciesPageLocators.waitingForAdded);
        }
        if (role == "VVB") {
            Checks.waitForElement(UserPoliciesPageLocators.vvbName);
            cy.get("div.form-field-value").find(CommonElements.Input).type("VVBName");
            cy.get(UserPoliciesPageLocators.submitButton).click();
            Checks.waitForElement(UserPoliciesPageLocators.divTitle);
        }
        if (role == "Project Participant") {
            Checks.waitForElement(UserPoliciesPageLocators.ppName);
            cy.get("div.form-field-value").find(CommonElements.Input).type("PPName");
            cy.get(UserPoliciesPageLocators.submitButton).click();
            Checks.waitForElement(UserPoliciesPageLocators.divTitle);
        }
        if (role == "Approvers")
            Checks.waitForElement(UserPoliciesPageLocators.signButton);
    }

    registerInPolicySmall() {
        cy.get(UserPoliciesPageLocators.roleSelect).should('be.visible').click();
        cy.get(UserPoliciesPageLocators.role("Registrant")).click();
        cy.get(UserPoliciesPageLocators.nextButton).click();
        Checks.waitForElement(UserPoliciesPageLocators.requestDocumentBlock);
    }

    typeBadIPFS(IPFS) {
        cy.get(UserPoliciesPageLocators.IPFSInput).type(IPFS);
        cy.contains(UserPoliciesPageLocators.IPFSErrorLabel).should('exist');
    }

    validateListOfGeoJSONTypes() {
        cy.get(UserPoliciesPageLocators.addLocButton).click();
        cy.contains(UserPoliciesPageLocators.addGeoButton).click();
        cy.contains(UserPoliciesPageLocators.geoJSONErrorLabel).should('exist');
        cy.get(UserPoliciesPageLocators.geoJSONTypeDropdown).click();
        cy.get(UserPoliciesPageLocators.geoJSONTypeDropdownList).should('have.length', 1);
        cy.get(UserPoliciesPageLocators.geoJSONTypeDropdownList).first().find('span').should('have.text', "Polygon");
    }

    validateGeoJSONFileImport(fileName) {
        cy.get(UserPoliciesPageLocators.addLocButton).click();
        cy.get(UserPoliciesPageLocators.switchButtonGeoJSONInput).click();
        cy.wait(1000);
        cy.get(CommonElements.fileInput).selectFile('cypress/fixtures/' + fileName, { force: true });
        cy.contains(UserPoliciesPageLocators.includeAllButton).click();
        cy.get(UserPoliciesPageLocators.locationPanel).should('have.length', 2);
        cy.contains(UserPoliciesPageLocators.geoJSONErrorLabel).should('not.exist');
        cy.contains(UserPoliciesPageLocators.clearButton).click();
    }

    validateGeoJSONLargeFileImport(fileName) {
        cy.get(UserPoliciesPageLocators.switchButtonGeoJSONInput).click();
        cy.wait(1000);
        cy.get(CommonElements.fileInput).selectFile('cypress/fixtures/' + fileName, { force: true });
        cy.contains(UserPoliciesPageLocators.includeAllButton).click();
        cy.contains(UserPoliciesPageLocators.largeFileLabelHeader).should('exist');
        cy.contains(UserPoliciesPageLocators.largeFileLabel).should('exist');
        cy.get(UserPoliciesPageLocators.switchButtonGeoJSONInput).click();
        cy.contains(UserPoliciesPageLocators.largeFileLabelHeaderJSON).should('exist');
        cy.contains(UserPoliciesPageLocators.largeFileLabel).should('exist');
    }

    openPolicy(name) {
        cy.contains("td", name).siblings().eq(0).click();
        Checks.waitForLoading();
    }

    createDeviceInPolicy() {
        Checks.waitForLoading();
        cy.contains(UserPoliciesPageLocators.deviceTab).click();
        cy.contains(UserPoliciesPageLocators.createDeviceButton).click();
        cy.get(CommonElements.dialogWindow).find(UserPoliciesPageLocators.createButton).click();
        Checks.waitForElement(UserPoliciesPageLocators.waitingForApprovalTitle);
    }

    createIssueRequestInPolicy(ammount = '1') {
        Checks.waitForLoading();
        cy.contains(UserPoliciesPageLocators.deviceTab).click();
        cy.contains(UserPoliciesPageLocators.createIssueRequestButton).click();
        cy.contains(UserPoliciesPageLocators.requiredFillDateLabel).parent().parent().find('input').type('2025-01-03', { force: true })
        cy.contains(UserPoliciesPageLocators.requiredFillDateLabel).parent().parent().find('input').type('2025-01-05', { force: true })
        cy.contains(UserPoliciesPageLocators.requiredFillNumberLabel).parent().parent().find('input').type(ammount)
        cy.get(CommonElements.dialogWindow).find(UserPoliciesPageLocators.createButton).click();
        cy.get(CommonElements.Loading).should('not.exist');
        cy.contains(UserPoliciesPageLocators.issueRequestsTab).click();
        Checks.waitForElement(UserPoliciesPageLocators.waitingForApprovalTitle);
    }

    approve(waitFor = "default") {
        if (waitFor == "default") {
            cy.get(UserPoliciesPageLocators.signButton).click();
            Checks.waitForElement(UserPoliciesPageLocators.signedStatus);
        }
        if (waitFor == "validationLabel") {
            cy.get(UserPoliciesPageLocators.approveButton).click();
            Checks.waitForElement(UserPoliciesPageLocators.validated);
        }
        if (waitFor == "Report") {
            cy.get(UserPoliciesPageLocators.approveButton).click();
            Checks.waitForElement(UserPoliciesPageLocators.verified);
        }
    }

    approveUserInPolicy() {
        this.approve()
    }

    checkRevokeButtonDisappear() {
        cy.wait(2000);
        Checks.waitForLoading();
        cy.get(UserPoliciesPageLocators.revokeButton).should('not.exist')
    }

    approveDeviceInPolicy() {
        Checks.waitForLoading();
        cy.contains(UserPoliciesPageLocators.deviceTab).click();
        this.approve()
    }

    approveIssueRequestInPolicy() {
        Checks.waitForLoading();
        cy.contains(UserPoliciesPageLocators.issueRequestsTab).click();
        this.approve()
    }

    assignProject() {
        cy.get(UserPoliciesPageLocators.ddAssignName).click();
        cy.get(CommonElements.dropdownOption).click();
    }

    approveProject() {
        cy.contains(UserPoliciesPageLocators.projectTab).click();
        this.approve("validationLabel");
    }

    createReport() {
        cy.get("p:contains('Projects')").click();
        cy.get(UserPoliciesPageLocators.createReportButton).click();
        cy.get(UserPoliciesPageLocators.chooseOptionInput).then((els) => {
            [...els].forEach((el) => {
                cy.wrap(el).click();
                cy.get(CommonElements.dropdownOption).first().click();
            });
        });
        cy.get(UserPoliciesPageLocators.chooseOptionInput).then((els) => {
            [...els].forEach((el) => {
                cy.wrap(el).click();
                cy.get(CommonElements.dropdownOption).first().click();
            });
        });
        cy.get(UserPoliciesPageLocators.chooseOptionInput).then((els) => {
            [...els].forEach((el) => {
                cy.wrap(el).click();
                cy.get(CommonElements.dropdownOption).first().click();
            });
        });
        cy.get(UserPoliciesPageLocators.chooseOptionInput).then((els) => {
            [...els].forEach((el) => {
                cy.wrap(el).click();
                cy.get(CommonElements.dropdownOption).first().click();
            });
        });
        cy.get(UserPoliciesPageLocators.enterTextInput).then((els) => {
            [...els].forEach((el) =>
                cy.wrap(el).type("Test text", { force: true })
            );
        });
        cy.get(UserPoliciesPageLocators.enterNumInput).then((els) => {
            [...els].forEach((el) => cy.wrap(el).type("123", { force: true }));
        });
        cy.get('input[aria-haspopup="dialog"]').then((els) => {
            [...els].forEach((el) =>
                cy.wrap(el).type('2025-01-03', { force: true })
            );
        });
        cy.get(UserPoliciesPageLocators.createButton).click();
        cy.get('.preloader-image').should('not.exist');
        cy.get(UserPoliciesPageLocators.monitoringReports).click();
        Checks.waitForElement(UserPoliciesPageLocators.waitingForVerification);
    }

    createReportVerra() {
        cy.get(UserPoliciesPageLocators.createReportButton).click();
        cy.get(UserPoliciesPageLocators.enterTextInput).then((els) => {
            [...els].forEach((el) =>
                cy.wrap(el).type("Test text", { force: true })
            );
        });
        cy.get(UserPoliciesPageLocators.enterNumInput).then((els) => {
            [...els].forEach((el) => cy.wrap(el).type("123", { force: true }));
        });
        cy.get('input[aria-haspopup="dialog"]').then((els) => {
            [...els].forEach((el) =>
                cy.wrap(el).type(d.toLocaleDateString("en-GB"))
            );
        });
        cy.get('input[aria-haspopup="dialog"]').then((els) => {
            [...els].forEach((el) =>
                cy.wrap(el).type("ipfs://ba")
            );
        });
        cy.get(UserPoliciesPageLocators.enterEmailInput).then((els) => {
            [...els].forEach((el) =>
                cy.wrap(el).type("asd@dsa.dsa")
            );
        });
        cy.get(UserPoliciesPageLocators.chooseOptionInput).then((els) => {
            [...els].forEach((el) => {
                cy.wrap(el).click();
                cy.get(CommonElements.dropdownOption);
            });
        });
        cy.get(UserPoliciesPageLocators.enterPosInput).then((els) => {
            [...els].forEach((el) => {
                cy.wrap(el).type("[1.23,4.56]")
            });
        });
        cy.get(UserPoliciesPageLocators.createButton).click();
        cy.get(CommonElements.Loading).should('not.exist');
        cy.get('.preloader-image').should('not.exist');
        cy.get(UserPoliciesPageLocators.monitoringReports).click();
        Checks.waitForElement(UserPoliciesPageLocators.waitingForValidation);
    }

    assignReport() {
        cy.get('p-dropdown[placeholder="Select"]').click();
        cy.get(CommonElements.dropdownOption).click();
        Checks.waitForElement(UserPoliciesPageLocators.waitingForVerification);
    }

    verifyReport() {
        cy.get(CommonElements.Loading).should('not.exist');
        cy.get('.preloader-image').should('not.exist');
        cy.get(UserPoliciesPageLocators.monitoringReports).click();
        this.approve("Report");
    }

    createProject() {
        Checks.waitForLoading();
        cy.get("p:contains('Projects')").click();
        Checks.waitForLoading();
        cy.get(UserPoliciesPageLocators.newProjectButton).click();
        cy.get(UserPoliciesPageLocators.chooseOptionInput).then((els) => {
            cy.log(els.length);
            [...els].forEach((el) => {
                cy.wrap(el).click();
                cy.get(CommonElements.dropdownOption).first().click();
            });
        });
        cy.get(UserPoliciesPageLocators.chooseOptionInput).then((els) => {
            cy.log(els.length);
            [...els].forEach((el) => {
                cy.wrap(el).click();
                cy.get(CommonElements.dropdownOption).first().click();
            });
        });
        cy.get(UserPoliciesPageLocators.chooseOptionInput).then((els) => {
            cy.log(els.length);
            [...els].forEach((el) => {
                cy.wrap(el).click();
                cy.get(CommonElements.dropdownOption).first().click();
            });
        });
        cy.get(UserPoliciesPageLocators.chooseOptionInput).then((els) => {
            cy.log(els.length);
            [...els].forEach((el) => {
                cy.wrap(el).click();
                cy.get(CommonElements.dropdownOption).first().click();
            });
        });
        cy.get(UserPoliciesPageLocators.enterTextInput).then((els) => {
            [...els].forEach((el) =>
                cy.wrap(el).type("Test text", { force: true })
            );
        });
        cy.get(UserPoliciesPageLocators.enterNumInput).then((els) => {
            [...els].forEach((el) => cy.wrap(el).type("1", { force: true }));
        });
        cy.get('input[aria-haspopup="dialog"]').then((els) => {
            [...els].forEach((el) =>
                cy.wrap(el).type('2025-01-03', { force: true })
            );
        });
        cy.get(UserPoliciesPageLocators.enterEmailInput).then((els) => {
            [...els].forEach((el) =>
                cy.wrap(el).type("asd@dsa.dsa")
            );
        });
        cy.get(UserPoliciesPageLocators.enterPosInput).then((els) => {
            [...els].forEach((el) => {
                cy.wrap(el).type("[1.23,4.56]")
            });
        });
        cy.get(UserPoliciesPageLocators.createButton).click();
        Checks.waitForElement(UserPoliciesPageLocators.waitingForValidation);
    }











    createGroup(role) {
        // cy.contains("Policies").click({ force: true });
        // cy.contains("List of Policies").click({ force: true });
        // cy.wait(1000)
        // cy.get("td").first().parent().get("td").eq("6").contains("Open").click();
        // cy.wait(1000)
        // cy.get(RegistrantPageLocators.roleSelect).click().get("p-dropdownitem").contains(role).click();
        // cy.get(RegistrantPageLocators.submitBtn).click({ force: true });
        // cy.intercept("/api/v1/profiles/" + role).as("waitForRegister" + role);
        // cy.wait("@waitForRegister" + role, { timeout: 180000 });
        // cy.get(RegistrantPageLocators.applicationRegBtns).contains("Next").click();
        // cy.get(RegistrantPageLocators.applicationRegBtns).contains("Next").click();
        // cy.get(RegistrantPageLocators.applicationRegBtns).contains("Create").click();
        // cy.wait(90000);
        // cy.contains("Submitted for Approval").should("exist");
    }

    openUserProfile() {
        // cy.visit(URL.Root + URL.Profile);
    }


    openTokensTab() {
        // cy.visit(URL.Root + URL.UserTokens);
    }

    createGroup(role) {
        // cy.contains("Policies").click({force: true});
        // cy.contains("List of Policies").click({force: true});
        // cy.wait(1000)
        // cy.get("td").first().parent().get("td").eq("6").contains("Open").click();
        // cy.wait(1000)
        // cy.get(RegistrantPageLocators.roleSelect).click().get("p-dropdownitem").contains(role).click();
        // cy.get(RegistrantPageLocators.submitBtn).click({force: true});
        // cy.intercept("/api/v1/profiles/" + role).as("waitForRegister" + role);
        // cy.wait("@waitForRegister" + role, { timeout: 180000 });
        // cy.get(RegistrantPageLocators.applicationRegBtns).contains("Next").click();
        // cy.get(RegistrantPageLocators.applicationRegBtns).contains("Next").click();
        // cy.get(RegistrantPageLocators.applicationRegBtns).contains("Create").click();
        // cy.wait(90000);
        // cy.contains("Submitted for Approval").should("exist");
    }


    static waitForPolicyList() {
        // cy.intercept(RegistrantPageLocators.policiesList).as(
        //     "waitForPoliciesList"
        // );
        // cy.wait("@waitForPoliciesList", {timeout: 100000})
    }


    static waitForBalance() {
        // cy.intercept(RegistrantPageLocators.balance).as(
        //     "waitForBalance"
        // );
        // cy.wait(['@waitForBalance', '@waitForBalance'], {timeout: 100000})
    }


    static waitForRegistrant() {
        // cy.intercept(RegistrantPageLocators.profilePage).as(
        //     "waitForRegistrant"
        // );
        // cy.wait("@waitForRegistrant", {timeout: 100000})
    }

    chooseRole(role) {
        // cy.contains("Policies").click({force: true});
        // cy.get("td").first().parent().get("td").eq("4").click();
        // cy.get(RegistrantPageLocators.roleSelect)
        //     .click()
        //     .get("mat-option")
        //     .contains(role)
        //     .click();
        // cy.get(RegistrantPageLocators.submitBtn).click();
        // cy.wait(12000);
        // cy.get(RegistrantPageLocators.submitBtn).click();
    }

    createDevice() {
        // RegistrantPage.waitForRegistrant();
        // cy.contains("Policies").click({force: true});
        // cy.contains("List of Policies").click({force: true});
        // RegistrantPage.waitForPolicyList();
        // cy.get("td").first().parent().get("td").eq("6").contains("Open").click();
        // cy.contains("Devices").click({force: true});
        // cy.intercept("/api/v1/profiles/Registrant").as("waitForRegisterRegistrant");
        // cy.wait("@waitForRegisterRegistrant", { timeout: 180000 });
        // cy.contains(RegistrantPageLocators.createDeviceBtn).click();
        // cy.get(RegistrantPageLocators.submitBtn).last().click();
        // cy.wait(60000);
        // cy.contains("Waiting for approval").should("exist");
    }


    createIssueRequest() {
        // RegistrantPage.waitForRegistrant();
        // cy.contains("Policies").click({force: true});
        // cy.contains("List of Policies").click({force: true});
        // cy.get("td").first().parent().get("td").eq("6").contains("Open").click();
        // cy.contains("Devices").click({force: true});
        // cy.intercept("/api/v1/profiles/Registrant").as("waitForRegisterRegistrant");
        // cy.wait("@waitForRegisterRegistrant", { timeout: 180000 });
        // cy.contains(RegistrantPageLocators.createIsssueRequestBtn).click();
        // cy.contains(RegistrantPageLocators.requiredFillDateLabel).parent().parent().parent().find('input').type('3/1/2023')
        // cy.contains(RegistrantPageLocators.requiredFillDateLabel).parent().parent().parent().find('input').type('3/1/2023')
        // cy.contains(RegistrantPageLocators.requiredFillNumberLabel).parent().parent().parent().find('input').type('123')
        // cy.get(RegistrantPageLocators.submitBtn).last().click();
        // cy.wait(60000);
        // cy.contains("Issue Requests").click({force: true});
        // cy.contains("Waiting for approval").should("exist");
    }

    getId() {
        // RegistrantPage.waitForBalance();
        // cy.contains(RegistrantPageLocators.hederaId).parent().find(RegistrantPageLocators.profileValue).find("a")
        //     .then(($div) => {
        //         cy.writeFile('cypress/fixtures/regId.txt', $div.get(0).innerText);
        //     });
    }

    checkTokenBalance() {
        // cy.intercept(RegistrantPageLocators.tokensWaiter).as(
        //     "waitForTokens"
        // );
        // cy.wait("@waitForTokens", {timeout: 60000})
        // cy.get("td").last().parent().find("td").eq("2").should('have.text', " 123 ");
        // let tokenId;
        // cy.readFile('cypress/fixtures/tokenId.txt').then(file => {
        //     tokenId = file;
        // }).then(() => {
        //     cy.contains(tokenId.trim()).should("exist");
        // })
    }

    checkTokenHistory() {
        //     cy.contains("Policies").click({force: true});
        //     cy.wait(2000);
        //     cy.get("td").first().parent().get("td").eq("5").click();
        //     cy.contains("Token History").click({force: true});
        //     cy.get(RegistrantPageLocators.tokenIdByHistory)
        //         .then(($a) => {
        //             cy.writeFile('cypress/fixtures/tokenId.txt', $a.find('.text').text());
        //         });
    }
}
