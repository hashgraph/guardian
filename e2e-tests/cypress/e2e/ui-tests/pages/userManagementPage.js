import URL from '../../../support/GuardianUrls';
import * as Checks from '../../../support/checkingMethods';
import CommonElements from '../../../support/defaultUIElements';

const userManagementPageLocators = {
    userManagementGrid: 'div.grid-container tbody',
    userRoleButton: 'div.user-role-btn',
    assignedPoliciesTab: 'Assigned Policies',
};

export class UserManagementPage {

    openUserManagementTab() {
        cy.visit(URL.Root + URL.UserManagement);
    }

    assignPolicyToUser(userName, policyName) {
        cy.get(userManagementPageLocators.userManagementGrid).contains(new RegExp('^' + userName + '$', 'g')).should('be.visible');
        cy.get(userManagementPageLocators.userManagementGrid).contains(new RegExp('^' + userName + '$', 'g')).siblings().find(userManagementPageLocators.userRoleButton).click();
        cy.contains(userManagementPageLocators.assignedPoliciesTab).click();
        Checks.waitForLoading();
        cy.contains(policyName).siblings().find(CommonElements.checkBox).click();
    }
}
