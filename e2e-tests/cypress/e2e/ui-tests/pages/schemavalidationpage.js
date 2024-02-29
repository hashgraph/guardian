import ASSERT from "../../../support/CustomHelpers/assertions";


const RegistrantPageLocators = {
    roleSelect: '[formcontrolname="roleOrGroup"]',
    policiesList: "/api/v1/policies?pageIndex=0&pageSize=100",
    tagsList: "api/v1/tags/search",
    passInput: '[formcontrolname="password"]',
    submitBtn: '[type="submit"]',
    appRegistrantDetails: "/api/v1/profiles/*",
    appPolicyReq: "/api/v1/policies/*/blocks/*",
    registrantRole: "Registrant",
    inputGroupLabel: '[formcontrolname="groupLabel"]',
    profileTab: "Profile",
    tokensBtn: "TOKENS",
    createDeviceBtn: "Create New Device",
    createIsssueRequestBtn: "Create Issue Request",
    enterTextInput: '[placeholder="Please enter text here"]',
    enterNumInput: '[placeholder="123"]',
    requiredFillDateLabel: "Please make sure the field contain a valid date value",
    requiredFillNumberLabel: "Please make sure the field contain a valid number value",
    hederaId: "HEDERA ID:",
    role: 'span.current-user-role',
    testfield: 'Applicant Legal Name',
    createBtn: 'Create',
    waitForApproval: "Submitted for Approval"
};


export class SchemaValidationPage {

    static waitForPolicyList() {
        cy.intercept(RegistrantPageLocators.policiesList).as(
            "waitForPoliciesList"
        );
        cy.wait("@waitForPoliciesList", { timeout: 100000 })
    }

    static waitForTagsList() {
        cy.intercept(RegistrantPageLocators.tagsList).as(
            "waitForTagsList"
        );
        cy.wait("@waitForTagsList", { timeout: 100000 })
    }


    static waitForRegistrant() {
        cy.intercept(RegistrantPageLocators.appRegistrantDetails).as(
            "waitForRegistrant"
        );
        cy.wait("@waitForRegistrant", { timeout: 20000 })
    }

    static waitForRequestSubmission() {
        cy.intercept(RegistrantPageLocators.appPolicyReq).as(
            "waitForRequestSubmission"
        );
        cy.wait("@waitForRequestSubmission", { timeout: 200000 })
    }


    createGroup() {
        cy.contains("Policies").click({ force: true });
        cy.get("td").first().parent().get("td").eq("5").click();
        //cy.contains("td","Schema_Validation_Multiple Values").siblings().eq(4).click();
        cy.wait(3000)
        cy.get(RegistrantPageLocators.role).invoke('text').then((text) => {
            if (text.includes(' Role: No role ')) {
                cy.log("choose role set operation")
                cy.get(RegistrantPageLocators.roleSelect).click().get("mat-option").contains("Registrant").click();
                cy.get(RegistrantPageLocators.submitBtn).click({ force: true });
                SchemaValidationPage.waitForRegistrant();
            } else {
                cy.log("Role already set")
            }
        });


    }

    checkTitleError(fieldName, errormessage) {

        cy.contains(fieldName).parentsUntil('.form-field-container').find('.required-field').first().should('contain', 'Required');
        cy.contains(fieldName).parentsUntil('.form-field-container').find('.invalid-field-label').first().children('span').children().should('contain', errormessage);
    }

    checkrequiredcondition(fieldName, errormessage, value) {

        cy.contains(fieldName).parentsUntil('.form-field-container').find('.required-field').should('contain', 'Required');
        cy.contains(fieldName).parentsUntil('.form-field-container').find('.invalid-field-label').children().find('b').should('contain', errormessage);
        cy.wait(500)
        cy.contains(errormessage).scrollIntoView();

        if (value == true) {
            cy.contains(fieldName).parentsUntil('.form-field-container').find('input').first().click({ force: true });
        }
        else if (value == "ENUM") {
            cy.contains(fieldName).parentsUntil('.form-field-container').find('.mat-select-arrow-wrapper').click({ force: true });
            cy.contains('.mat-option-text', 'FIRST_OPTION').click();
        }
        else if (typeof value === 'string' && value.includes(".png")) {
            cy.contains(fieldName).parentsUntil('.form-field-container').find('[type="file"]').click({ force: true });
            cy.fixture(value, { encoding: null }).as("myFixture");
            cy.get('[type="file"]').selectFile("@myFixture", {
                force: true,
            });
        }
        else {
            cy.contains(fieldName).parentsUntil('.form-field-container').find('input').type(value, { force: true });
        }
        cy.wait(500)
        cy.contains(fieldName).parentsUntil('.form-field-container').children().should('not.contain', errormessage);
        cy.wait(1500)
        cy.contains(fieldName).parentsUntil('.form-field-container').scrollIntoView();
            

    }

