import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';

// The settings endpoint only format-validates the operator (AccountId.fromString /
// PrivateKey.fromString – no network or balance check), so a throwaway keypair is
// enough to exercise it.
const testOperatorId = '0.0.999999999';
const testOperatorKey = '302e020100300506032b6570042204206d8024debb71d43324e4b59d879765875493039e647e2850e653b4b2dd27cc20';

// Required by the API, but unused while IPFS_PROVIDER=local.
const ipfsStorageApiKey = Cypress.env('ipfsStorageApiKey') || 'local-ipfs-node-unused';

// POST /settings replaces the operator for the whole Guardian instance. Without a real
// operator to put back afterwards this spec would strand every later spec on the throwaway
// account, so it is skipped instead of run.
const realOperatorId = Cypress.env('operatorId');
const realOperatorKey = Cypress.env('operatorKey');
const operatorConfigured = Boolean(realOperatorId && realOperatorKey);

context('Settings', { tags: ['settings', 'thirdPool', 'all', 'all-no-mgs'] }, () => {
    const SRUsername = Cypress.env('SRUser');

    before(function () {
        if (!operatorConfigured) {
            cy.log('Skipping: CYPRESS_operatorId / CYPRESS_operatorKey are not set');
            this.skip();
        }
    });

    const setSettings = (authorization, operatorId, operatorKey) =>
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + 'settings',
            headers: {
                authorization,
            },
            body: {
                operatorId,
                operatorKey,
                ipfsStorageApiKey,
            }
        }).then((response) => {
            expect(response.status).to.eq(STATUS_CODE.SUCCESS)
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + 'settings',
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.OK)
                expect(response.body.operatorId).to.eq(operatorId)
            })
        })

    it('Set settings', { tags: ['smoke'] }, () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            setSettings(authorization, testOperatorId, testOperatorKey)
        })
    })

    after('Restore the real operator', () => {
        if (!operatorConfigured) {
            return;
        }
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            setSettings(authorization, realOperatorId, realOperatorKey)
        })
    })
})
