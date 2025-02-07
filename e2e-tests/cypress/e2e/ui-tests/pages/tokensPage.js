import CommonElements from "../../../support/defaultUIElements";
import * as Checks from "../../../support/checkingMethods";

const TokensPageLocators = {
	associateTokenButton: "div.associated-btn",
	grantKYCButton: "button[label='Grant KYC']",
	balanceIncreaseElement: "td:contains(' 1 ')",

	importBtn: "Tokens",
	createTokenBtn: " Create Token ",
	adminKey: " Admin Key ",
	wipeKey: " Wipe Key ",
	freezeKey: " Freeze Key ",
	kycKey: " KYC Key ",
	publishedBtn: '[ng-reflect-on="Published"]',
	createFinalBtn: "div.g-dialog-actions",
	tokensList: "/api/v1/tokens",
	tokenNameInput: '[data-placeholder = "Token Name"]',
	tokenSymbolInput: '[ng-reflect-name="tokenSymbol"]',
	tokenDecimalInput: '[ng-reflect-name="decimals"]',
	tokenName: "td.mat-column-tokenName",
	tokenSymbol: "td.mat-column-tokenSymbol",
	tokenId: "td > hedera-explorer > a",
	tokenType: '[ng-reflect-name="tokenType"]',
	saveTokenBtn: " Save ",
	tokenDeleteBtn: "OK",
	tagNameInput: '[ng-reflect-name="name"]',
	tagDescInput: '[ng-reflect-name="description"]',
	tagCreationModal: 'tags-create-dialog',
	createTagButton: ' Create Tag ',
	closeWindowButton: 'div.g-dialog-cancel-btn',
	tagsListRequest: "/api/v1/tags/",
	tagsDeleteRequest: "/api/v1/tags/*",
	tagDeleteButton: "div.delete-tag",
};

export class TokensPage {

	openTokensTab() {
        cy.get(CommonElements.navBar).should('exist')
        cy.get("body").then(($body) => {
            if ($body.find(`span:contains(${CommonElements.manageTokens})`).length==0)
                cy.get(CommonElements.navBar).contains(CommonElements.tokensTab).click();
        })
		cy.get(CommonElements.navBar).contains(CommonElements.manageTokens).click();
	}

	openUserTokensTab() {
        cy.get(CommonElements.navBar).should('exist')
        cy.get("body").then(($body) => {
            if ($body.find(`span:contains(${CommonElements.listOfTokensTab})`).length==0)
                cy.get(CommonElements.navBar).contains(CommonElements.tokensTab).click();
        })
		cy.get(CommonElements.navBar).contains(CommonElements.listOfTokensTab).click();
	}

	associatePolicyToken(name) {
		cy.contains("td", name).siblings().find(TokensPageLocators.associateTokenButton).click();
	}

	openAndRefreshUserTokensData(name, username) {
		cy.contains("td", name).siblings().eq(4).find(CommonElements.svg).eq(0).click();
		cy.contains("td", username).siblings().find(CommonElements.svg).click();
	}

	grantKYC(name, username) {
		this.openAndRefreshUserTokensData(name, username);
		cy.get(TokensPageLocators.grantKYCButton).click();
	}

	verifyBalance(name, username) {
		this.openAndRefreshUserTokensData(name, username);
		Checks.waitForElement(TokensPageLocators.balanceIncreaseElement);
	}







	static waitForTokens() {
		// cy.intercept(TokensPageLocators.tokensList).as(
		// 	"waitForTokensList"
		// );
		// cy.wait("@waitForTokensList", { timeout: 200000 })
	}
	createToken(name) {
		// cy.contains(TokensPageLocators.createTokenBtn).click();
		// cy.get(TokensPageLocators.publishedBtn).click();
		// cy.get(TokensPageLocators.tokenNameInput).clear().type(name);
		// cy.get(TokensPageLocators.createFinalBtn).click();
		// TokensPage.waitForTokens();
		// cy.contains(TokensPageLocators.tokenName, name).should(ASSERT.exist);
	}

	createFungibleTokenInDraftStatusWithDefaultOptions(name) {
		// cy.contains(TokensPageLocators.createTokenBtn).click();
		// cy.get(TokensPageLocators.tokenNameInput).click().clear();
		// cy.get(TokensPageLocators.tokenNameInput).type(name);
		// cy.get(TokensPageLocators.createFinalBtn).click();
		// cy.contains(TokensPageLocators.tokenName, name).should(ASSERT.exist);
	}

