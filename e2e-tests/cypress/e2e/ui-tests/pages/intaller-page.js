import URL from "../../../support/GuardianUrls";

const InstallerPageLocators = {
    roleSelect: '[formcontrolname="roleOrGroup"]',
    passInput: '[formcontrolname="password"]',
    submitBtn: '[type="submit"]',
    installerRole: "INSTALLER",
    profileTab: 'Profile',
    tokensBtn: 'TOKENS',
};

export class InstallerPage {
    fillInfoInstaller() {
        cy.contains("Policies").click({ force: true });

        cy.get("td").first().parent().get("td").eq("4").click();
        cy.get(InstallerPageLocators.roleSelect).click();
        cy.wait(6000);
        cy.contains(InstallerPageLocators.installerRole).click({ force: true });

        cy.get(InstallerPageLocators.submitBtn).click();
        cy.wait(8000);
        cy.contains("Applicant legal name").next().type("Agent Smith");
        cy.get(InstallerPageLocators.submitBtn).click();
    }

    signApplication() {
        cy.contains("Sign").click({ force: true });

    }


    okButton() {
        cy.get(InstallerPageLocators.submitBtn).click();
    }

    approveDevice() {
        cy.contains("Policies").click({ force: true });
        cy.get("td").first().parent().get("td").eq("4").click();
        cy.contains("Devices").click({ force: true });
        cy.wait(8000);
        cy.contains("Sign").click({ force: true });
    }


    createGroup(role) {
        cy.contains("Policies").click({ force: true });

        cy.get("td").first().parent().get("td").eq("4").click();
        cy.wait(8000);
        cy.get(InstallerPageLocators.roleSelect)
            .click()
            .get("mat-option")
            .contains(role)
            .click();

        cy.get(InstallerPageLocators.submitBtn).click();
        cy.wait(12000);

    }

    accociateUserWithToken() {
        //associate the user (Installer) with the provided Hedera token
        cy.contains(InstallerPageLocators.profileTab).click();
        cy.contains(InstallerPageLocators.tokensBtn, { timeout: 180000 })
            .click()
            .then(() => {
                cy.get("td")
                    .first()
                    .then((policyName) => {
                        cy.get("td")
                            .eq("0")
                            .find("dragonglass>a")
                            .invoke("text")
                            .as("tokenId");
                        cy.get("td")
                            .eq("1")
                            .within(() => {
                                cy.get("@tokenId").then((tokenId) => {
                                    cy.intercept(
                                        "/api/v1/tokens/" +
                                            tokenId +
                                            "/associate"
                                    ).as("waitForAccociate");
                                    cy.get("div").eq("1").click();
                                });
                            });
                    });
            });
    }
}
