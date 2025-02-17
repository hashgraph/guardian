import CommonElements from "../../../support/defaultUIElements";
import * as Checks from "../../../support/checkingMethods";

const TokensPageLocators = {
	associateTokenButton: "div.associated-btn",
	grantKYCButton: "button[label='Grant KYC']",
	balanceIncreaseElement: "td:contains(' 1 ')",
	createTokenBtn: 'button[label="Create token"]',
	createFinalBtn: 'button[ng-reflect-label="Create"]',
	publishedBtn: '[ng-reflect-on="Published"]',
	adminKey: 'div.key-name:contains(" Admin Key ")',
	wipeKey: 'div.key-name:contains(" Wipe Key ")',
	freezeKey: 'div.key-name:contains(" Freeze Key ")',
	kycKey: 'div.key-name:contains(" KYC Key ")',
	tokenTypeChoose: 'p-dropdown[formcontrolname="tokenType"]',
	tokenDeleteBtn: 'button[ng-reflect-label="Delete"]',
	tokenEditBtn: '[ng-reflect-src="/assets/images/icons/edit.svg"]',
	tokenEditBtnDisabled: '[ng-reflect-svg-class="disabled-color"]',
	adminKeyIsntSet: 'Admin Key is not set',
	tokenNameInput: '[formcontrolname="tokenName"]',
	tokenSymbolInput: '[formcontrolname="tokenSymbol"]',
	saveTokenBtn: "Save",
    createTagButton: ' Create a Tag ',
    tagNameInput: '[ng-reflect-name="name"]',
    tagDeleteButton: "div.delete-tag",
    tagDescInput: '[ng-reflect-name="description"]',
    tagsListRequest: "/api/v1/tags/",
    closeWindowButton: "[ng-reflect-label='Close']",
    deleteTagIcon: "svg-icon[svgclass='accent-color-red']",
    createButton: "[ng-reflect-label='Create']",


	
	importBtn: "Tokens",
	tokensList: "/api/v1/tokens",
	tokenName: "td.mat-column-tokenName",
	tokenSymbol: "td.mat-column-tokenSymbol",
	tokenId: "td > hedera-explorer > a",
	tokenType: '[ng-reflect-name="tokenType"]',
	tagsDeleteRequest: "/api/v1/tags/*",
};

export class TokensPage {

	openTokensTab() {
		cy.get(CommonElements.navBar).should('exist')
		cy.get("body").then(($body) => {
			if ($body.find(`span:contains(${CommonElements.manageTokens})`).length == 0)
				cy.get(CommonElements.navBar).contains(CommonElements.tokensTab).click();
		})
		cy.get(CommonElements.navBar).contains(CommonElements.manageTokens).click();
	}