	editToken(name, editname, editSymbol) {
		// cy.contains(TokensPageLocators.tokenName, name).scrollIntoView().parent().children('td.mat-column-edit').click();

		// cy.get(TokensPageLocators.tokenNameInput).click().clear();

		// cy.get(TokensPageLocators.tokenNameInput).type(editname);

		// cy.get(TokensPageLocators.tokenSymbolInput).click().clear();

		// cy.get(TokensPageLocators.tokenSymbolInput).type(editSymbol);

		// cy.get(TokensPageLocators.tokenDecimalInput).click().clear();

		// cy.get(TokensPageLocators.tokenDecimalInput).type(1);

		// cy.contains(TokensPageLocators.saveTokenBtn).click();
		// TokensPage.waitForTokens();
		// cy.contains(TokensPageLocators.tokenName, editname).scrollIntoView().should(ASSERT.exist);
		// cy.contains(TokensPageLocators.tokenSymbol, editSymbol).scrollIntoView().should(ASSERT.exist);

	}

	editTokenPublished(name, editname, editSymbol) {
		// cy.contains(TokensPageLocators.tokenName, name).scrollIntoView().parent().children('td.mat-column-edit').click();
		// cy.get(TokensPageLocators.tokenNameInput).click().clear();
		// cy.get(TokensPageLocators.tokenNameInput).type(editname);
		// cy.get(TokensPageLocators.tokenSymbolInput).click().clear();
		// cy.get(TokensPageLocators.tokenSymbolInput).type(editSymbol);
		// cy.contains(TokensPageLocators.saveTokenBtn).click();
		// TokensPage.waitForTokens();
		// cy.contains(TokensPageLocators.tokenName, editname).scrollIntoView().should(ASSERT.exist);
		// cy.contains(TokensPageLocators.tokenSymbol, editSymbol).scrollIntoView().should(ASSERT.exist);

	}

	editTokenDisabled(name) {
		// cy.contains(TokensPageLocators.tokenName, name).scrollIntoView().parent().find('[ng-reflect-message="Edit"]').should('have.css', 'cursor', 'not-allowed');

	}

	deleteTokenDisabled(name) {
		// cy.contains(TokensPageLocators.tokenName, name).scrollIntoView().parent().find('[ng-reflect-message="Delete"]').should('have.css', 'cursor', 'not-allowed');

	}

	deleteToken(name) {
		// cy.contains(TokensPageLocators.tokenName, name).scrollIntoView().parent().children('td.mat-column-delete').click();
		// cy.wait(3000);
		// cy.contains(TokensPageLocators.tokenDeleteBtn).click();
		// cy.contains(TokensPageLocators.tokenName, name).scrollIntoView().should(ASSERT.notExist);

	}

	createFungibleTokenInPublishedStatusWithDefaultOptions(name) {
		// cy.contains(TokensPageLocators.createTokenBtn).click();
		// cy.get(TokensPageLocators.publishedBtn).click();
		// cy.get(TokensPageLocators.tokenNameInput).click().clear();
		// cy.get(TokensPageLocators.tokenNameInput).type(name);
		// cy.get(TokensPageLocators.createFinalBtn).click();
		// TokensPage.waitForTokens();
		// cy.contains(TokensPageLocators.tokenName, name).should(ASSERT.exist);

	}


	createNonFungibleTokenInDraftStatusWithDefaultOptions(name) {
		// cy.contains(TokensPageLocators.createTokenBtn).click();
		// cy.get(TokensPageLocators.tokenNameInput).clear().type(name);
		// cy.get(TokensPageLocators.tokenType).click();
		// cy.contains('Non-Fungible').click();
		// cy.get(TokensPageLocators.createFinalBtn).click();
		// TokensPage.waitForTokens();
		// cy.contains(TokensPageLocators.tokenName, name).should(ASSERT.exist);

	}


	createNonFungibleTokenInPublishedStatusWithDefaultOptions(name) {
		// cy.contains(TokensPageLocators.createTokenBtn).click();
		// cy.get(TokensPageLocators.publishedBtn).click();
		// cy.get(TokensPageLocators.tokenNameInput).clear().type(name);
		// cy.get(TokensPageLocators.tokenType).click();
		// cy.contains('Non-Fungible').click();
		// cy.get(TokensPageLocators.createFinalBtn).click();
		// TokensPage.waitForTokens();
		// cy.contains(TokensPageLocators.tokenName, name).should(ASSERT.exist);

	}

