import { AuthenticationPage } from "../../pages/authentication";
import { PoliciesPage } from "../../pages/policies";
import { InstallerPage } from "../../pages/intaller-page";
import { RegistrantPage } from "../../pages/registrant-page";
import { VerraPage } from "../../pages/verra";
import { TokensPage } from "../../pages/tokens";
import { PPPage } from "../../pages/projectProponent";


const home = new AuthenticationPage();
const policies = new PoliciesPage();
const registrant = new RegistrantPage();
const installer = new InstallerPage();
const tokens = new TokensPage();
const verra = new VerraPage();
const projectProponent = new PPPage();


describe("Workflow Verra Policy", () => {
    it("checks verra policy workflow", () => {
        cy.viewport(1230, 800);

        home.visit();

        home.login("StandardRegistry");
        policies.openPoliciesTab();
        policies.importPolicyButton();
        policies.importPolicyMessage("1663846582.307635866");
        policies.publishPolicy();
        home.logOut("StandardRegistry");


        home.login("VVB");
        home.checkSetup("VVB");
        verra.createGroup('VVBs');
        home.logOut("VVB");

        home.login("StandardRegistry");
        policies.approve();
        home.logOut("StandardRegistry");


        //Project Proponent
        home.login("ProjectProponent");
        home.checkSetup("ProjectProponent");
        projectProponent.createGroup('Project_Proponent');
        projectProponent.createProject();
        home.logOut("ProjectProponent");

        home.login("StandardRegistry");
        policies.addVVB();
        home.logOut("StandardRegistry");


        home.login("ProjectProponent");
        projectProponent.assignPolicy();
        home.logOut("ProjectProponent");

        home.login("VVB");
        verra.getInvite();
        verra.copyInvitation();
        home.logOut("VVB");

        home.createNew('User');
        verra.createGroupWithInvitation();





    });
});

export {};
