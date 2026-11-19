import { METHOD, STATUS_CODE } from '../api/api-const';
import API from '../ApiUrls';
import * as Authorization from '../authorization';
import { waitForTokenBalance } from '../api/contracts';
import { waitForBlockAvailable, whileApplicationApproving, whileApplicationCreating, whileDeviceApproving, whileDeviceCreating, whileIssueRequestApproving, whileIssueRequestCreating } from '../checkingMethods';

/**
 * Assigns a published iRec policy to `userUsername`, who picks the Registrant role and submits an
 * application, and waits until it is submitted for approval: the application is the first row of
 * the `registrants_grid` block afterwards.
 */
export const submitRegistrantApplication = (srUsername, userUsername, policyId) =>
    Authorization.getAccessToken(srUsername)
        .then((authorization) => cy.assignPolicyToUser(authorization, userUsername, policyId))
        .then((response) => {
            expect(response.status, 'assigning the policy to the user').to.eq(STATUS_CODE.SUCCESS);
            return Authorization.getAccessToken(userUsername);
        })
        .then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: `${API.ApiServer}${API.Policies}${policyId}/${API.ChooseRegistrantRole}`,
                headers: { authorization },
                body: { role: 'Registrant' },
            });
            waitForBlockAvailable(API.BlockByTag(policyId, 'create_application'), authorization);
            cy.request({
                method: METHOD.POST,
                url: API.BlockByTag(policyId, 'create_application'),
                headers: { authorization },
                body: {
                    document: { field1: {}, field2: {}, field3: {} },
                    ref: null,
                },
            });
            return whileApplicationCreating('Submitted for Approval', {
                method: METHOD.GET,
                url: API.BlockByTag(policyId, 'wait_for_approve'),
                headers: { authorization },
            });
        });

/** The Standard Registry approves the application `submitRegistrantApplication` submitted. */
export const approveRegistrantApplication = (srUsername, userUsername, policyId) =>
    Authorization.getAccessToken(srUsername)
        .then((authorization) => cy.request({
            method: METHOD.GET,
            url: API.BlockByTag(policyId, 'registrants_grid'),
            headers: { authorization },
        }).then((response) => {
            const application = response.body.data.at(0);
            application.option.status = 'Approved';
            cy.request({
                method: METHOD.POST,
                url: `${API.ApiServer}${API.Policies}${policyId}/${API.ApproveApplication}`,
                headers: { authorization },
                body: { document: application, tag: 'Button_0' },
            });
        }))
        .then(() => Authorization.getAccessToken(userUsername))
        .then((authorization) => whileApplicationApproving('Device Name', {
            method: METHOD.GET,
            url: API.BlockByTag(policyId, 'devices_grid'),
            headers: { authorization },
        }));

/** The registrant of an approved application registers a device, which waits for approval. */
export const submitDevice = (userUsername, policyId) =>
    Authorization.getAccessToken(userUsername).then((authorization) => {
        cy.request({
            method: METHOD.POST,
            url: `${API.ApiServer}${API.Policies}${policyId}/${API.CreateDevice}`,
            headers: { authorization },
            body: {
                document: { field3: {}, field4: {}, field5: {} },
                ref: null,
            },
        });
        return whileDeviceCreating('Waiting for approval', {
            method: METHOD.GET,
            url: API.BlockByTag(policyId, 'devices_grid'),
            headers: { authorization },
        });
    });

const ISSUED_AMOUNT = 10;

const approveLastRow = (authorization, policyId, gridUrl, approveButtonUrl) =>
    cy.request({
        method: METHOD.GET,
        url: `${API.ApiServer}${API.Policies}${policyId}/${gridUrl}`,
        headers: { authorization },
    }).then((response) => {
        const row = response.body.data.at(-1);
        row.option.status = 'Approved';
        cy.request({
            method: METHOD.POST,
            url: `${API.ApiServer}${API.Policies}${policyId}/${approveButtonUrl}`,
            headers: { authorization },
            body: { document: row, tag: 'Button_0' },
        });
    });

const findPolicyTokenId = (authorization, policyId) =>
    cy.request({
        method: METHOD.GET,
        url: API.ApiServer + API.ListOfTokens,
        headers: { authorization },
    }).then((response) => {
        expect(response.status).to.eq(STATUS_CODE.OK);
        const token = response.body.find((item) => (item.policyIds ?? []).includes(policyId));
        expect(token, `the token of policy ${policyId}`).to.not.be.undefined;
        return token.tokenId;
    });

/**
 * Drives a freshly published iRec policy from the registrant's application to minted tokens: the
 * application, a device and an issue request of `userUsername`, each approved by the Standard
 * Registry. Yields once the tokens are in the user's balance.
 */
export const mintRegistrantTokens = (srUsername, userUsername, policyId) => {
    submitRegistrantApplication(srUsername, userUsername, policyId);
    approveRegistrantApplication(srUsername, userUsername, policyId);
    submitDevice(userUsername, policyId);
    Authorization.getAccessToken(srUsername)
        .then((authorization) => approveLastRow(authorization, policyId, API.GetDevices, API.ApproveDevice));
    return Authorization.getAccessToken(userUsername).then((authorization) => {
        const issueRequestGrid = {
            method: METHOD.GET,
            url: API.BlockByTag(policyId, 'issue_requests_grid'),
            headers: { authorization },
        };
        whileDeviceApproving('Approved', {
            method: METHOD.GET,
            url: API.BlockByTag(policyId, 'devices_grid'),
            headers: { authorization },
        });
        cy.request({
            method: METHOD.GET,
            url: `${API.ApiServer}profiles/${userUsername}`,
            headers: { authorization },
        }).then((profile) => cy.request({
            method: METHOD.GET,
            url: `${API.ApiServer}${API.Policies}${policyId}/${API.GetDeviceIssue}`,
            headers: { authorization },
        }).then((devices) => cy.request({
            method: METHOD.POST,
            url: `${API.ApiServer}${API.Policies}${policyId}/${API.CreateIssue}`,
            headers: { authorization },
            body: {
                document: {
                    field2: {},
                    field3: {},
                    field6: '2024-03-01',
                    field7: ISSUED_AMOUNT,
                    field8: '2024-03-02',
                    field17: userUsername,
                    field18: profile.body.hederaAccountId,
                },
                ref: devices.body.data.at(-1),
            },
        })));
        whileIssueRequestCreating('Waiting for approval', issueRequestGrid);
        Authorization.getAccessToken(srUsername).then((srAuthorization) => {
            approveLastRow(srAuthorization, policyId, API.GetIssues, API.ApproveIssueRequestsBtn);
            findPolicyTokenId(srAuthorization, policyId).as('policyTokenId');
        });
        whileIssueRequestApproving('Approved', issueRequestGrid);
        //the minted tokens reach the balance through the mirror node, so it is polled, not assumed
        return cy.get('@policyTokenId').then((tokenId) =>
            waitForTokenBalance(authorization, { tokenId, expected: String(ISSUED_AMOUNT) }));
    });
};