    checkTitleErrorRemoved(fieldName, errormessage) {

        cy.contains(fieldName).parentsUntil('.form-field-container').first().children().should('not.contain', errormessage);
        cy.contains(fieldName).parentsUntil('.form-field-container').first().children().should('not.contain', 'Required');
        cy.contains(fieldName).scrollIntoView();
        cy.wait(3000)
        cy.contains(RegistrantPageLocators.createBtn).should('not.be.disabled');


    }

    submitApplication() {
        cy.contains(RegistrantPageLocators.createBtn).click();
        cy.contains(RegistrantPageLocators.waitForApproval, { timeout: 20000 }).should("exist");
        cy.wait(3000)
    }

    checkAddEntity() {

        cy.contains('Add Entity').should(ASSERT.exist);
        cy.contains('Add Entity').click();
    }

    checkErrorcondition(fieldName, errormessage, incorrectValue, value) {

        var errorTitle = "Please make sure all fields in schema contain a valid value"
        var title = 'Applicant Details'

        if (incorrectValue !== "NO VALIDATION") {
            cy.contains(fieldName).parentsUntil('.form-field-container').find('input').type(incorrectValue, { force: true });
            cy.wait(1500)
            cy.contains(errormessage).scrollIntoView();
            cy.wait(1000)
            cy.contains(errorTitle).scrollIntoView();
            cy.wait(500)
            cy.contains(fieldName).parentsUntil('.form-field-container').find('.invalid-field-label').children().find('b').should('contain', errormessage);
            cy.contains(title).parentsUntil('.form-field-container').find('.invalid-field-label').first().children('span').children().should('contain', errorTitle);
            cy.contains(RegistrantPageLocators.createBtn).should('be.disabled')
        }

        //enter correct value
        if (value == true) {
            cy.contains(fieldName).parentsUntil('.form-field-container').find('input').first().click({ force: true });
        }
        else if (value == "ENUM") {
            cy.contains(fieldName).parentsUntil('.form-field-container').find('.mat-select-arrow-wrapper').click({ force: true });
            cy.contains('.mat-option-text', 'FIRST_OPTION').click({ force: true });
        }
        else if (typeof value === 'string' && value.includes(".png")) {
            cy.contains(fieldName).parentsUntil('.form-field-container').find('[type="file"]').click({ force: true });
            cy.fixture(value, { encoding: null }).as("myFixture");
            cy.get('[type="file"]').selectFile("@myFixture", {
                force: true,
            });
        }
        else {
            cy.contains(fieldName).parentsUntil('.form-field-container').find('input').clear();
            cy.wait(300);
            cy.contains(fieldName).parentsUntil('.form-field-container').find('input').clear().type(value, { force: true });

        }
        cy.contains(RegistrantPageLocators.createBtn).should('not.be.disabled');
        cy.wait(500)
        cy.contains(fieldName).parentsUntil('.form-field-container').scrollIntoView();
        cy.wait(1500)
        cy.contains(title).parent().scrollIntoView();
        cy.wait(500)
        cy.contains(fieldName).parent().children().should('not.contain', errormessage);
        cy.contains(title).parentsUntil('.form-field-container').children().should('not.contain', errorTitle);
        cy.wait(1000)
    }


    //multiple 

    checkMultipleInputrequiredcondition(fieldName, errormessage, value) {

        cy.contains(fieldName).parentsUntil('.form-field-container').find('.required-field').should('contain', 'Required');
        cy.contains(fieldName).parentsUntil('.form-field-container').find('.invalid-field-label').children().find('b').should('contain', errormessage);


        if (value == true) {
            cy.contains(fieldName).parentsUntil('.form-field-container').find('input').first().click({ force: true });
            cy.wait(1000)
        }
        else if (value == "ENUM") {
            cy.contains(fieldName).parentsUntil('.form-field-container').find('.add-btn').click({ force: true });
            cy.wait(500)
            cy.contains(fieldName).parentsUntil('.form-field-container').find('.mat-select-arrow-wrapper').each(($input) => {
                cy.wait(500)
                cy.wrap($input).click({ force: true });
                cy.contains('.mat-option-text', 'FIRST_OPTION').click();
                cy.wait(500)
            });

        }
        else if (typeof value === 'string' && value.includes(".png")) {
           
            cy.contains(fieldName).parentsUntil('.form-field-container').find('.add-btn').click({ force: true });
            cy.wait(500)
            cy.contains(fieldName).parentsUntil('.form-field-container').find('[type="file"]').each(($input) => {
                cy.wrap($input).click({ force: true });
                cy.fixture(value, { encoding: null }).as("myFixture");
                cy.get('[type="file"]').each(($input) => {
                    cy.wait(500)
                    cy.wrap($input).selectFile("@myFixture", {
                        force: true,
                    });
                    cy.wait(500)
                });
            });


        }
        else {
           
            cy.contains(fieldName).parentsUntil('.form-field-container').find('.add-btn').click({ force: true });
            cy.wait(500)
            cy.contains(fieldName).parentsUntil('.form-field-container').find('input').each(($input) => {
                cy.wait(500)
                cy.wrap($input).type(value, { force: true });
                cy.wait(500)
            });
        }
       
        cy.wait(500)
        cy.contains(fieldName).parentsUntil('.form-field-container').children().should('not.contain', errormessage);
        cy.wait(1500)
        cy.contains(fieldName).parent().scrollIntoView();
    }

