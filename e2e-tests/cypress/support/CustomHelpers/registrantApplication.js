import { METHOD, STATUS_CODE } from '../api/api-const';
import API from '../ApiUrls';
import * as Authorization from '../authorization';
import { waitForBlockAvailable, whileApplicationApproving, whileApplicationCreating, whileDeviceCreating } from '../checkingMethods';

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
