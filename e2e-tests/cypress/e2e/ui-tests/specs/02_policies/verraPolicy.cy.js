import { HomePage } from '../../pages/homePage';
const homePage = new HomePage();

context('Workflow Verra Policy', { tags: ['ui'] }, () => {

    beforeEach(() => {
        cy.viewport(1920, 1080);
        homePage.visit();
    })

    //TBD: wait good params
    it('checks verra policy workflow', () => {
        // //Import and publish policy
        // homePage.login(SRUsername);
        // policiesPage.openPoliciesTab();
        // policiesPage.importPolicyFromIPFS("1739273276.903073085"); //Verra
        // policiesPage.backToPoliciesList();
        // policiesPage.checkStatus(name, "Draft");
        // policiesPage.publishPolicy(name);
        // policiesPage.backToPoliciesList();
        // policiesPage.checkStatus(name, "Published");

        // //Give permissions to user
        // userManagementPage.openUserManagementTab();
        // userManagementPage.assignPolicyToUser(userUsername, name);
        // userManagementPage.openUserManagementTab();
        // userManagementPage.assignPolicyToUser(user2Username, name);
        // homePage.logOut();

        // //Token associate
        // homePage.login(userUsername);
        // tokensPage.openUserTokensTab();
        // tokensPage.associatePolicyToken(name);
        // //Register user as PP and create project
        // userPoliciesPage.openPoliciesTab();
        // userPoliciesPage.openPolicy(name);
        // userPoliciesPage.registerInPolicy("Project_Proponent");
        // homePage.logOut();

        // //Register user as VVB
        // homePage.login(user2Username);
        // userPoliciesPage.openPoliciesTab();
        // userPoliciesPage.openPolicy(name);
        // userPoliciesPage.registerInPolicy("VVB");
        // homePage.logOut();

        // //Token grant KYC
        // homePage.login(SRUsername);
        // tokensPage.openTokensTab();
        // tokensPage.grantKYC(name, userUsername);
        // //Approve role and add project
        // policiesPage.openPoliciesTab();
        // policiesPage.openPolicy(name);
        // policiesPage.approveUserInPolicy();
        // policiesPage.addProject();
        // homePage.logOut();

        // //Assign project
        // homePage.login(userUsername);
        // userPoliciesPage.openPoliciesTab();
        // userPoliciesPage.openPolicy(name);
        // userPoliciesPage.assignProject();
        // homePage.logOut();

        // //Approve project
        // homePage.login(user2Username);
        // userPoliciesPage.openPoliciesTab();
        // userPoliciesPage.openPolicy(name);
        // userPoliciesPage.approveProject();
        // homePage.logOut();

        // //Create report
        // homePage.login(userUsername);
        // userPoliciesPage.openPoliciesTab();
        // userPoliciesPage.openPolicy(name);
        // userPoliciesPage.createReport();
        // homePage.logOut();

        // //Verify report
        // homePage.login(user2Username);
        // userPoliciesPage.openPoliciesTab();
        // userPoliciesPage.openPolicy(name);
        // userPoliciesPage.verifyReport();
        // homePage.logOut();

        // //Approve report
        // homePage.login(SRUsername);
        // policiesPage.openPoliciesTab();
        // policiesPage.openPolicy(name);
        // policiesPage.approveReport();
        // homePage.logOut();
    });
});