	createFungibleTokenInPublishedStatusWithOptionsChanged(name) {
		// cy.contains(TokensPageLocators.createTokenBtn).click();
		// cy.get(TokensPageLocators.publishedBtn).click();
		// cy.get(TokensPageLocators.tokenNameInput).click().clear();
		// cy.get(TokensPageLocators.tokenNameInput).type(name);
		// cy.contains(TokensPageLocators.adminKey).parent().children().contains('Disabled').click();
		// cy.contains(TokensPageLocators.wipeKey).parent().children().contains('Disabled').click();
		// cy.contains(TokensPageLocators.freezeKey).parent().children().contains('Enabled').click();
		// cy.contains(TokensPageLocators.kycKey).parent().children().contains('Enabled').click();
		// //assert if options have been changed
		// cy.contains(TokensPageLocators.adminKey).parent().children().find('[ng-reflect-value="false"]').should(ASSERT.exist);
		// cy.contains(TokensPageLocators.wipeKey).parent().children().find('[ng-reflect-value="false"]').should(ASSERT.exist);
		// cy.contains(TokensPageLocators.freezeKey).parent().children().find('[ng-reflect-value="true"]').should(ASSERT.exist);
		// cy.contains(TokensPageLocators.kycKey).parent().children().find('[ng-reflect-value="true"]').should(ASSERT.exist);
		// cy.get(TokensPageLocators.createFinalBtn).click();
		// TokensPage.waitForTokens();
		// cy.contains(TokensPageLocators.tokenName, name).should(ASSERT.exist);

	}

	createNonFungibleTokenInPublishedStatusWithOptionsChanged(name) {
		// cy.contains(TokensPageLocators.createTokenBtn).click();
		// cy.get(TokensPageLocators.publishedBtn).click();
		// cy.get(TokensPageLocators.tokenNameInput).click().clear();
		// cy.get(TokensPageLocators.tokenNameInput).type(name);
		// cy.get(TokensPageLocators.tokenType).click();
		// cy.contains('Non-Fungible').click();
		// cy.contains(TokensPageLocators.adminKey).parent().children().contains('Disabled').click();
		// cy.contains(TokensPageLocators.wipeKey).parent().children().contains('Disabled').click();
		// cy.contains(TokensPageLocators.freezeKey).parent().children().contains('Enabled').click();
		// cy.contains(TokensPageLocators.kycKey).parent().children().contains('Enabled').click();
		// //assert if options have been changed
		// cy.contains(TokensPageLocators.adminKey).parent().children().find('[ng-reflect-value="false"]').should(ASSERT.exist);
		// cy.contains(TokensPageLocators.wipeKey).parent().children().find('[ng-reflect-value="false"]').should(ASSERT.exist);
		// cy.contains(TokensPageLocators.freezeKey).parent().children().find('[ng-reflect-value="true"]').should(ASSERT.exist);
		// cy.contains(TokensPageLocators.kycKey).parent().children().find('[ng-reflect-value="true"]').should(ASSERT.exist);
		// cy.wait(3000);
		// cy.get(TokensPageLocators.createFinalBtn).click();
		// TokensPage.waitForTokens();
		// cy.contains(TokensPageLocators.tokenName, name).should(ASSERT.exist);

	}

	addTag(tagName) {
		// cy.intercept(TokensPageLocators.tagsListRequest).as(
		// 	"waitForTags"
		// );
		// cy.contains(TokensPageLocators.createTagButton).click();
		// cy.get(TokensPageLocators.tagNameInput).type(tagName);
		// cy.get(TokensPageLocators.tagDescInput).type(tagName);
		// cy.get(TokensPageLocators.createFinalBtn).click();
		// cy.wait("@waitForTags", { timeout: 30000 })
		// cy.contains(tagName).should("exist");
	}

	deleteTag(tagName) {
		// cy.intercept(TokensPageLocators.tagsDeleteRequest).as(
		// 	"waitForTags"
		// );
		// cy.contains(tagName).click();
		// cy.get(TokensPageLocators.tagDeleteButton).click();
		// cy.wait("@waitForTags", { timeout: 30000 })
		// cy.get(TokensPageLocators.closeWindowButton).click();
		// cy.contains(tagName).should("not.exist");
	}
}
