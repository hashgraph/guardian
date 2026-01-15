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
		//Create retire contract and save id
		Authorization.getAccessToken(SRUsername).then((authorization) => {
			cy.request({
				method: METHOD.GET,
				url: API.ApiServer + API.ListOfContracts,
				headers: {
					authorization,
				},
				qs: {
					"type": "RETIRE",
				},
				timeout: 180000
			}).then((response) => {
				contractIdR = response.body.at(0).id;
				contractUuidR = response.body.at(0).contractId;
				cy.request({
					method: METHOD.GET,
					url: API.ApiServer + API.ListOfContracts,
					headers: {
						authorization,
					},
					qs: {
						"type": "WIPE",
					},
				}).then((response) => {
					contractIdW = response.body.at(0).id;
					contractUuidW = response.body.at(0).contractId;
				})
			})

			cy.request({
				method: METHOD.GET,
				url: API.ApiServer + API.Policies,
				headers: {
					authorization,
				},
				timeout: 180000
			}).then((response) => {
				expect(response.status).to.eq(STATUS_CODE.OK);
				response.body.forEach(element => {
					if (element.name == "iRec_4") {
						policyId = element.id
						cy.task('log', element)
					}
				})
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
						if (element.policyIds.at(0) == policyId) {
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
							tokenId: tokenId,
							wipeContractId: contractUuidW,
							draftToken: true
						}
					}).then(() => {
						//Publish policy
						cy.request({
							method: METHOD.PUT,
							url: API.ApiServer + API.Policies + policyId + "/" + API.Publish,
							body: {
								policyVersion: "1.2.5"
							},
							headers: {
								authorization
							},
							timeout: 600000,
							failOnStatusCode: false,
						}).then((response) => {
							if (response.status == STATUS_CODE.ERROR && response.body.message != "Policy already published")
								throw new Error("Issue with policy publish")
						})
					})
					cy.request({
						method: METHOD.POST,
						url: API.ApiServer + API.Permissions + API.Users + UserUsername + "/" + API.Policies + API.Assign,
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

	before("Get blocks for waiting(approve app, device grid, issue grid) and token id", () => {
		Authorization.getAccessToken(UserUsername).then((authorization) => {
			cy.request({
				method: METHOD.GET,
				url: API.ApiServer + API.Policies + policyId + "/" + API.WaitForApproveApplication,
				headers: {
					authorization
				}
			}).then((response) => {
				waitForApproveApplicationBlockId = response.body.id
			})
			cy.request({
				method: METHOD.GET,
				url: API.ApiServer + API.Policies + policyId + "/" + API.DeviceGrid,
				headers: {
					authorization
				}
			}).then((response) => {
				deviceGridBlockId = response.body.id
			})
			cy.request({
				method: METHOD.GET,
				url: API.ApiServer + API.Policies + policyId + "/" + API.IssueRequestGrid,
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
					if (element.policyIds.at(0) == policyId) {
						tokenId = element.tokenId
					}
				});
			})
		})
	})

	before("Mint token", () => {
		//Choose role
		Authorization.getAccessToken(UserUsername).then((authorization) => {
			cy.request({
				method: METHOD.POST,
				url: API.ApiServer + API.Policies + policyId + "/" + API.ChooseRegistrantRole,
				headers: {
					authorization
				},
				body: {
					role: "Registrant"
				}
			})

			cy.wait(10000)

			//Create app and wait while it in progress
			cy.request({
				method: METHOD.POST,
				url: API.ApiServer + API.Policies + policyId + "/" + API.CreateApplication,
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
				url: API.ApiServer + API.Policies + policyId + "/" + API.Blocks + waitForApproveApplicationBlockId,
				headers: {
					authorization
				},
				failOnStatusCode: false
			}

			Checks.whileApplicationCreating("Submitted for Approval", requestForApplicationCreationProgress, 0)
		})
		//Get applications data and prepare body for approve
		let applicationData
		Authorization.getAccessToken(SRUsername).then((authorization) => {
			cy.request({
				method: METHOD.GET,
				url: API.ApiServer + API.Policies + policyId + "/" + API.GetApplications,
				headers: {
					authorization
				}
			}).then((response) => {
				applicationData = response.body.data[0];
				applicationData.option.status = "Approved"
				let appDataBody = JSON.stringify({
					document: applicationData,
					tag: "Button_0"
				})
				//Approve app
				cy.request({
					method: METHOD.POST,
					url: API.ApiServer + API.Policies + policyId + "/" + API.ApproveApplication,
					headers: {
						authorization,
						"content-type": "application/json"
					},
					body: appDataBody
				})
			})
		})
		//Wait while approve in progress
		Authorization.getAccessToken(UserUsername).then((authorization) => {
			let requestForApplicationApproveProgress = {
				method: METHOD.GET,
				url: API.ApiServer + API.Policies + policyId + "/" + API.Blocks + deviceGridBlockId,
				headers: {
					authorization
				},
				failOnStatusCode: false
			}

			Checks.whileApplicationApproving("Device Name", requestForApplicationApproveProgress, 0)

			//Create device and wait while it in progress
			cy.request({
				method: METHOD.POST,
				url: API.ApiServer + API.Policies + policyId + "/" + API.CreateDevice,
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
				url: API.ApiServer + API.Policies + policyId + "/" + API.Blocks + deviceGridBlockId,
				headers: {
					authorization
				},
				failOnStatusCode: false
			}
			Checks.whileDeviceCreating("Waiting for approval", requestForDeviceCreationProgress, 0)
		})

		//Get devices data and prepare body for approve
		let deviceBody
		Authorization.getAccessToken(SRUsername).then((authorization) => {
			cy.request({
				method: METHOD.GET,
				url: API.ApiServer + API.Policies + policyId + "/" + API.GetDevices,
				headers: {
					authorization
				}
			}).then((response) => {
				deviceBody = response.body;
				let data = deviceBody.data[deviceBody.data.length - 1]
				data[optionKey].status = "Approved"
				let appDataBody = JSON.stringify({
					document: data,
					tag: "Button_0"
				})
				//Approve device
				cy.request({
					method: METHOD.POST,
					url: API.ApiServer + API.Policies + policyId + "/" + API.ApproveDevice,
					headers: {
						authorization,
						"content-type": "application/json"
					},
					body: appDataBody
				})
			})
		})

		//Wait while approve in progress
		Authorization.getAccessToken(UserUsername).then((authorization) => {

			let requestForDeviceApproveProgress = {
				method: METHOD.GET,
				url: API.ApiServer + API.Policies + policyId + "/" + API.Blocks + deviceGridBlockId,
				headers: {
					authorization
				},
				failOnStatusCode: false
			}

			Checks.whileDeviceApproving("Approved", requestForDeviceApproveProgress, 0)

			//Get issue data and prepare body for create
			cy.request({
				method: METHOD.GET,
				url: API.ApiServer + API.Policies + policyId + "/" + API.GetDeviceIssue,
				headers: {
					authorization
				}
			}).then((response) => {
				let obj = response.body
				let device_issue_row = obj.data[obj.data.length - 1]

				//Create issue and wait while it in progress
				cy.request({
					method: METHOD.POST,
					url: API.ApiServer + API.Policies + policyId + "/" + API.CreateIssue,
					headers: {
						authorization,
						"content-type": "application/json"
					},
					body: {
						document: {
							field2: {},
							field3: {},
							field6: "2024-03-01",
							field7: 10,
							field8: "2024-03-02",
							field17: UserUsername,
							field18: hederaId
						},
						ref: device_issue_row
					}
				})

				let requestForIssueCreationProgress = {
					method: METHOD.GET,
					url: API.ApiServer + API.Policies + policyId + "/" + API.Blocks + issueRequestGridBlockId,
					headers: {
						authorization
					},
					failOnStatusCode: false
				}

				Checks.whileIssueRequestCreating("Waiting for approval", requestForIssueCreationProgress, 0)
			})
		})

		//Get issue data and prepare body for approve
		let issueRow
		Authorization.getAccessToken(SRUsername).then((authorization) => {
			cy.request({
				method: METHOD.GET,
				url: API.ApiServer + API.Policies + policyId + "/" + API.GetIssues,
				headers: {
					authorization
				}
			}).then((response) => {
				issueRow = response.body.data
				issueRow = issueRow[issueRow.length - 1]
				issueRow[optionKey].status = "Approved"
				issueRow = JSON.stringify({
					document: issueRow,
					tag: "Button_0"
				})
				//Approve issue
				cy.request({
					method: METHOD.POST,
					url: API.ApiServer + API.Policies + policyId + "/" + API.ApproveIssueRequestsBtn,
					headers: {
						authorization,
						"content-type": "application/json"
					},
					body: issueRow
				})
			})
		})

		//Wait while approve in progress
		Authorization.getAccessToken(UserUsername).then((authorization) => {
			let requestForIssueApproveProgress = {
				method: METHOD.GET,
				url: API.ApiServer + API.Policies + policyId + "/" + API.Blocks + issueRequestGridBlockId,
				headers: {
					authorization
				},
				failOnStatusCode: false
			}

			Checks.whileIssueRequestApproving("Approved", requestForIssueApproveProgress, 0)


			let requestForBalance = {
				method: METHOD.GET,
				url: API.ApiServer + API.ListOfTokens,
				headers: {
					authorization
				}
			}

			Checks.whileBalanceVerifying("10", requestForBalance, 91, tokenId)
			Checks.whileBalanceVerifying("10", requestForBalance, 91, tokenId)
		})
	})



	it("Disable wipe contract requests", () => {
		Authorization.getAccessToken(SRUsername).then((authorization) => {
			cy.request({
				method: METHOD.POST,
				url: API.ApiServer + API.WipeContract + contractIdW + "/" + API.Requests + API.Disable,
				headers: {
					authorization,
				},
				timeout: 180000,
			}).then((response) => {
				expect(response.status).eql(STATUS_CODE.OK);
			})

			cy.request({
				method: METHOD.POST,
				url: API.ApiServer + API.RetireContract + contractIdR + "/" + API.PoolContract,
				headers: {
					authorization,
				},
				body: {
					tokens: [
						{
							token: tokenId,
							count: 1
						}
					],
					immediately: false
				}
			}).then((response) => {
				expect(response.status).eql(STATUS_CODE.OK);
			})

			cy.wait(120000)

			cy.request({
				method: METHOD.GET,
				url: API.ApiServer + API.WipeRequests,
				headers: {
					authorization,
				},
				qs: {
					contractId: contractIdW
				}
			}).then((response) => {
				expect(response.status).eql(STATUS_CODE.OK);
				expect(response.body).eql([]);
			})
		})
	})

	it("Disable wipe contract requests without auth token - Negative", () => {
		cy.request({
			method: METHOD.POST,
			url: API.ApiServer + API.WipeContract + contractIdW + "/" + API.Requests + API.Disable,
			failOnStatusCode: false,
		}).then((response) => {
			expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
		});
	});

	it("Disable wipe contract requests with invalid auth token - Negative", () => {
		cy.request({
			method: METHOD.POST,
			url: API.ApiServer + API.WipeContract + contractIdW + "/" + API.Requests + API.Disable,
			headers: {
				authorization: "Bearer wqe",
			},
			failOnStatusCode: false,
		}).then((response) => {
			expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
		});
	});

	it("Disable wipe contract requests with empty auth token - Negative", () => {
		cy.request({
			method: METHOD.POST,
			url: API.ApiServer + API.WipeContract + contractIdW + "/" + API.Requests + API.Disable,
			headers: {
				authorization: "",
			},
			failOnStatusCode: false,
		}).then((response) => {
			expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
		});
	});

	it("Unset retire contract pool without auth token - Negative", () => {
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
				cy.request({
					method: METHOD.DELETE,
					url: API.ApiServer + API.RetirePools + poolId,
					failOnStatusCode: false,
				}).then((response) => {
					expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
				});
			})
		})
	});

	it("Unset retire contract pool with invalid auth token - Negative", () => {
		cy.request({
			method: METHOD.DELETE,
			url: API.ApiServer + API.RetirePools + poolId,
			headers: {
				authorization: "Bearer wqe",
			},
			failOnStatusCode: false,
		}).then((response) => {
			expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
		});
	});

	it("Unset retire contract pool with empty auth token - Negative", () => {
		cy.request({
			method: METHOD.DELETE,
			url: API.ApiServer + API.RetirePools + poolId,
			headers: {
				authorization: "",
			},
			failOnStatusCode: false,
		}).then((response) => {
			expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
		});
	});

	it("Unset retire contract pool", () => {
		Authorization.getAccessToken(SRUsername).then((authorization) => {
			cy.request({
				method: METHOD.DELETE,
				url: API.ApiServer + API.RetirePools + poolId,
				headers: {
					authorization,
				}
			}).then((response) => {
				expect(response.status).eql(STATUS_CODE.OK);
			})
		})
	})

	it("Enable wipe contract requests", () => {
		Authorization.getAccessToken(SRUsername).then((authorization) => {
			cy.request({
				method: METHOD.POST,
				url: API.ApiServer + API.WipeContract + contractIdW + "/" + API.Requests + API.Enable,
				headers: {
					authorization,
				}
			}).then((response) => {
				expect(response.status).eql(STATUS_CODE.OK);
			})

			cy.request({
				method: METHOD.POST,
				url: API.ApiServer + API.RetireContract + contractIdR + "/" + API.PoolContract,
				headers: {
					authorization,
				},
				body: {
					tokens: [
						{
							token: tokenId,
							count: 1
						}
					],
					immediately: false
				}
			}).then((response) => {
				expect(response.status).eql(STATUS_CODE.OK);
			})

			Checks.whileRetireRequestCreating(contractUuidW, authorization, 0)
		})
	})

	it("Enable wipe contract requests without auth token - Negative", () => {
		cy.request({
			method: METHOD.POST,
			url: API.ApiServer + API.WipeContract + contractIdW + "/" + API.Requests + API.Enable,
			failOnStatusCode: false,
		}).then((response) => {
			expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
		});
	});

	it("Enable wipe contract requests with invalid auth token - Negative", () => {
		cy.request({
			method: METHOD.POST,
			url: API.ApiServer + API.WipeContract + contractIdW + "/" + API.Requests + API.Enable,
			headers: {
				authorization: "Bearer wqe",
			},
			failOnStatusCode: false,
		}).then((response) => {
			expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
		});
	});

	it("Enable wipe contract requests with empty auth token - Negative", () => {
		cy.request({
			method: METHOD.POST,
			url: API.ApiServer + API.WipeContract + contractIdW + "/" + API.Requests + API.Enable,
			headers: {
				authorization: "",
			},
			failOnStatusCode: false,
		}).then((response) => {
			expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
		});
	});

	it("Approve wipe contract requests without auth token - Negative", () => {
		cy.request({
			method: METHOD.POST,
			url: API.ApiServer + API.WipeRequests + wipeRequestId + "/" + API.Approve,
			failOnStatusCode: false,
		}).then((response) => {
			expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
		});
	});

	it("Approve wipe contract requests with invalid auth token - Negative", () => {
		cy.request({
			method: METHOD.POST,
			url: API.ApiServer + API.WipeRequests + wipeRequestId + "/" + API.Approve,
			headers: {
				authorization: "Bearer wqe",
			},
			failOnStatusCode: false,
		}).then((response) => {
			expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
		});
	});

	it("Approve wipe contract requests with empty auth token - Negative", () => {
		cy.request({
			method: METHOD.POST,
			url: API.ApiServer + API.WipeRequests + wipeRequestId + "/" + API.Approve,
			headers: {
				authorization: "",
			},
			failOnStatusCode: false,
		}).then((response) => {
			expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
		});
	});

	it("Approve wipe contract requests", () => {
		Authorization.getAccessToken(SRUsername).then((authorization) => {
			cy.request({
				method: METHOD.GET,
				url: API.ApiServer + API.WipeRequests,
				headers: {
					authorization,
				},
				qs: {
					contractId: contractUuidW
				}
			}).then((response) => {
				expect(response.status).eql(STATUS_CODE.OK);
				wipeRequestId = response.body.at(0).id;
				cy.request({
					method: METHOD.POST,
					url: API.ApiServer + API.WipeRequests + wipeRequestId + "/" + API.Approve,
					headers: {
						authorization,
					}
				}).then((response) => {
					expect(response.status).eql(STATUS_CODE.OK);
				});
			});
		})
		cy.wait(60000)
		Authorization.getAccessToken(UserUsername).then((authorization) => {
			cy.request({
				method: METHOD.GET,
				url: API.ApiServer + API.RetirePools,
				headers: {
					authorization
				}
			}).then((response) => {
				expect(response.status).eql(STATUS_CODE.OK);
				expect(response.body.at(0)).to.have.property("id");
			})
		})
	})
})