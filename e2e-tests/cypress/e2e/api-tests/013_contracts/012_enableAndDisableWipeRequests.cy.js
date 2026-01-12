import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Checks from "../../../support/checkingMethods";
import * as Authorization from "../../../support/authorization";

context("Contracts", { tags: ['policy_labels', 'formulas', 'trustchains', 'contracts', 'firstPool', 'all'] }, () => {
	const SRUsername = Cypress.env('SRUser');
	const UserUsername = Cypress.env('User');

	const optionKey = "option";
	let contractIdW, contractIdR, tokenId, policyId, hederaId, contractUuidR, contractUuidW, poolId, wipeRequestId;
	let waitForApproveApplicationBlockId, deviceGridBlockId, issueRequestGridBlockId;

	before("Get contracts, policy and register new user", () => {
		Authorization.getAccessToken(SRUsername).then((auth) => {
			// Get Contracts
			cy.request({ method: METHOD.GET, url: API.ApiServer + API.ListOfContracts, headers: { authorization: auth }, qs: { type: "RETIRE" }, timeout: 180000 })
				.then(({ body }) => {
					contractIdR = body.at(0).id;
					contractUuidR = body.at(0).contractId;
				});

			cy.request({ method: METHOD.GET, url: API.ApiServer + API.ListOfContracts, headers: { authorization: auth }, qs: { type: "WIPE" } })
				.then(({ body }) => {
					contractIdW = body.at(0).id;
					contractUuidW = body.at(0).contractId;
				});

			// Get Policy & Token
			cy.request({ method: METHOD.GET, url: API.ApiServer + API.Policies, headers: { authorization: auth }, timeout: 180000 }).then((res) => {
				policyId = res.body.find(p => p.name === "iRec_4")?.id;

				cy.request({ method: METHOD.GET, url: API.ApiServer + API.ListOfTokens, headers: { authorization: auth } }).then(({ body }) => {
					tokenId = body.find(t => t.policyIds[0] === policyId)?.tokenId;

					cy.request({
						method: METHOD.PUT,
						url: API.ApiServer + API.ListOfTokens + API.Async,
						headers: { authorization: auth },
						body: { tokenId, wipeContractId: contractUuidW, draftToken: true }
					});
				}).then(() => {
					cy.request({
						method: METHOD.PUT,
						url: `${API.ApiServer}${API.Policies}${policyId}/${API.Publish}`,
						body: { policyVersion: "1.2.5" },
						headers: { authorization: auth },
						timeout: 600000,
						failOnStatusCode: false,
					}).then((res) => {
						if (res.status === STATUS_CODE.ERROR && res.body.message !== "Policy already published")
							throw new Error("Issue with policy publish");
					});

					cy.request({
						method: METHOD.POST,
						url: `${API.ApiServer}${API.Permissions}${API.Users}${UserUsername}/${API.Policies}${API.Assign}`,
						body: { policyIds: [policyId], assign: true },
						headers: { authorization: auth },
					}).its('status').should('eq', STATUS_CODE.SUCCESS);
				});
			});

			cy.request({ method: METHOD.GET, url: `profiles/${UserUsername}`, headers: { authorization: auth } })
				.then(({ body }) => { hederaId = body.hederaAccountId; });
		});
	});

	before("Get blocks for waiting and token id", () => {
		Authorization.getAccessToken(UserUsername).then((auth) => {
			cy.getPolicyBlockId(auth, policyId, API.WaitForApproveApplication).then(id => waitForApproveApplicationBlockId = id);
			cy.getPolicyBlockId(auth, policyId, API.DeviceGrid).then(id => deviceGridBlockId = id);
			cy.getPolicyBlockId(auth, policyId, API.IssueRequestGrid).then(id => issueRequestGridBlockId = id);
		});

		Authorization.getAccessToken(SRUsername).then((auth) => {
			cy.request({ method: METHOD.GET, url: API.ApiServer + API.ListOfTokens, headers: { authorization: auth } })
				.then(({ body }) => { tokenId = body.find(t => t.policyIds[0] === policyId)?.tokenId; });
		});
	});

	before("Mint token", () => {
		Authorization.getAccessToken(UserUsername).then((auth) => {
			cy.request({ method: METHOD.POST, url: `${API.ApiServer}${API.Policies}${policyId}/${API.ChooseRegistrantRole}`, headers: { authorization: auth }, body: { role: "Registrant" } });
			cy.wait(10000);
			cy.request({ method: METHOD.POST, url: `${API.ApiServer}${API.Policies}${policyId}/${API.CreateApplication}`, headers: { authorization: auth }, body: { document: { field1: {}, field2: {}, field3: {} }, ref: null } });

			const pollApp = { method: METHOD.GET, url: `${API.ApiServer}${API.Policies}${policyId}/${API.Blocks}${waitForApproveApplicationBlockId}`, headers: { authorization: auth }, failOnStatusCode: false };
			Checks.whileApplicationCreating("Submitted for Approval", pollApp, 0);
		});

		Authorization.getAccessToken(SRUsername).then((auth) => {
			cy.request({ method: METHOD.GET, url: `${API.ApiServer}${API.Policies}${policyId}/${API.GetApplications}`, headers: { authorization: auth } }).then(({ body }) => {
				let data = body.data[0];
				data.option.status = "Approved";
				cy.request({ method: METHOD.POST, url: `${API.ApiServer}${API.Policies}${policyId}/${API.ApproveApplication}`, headers: { authorization: auth, "content-type": "application/json" }, body: JSON.stringify({ document: data, tag: "Button_0" }) });
			});
		});

		Authorization.getAccessToken(UserUsername).then((auth) => {
			const pollDevice = { method: METHOD.GET, url: `${API.ApiServer}${API.Policies}${policyId}/${API.Blocks}${deviceGridBlockId}`, headers: { authorization: auth }, failOnStatusCode: false };
			Checks.whileApplicationApproving("Device Name", pollDevice, 0);
			cy.request({ method: METHOD.POST, url: `${API.ApiServer}${API.Policies}${policyId}/${API.CreateDevice}`, headers: { authorization: auth }, body: { document: { field3: {}, field4: {}, field5: {} }, ref: null } });
			Checks.whileDeviceCreating("Waiting for approval", pollDevice, 0);
		});

		Authorization.getAccessToken(SRUsername).then((auth) => {
			cy.request({ method: METHOD.GET, url: `${API.ApiServer}${API.Policies}${policyId}/${API.GetDevices}`, headers: { authorization: auth } }).then(({ body }) => {
				let data = body.data.at(-1);
				data[optionKey].status = "Approved";
				cy.request({ method: METHOD.POST, url: `${API.ApiServer}${API.Policies}${policyId}/${API.ApproveDevice}`, headers: { authorization: auth, "content-type": "application/json" }, body: JSON.stringify({ document: data, tag: "Button_0" }) });
			});
		});

		Authorization.getAccessToken(UserUsername).then((auth) => {
			const pollIssue = { method: METHOD.GET, url: `${API.ApiServer}${API.Policies}${policyId}/${API.Blocks}${issueRequestGridBlockId}`, headers: { authorization: auth }, failOnStatusCode: false };
			Checks.whileDeviceApproving("Approved", pollIssue, 0);
			cy.request({ method: METHOD.GET, url: `${API.ApiServer}${API.Policies}${policyId}/${API.GetDeviceIssue}`, headers: { authorization: auth } }).then(({ body }) => {
				cy.request({ method: METHOD.POST, url: `${API.ApiServer}${API.Policies}${policyId}/${API.CreateIssue}`, headers: { authorization: auth, "content-type": "application/json" }, body: { document: { field2: {}, field3: {}, field6: "2024-03-01", field7: 10, field8: "2024-03-02", field17: UserUsername, field18: hederaId }, ref: body.data.at(-1) } });
				Checks.whileIssueRequestCreating("Waiting for approval", pollIssue, 0);
			});
		});

		Authorization.getAccessToken(SRUsername).then((auth) => {
			cy.request({ method: METHOD.GET, url: `${API.ApiServer}${API.Policies}${policyId}/${API.GetIssues}`, headers: { authorization: auth } }).then(({ body }) => {
				let data = body.data.at(-1);
				data[optionKey].status = "Approved";
				cy.request({ method: METHOD.POST, url: `${API.ApiServer}${API.Policies}${policyId}/${API.ApproveIssueRequestsBtn}`, headers: { authorization: auth, "content-type": "application/json" }, body: JSON.stringify({ document: data, tag: "Button_0" }) });
			});
		});

		Authorization.getAccessToken(UserUsername).then((auth) => {
			const balanceReq = { method: METHOD.GET, url: API.ApiServer + API.ListOfTokens, headers: { authorization: auth } };
			Checks.whileBalanceVerifying("10", balanceReq, 91, tokenId);
		});
	});

	it("Disable wipe contract requests", () => {
		Authorization.getAccessToken(SRUsername).then((auth) => {
			cy.toggleWipeRequests(auth, contractIdW, API.Disable).its('status').should('eq', STATUS_CODE.OK);
			cy.request({ method: METHOD.POST, url: `${API.ApiServer}${API.RetireContract}${contractIdR}/${API.PoolContract}`, headers: { authorization: auth }, body: { tokens: [{ token: tokenId, count: 1 }], immediately: false } }).its('status').should('eq', STATUS_CODE.OK);
			cy.wait(120000);
			cy.request({ method: METHOD.GET, url: API.ApiServer + API.WipeRequests, headers: { authorization: auth }, qs: { contractId: contractIdW } }).then(({ body }) => { expect(body).to.deep.eq([]); });
		});
	});

	it("Disable wipe contract requests without auth token - Negative", () => {
		cy.toggleWipeRequests(null, contractIdW, API.Disable).its('status').should('eq', STATUS_CODE.UNAUTHORIZED);
	});

	it("Disable wipe contract requests with invalid auth token - Negative", () => {
		cy.toggleWipeRequests("Bearer wqe", contractIdW, API.Disable).its('status').should('eq', STATUS_CODE.UNAUTHORIZED);
	});

	it("Disable wipe contract requests with empty auth token - Negative", () => {
		cy.toggleWipeRequests("", contractIdW, API.Disable).its('status').should('eq', STATUS_CODE.UNAUTHORIZED);
	});

	it("Unset retire contract pool without auth token - Negative", () => {
		Authorization.getAccessToken(SRUsername).then((auth) => {
			cy.request({ method: METHOD.GET, url: API.ApiServer + API.RetirePools, headers: { authorization: auth }, qs: { contractId: contractUuidR } }).then(({ body }) => {
				poolId = body.at(0).id;
				cy.deleteRetirePool(null, poolId).its('status').should('eq', STATUS_CODE.UNAUTHORIZED);
			});
		});
	});

	it("Unset retire contract pool with invalid auth token - Negative", () => {
		cy.deleteRetirePool("Bearer wqe", poolId).its('status').should('eq', STATUS_CODE.UNAUTHORIZED);
	});

	it("Unset retire contract pool with empty auth token - Negative", () => {
		cy.deleteRetirePool("", poolId).its('status').should('eq', STATUS_CODE.UNAUTHORIZED);
	});

	it("Unset retire contract pool", () => {
		Authorization.getAccessToken(SRUsername).then((auth) => {
			cy.deleteRetirePool(auth, poolId).its('status').should('eq', STATUS_CODE.OK);
		});
	});

	it("Enable wipe contract requests", () => {
		Authorization.getAccessToken(SRUsername).then((auth) => {
			cy.toggleWipeRequests(auth, contractIdW, API.Enable).its('status').should('eq', STATUS_CODE.OK);
			cy.request({ method: METHOD.POST, url: `${API.ApiServer}${API.RetireContract}${contractIdR}/${API.PoolContract}`, headers: { authorization: auth }, body: { tokens: [{ token: tokenId, count: 1 }], immediately: false } }).its('status').should('eq', STATUS_CODE.OK);
			Checks.whileRetireRequestCreating(contractUuidW, auth, 0);
		});
	});

	it("Enable wipe contract requests without auth token - Negative", () => {
		cy.toggleWipeRequests(null, contractIdW, API.Enable).its('status').should('eq', STATUS_CODE.UNAUTHORIZED);
	});

	it("Enable wipe contract requests with invalid auth token - Negative", () => {
		cy.toggleWipeRequests("Bearer wqe", contractIdW, API.Enable).its('status').should('eq', STATUS_CODE.UNAUTHORIZED);
	});

	it("Enable wipe contract requests with empty auth token - Negative", () => {
		cy.toggleWipeRequests("", contractIdW, API.Enable).its('status').should('eq', STATUS_CODE.UNAUTHORIZED);
	});

	it("Approve wipe contract requests without auth token - Negative", () => {
		cy.approveWipeRequest(null, wipeRequestId).its('status').should('eq', STATUS_CODE.UNAUTHORIZED);
	});

	it("Approve wipe contract requests with invalid auth token - Negative", () => {
		cy.approveWipeRequest("Bearer wqe", wipeRequestId).its('status').should('eq', STATUS_CODE.UNAUTHORIZED);
	});

	it("Approve wipe contract requests with empty auth token - Negative", () => {
		cy.approveWipeRequest("", wipeRequestId).its('status').should('eq', STATUS_CODE.UNAUTHORIZED);
	});

	it("Approve wipe contract requests", () => {
		Authorization.getAccessToken(SRUsername).then((auth) => {
			cy.request({ method: METHOD.GET, url: API.ApiServer + API.WipeRequests, headers: { authorization: auth }, qs: { contractId: contractUuidW } }).then(({ body }) => {
				wipeRequestId = body.at(0).id;
				cy.approveWipeRequest(auth, wipeRequestId).its('status').should('eq', STATUS_CODE.OK);
			});
		});
		cy.wait(60000);
		Authorization.getAccessToken(UserUsername).then((auth) => {
			cy.request({ method: METHOD.GET, url: API.ApiServer + API.RetirePools, headers: { authorization: auth } }).then(({ body }) => { expect(body.at(0)).to.have.property("id"); });
		});
	});

});