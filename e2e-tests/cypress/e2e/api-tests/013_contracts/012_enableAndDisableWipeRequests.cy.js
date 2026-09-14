
import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Checks from '../../../support/checkingMethods';
import * as Authorization from '../../../support/authorization';
import * as Contracts from '../../../support/api/contracts';

context('Contracts', { tags: ['policy_labels', 'formulas', 'trustchains', 'contracts', 'firstPool', 'all', 'all-no-mgs'] }, () => {
	const SRUsername = Cypress.env('SRUser');
	const UserUsername = Cypress.env('User');
	const contractNameR = 'FirstAPIContractR';
	const contractNameW = 'FirstAPIContractW';

	const optionKey = 'option';
	let contractIdW; let contractIdR; let tokenId; let policyId; let hederaId; let contractUuidR; let contractUuidW; let poolId; let wipeRequestId;
	let waitForApproveApplicationBlockId; let deviceGridBlockId; let issueRequestGridBlockId;

	const toggleWipeRequests = ({
		authorization,
		contractId,
		action,                  // API.Disable | API.Enable
		timeout = 180000,
		failOnStatusCode = true,
	}) => cy.request({
		method: METHOD.POST,
		url: `${API.ApiServer}${API.WipeContract}${contractId}/${API.Requests}${action}`,
		headers: authorization ? { authorization } : {},
		timeout,
		failOnStatusCode,
	});

	const postPoolContract = ({
		authorization,
		contractId,
		body,
		failOnStatusCode = true,
	}) => cy.request({
		method: METHOD.POST,
		url: `${API.ApiServer}${API.RetireContract}${contractId}/${API.PoolContract}`,
		headers: authorization ? { authorization } : {},
		body,
		failOnStatusCode,
	});

	const deleteRetirePool = ({
		authorization,
		retirePoolId,
		failOnStatusCode = true,
	}) => cy.request({
		method: METHOD.DELETE,
		url: `${API.ApiServer}${API.RetirePools}${retirePoolId}`,
		headers: authorization ? { authorization } : {},
		failOnStatusCode,
	});

	const approveWipeRequest = ({
		authorization,
		requestId,
		failOnStatusCode = true,
	}) => cy.request({
		method: METHOD.POST,
		url: `${API.ApiServer}${API.WipeRequests}${requestId}/${API.Approve}`,
		headers: authorization ? { authorization } : {},
		failOnStatusCode,
	});

	before('Get contracts, policy and register new user', () => {
		//Create retire contract and save id
		Authorization.getAccessToken(SRUsername).then((authorization) => {
			Contracts.getContractByDescription(authorization, 'RETIRE', contractNameR).then((contract) => {
				contractIdR = contract.id;
				contractUuidR = contract.contractId;
			})
			Contracts.getContractByDescription(authorization, 'WIPE', contractNameW).then((contract) => {
				contractIdW = contract.id;
				contractUuidW = contract.contractId;
			})

			//The policy this spec works on is seeded on demand, so the folder does not depend on
			//another suite having imported it. It is taken as a draft: the wipe contract is put on
			//its token below, and publishing it afterwards is what raises the wipe request
			cy.getOrCreateIRec4Policy(SRUsername, { publish: false }).then((policy) => {
				policyId = policy.id
				//Get token(Irec token) draft id to update it
				cy.request({
					method: METHOD.GET,
					url: API.ApiServer + API.ListOfTokens,
					headers: {
						authorization,
					},
				}).then((response) => {
					expect(response.status).eql(STATUS_CODE.OK);
					response.body.forEach(element => {
						if (element.policyIds.at(0) === policyId) {
							tokenId = element.tokenId
						}
					});
				}).then(() => {
					//Put wipe contract to token
					cy.request({
						method: METHOD.PUT,
						url: API.ApiServer + API.ListOfTokens + API.Async,
						headers: {
							authorization,
						},
						body: {
							tokenId,
							wipeContractId: contractUuidW,
							draftToken: true
						}
					}).then(() => {
						//Publish policy
						cy.request({
							method: METHOD.PUT,
							url: API.ApiServer + API.Policies + policyId + '/' + API.Publish,
							body: {
								policyVersion: '1.2.5'
							},
							headers: {
								authorization
							},
							timeout: 600000,
							failOnStatusCode: false,
						}).then((response) => {
							if (response.status === STATUS_CODE.ERROR && response.body.message !== 'Policy already published')
								{throw new Error('Issue with policy publish')}
						})
					})
					cy.request({
						method: METHOD.POST,
						url: API.ApiServer + API.Permissions + API.Users + UserUsername + '/' + API.Policies + API.Assign,
						body: {
							policyIds: [
								policyId
							],
							assign: true
						},
						headers: {
							authorization
						},
					}).then((response) => {
						expect(response.status).to.eq(STATUS_CODE.SUCCESS);
					})
				})
				cy.request({
					method: METHOD.GET,
					url: API.ApiServer + 'profiles/' + UserUsername,
					headers: {
						authorization,
					}
				}).should((response) => {
					expect(response.status).to.eq(STATUS_CODE.OK)
					hederaId = response.body.hederaAccountId;
				})
			})
		})
	})

	before('Get blocks for waiting(approve app, device grid, issue grid) and token id', () => {
		Authorization.getAccessToken(UserUsername).then((authorization) => {
			cy.request({
				method: METHOD.GET,
				url: API.ApiServer + API.Policies + policyId + '/' + API.WaitForApproveApplication,
				headers: {
					authorization
				}
			}).then((response) => {
				waitForApproveApplicationBlockId = response.body.id
			})
			cy.request({
				method: METHOD.GET,
				url: API.ApiServer + API.Policies + policyId + '/' + API.DeviceGrid,
				headers: {
					authorization
				}
			}).then((response) => {
				deviceGridBlockId = response.body.id
			})
			cy.request({
				method: METHOD.GET,
				url: API.ApiServer + API.Policies + policyId + '/' + API.IssueRequestGrid,
				headers: {
					authorization
				}
			}).then((response) => {
				issueRequestGridBlockId = response.body.id
			})
		})
		Authorization.getAccessToken(SRUsername).then((authorization) => {
			cy.request({
				method: METHOD.GET,
				url: API.ApiServer + API.ListOfTokens,
				headers: {
					authorization,
				},
			}).then((response) => {
				expect(response.status).eql(STATUS_CODE.OK);
				response.body.forEach(element => {
					if (element.policyIds.at(0) === policyId) {
						tokenId = element.tokenId
					}
				});
			})
		})
	})

	before('Mint token', () => {
		//Choose role
		Authorization.getAccessToken(UserUsername).then((authorization) => {
			cy.request({
				method: METHOD.POST,
				url: API.ApiServer + API.Policies + policyId + '/' + API.ChooseRegistrantRole,
				headers: {
					authorization
				},
				body: {
					role: 'Registrant'
				}
			})

			//The role is applied by the policy asynchronously, and the application form is gated on
			//it: the form block is polled until it answers, instead of waiting a fixed span and
			//hoping. Note it has to be this block and not the one the next step waits on - that one
			//only opens once the application has been submitted, which is what happens below.
			Contracts.pollUntil({
				request: {
					method: METHOD.GET,
					url: API.ApiServer + API.Policies + policyId + '/' + API.CreateApplication,
					headers: { authorization },
				},
				predicate: (response) => response.status === STATUS_CODE.OK,
				description: 'the Registrant role to be applied to the policy',
				timeout: 120000,
			})

			//Create app and wait while it in progress
			cy.request({
				method: METHOD.POST,
				url: API.ApiServer + API.Policies + policyId + '/' + API.CreateApplication,
				headers: {
					authorization
				},
				body: {
					document: {
						field1: {},
						field2: {},
						field3: {}
					},
					ref: null
				}
			})

			let requestForApplicationCreationProgress = {
				method: METHOD.GET,
				url: API.ApiServer + API.Policies + policyId + '/' + API.Blocks + waitForApproveApplicationBlockId,
				headers: {
					authorization
				},
				failOnStatusCode: false
			}

			Checks.whileApplicationCreating('Submitted for Approval', requestForApplicationCreationProgress, 0)
		})
		//Get applications data and prepare body for approve
		let applicationData
		Authorization.getAccessToken(SRUsername).then((authorization) => {
			cy.request({
				method: METHOD.GET,
				url: API.ApiServer + API.Policies + policyId + '/' + API.GetApplications,
				headers: {
					authorization
				}
			}).then((response) => {
				applicationData = response.body.data[0];
				applicationData.option.status = 'Approved'
				let appDataBody = JSON.stringify({
					document: applicationData,
					tag: 'Button_0'
				})
				//Approve app
				cy.request({
					method: METHOD.POST,
					url: API.ApiServer + API.Policies + policyId + '/' + API.ApproveApplication,
					headers: {
						authorization,
						'content-type': 'application/json'
					},
					body: appDataBody
				})
			})
		})
		//Wait while approve in progress
		Authorization.getAccessToken(UserUsername).then((authorization) => {
			let requestForApplicationApproveProgress = {
				method: METHOD.GET,
				url: API.ApiServer + API.Policies + policyId + '/' + API.Blocks + deviceGridBlockId,
				headers: {
					authorization
				},
				failOnStatusCode: false
			}

			Checks.whileApplicationApproving('Device Name', requestForApplicationApproveProgress, 0)

			//Create device and wait while it in progress
			cy.request({
				method: METHOD.POST,
				url: API.ApiServer + API.Policies + policyId + '/' + API.CreateDevice,
				headers: {
					authorization
				},
				body: {
					document: {
						field3: {},
						field4: {},
						field5: {}
					},
					ref: null
				}
			})

			let requestForDeviceCreationProgress = {
				method: METHOD.GET,
				url: API.ApiServer + API.Policies + policyId + '/' + API.Blocks + deviceGridBlockId,
				headers: {
					authorization
				},
				failOnStatusCode: false
			}
			Checks.whileDeviceCreating('Waiting for approval', requestForDeviceCreationProgress, 0)
		})

		//Get devices data and prepare body for approve
		let deviceBody
		Authorization.getAccessToken(SRUsername).then((authorization) => {
			cy.request({
				method: METHOD.GET,
				url: API.ApiServer + API.Policies + policyId + '/' + API.GetDevices,
				headers: {
					authorization
				}
			}).then((response) => {
				deviceBody = response.body;
				let data = deviceBody.data[deviceBody.data.length - 1]
				data[optionKey].status = 'Approved'
				let appDataBody = JSON.stringify({
					document: data,
					tag: 'Button_0'
				})
				//Approve device
				cy.request({
					method: METHOD.POST,
					url: API.ApiServer + API.Policies + policyId + '/' + API.ApproveDevice,
					headers: {
						authorization,
						'content-type': 'application/json'
					},
					body: appDataBody
				})
			})
		})

		//Wait while approve in progress
		Authorization.getAccessToken(UserUsername).then((authorization) => {

			let requestForDeviceApproveProgress = {
				method: METHOD.GET,
				url: API.ApiServer + API.Policies + policyId + '/' + API.Blocks + deviceGridBlockId,
				headers: {
					authorization
				},
				failOnStatusCode: false
			}

			Checks.whileDeviceApproving('Approved', requestForDeviceApproveProgress, 0)

			//Get issue data and prepare body for create
			cy.request({
				method: METHOD.GET,
				url: API.ApiServer + API.Policies + policyId + '/' + API.GetDeviceIssue,
				headers: {
					authorization
				}
			}).then((response) => {
				let obj = response.body
				let device_issue_row = obj.data[obj.data.length - 1]

				//Create issue and wait while it in progress
				cy.request({
					method: METHOD.POST,
					url: API.ApiServer + API.Policies + policyId + '/' + API.CreateIssue,
					headers: {
						authorization,
						'content-type': 'application/json'
					},
					body: {
						document: {
							field2: {},
							field3: {},
							field6: '2024-03-01',
							field7: 10,
							field8: '2024-03-02',
							field17: UserUsername,
							field18: hederaId
						},
						ref: device_issue_row
					}
				})

				let requestForIssueCreationProgress = {
					method: METHOD.GET,
					url: API.ApiServer + API.Policies + policyId + '/' + API.Blocks + issueRequestGridBlockId,
					headers: {
						authorization
					},
					failOnStatusCode: false
				}

				Checks.whileIssueRequestCreating('Waiting for approval', requestForIssueCreationProgress, 0)
			})
		})

		//Get issue data and prepare body for approve
		let issueRow
		Authorization.getAccessToken(SRUsername).then((authorization) => {
			cy.request({
				method: METHOD.GET,
				url: API.ApiServer + API.Policies + policyId + '/' + API.GetIssues,
				headers: {
					authorization
				}
			}).then((response) => {
				issueRow = response.body.data
				issueRow = issueRow[issueRow.length - 1]
				issueRow[optionKey].status = 'Approved'
				issueRow = JSON.stringify({
					document: issueRow,
					tag: 'Button_0'
				})
				//Approve issue
				cy.request({
					method: METHOD.POST,
					url: API.ApiServer + API.Policies + policyId + '/' + API.ApproveIssueRequestsBtn,
					headers: {
						authorization,
						'content-type': 'application/json'
					},
					body: issueRow
				})
			})
		})

		//Wait while approve in progress
		Authorization.getAccessToken(UserUsername).then((authorization) => {
			let requestForIssueApproveProgress = {
				method: METHOD.GET,
				url: API.ApiServer + API.Policies + policyId + '/' + API.Blocks + issueRequestGridBlockId,
				headers: {
					authorization
				},
				failOnStatusCode: false
			}

			Checks.whileIssueRequestApproving('Approved', requestForIssueApproveProgress, 0)

			//The mint lands on Hedera and the balance is read back from the mirror node, so it is
			//polled until the ten minted tokens show up and fails loudly if they never do
			Contracts.waitForTokenBalance(authorization, { tokenId, expected: '10' })
		})
	})

	it('Disable wipe contract requests', () => {
		Authorization.getAccessToken(SRUsername).then((authorization) => {
			// POST /wipe-contract/{id}/requests/disable
			toggleWipeRequests({
				authorization,
				contractId: contractIdW,
				action: API.Disable,
				timeout: 180000,
				failOnStatusCode: true,
			}).then((response) => {
				expect(response.status).eql(STATUS_CODE.OK);
			})

			// POST /retire-contract/{id}/pool-contract
			postPoolContract({
				authorization,
				contractId: contractIdR,
				body: {
					tokens: [
						{
							token: tokenId,
							count: 1
						}
					],
					immediately: false
				},
				failOnStatusCode: true,
			}).then((response) => {
				expect(response.status).eql(STATUS_CODE.OK);
			})

			//With requests disabled the pool above must raise nothing: the listing is watched for
			//longer than one synchronization cycle, so the assertion covers the window in which a
			//request would have surfaced rather than a single read at an arbitrary moment
			Contracts.expectNoWipeRequest(authorization, contractUuidW, { token: tokenId })
		})
	})

	it('Disable wipe contract requests without auth token - Negative', () => {
		toggleWipeRequests({
			authorization: undefined,
			contractId: contractIdW,
			action: API.Disable,
			failOnStatusCode: false,
		}).then((response) => {
			expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
		});
	});

	it('Disable wipe contract requests with invalid auth token - Negative', () => {
		toggleWipeRequests({
			authorization: 'Bearer wqe',
			contractId: contractIdW,
			action: API.Disable,
			failOnStatusCode: false,
		}).then((response) => {
			expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
		});
	});

	it('Disable wipe contract requests with empty auth token - Negative', () => {
		toggleWipeRequests({
			authorization: '',
			contractId: contractIdW,
			action: API.Disable,
			failOnStatusCode: false,
		}).then((response) => {
			expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
		});
	});

	it('Unset retire contract pool without auth token - Negative', () => {
		Authorization.getAccessToken(SRUsername).then((authorization) => {
			cy.request({
				method: METHOD.GET,
				url: API.ApiServer + API.RetirePools,
				headers: {
					authorization,
				},
				qs: {
					contractId: contractUuidR
				}
			}).then((response) => {
				expect(response.status).eql(STATUS_CODE.OK);
				poolId = response.body.at(0).id;
			}).then(() => {
				deleteRetirePool({
					authorization: undefined,
					retirePoolId: poolId,
					failOnStatusCode: false,
				}).then((response) => {
					expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
				});
			})
		})
	});

	it('Unset retire contract pool with invalid auth token - Negative', () => {
		deleteRetirePool({
			authorization: 'Bearer wqe',
			retirePoolId: poolId,
			failOnStatusCode: false,
		}).then((response) => {
			expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
		});
	});

	it('Unset retire contract pool with empty auth token - Negative', () => {
		deleteRetirePool({
			authorization: '',
			retirePoolId: poolId,
			failOnStatusCode: false,
		}).then((response) => {
			expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
		});
	});

	it('Unset retire contract pool', () => {
		Authorization.getAccessToken(SRUsername).then((authorization) => {
			deleteRetirePool({
				authorization,
				retirePoolId: poolId,
				failOnStatusCode: true,
			}).then((response) => {
				expect(response.status).eql(STATUS_CODE.OK);
			})
		})
	})

	it('Enable wipe contract requests', () => {
		Authorization.getAccessToken(SRUsername).then((authorization) => {
			toggleWipeRequests({
				authorization,
				contractId: contractIdW,
				action: API.Enable,
				failOnStatusCode: true,
			}).then((response) => {
				expect(response.status).eql(STATUS_CODE.OK);
			})

			postPoolContract({
				authorization,
				contractId: contractIdR,
				body: {
					tokens: [
						{
							token: tokenId,
							count: 1
						}
					],
					immediately: false
				},
				failOnStatusCode: true,
			}).then((response) => {
				expect(response.status).eql(STATUS_CODE.OK);
			})

			Contracts.waitForWipeRequest(authorization, contractUuidW, { token: tokenId })
				.then((request) => wipeRequestId = request.id)
		})
	})

	it('Enable wipe contract requests without auth token - Negative', () => {
		toggleWipeRequests({
			authorization: undefined,
			contractId: contractIdW,
			action: API.Enable,
			failOnStatusCode: false,
		}).then((response) => {
			expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
		});
	});

	it('Enable wipe contract requests with invalid auth token - Negative', () => {
		toggleWipeRequests({
			authorization: 'Bearer wqe',
			contractId: contractIdW,
			action: API.Enable,
			failOnStatusCode: false,
		}).then((response) => {
			expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
		});
	});

	it('Enable wipe contract requests with empty auth token - Negative', () => {
		toggleWipeRequests({
			authorization: '',
			contractId: contractIdW,
			action: API.Enable,
			failOnStatusCode: false,
		}).then((response) => {
			expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
		});
	});

	it('Approve wipe contract requests without auth token - Negative', () => {
		approveWipeRequest({
			authorization: undefined,
			requestId: wipeRequestId,
			failOnStatusCode: false,
		}).then((response) => {
			expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
		});
	});

	it('Approve wipe contract requests with invalid auth token - Negative', () => {
		approveWipeRequest({
			authorization: 'Bearer wqe',
			requestId: wipeRequestId,
			failOnStatusCode: false,
		}).then((response) => {
			expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
		});
	});

	it('Approve wipe contract requests with empty auth token - Negative', () => {
		approveWipeRequest({
			authorization: '',
			requestId: wipeRequestId,
			failOnStatusCode: false,
		}).then((response) => {
			expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
		});
	});

	it('Approve wipe contract requests', () => {
		Authorization.getAccessToken(SRUsername).then((authorization) => {
			approveWipeRequest({
				authorization,
				requestId: wipeRequestId,
				failOnStatusCode: true,
			}).then((response) => {
				expect(response.status).eql(STATUS_CODE.OK);
			});
		})
		//Approving grants the retire contract the wiper role on the token, and only then is the
		//pool listed to a plain user - the grant travels through Hedera, so it is polled for
		Authorization.getAccessToken(UserUsername).then((authorization) => {
			Contracts.waitForRetirePool(authorization, { tokenId }).then((pool) => {
				expect(pool).to.have.property('id');
			})
		})
	})
})
