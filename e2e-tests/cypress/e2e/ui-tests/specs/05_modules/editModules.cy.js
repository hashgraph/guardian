import { ModulesPage } from "../../pages/modulesPage";
const modulesPage = new ModulesPage();

import { HomePage } from "../../pages/homePage";
const homePage = new HomePage();
//TBD: w8 for "Back" button
// context("Workflow Module Editing", { tags: ['ui'] }, () => {

//     const SRUsername = Cypress.env('SRUser');
//     const moduleName = "UIModuleFor";
//     let newName;

//     beforeEach(() => {
//         cy.viewport(1920, 1080);
//         homePage.visit();
//         homePage.login(SRUsername);
//         modulesPage.openModulesTab();
//     })

//     it("Verify if it possible to edit module", () => {
//         modulesPage.createNewModule(moduleName);
//         modulesPage.checkStatus(moduleName, "Draft");
//         modulesPage.openEditingModule(moduleName);
//         newName = moduleName + "Edited";
//         modulesPage.editModuleProperty("Name", newName);
//         modulesPage.editModuleProperty("Description", "Description Edited");
//         modulesPage.saveModuleEditing();
//         modulesPage.backToModulesList();
//         modulesPage.checkStatus(newName, "Draft");
//         modulesPage.verifyModuleProperty(newName, "Description", "Description Edited");
//     });

//     //TBD: doesn't work; only after validation
//     // it("Verify if a modal window appears after returning to editing module", () => {
//     //     modulesPage.checkStatus(moduleName, "Draft");
//     //     modulesPage.openEditingModule(moduleName);
//     //     modulesPage.fillFieldInEditPolicyPage("Name", moduleName+"Edited");
//     //     modulesPage.fillFieldInEditPolicyPage("Description", "Description Edited");
//     //     modulesPage.openModulesTab();
//     //     modulesPage.clickEditPolicy(moduleName);
//     //     modulesPage.checkModalWindowIsVisible("Apply latest changes");
//     //     modulesPage.checkModalWindowIsVisible("Do you want to apply latest changes?");
//     // });

//     it("Adding new blocks on edit module page", () => {
//         modulesPage.checkStatus(newName, "Draft");
//         modulesPage.openEditingModule(newName);
//         modulesPage.addNewBlock("Action");
//         modulesPage.addNewBlock("Filters Addon");
//         modulesPage.saveModuleEditing();
//         modulesPage.backToModulesList();
//         modulesPage.openEditingModule(newName);
//         modulesPage.checkBlockExists("Block_1");
//         modulesPage.checkBlockExists("Block_2");
//     });

//     it("Modify Existing block and validate if changes are saved on edit module page", () => {
//         modulesPage.checkStatus(newName, "Draft");
//         modulesPage.openEditingModule(newName);
//         modulesPage.editBlockName("Block_1", "Block_12");
//         modulesPage.clickOnBlock("Block_2");
//         modulesPage.addNewBlock("Action");
//         modulesPage.addNewBlock("Filters Addon");
//         modulesPage.saveModuleEditing();
//         modulesPage.backToModulesList();
//         modulesPage.openEditingModule(newName);
//         modulesPage.checkBlockExists("Block_12");
//         modulesPage.expandBlock("Block_2");
//         modulesPage.checkBlockExists("Block_2");
//         modulesPage.checkBlockExists("Block_3");
//         modulesPage.checkBlockExists("Block_1");
//     });

//     it("Delete existing block and validate if changes are saved on edit module page", () => {
//         modulesPage.checkStatus(newName, "Draft");
//         modulesPage.openEditingModule(newName);
//         modulesPage.clickOnBlock("Block_12");
//         modulesPage.clickOnDeleteBlockButton();
//         modulesPage.saveModuleEditing();
//         modulesPage.backToModulesList();
//         modulesPage.openEditingModule(name);
//         modulesPage.checkBlockNotExist("Block_12");
//     });

//     it("Verify if it impossible to edit Published module", () => {
//         modulesPage.publishModule(newName);
//         modulesPage.backToModulesList();
//         modulesPage.checkStatus(newName, "Published");
//         modulesPage.openEditingModule(newName);
//         modulesPage.checkFieldsInEditModuleIsNotEditable(newName);
//     });
// });
