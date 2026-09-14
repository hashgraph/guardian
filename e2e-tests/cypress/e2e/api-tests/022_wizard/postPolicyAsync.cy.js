import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';
import { randomInt } from '../../../support/random';

context('Create Policy by Wizard', { tags: ['wizard', 'firstPool', 'all', 'all-no-mgs'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    // policyTag is unique in the DB, so a hardcoded one makes every run after the first fail with a
    // duplicate key error
    const runId = randomInt(999999);
    const policyName = `wizardPolicyAsync_${runId}`;
    const policyRole = 'wizardPolicyAsyncRole';
    const policyRole2 = 'wizardPolicyAsyncRole2';
    const policyTag = `wizardPolicyAsyncTag_${runId}`;
    let secScope; let projScale; let appTechType; let migrActType; let subType;

    before('Get methodologies ids', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Policies + API.Categories,
                headers: {
                    authorization,
                }
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.ACCEPTED);
                response.body.forEach(item => {
                    if (item.type === 'SECTORAL_SCOPE')
                        {secScope = item.id}
                    if (item.type === 'PROJECT_SCALE')
                        {projScale = item.id}
                    if (item.type === 'APPLIED_TECHNOLOGY_TYPE')
                        {appTechType = item.id}
                    if (item.type === 'MITIGATION_ACTIVITY_TYPE')
                        {migrActType = item.id}
                    if (item.type === 'SUB_TYPE')
                        {subType = item.id}
                });
            });
        })
    })

    it('Create policy(wizard, async) without auth - Negative', () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.WizardPolicyAsync,
            body: {
                wizardConfig: {
                    policy: {
                        name: policyName,
                        sectoralScope: secScope,
                        projectScale: projScale,
                        applicabilityConditions: '',
                        detailsUrl: '',
                        policyTag,
                        typicalProjects: '',
                        topicDescription: '',
                        description: '',
                        appliedTechnologyType: appTechType,
                        migrationActivityType: [
                            migrActType
                        ],
                        subType: [
                            subType
                        ],
                        atValidation: '',
                        monitored: ''
                    },
                    roles: [
                        'OWNER',
                        policyRole,
                        policyRole2
                    ],
                    schemas: [],
                    trustChain: [
                        {
                            role: policyRole2,
                            viewOnlyOwnDocuments: false,
                            mintSchemaIri: ''
                        },
                        {
                            role: policyRole,
                            viewOnlyOwnDocuments: false,
                            mintSchemaIri: ''
                        },
                        {
                            role: 'OWNER',
                            viewOnlyOwnDocuments: false,
                            mintSchemaIri: ''
                        }
                    ]
                },
                saveState: true
            },
            headers: {
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Create policy(wizard, async) with incorrect auth - Negative', () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.WizardPolicyAsync,
            body: {
                wizardConfig: {
                    policy: {
                        name: policyName,
                        sectoralScope: secScope,
                        projectScale: projScale,
                        applicabilityConditions: '',
                        detailsUrl: '',
                        policyTag,
                        typicalProjects: '',
                        topicDescription: '',
                        description: '',
                        appliedTechnologyType: appTechType,
                        migrationActivityType: [
                            migrActType
                        ],
                        subType: [
                            subType
                        ],
                        atValidation: '',
                        monitored: ''
                    },
                    roles: [
                        'OWNER',
                        policyRole,
                        policyRole2
                    ],
                    schemas: [],
                    trustChain: [
                        {
                            role: policyRole2,
                            viewOnlyOwnDocuments: false,
                            mintSchemaIri: ''
                        },
                        {
                            role: policyRole,
                            viewOnlyOwnDocuments: false,
                            mintSchemaIri: ''
                        },
                        {
                            role: 'OWNER',
                            viewOnlyOwnDocuments: false,
                            mintSchemaIri: ''
                        }
                    ]
                },
                saveState: true
            },
            headers: {
                authorization: 'bearer 11111111111111111111@#$',
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Create policy(wizard, async) with empty auth - Negative', () => {
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.WizardPolicyAsync,
            body: {
                wizardConfig: {
                    policy: {
                        name: policyName,
                        sectoralScope: secScope,
                        projectScale: projScale,
                        applicabilityConditions: '',
                        detailsUrl: '',
                        policyTag,
                        typicalProjects: '',
                        topicDescription: '',
                        description: '',
                        appliedTechnologyType: appTechType,
                        migrationActivityType: [
                            migrActType
                        ],
                        subType: [
                            subType
                        ],
                        atValidation: '',
                        monitored: ''
                    },
                    roles: [
                        'OWNER',
                        policyRole,
                        policyRole2
                    ],
                    schemas: [],
                    trustChain: [
                        {
                            role: policyRole2,
                            viewOnlyOwnDocuments: false,
                            mintSchemaIri: ''
                        },
                        {
                            role: policyRole,
                            viewOnlyOwnDocuments: false,
                            mintSchemaIri: ''
                        },
                        {
                            role: 'OWNER',
                            viewOnlyOwnDocuments: false,
                            mintSchemaIri: ''
                        }
                    ]
                },
                saveState: true
            },
            headers: {
                authorization: '',
            },
            failOnStatusCode: false,
        }).then((response) => {
            expect(response.status).eql(STATUS_CODE.UNAUTHORIZED);
        });
    });

    it('Create policy(wizard, async)', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.WizardPolicyAsync,
                body: {
                    wizardConfig: {
                        policy: {
                            name: policyName,
                            sectoralScope: secScope,
                            projectScale: projScale,
                            applicabilityConditions: '',
                            detailsUrl: '',
                            policyTag,
                            typicalProjects: '',
                            topicDescription: '',
                            description: '',
                            appliedTechnologyType: appTechType,
                            migrationActivityType: [
                                migrActType
                            ],
                            subType: [
                                subType
                            ],
                            atValidation: '',
                            monitored: ''
                        },
                        roles: [
                            'OWNER',
                            policyRole,
                            policyRole2
                        ],
                        schemas: [],
                        trustChain: [
                            {
                                role: 'OWNER',
                                viewOnlyOwnDocuments: false,
                                mintSchemaIri: ''
                            },
                            {
                                role: policyRole,
                                viewOnlyOwnDocuments: false,
                                mintSchemaIri: ''
                            },
                            {
                                role: policyRole2,
                                viewOnlyOwnDocuments: false,
                                mintSchemaIri: ''
                            }
                        ]
                    },
                    saveState: true
                },
                headers: {
                    authorization,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.ACCEPTED);
            });
        })
    });
});
