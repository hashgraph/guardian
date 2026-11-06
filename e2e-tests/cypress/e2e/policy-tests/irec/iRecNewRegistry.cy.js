import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import { registerUser } from '../../../support/api/accounts';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';
import { TIMEOUTS } from '../../../support/CustomHelpers/timeouts';
import { randomInt } from '../../../support/random';

// Starts from a brand-new Standard Registry instead of the seeded accounts. The registry, the user and the
// published policy and token are left behind: the product cannot delete accounts or published policies.
context('Policy autotest', { tags: ['policyAT', 'policy-all', 'all', 'all-no-mgs'] }, () => {
    const runId = randomInt(1000000000);
    const registryUsername = `${runId}iRecRegistry`;
    const userUsername = `${runId}iRecUser`;
    const policyFile = '../Methodology Library/International Renewable Energy Certificate (iREC)/Policies/iRec Policy.policy';

    let registryDid;
    let policyId;
    let tokenId;

    const setHederaCredentials = (username, profile) =>
        Authorization.getAccessToken(username).then((authorization) =>
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.RandomKey,
                headers: { authorization },
                timeout: TIMEOUTS.backend,
            }).then((keyResponse) =>
                cy.request({
                    method: METHOD.PUT,
                    url: API.ApiServer + API.Profiles + username,
                    headers: { authorization },
                    body: {
                        hederaAccountId: keyResponse.body.id,
                        hederaAccountKey: keyResponse.body.key,
                        ...profile,
                    },
                    timeout: TIMEOUTS.longOperation,
                })
            ).then(() =>
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Profiles + username,
                    headers: { authorization },
                })
            )
        );

    it('Register a new Standard Registry with Hedera credentials', () => {
        return registerUser(registryUsername, 'STANDARD_REGISTRY')
            .then(() => setHederaCredentials(registryUsername, {
                vcDocument: {
                    geography: 'testGeography',
                    law: 'testLaw',
                    tags: 'testTags',
                    type: 'StandardRegistry',
                    '@context': [],
                },
            }))
            .then((profile) => {
                expect(profile.body.username).to.eq(registryUsername);
                expect(profile.body.role).to.eq('STANDARD_REGISTRY');
                expect(profile.body.confirmed).to.eq(true);
                registryDid = profile.body.did;
                expect(registryDid).to.be.a('string').and.not.be.empty;
            });
    });

    it('Import and publish iRec Policy as the new registry', () => {
        return Authorization.getAccessToken(registryUsername).then((authorization) =>
            cy.readFile(policyFile, 'binary')
                .then((binary) => Cypress.Blob.binaryStringToBlob(binary))
                .then((file) =>
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.PolicisImportFile,
                        body: file,
                        headers: { 'content-type': 'binary/octet-stream', authorization },
                        timeout: TIMEOUTS.longOperation,
                    })
                )
                .then((importResponse) => {
                    expect(importResponse.status).to.eq(STATUS_CODE.SUCCESS);
                    // `cy.request` yields an ArrayBuffer for binary requests.
                    const [imported] = JSON.parse(new TextDecoder('utf-8').decode(importResponse.body));
                    expect(imported.status).to.eq('DRAFT');
                    policyId = imported.id;
                    return cy.request({
                        method: METHOD.PUT,
                        url: API.ApiServer + API.Policies + policyId + '/' + API.Publish,
                        body: { policyVersion: '1.0.0' },
                        headers: { authorization },
                        timeout: TIMEOUTS.longOperation,
                    });
                })
                .then((publishResponse) => {
                    expect(publishResponse.status).to.eq(STATUS_CODE.OK);
                    const published = publishResponse.body.policies.find((policy) => policy.id === policyId);
                    expect(published.status).to.eq('PUBLISH');
                    return cy.request({
                        method: METHOD.GET,
                        url: API.ApiServer + API.ListOfTokens,
                        headers: { authorization },
                    });
                })
                .then((tokensResponse) => {
                    const policyToken = tokensResponse.body.find((token) => token.policyIds.includes(policyId));
                    expect(policyToken, 'token of the published policy').to.exist;
                    tokenId = policyToken.tokenId;
                })
        );
    });

    it('Register a user under the new registry', () => {
        return registerUser(userUsername)
            .then(() => setHederaCredentials(userUsername, { parent: registryDid }))
            .then((profile) => {
                expect(profile.body.username).to.eq(userUsername);
                expect(profile.body.role).to.eq('USER');
                expect(profile.body.confirmed).to.eq(true);
                expect(profile.body.parent).to.eq(registryDid);
            });
    });

    it('Associate the policy token and grant KYC to the user', () => {
        return Authorization.getAccessToken(userUsername)
            .then((authorization) =>
                cy.request({
                    method: METHOD.PUT,
                    url: API.ApiServer + API.ListOfTokens + tokenId + '/associate',
                    headers: { authorization },
                    timeout: TIMEOUTS.backend,
                })
            )
            .then((associateResponse) => {
                expect(associateResponse.status).to.eq(STATUS_CODE.OK);
                return Authorization.getAccessToken(registryUsername);
            })
            .then((authorization) =>
                cy.request({
                    method: METHOD.PUT,
                    url: API.ApiServer + API.ListOfTokens + tokenId + '/' + userUsername + '/grant-kyc',
                    headers: { authorization },
                    timeout: TIMEOUTS.backend,
                })
            )
            .then((kycResponse) => {
                expect(kycResponse.status).to.eq(STATUS_CODE.OK);
                expect(kycResponse.body.tokenId).to.eq(tokenId);
                expect(kycResponse.body.kyc).to.eq(true);
            });
    });
});
