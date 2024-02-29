import ASSERT from "../../../support/CustomHelpers/assertions";
import TIMEOUTS from "../../../support/CustomHelpers/timeouts";
import URL from "../../../support/GuardianUrls";

const SchemasPageLocators = {

    //Buttons

    policySchemacreateBtn: "div.g-dialog-actions-btn",
    policySchemaeditBtn: "td.mat-column-edit",
    policySchemapublishbtn: "td.mat-column-operation",
    policySchemasBtn: "Policy Schemas",
    newBtn: "New",
    policySchemapublishOkBtn: '.mat-button-wrapper',
    schemaDeleteBtn: ".mat-dialog-actions > .mat-primary",
    deleteBtn: "delete",
    saveBtn: ' Save ',
    importBtn: "Import",
    importFileBtn: "Import from file",
    importMsgBtn: "Import from IPFS",
    continueImportBtn: "*[class^='g-dialog-actions-btn']",
    submitBtn: 'button[type="submit"]',
    schemaExportBtn : 'td.mat-column-export',
    schemaSaveToFileBtn : 'Save to file',
    compareBtn : 'Compare',


    //Inputs
    nameInput: "*[formcontrolname^='name']",
    descriptionInput: '[formcontrolname="description"]',
    policySchemaVersionInput: '[type="text"]',
    msgInput: '[data-placeholder="Message timestamp"]',
    policySchemaentityDefaultinput: '[value="NONE"]',
    policySchemaentityVCinput: '[value="VC"]',
    policySchemaentityEVCinput: '[value="EVC"]',


    //Lists
    entityList: '[formcontrolname="entity"]',
    policyList: '[formcontrolname="topicId"]',
    schemaSelectPolicyList : '[role="combobox"]',
 

    //Request
    schemaListReq: 'api/v1/schemas/list/all',
    searchSchemaReq : '/api/v1/tags/search',
    compareReq: 'api/v1/analytics/compare/schemas',
    taskReq: '/api/v1/tasks/**',

    //others
    
    
    headerSelector: 'th[role="columnheader"]',
    policyName: '[role="option"]',
    schemaName: "td.mat-column-type",
    importFile: '[type="file"]',
    schemaPolicyValue : '.mat-option-text',
    compareresults : 'div.g-dialog-actions-btn',
    compareSchemaname : 'div.schema-info-field-value'
};

export class SchemasPage {
    openSchemasTab() {
        cy.visit(URL.Root + URL.Schemas);
    }

    static waitForSchemas() {
        cy.intercept(SchemasPageLocators.schemaListReq).as(
            "waitForSchemaList"
        );
        cy.wait("@waitForSchemaList", { timeout: 200000 })
    }

    static waitForSchemaStatusToComplete() {
        cy.intercept(SchemasPageLocators.searchSchemaReq).as(
            "waitForSchemaToBepublished"
        );
        cy.wait("@waitForSchemaToBepublished", { timeout: 200000 })
    }

    static waitForSchemaCompareReq() {
        cy.intercept(SchemasPageLocators.compareReq).as(
            "waitForSchemaToBepublished"
        );
        cy.wait("@waitForSchemaToBepublished", { timeout: 200000 })
    }

    clickPolicySchema(){
        cy.contains(SchemasPageLocators.policySchemasBtn).click();
    }

    verifyButtonsAndHeadersPolicySchema() {
        cy.contains(SchemasPageLocators.newBtn).should("exist");
        cy.get(SchemasPageLocators.headerSelector).should(($header) => {
            expect($header.get(0).innerText).to.eq('Policy')
            expect($header.get(1).innerText).to.eq('Name')
            expect($header.get(2).innerText).to.eq('Topic')
            expect($header.get(3).innerText).to.eq('Version')
            expect($header.get(4).innerText).to.eq('Entity')
            expect($header.get(5).innerText).to.eq('Tags')
            expect($header.get(6).innerText).to.eq('Status')
            expect($header.get(7).innerText).to.eq('Operations')
        })
    }



    createPolicySchema(name, entitytype, policyname) {
        cy.contains(SchemasPageLocators.newBtn).click();
        const inputName = cy.get(SchemasPageLocators.nameInput);
        cy.wait(1000);
        inputName.click();
        inputName.type(name);

        if (entitytype == 'DEFAULT') {
            cy.get(SchemasPageLocators.entityList).click();
            cy.get(SchemasPageLocators.policySchemaentityDefaultinput).click();
        }
        if (entitytype == 'EVC') {
            cy.get(SchemasPageLocators.entityList).click();
            cy.get(SchemasPageLocators.policySchemaentityEVCinput).click();

        }

        //Link Policy
        cy.get(SchemasPageLocators.policyList).click();
        cy.contains(SchemasPageLocators.policyName, policyname).click();

        cy.get(SchemasPageLocators.policySchemacreateBtn).click();
        SchemasPage.waitForSchemaStatusToComplete();
        cy.contains(SchemasPageLocators.schemaName, name).should(ASSERT.exist);

    }

   