	openUserTokensTab() {
		cy.get(CommonElements.navBar).should('exist')
		cy.get("body").then(($body) => {
			if ($body.find(`span:contains(${CommonElements.listOfTokensTab})`).length == 0)
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

	verifyBalance(name, username, balance = " 1 ") {
		this.openAndRefreshUserTokensData(name, username);
		Checks.waitForBalanceIncrease(balance, username);
	}

	createToken(name, published = false, nft = false, adminKey = true, wipeKey = true, freeze = false, KYC = false) {
		cy.get(TokensPageLocators.createTokenBtn).click();
		cy.get(TokensPageLocators.tokenNameInput).click().clear().type(name);
		if (published)
			cy.get(TokensPageLocators.publishedBtn).click();
		if (nft) {
			cy.get(TokensPageLocators.tokenTypeChoose).click();
			cy.contains("Non-Fungible").click();
		}
		if (!adminKey) {
			cy.get(TokensPageLocators.adminKey).parent().find("switch-button").click();
		}
		if (!wipeKey) {
			cy.get(TokensPageLocators.wipeKey).parent().find("switch-button").click();
		}
		if (freeze) {
			cy.get(TokensPageLocators.freezeKey).parent().find("switch-button").click();
		}
		if (KYC) {
			cy.get(TokensPageLocators.kycKey).parent().find("switch-button").click();
		}
		cy.get(TokensPageLocators.createFinalBtn).click();
		Checks.waitForTaskComplete();
		Checks.waitForLoading();
		cy.contains(name).should('exist');
	}

	deleteToken(name) {
		cy.contains(name).parent().find('[ng-reflect-src="/assets/images/icons/delete.sv"]').click();
		cy.get(TokensPageLocators.tokenDeleteBtn).click();
		Checks.waitForTaskComplete();
		cy.contains(name).should('not.exist');
	}

	deleteTokenDisabled(name) {
		cy.contains(name).parent().find('[ng-reflect-src="/assets/images/icons/delete.sv"]').click();
		cy.get(TokensPageLocators.tokenDeleteBtn).click();
		Checks.waitForTaskComplete();
		cy.contains(TokensPageLocators.adminKeyIsntSet).should('exist');
		cy.contains(name).should('not.exist');
	}

	editToken(name, editname, editSymbol) {
		cy.contains(name).parent().find(TokensPageLocators.tokenEditBtn).click();
		cy.get(TokensPageLocators.tokenNameInput).click().clear().type(editname);
		cy.get(TokensPageLocators.tokenSymbolInput).click().clear().type(editSymbol);
		cy.contains(TokensPageLocators.saveTokenBtn).click();
		cy.contains(editname).should('exist');
		cy.contains(name).parent().contains(editSymbol).should('exist');
	}

	editTokenDisabled(name) {
		cy.contains(name).parent().find(TokensPageLocators.tokenEditBtnDisabled).should('exist');
	}	

    addTag(name, tagName) {
        cy.contains(name).siblings().contains(TokensPageLocators.createTagButton).click();
        cy.get(TokensPageLocators.tagNameInput).type(tagName);
        cy.get(TokensPageLocators.tagDescInput).type(tagName);
        cy.get(TokensPageLocators.createButton).click();
        cy.contains(tagName).should("exist");
    }

    deleteTag(name, tagName) {
        cy.contains(name).siblings().contains(tagName).click();
        cy.get(TokensPageLocators.deleteTagIcon).click();
        cy.get(TokensPageLocators.closeWindowButton).click();
        cy.contains(tagName).should("not.exist");
    }








	static waitForTokens() {
		// cy.intercept(TokensPageLocators.tokensList).as(
		// 	"waitForTokensList"
		// );
		// cy.wait("@waitForTokensList", { timeout: 200000 })
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

	createTokenOld(name) {
		// cy.get(TokensPageLocators.createTokenBtn).click();
		// cy.get(TokensPageLocators.publishedBtn).click();
		// cy.get(TokensPageLocators.tokenNameInput).clear().type(name);
		// cy.get(TokensPageLocators.createFinalBtn).click();
		// TokensPage.waitForTokens();
		// cy.contains(TokensPageLocators.tokenName, name).should(ASSERT.exist);
	}

	createFungibleTokenInDraftStatusWithDefaultOptions(name) {
		// cy.get(TokensPageLocators.createTokenBtn).click();
		// cy.get(TokensPageLocators.tokenNameInput).click().clear();
		// cy.get(TokensPageLocators.tokenNameInput).type(name);
		// cy.get(TokensPageLocators.createFinalBtn).click();
		// cy.contains(TokensPageLocators.tokenName, name).should(ASSERT.exist);
	}

	createFungibleTokenInPublishedStatusWithDefaultOptions(name) {
		// cy.get(TokensPageLocators.createTokenBtn).click();
		// cy.get(TokensPageLocators.publishedBtn).click();
		// cy.get(TokensPageLocators.tokenNameInput).click().clear();
		// cy.get(TokensPageLocators.tokenNameInput).type(name);
		// cy.get(TokensPageLocators.createFinalBtn).click();
		// TokensPage.waitForTokens();
		// cy.contains(TokensPageLocators.tokenName, name).should(ASSERT.exist);

	}


	createNonFungibleTokenInDraftStatusWithDefaultOptions(name) {
		// cy.get(TokensPageLocators.createTokenBtn).click();
		// cy.get(TokensPageLocators.tokenNameInput).clear().type(name);
		// cy.get(TokensPageLocators.tokenType).click();
		// cy.contains('Non-Fungible').click();
		// cy.get(TokensPageLocators.createFinalBtn).click();
		// TokensPage.waitForTokens();
		// cy.contains(TokensPageLocators.tokenName, name).should(ASSERT.exist);

	}


	createNonFungibleTokenInPublishedStatusWithDefaultOptions(name) {
		// cy.get(TokensPageLocators.createTokenBtn).click();
		// cy.get(TokensPageLocators.publishedBtn).click();
		// cy.get(TokensPageLocators.tokenNameInput).clear().type(name);
		// cy.get(TokensPageLocators.tokenType).click();
		// cy.contains('Non-Fungible').click();
		// cy.get(TokensPageLocators.createFinalBtn).click();
		// TokensPage.waitForTokens();
		// cy.contains(TokensPageLocators.tokenName, name).should(ASSERT.exist);

	}

	createFungibleTokenInPublishedStatusWithOptionsChanged(name) {
		// cy.get(TokensPageLocators.createTokenBtn).click();
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
		// cy.get(TokensPageLocators.createTokenBtn).click();
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
}
