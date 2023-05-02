import { AuthenticationPage } from "../../pages/authentication";
import { PoliciesPage } from "../../pages/policies";
import { InstallerPage } from "../../pages/intaller-page";
import { RegistrantPage } from "../../pages/registrant-page";
import { VerraPage } from "../../pages/verra";
import { TokensPage } from "../../pages/tokens";
import { PPPage } from "../../pages/projectProponent";


const home = new AuthenticationPage();
const policies = new PoliciesPage();
const verra = new VerraPage();
const projectProponent = new PPPage();


describe("Workflow Verra Policy", { tags: '@ui' },  () => {
    it("checks verra policy workflow", () => {
        cy.viewport(1230, 800);

        home.visit();

        home.login("StandardRegistry");
        policies.openPoliciesTab();
        policies.importPolicyButton();
        policies.importPolicyMessage("1675254414.695533713"); //Verra REDD
        policies.publishPolicy();
        home.logOut("StandardRegistry");


        home.login("VVB");
        home.checkSetup("VVB");
        verra.createGroup('VVB');
        home.logOut("VVB");

        home.login("StandardRegistry");
        policies.openPoliciesTab();
        policies.approveUser();
        home.logOut("StandardRegistry");


        //Project Proponent
        home.login("ProjectProponent");
        home.checkSetup("ProjectProponent");
        projectProponent.createGroup('Project_Proponent');
        projectProponent.createProject();
        home.logOut("ProjectProponent");

        home.login("StandardRegistry");
        policies.openPoliciesTab();
        policies.addVVB();
        home.logOut("StandardRegistry");


        home.login("ProjectProponent");
        projectProponent.assignPolicy();
        home.logOut("ProjectProponent");
    });
});

export {};
