import { HomePage } from '../../pages/homePage';
const homePage = new HomePage();

import { PoliciesPage } from '../../pages/policiesPage';
const policiesPage = new PoliciesPage();

import { UserManagementPage } from '../../pages/userManagementPage';
const userManagementPage = new UserManagementPage();

import { UserPoliciesPage } from '../../pages/userPoliciesPage';
const userPoliciesPage = new UserPoliciesPage();

import { TokensPage } from '../../pages/tokensPage';
const tokensPage = new TokensPage();

import { ToolsPage } from '../../pages/toolsPage';
const toolsPage = new ToolsPage();

import { randomInt } from '../../../../support/random';

const CDM_FILE = '../Methodology Library/Clean Development Mechanism (CDM)/CDM ACM0001/ACM0001.policy';

context('Workflow CDM ACM 0001 Policy', { tags: ['ui'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const userUsername = Cypress.env('User');
    const user2Username = Cypress.env('User2');
    const runName = randomInt(1000000000) + 'testName';

    beforeEach(() => {
        cy.viewport(1920, 1080);
        homePage.visit();
    })

    it('checks CDM ACM 0001 policy workflow', () => {
        //The workspace seeds Registrant and the SR/Installer accounts but not
        //User2; the workflow needs a second user (VVB registration, report
        //verification) that is visible in the SR user-management grid, so
        //ensure it exists AND is onboarded (Hedera account + DID + parent
        //registry). A re-run where it already is just bounces off.
        homePage.ensureAccount(user2Username, SRUsername);

        //Import and publish policy (file import: the localnode gateway does not
        //answer the IPFS message lookups the IPFS import needs)
        homePage.login(SRUsername);
        policiesPage.openPoliciesTab();
        // The archive references four CDM tools by messageId and this gateway
        // cannot resolve them, which would leave the import preview rows invalid
        // and hold the Import button. The same-named tools from the
        // Methodology Library must be in the workspace and PUBLISHED first:
        // the tool picker in the import previews only lists published tools,
        // so a draft would not be selectable as a replacement.
        // Tool 07 goes before Tool 05: the Tool 05 archive bundles a Tool 07
        // reference, and its import preview needs a workspace Tool 07.
        const cdmTools = '../Methodology Library/Clean Development Mechanism (CDM)/Tools';
        toolsPage.ensureToolPublished('Tool 03', cdmTools + '/Tool 03/Tool 03.tool');
        toolsPage.ensureToolPublished('Tool 06', cdmTools + '/Tool 06/Tool 06.tool');
        toolsPage.ensureToolPublished('Tool 07', cdmTools + '/Tool 07/Tool 07.tool');
        toolsPage.ensureToolPublished('Tool 05', cdmTools + '/Tool 05/Tool 05.tool');
        policiesPage.openPoliciesTab();
        policiesPage.importPolicyFromFile(CDM_FILE);
        policiesPage.renameImportedPolicy(runName);
        policiesPage.publishPolicy(runName);
        policiesPage.backToPoliciesList();
        policiesPage.checkStatus(runName, 'Published');

        //The token must be associated with the user's Hedera account before
        //the workflow can transfer it. /tokens-user is restricted to the USER
        //role, so the SR (STANDARD_REGISTRY) cannot open it: the SR reads the
        //token id from the /tokens grid, and the user then self-associates
        //from the per-token view, which lists the viewer's own account.
        tokensPage.openTokensTab();
        tokensPage.storeTokenId(runName);
        homePage.logOut();

        homePage.login(userUsername);
        tokensPage.associatePolicyToken();
        homePage.logOut();

        //Give permissions to users
        homePage.login(SRUsername);
        userManagementPage.openUserManagementTab();
        userManagementPage.assignPolicyToUser(userUsername, runName);
        userManagementPage.openUserManagementTab();
        userManagementPage.assignPolicyToUser(user2Username, runName);
        homePage.logOut();

        //Register user as PP
        homePage.login(userUsername);
        userPoliciesPage.openPoliciesTab();
        userPoliciesPage.openPolicy(runName);
        userPoliciesPage.registerInPolicy('Project Participant');
        homePage.logOut();

        //Register user as VVB
        homePage.login(user2Username);
        userPoliciesPage.openPoliciesTab();
        userPoliciesPage.openPolicy(runName);
        userPoliciesPage.registerInPolicy('VVB');
        homePage.logOut();

        //Token grant KYC
        homePage.login(SRUsername);
        tokensPage.openTokensTab();
        tokensPage.grantKYC(runName, userUsername);
        //Approve roles (the viewer does not guarantee which step it opens on,
        //so steer to each approval tab explicitly)
        policiesPage.openPoliciesTab();
        policiesPage.openPolicy(runName);
        policiesPage.openPPTab();
        policiesPage.approveUserInPolicy();
        policiesPage.openVVBTab();
        policiesPage.approveUserInPolicy();
        homePage.logOut();

        //Create project
        homePage.login(userUsername);
        userPoliciesPage.openPoliciesTab();
        userPoliciesPage.openPolicy(runName);
        userPoliciesPage.createProject();
        homePage.logOut();

        //Approve project
        homePage.login(SRUsername);
        policiesPage.openPoliciesTab();
        policiesPage.openPolicy(runName);
        policiesPage.openProjectPipelineTab();
        policiesPage.approveProject();
        homePage.logOut();

        //Create report
        homePage.login(userUsername);
        userPoliciesPage.openPoliciesTab();
        userPoliciesPage.openPolicy(runName);
        userPoliciesPage.createReport();
        userPoliciesPage.assignReport();
        homePage.logOut();

        //Verify report
        homePage.login(user2Username);
        userPoliciesPage.openPoliciesTab();
        userPoliciesPage.openPolicy(runName);
        userPoliciesPage.verifyReport();
        homePage.logOut();

        //Approve report and verify balance increase
        homePage.login(SRUsername);
        policiesPage.openPoliciesTab();
        policiesPage.openPolicy(runName);
        policiesPage.openReportsTab();
        policiesPage.approveReport();
        tokensPage.openTokensTab();
        tokensPage.verifyBalance(runName, userUsername, ' 85 ');
        homePage.logOut();
    });
});