        //multiple 

        checkMultipleInputErrorcondition(fieldName, errormessage, incorrectValue,value) {

            var errorTitle = "Please make sure all fields in schema contain a valid value"
            var title = 'Applicant Details'
            const arr = incorrectValue.split(":")

            if (incorrectValue !== "NO VALIDATION") {
                cy.contains(fieldName).parentsUntil('.form-field-container').find('.add-btn').click({ force: true });
                cy.wait(300)
                cy.contains(fieldName).parentsUntil('.form-field-container').find('.add-btn').click({ force: true });
                cy.contains(fieldName).parentsUntil('.form-field-container').find('input').each(($input,index) => {
                    cy.wrap($input).type(arr[index], { force: true });
                    cy.wait(1000)
                });
                cy.contains(errormessage).scrollIntoView();
                cy.wait(1000)
                cy.contains(errorTitle).scrollIntoView();
                cy.wait(500)
                cy.contains(fieldName).parentsUntil('.form-field-container').find('.invalid-field-label').children().find('b').should('contain', errormessage);
                cy.contains(title).parentsUntil('.form-field-container').find('.invalid-field-label').first().children('span').children().should('contain', errorTitle);
                cy.contains(RegistrantPageLocators.createBtn).should('be.disabled')
            }

                 //enter correct value
        if (value == true) {
            cy.contains(fieldName).parentsUntil('.form-field-container').find('input').first().click({ force: true });
        }
        else if (value == "ENUM") {

         
            cy.contains(fieldName).parentsUntil('.form-field-container').then(($parent) => {
                if ($parent.find('input').length <= 0) {
            cy.contains(fieldName).parentsUntil('.form-field-container').find('.add-btn').click({ force: true });
            cy.wait(300)
            cy.contains(fieldName).parentsUntil('.form-field-container').find('.add-btn').click({ force: true });
                }
          });
              
         
            cy.contains(fieldName).parentsUntil('.form-field-container').find('.mat-select-arrow-wrapper').each(($input) => {
                cy.wrap($input).click({ force: true });
                cy.contains('.mat-option-text', 'FIRST_OPTION').click();
                cy.wait(1000)
            });
        }
        else if (typeof value === 'string' && value.includes(".png")) {

          
            cy.contains(fieldName).parentsUntil('.form-field-container').then(($parent) => {
                if ($parent.find('input').length <= 0) {
            cy.contains(fieldName).parentsUntil('.form-field-container').find('.add-btn').click({ force: true });
            cy.wait(300)
            cy.contains(fieldName).parentsUntil('.form-field-container').find('.add-btn').click({ force: true });
                }
          });
              
        
           cy.contains(fieldName).parentsUntil('.form-field-container').find('[type="file"]').each(($input) => {
                cy.wrap($input).click({ force: true });
                cy.fixture(value, { encoding: null }).as("myFixture");
                cy.get('[type="file"]').each(($input) => {
                    cy.wrap($input).selectFile("@myFixture", {
                        force: true,
                    });
                    cy.wait(1000)
                });
            });
        }
        else {


              cy.contains(fieldName).parentsUntil('.form-field-container').then(($parent) => {
                    if ($parent.find('input').length <= 0) {
                cy.contains(fieldName).parentsUntil('.form-field-container').find('.add-btn').click({ force: true });
                cy.wait(300)
                cy.contains(fieldName).parentsUntil('.form-field-container').find('.add-btn').click({ force: true });
                    }
              });
    

            cy.contains(fieldName).parentsUntil('.form-field-container').find('input').each(($input) => {
                cy.wrap($input).clear().type(value, { force: true });
                cy.wait(1000)
            });
                }
                cy.wait(1000)
                cy.contains(fieldName).parent().scrollIntoView();
                cy.contains(fieldName).parentsUntil('.form-field-container').children().should('not.contain', errormessage);
                cy.wait(1000)


    
        }
}
