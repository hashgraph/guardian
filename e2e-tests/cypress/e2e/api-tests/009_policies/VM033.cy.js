import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Checks from '../../../support/checkingMethods';
import * as Authorization from '../../../support/authorization';
import { randomInt } from '../../../support/random';

context('Policies', { tags: ['policies', 'secondPool', 'VM0033'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const PPUser = Cypress.env('PPUser');
    const VVBUser = Cypress.env('VVBUser');

    // The policy under test is the fixture in this repository, imported from file.
    //
    // The fixture embeds both tools in full (`tools/*.json` inside the archive), so importing it
    // from file needs no IPFS seeding and no Hedera message at all.
    const VM0033Fixture = 'VM0033_7_23.policy';

    // A fresh copy is imported per run, so its grids only ever hold this run's documents. The
    // run-scoped names are kept so a failure still names the document it was waiting for.
    const runId = randomInt(999999);
    const projectName = `E2E project ${runId}`;
    const revokedProjectName = `E2E project to revoke ${runId}`;

    let policyId; let tokenId; let VVBDid;
    let validationReportRef; let verificationReportRef;

    // Grid rows are `VcDocument` entities: the posted payload becomes `credentialSubject[0]`.
    const projectNameOf = (row) => row?.document?.credentialSubject?.at(0)?.projectTitle;
    const subjectIdOf = (row) => row?.document?.credentialSubject?.at(0)?.id;
    const refOf = (row) => row?.document?.credentialSubject?.at(0)?.ref;
    const statusOf = (row) => row?.option?.status;

    const blockRequest = (authorization, tag, extra = {}) => ({
        method: METHOD.GET,
        url: API.ApiServer + API.Policies + policyId + '/' + tag,
        headers: { authorization },
        failOnStatusCode: false,
        timeout: 60000,
        ...extra
    });

    // A user keeps the role it picked on a previous run, and picking it twice is not allowed.
    const chooseRoleIfNeeded = (authorization, role) => {
        return cy.request({
            method: METHOD.GET,
            url: API.ApiServer + API.Policies + policyId + '/' + API.PolicyGroups,
            headers: { authorization },
            failOnStatusCode: false,
        }).then((response) => {
            if (Array.isArray(response.body) && response.body.length) {
                return cy.wrap(null);
            }
            return cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.Policies + policyId + '/' + API.ChooseRole,
                headers: { authorization },
                body: { role },
                timeout: 180000,
            });
        });
    };

    const createProject = (authorization, name) => {
        return cy.fixture('payload.json').then((payload) => {
            // `cy.fixture` hands out the same cached object on every call, so build a copy
            // instead of renaming the project in place.
            const document = {
                ...payload.document,
                projectTitle: name
            };
            return cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.Policies + policyId + '/' + API.ProjectBtn,
                headers: { authorization },
                body: { document, ref: null },
                timeout: 600000
            }).then(() => Checks.waitForRow(
                blockRequest(authorization, API.ProjectGridPP2),
                (row) => projectNameOf(row) === name && statusOf(row) === 'Waiting to be Added'
            ));
        });
    };

    // Re-registering a profile that is already set up fails with `401 User DID already exists`,
    // so `setupLocalProfile` links the user to the SR only when the profile is not confirmed yet.
    const linkToStandardRegistry = (username) => {
        Authorization.getAccessToken(username).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + 'accounts/standard-registries/aggregated',
                headers: { authorization }
            }).then((response) => {
                const SRDid = response.body.find(element => element.username === SRUsername).did;
                cy.setupLocalProfile(username, authorization, { parent: SRDid });
            })
        })
    };

    it('Register PP and VVB', () => {
        linkToStandardRegistry(PPUser);
        linkToStandardRegistry(VVBUser);
    })

    it('Import, publish, assign policy', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.fixture(VM0033Fixture, 'binary')
                .then((binary) => Cypress.Blob.binaryStringToBlob(binary))
                .then((file) => cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.PolicisImportFile,
                    body: file,
                    headers: {
                        'content-type': 'binary/octet-stream',
                        authorization,
                    },
                    timeout: 1800000,
                }))
                .then((response) => {
                    expect(response.status, `import of ${VM0033Fixture}`).to.eq(STATUS_CODE.SUCCESS);
                    // The request body is a Blob, so the response comes back as an ArrayBuffer.
                    policyId = JSON.parse(new TextDecoder().decode(response.body)).at(0).id;
                    return cy.request({
                        method: METHOD.PUT,
                        url: API.ApiServer + API.Policies + policyId + '/' + API.Publish,
                        body: {
                            policyVersion: '1.2.5'
                        },
                        headers: {
                            authorization
                        },
                        timeout: 1800000,
                    });
                })
                // Publishing answers 200 whether or not it published; only `isValid` says so, and
                // an unpublished policy fails much later as an empty grid.
                .then((response) => {
                    expect(response.status, `publish of ${VM0033Fixture}`).to.eq(STATUS_CODE.OK);
                    expect(
                        response.body.isValid,
                        `publish of ${VM0033Fixture} validation: ${JSON.stringify(response.body.errors)}`
                    ).to.be.true;
                })
        })

        // Assigning is a flag update, so re-assigning an already assigned policy is harmless.
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.Permissions + API.Users + PPUser + '/' + API.Policies + API.Assign,
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

        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.Permissions + API.Users + VVBUser + '/' + API.Policies + API.Assign,
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
    })

    it('Token associate and grant kyc', () => {
        Authorization.getAccessToken(PPUser).then((authorization) => {
            const listTokens = {
                method: METHOD.GET,
                url: API.ApiServer + API.ListOfTokens,
                headers: { authorization },
                timeout: 180000
            };
            cy.request(listTokens).then((response) => {
                const token = response.body.find(element =>
                    (element.policyIds ?? [element.policyId]).includes(policyId));
                expect(token, `no token found for policy ${policyId}`).to.not.equal(undefined);
                tokenId = token.tokenId;
                // Associating twice is rejected by Hedera, so only do it on the first run.
                if (token.associated) {
                    return cy.wrap(token);
                }
                return cy.request({
                    method: METHOD.PUT,
                    url: API.ApiServer + API.ListOfTokens + tokenId + '/associate',
                    headers: { authorization },
                    timeout: 180000
                }).then(() => cy.request(listTokens)
                    .then((refreshed) => refreshed.body.find(element => element.tokenId === tokenId)));
            }).then((token) => {
                if (token.kyc) {
                    return;
                }
                Authorization.getAccessToken(SRUsername).then((srAuthorization) => {
                    cy.request({
                        method: METHOD.PUT,
                        url: API.ApiServer + API.ListOfTokens + tokenId + '/' + PPUser + '/grant-kyc',
                        headers: { authorization: srAuthorization },
                        timeout: 180000
                    }).then((response) => {
                        expect(response.status).eql(STATUS_CODE.OK);
                    });
                });
            })
        })
    })

    it('Register PP in policy', () => {
        Authorization.getAccessToken(PPUser).then((authorization) => {
            chooseRoleIfNeeded(authorization, 'Project_Proponent').then(() => {
                Checks.whileRequestProccessing(
                    blockRequest(authorization, API.ProjectBtn),
                    'New project',
                    'uiMetaData.content'
                )
            })
        })
    })

    it('Register VVB in policy', () => {
        Authorization.getAccessToken(VVBUser).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Profiles + VVBUser,
                headers: { authorization }
            }).then((response) => {
                VVBDid = response.body.did
                chooseRoleIfNeeded(authorization, 'VVB').then(() => {
                    // `create_new_vvb` derives the document id from the owner DID, so a VVB user
                    // can hold exactly one VVB document: create it once, reuse it afterwards.
                    Authorization.getAccessToken(SRUsername).then((srAuthorization) => {
                        cy.request(blockRequest(srAuthorization, API.VVBGrid)).then((grid) => {
                            const existing = (grid.body?.data ?? []).find(row => subjectIdOf(row) === VVBDid);
                            if (existing) {
                                return;
                            }
                            cy.request({
                                method: METHOD.POST,
                                url: API.ApiServer + API.Policies + policyId + '/' + API.CreateVVB,
                                headers: { authorization },
                                body: {
                                    document: {
                                        field0: 'TestingVVBName'
                                    },
                                    ref: null
                                }
                            }).then(() => {
                                Checks.waitForRow(
                                    blockRequest(srAuthorization, API.VVBGrid),
                                    (row) => subjectIdOf(row) === VVBDid
                                )
                            })
                        })
                    })
                })
            })
        })
    })

    it('Approve VVB', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            Checks.waitForRow(
                blockRequest(authorization, API.VVBGrid),
                (row) => subjectIdOf(row) === VVBDid
            ).then((vvbData) => {
                if (vvbData.type === 'approved_vvb') {
                    return;
                }
                vvbData.option.status = 'APPROVED'
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Policies + policyId + '/' + API.ApproveDocs,
                    headers: {
                        authorization
                    },
                    body: {
                        document: vvbData,
                        tag: 'Button_0'
                    }
                }).then(() => {
                    Checks.waitForRow(
                        blockRequest(authorization, API.VVBGrid),
                        (row) => subjectIdOf(row) === VVBDid && row.type === 'approved_vvb'
                    )
                })
            })
        })
    })

    it('Create application', () => {
        Authorization.getAccessToken(PPUser).then((authorization) => {
            createProject(authorization, projectName)
        })
    })

    it('Add project', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            Checks.waitForRow(
                blockRequest(authorization, API.ProjGridVVB),
                (row) => projectNameOf(row) === projectName && statusOf(row) === 'Waiting to be Added'
            ).then((projData) => {
                projData.option.status = 'Waiting to Validate'
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Policies + policyId + '/' + API.AddProj,
                    headers: {
                        authorization
                    },
                    body: {
                        document: projData,
                        tag: 'Option_0'
                    }
                }).then(() => {
                    Checks.waitForRow(
                        blockRequest(authorization, API.ProjGridVVB),
                        (row) => projectNameOf(row) === projectName && statusOf(row) === 'Waiting to Validate'
                    )
                })
            })
        })
    })

    it('Assign project', () => {
        Authorization.getAccessToken(PPUser).then((authorization) => {
            Checks.waitForRow(
                blockRequest(authorization, API.ProjectGridPP2),
                (row) => projectNameOf(row) === projectName && statusOf(row) === 'Waiting to Validate'
            ).then((projDataAssign) => {
                projDataAssign.assignedTo = VVBDid;
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Policies + policyId + '/' + API.AssignVVB,
                    headers: {
                        authorization
                    },
                    body: projDataAssign,
                })
            })
        })
    })

    it('Approve project', () => {
        Authorization.getAccessToken(VVBUser).then((authorization) => {
            Checks.waitForRow(
                blockRequest(authorization, API.ProjGridVVB2),
                (row) => projectNameOf(row) === projectName && statusOf(row) === 'Waiting to Validate'
            ).then((projDataApprove) => {
                projDataApprove.option.status = 'Validated';
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Policies + policyId + '/' + API.ApproveProjBtn,
                    headers: {
                        authorization
                    },
                    body: {
                        document: projDataApprove,
                        tag: 'Button_0'
                    }
                })
            })
        })
    })

    it('Create report', () => {
        Authorization.getAccessToken(PPUser).then((authorization) => {
            Checks.waitForRow(
                blockRequest(authorization, API.ProjectGridPP2),
                (row) => projectNameOf(row) === projectName && row.type === 'approved_project'
            ).then((projectDataRef) => {
                cy.fixture('payload.json').then((payload) => {
                    // The report carries the same project name, which is what ties it to this run.
                    const document = {
                        ...payload.document,
                        projectTitle: projectName
                    };
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.Policies + policyId + '/' + API.AddReportBtn,
                        headers: {
                            authorization
                        },
                        body: {
                            document,
                            ref: projectDataRef
                        },
                        timeout: 600000
                    }).then(() => {
                        Checks.waitForRow(
                            blockRequest(authorization, API.ReportGridPP, { timeout: 600000 }),
                            (row) => projectNameOf(row) === projectName && statusOf(row) === 'Waiting for Verification'
                        )
                    })
                })
            })
        })
    })

    it('Assign report', () => {
        Authorization.getAccessToken(PPUser).then((authorization) => {
            Checks.waitForRow(
                blockRequest(authorization, API.ReportGridPP, { timeout: 120000 }),
                (row) => projectNameOf(row) === projectName && statusOf(row) === 'Waiting for Verification'
            ).then((reportAssignData) => {
                reportAssignData.assignedTo = VVBDid;
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Policies + policyId + '/' + API.AssignVVBMR,
                    headers: {
                        authorization
                    },
                    body: reportAssignData,
                    timeout: 60000
                })
            })
        })
    })

    it('Verify report', () => {
        Authorization.getAccessToken(VVBUser).then((authorization) => {
            Checks.waitForRow(
                blockRequest(authorization, API.ReportGridVVB),
                (row) => projectNameOf(row) === projectName && statusOf(row) === 'Waiting for Verification'
            ).then((reportVerifyData) => {
                reportVerifyData.option.status = 'Verified';
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Policies + policyId + '/' + API.ApproveReportBtn,
                    headers: {
                        authorization
                    },
                    body: {
                        document: reportVerifyData,
                        tag: 'Button_0'
                    },
                    timeout: 60000
                }).then(() => {
                    Checks.waitForRow(
                        blockRequest(authorization, API.ReportGridVVB),
                        (row) => projectNameOf(row) === projectName && statusOf(row) === 'Verified'
                    )
                })
            })
        })
    })

    it('Create validation report', () => {
        Authorization.getAccessToken(VVBUser).then((authorization) => {
            cy.fixture('valrep.json').then((payload) => {
                Checks.waitForRow(
                    blockRequest(authorization, API.ProjGridVVB2),
                    (row) => projectNameOf(row) === projectName && row.type === 'approved_project'
                ).then((referenceValidationReport) => {
                    // The validation report has no project name of its own: it is identified by
                    // the subject id of the project it references.
                    validationReportRef = subjectIdOf(referenceValidationReport);
                    referenceValidationReport.option.status = 'Verified';
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.Policies + policyId + '/' + API.AddValidationReport,
                        headers: {
                            authorization
                        },
                        body: {
                            document: payload,
                            ref: referenceValidationReport
                        },
                        timeout: 60000
                    })
                })
            })
        })
    })

    it('Approve validation report', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            Checks.waitForRow(
                blockRequest(authorization, API.ValidationReportsVerra),
                (row) => refOf(row) === validationReportRef && statusOf(row) === 'Submitted'
            ).then((reportVerifyData) => {
                reportVerifyData.option.status = 'APPROVED';
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Policies + policyId + '/' + API.ApproveValidationReportBtn,
                    headers: {
                        authorization
                    },
                    body: {
                        document: reportVerifyData,
                        tag: 'Approve_Button_Validation'
                    },
                    timeout: 60000
                })
            })
        })
    })

    it('Create verification report', () => {
        Authorization.getAccessToken(VVBUser).then((authorization) => {
            cy.fixture('verrep.json').then((payload) => {
                Checks.waitForRow(
                    blockRequest(authorization, API.ReportGridVVB),
                    (row) => projectNameOf(row) === projectName && row.type === 'approved_report'
                ).then((referenceVerificationReport) => {
                    verificationReportRef = subjectIdOf(referenceVerificationReport);
                    referenceVerificationReport.option.status = 'Verified';
                    cy.request({
                        method: METHOD.POST,
                        url: API.ApiServer + API.Policies + policyId + '/' + API.AddVerificationReport,
                        headers: {
                            authorization
                        },
                        body: {
                            document: payload,
                            ref: referenceVerificationReport
                        },
                        timeout: 60000
                    })
                })
            })
        })
    })

    it('Approve verification report', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            Checks.waitForRow(
                blockRequest(authorization, API.VerificationReportsVerra),
                (row) => refOf(row) === verificationReportRef && statusOf(row) === 'Submitted'
            ).then((reportVerifyData) => {
                reportVerifyData.option.status = 'APPROVED';
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Policies + policyId + '/' + API.MintTokenVerra,
                    headers: {
                        authorization
                    },
                    body: {
                        document: reportVerifyData,
                        tag: 'Option_0'
                    },
                    timeout: 60000
                })
            })
        })
    })

    it('Create one more project for revoke', () => {
        Authorization.getAccessToken(PPUser).then((authorization) => {
            createProject(authorization, revokedProjectName)
        })
    })

    it('Reject project', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            Checks.waitForRow(
                blockRequest(authorization, API.ProjGridVVB),
                (row) => projectNameOf(row) === revokedProjectName && statusOf(row) === 'Waiting to be Added'
            ).then((projData) => {
                projData.option.status = {
                    'status': 'REJECTED',
                    'comment': [
                        'testRevoke'
                    ]
                }
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Policies + policyId + '/' + API.AddProj,
                    headers: {
                        authorization
                    },
                    body: {
                        document: projData,
                        tag: 'Option_1'
                    }
                }).then(() => {
                    Checks.waitForRow(
                        blockRequest(authorization, API.ProjGridVVB),
                        (row) => projectNameOf(row) === revokedProjectName && statusOf(row) === 'Revoked'
                    )
                })
            })
        })

        Authorization.getAccessToken(PPUser).then((authorization) => {
            Checks.waitForRow(
                blockRequest(authorization, API.ProjectGridPP2),
                (row) => projectNameOf(row) === revokedProjectName && statusOf(row) === 'Revoked'
            )
        })
    })

    it('Revoke project', () => {
        Authorization.getAccessToken(PPUser).then((authorization) => {
            // `revoke_project_pp_btn` is bound to the sources holding the PP's own, not yet
            // revoked `project` rows, which is the project this run validated.
            Checks.waitForRow(
                blockRequest(authorization, API.ProjectGridPP2),
                (row) => projectNameOf(row) === projectName && row.type === 'project' && statusOf(row) !== 'Revoked'
            ).then((projData) => {
                projData.option.comment = ['testRevoke'];
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Policies + policyId + '/' + API.RevokeProjectPP,
                    headers: {
                        authorization
                    },
                    body: {
                        document: projData,
                        tag: 'Button_0'
                    }
                }).then(() => {
                    Checks.waitForRow(
                        blockRequest(authorization, API.ProjectGridPP2),
                        (row) => projectNameOf(row) === projectName && statusOf(row) === 'Revoked'
                    )
                })
            })
        })

        Authorization.getAccessToken(SRUsername).then((authorization) => {
            Checks.waitForRow(
                blockRequest(authorization, API.ProjGridVVB),
                (row) => projectNameOf(row) === projectName && statusOf(row) === 'Revoked'
            )
        })
    })

})