    editPolicySchema(name, entitytype) {
        cy.contains(SchemasPageLocators.schemaName, name).siblings(SchemasPageLocators.policySchemaeditBtn).click();
        const inputNameEdit = cy.get(SchemasPageLocators.nameInput);
        cy.wait(1000);
        inputNameEdit.click();
        inputNameEdit.clear();
        var editName = name + " updated";
        inputNameEdit.type(editName);

        if (entitytype == 'DEFAULT') {
            cy.get(SchemasPageLocators.entityList).click();
            cy.get(SchemasPageLocators.policySchemaentityDefaultinput).click();
        }
        if (entitytype == 'EVC') {
            cy.get(SchemasPageLocators.entityList).click();
            cy.get(SchemasPageLocators.policySchemaentityEVCinput).click();

        }
        const descNameEdit = cy.get(SchemasPageLocators.descriptionInput);
        descNameEdit.type("Added Description in edit flow")
        cy.contains(SchemasPageLocators.saveBtn).click({ force: true });
        SchemasPage.waitForSchemaStatusToComplete();
        cy.contains(SchemasPageLocators.schemaName, editName).should(ASSERT.exist);

    }


    PublishPolicySchema(name) {
        cy.contains(SchemasPageLocators.schemaName, name).siblings(SchemasPageLocators.policySchemapublishbtn).click();

        cy.get(SchemasPageLocators.policySchemaVersionInput).type("1.0.0");
     cy.contains(SchemasPageLocators.policySchemapublishOkBtn,'Publish').click();
     SchemasPage.waitForSchemaStatusToComplete();
        cy.contains(SchemasPageLocators.schemaName, name).siblings(SchemasPageLocators.tagschemaPublishedStatus).find('span.status-PUBLISHED').should(($text) => {
            expect($text).to.contain('Published')
        })

    }

    DeletePolicySchema(name) {
        cy.contains(SchemasPageLocators.schemaName, name).siblings().contains(SchemasPageLocators.deleteBtn).click();
        cy.get(SchemasPageLocators.schemaDeleteBtn).click();
        SchemasPage.waitForSchemaStatusToComplete();
        cy.contains(SchemasPageLocators.schemaName, name).should(ASSERT.notExist);

    }

    importSchemaButton() {
        cy.contains(SchemasPageLocators.importBtn).click();
    }

    importSchemaFile(file) {
        cy.contains(SchemasPageLocators.importFileBtn).click();
        cy.fixture(file, { encoding: null }).as("myFixture");
        cy.get(SchemasPageLocators.importFile).selectFile("@myFixture", {
            force: true,
        });
        cy.readFile('test.env.json').then((env) => {
            const pname = env.policyname;
           cy.contains('.field-name','Policy').parent().children().find(SchemasPageLocators.schemaSelectPolicyList).click();
           cy.contains(SchemasPageLocators.schemaPolicyValue,pname).click();
          });
        cy.get(SchemasPageLocators.continueImportBtn).click();
        SchemasPage.waitForSchemaStatusToComplete();
    }
  
    importSchemaMessage(msg) {
        cy.contains(SchemasPageLocators.importMsgBtn).click();
        const inputMessage = cy.get(SchemasPageLocators.msgInput);
        inputMessage.type(msg);
        cy.intercept(SchemasPageLocators.taskReq).as(
            "waitForSchemaImport"
        );
        cy.get(SchemasPageLocators.submitBtn).click();
        cy.wait("@waitForSchemaImport", { timeout: 100000 })
        cy.readFile('test.env.json').then((env) => {
                     const pname = env.policyname;
                    cy.contains('.field-name','Policy').parent().children().find(SchemasPageLocators.schemaSelectPolicyList).click();
                    cy.contains(SchemasPageLocators.schemaPolicyValue,pname).click();
                   });
        cy.get(SchemasPageLocators.continueImportBtn).click();
        SchemasPage.waitForSchemaStatusToComplete();
        cy.contains(SchemasPageLocators.schemaName, "Applicant Details").should(ASSERT.exist);
    }

    exportSchemaFile(name)
    {
        cy.contains(SchemasPageLocators.schemaName, name).siblings(SchemasPageLocators.schemaExportBtn).click();
        cy.contains(SchemasPageLocators.schemaSaveToFileBtn).click();
        cy.wait(2000);
        cy.verifyDownload('.schema', { contains: true });
        
    }

    comparePolicySchema(schemapolicy1,schemapolicy2,policyname)
  
    {
        cy.contains(SchemasPageLocators.compareBtn).click();
        cy.get(SchemasPageLocators.schemaSelectPolicyList).eq(2).click({force: true});
        cy.contains(SchemasPageLocators.schemaPolicyValue,policyname).click();
        cy.get(SchemasPageLocators.schemaSelectPolicyList).eq(3).click({force: true});
        cy.contains(SchemasPageLocators.schemaPolicyValue,schemapolicy1).click();
        cy.get(SchemasPageLocators.schemaSelectPolicyList).eq(4).click({force: true});
        cy.contains(SchemasPageLocators.schemaPolicyValue,policyname).click();
        cy.get(SchemasPageLocators.schemaSelectPolicyList).eq(5).click({force: true});
        cy.contains(SchemasPageLocators.schemaPolicyValue,schemapolicy2).click();
        cy.contains(SchemasPageLocators.compareresults,' Compare ').click();
        SchemasPage.waitForSchemaCompareReq();
        cy.contains(SchemasPageLocators.compareSchemaname, schemapolicy1).should(ASSERT.exist);
        cy.contains(SchemasPageLocators.compareSchemaname, schemapolicy2).should(ASSERT.exist);
        cy.contains(SchemasPageLocators.compareSchemaname, policyname).should(ASSERT.exist);
        
    }
}
