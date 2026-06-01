
import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Checks from "../../../support/checkingMethods";
import * as Authorization from "../../../support/authorization";

context("Policies", { tags: ['policies', 'secondPool', 'all'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const UserUsername = Cypress.env('User');

    const importMsgUrl = `${API.ApiServer}${API.PolicisImportMsg}`;
    const policiesBase = `${API.ApiServer}${API.Policies}`;
    const assignUrl = (username) => `${API.ApiServer}${API.Permissions}${API.Users}${username}/${API.Policies}${API.Assign}`;
    const publishUrl = (policyId) => `${policiesBase}${policyId}/${API.Publish}`;
    const chooseRoleUrl = (policyId) => `${policiesBase}${policyId}/${API.ChooseRegistrantRole}`;
    const regWorkflowStepsUrl = (policyId) => `${policiesBase}${policyId}/${API.RegWorkflowSteps}`;
    const createApplicationUrl = (policyId) => `${policiesBase}${policyId}/${API.CreateApplication}`;

    let policyId;

    const requestWithAuth = (method, url, authorization, options = {}) =>
        cy.request({
            method,
            url,
            headers: { authorization },
            ...(options.body ? { body: options.body } : {}),
            ...(options.timeout ? { timeout: options.timeout } : {}),
            ...(options.failOnStatusCode !== undefined ? { failOnStatusCode: options.failOnStatusCode } : {}),
        });

    const postCreateApplicationWithAuth = (authorization, policyId, body, opts = {}) =>
        requestWithAuth(METHOD.POST, createApplicationUrl(policyId), authorization, {
            body,
            timeout: opts.timeout ?? 600000,
            failOnStatusCode: opts.failOnStatusCode ?? false,
        });

    it("Import, publish, assign policy", () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            requestWithAuth(METHOD.POST, importMsgUrl, authorization, {
                body: { messageId: "1759843626.057332154" },
                timeout: 18000000,
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.SUCCESS);
                policyId = response.body.at(0).id;
                Authorization.getAccessToken(SRUsername).then((authorization) => {
                    requestWithAuth(METHOD.PUT, publishUrl(policyId), authorization, {
                        body: { policyVersion: "1.2.5" },
                        timeout: 18000000,
                    });
                });
            });
        });

        Authorization.getAccessToken(SRUsername).then((authorization) => {
            requestWithAuth(METHOD.POST, assignUrl(UserUsername), authorization, {
                body: { policyIds: [policyId], assign: true },
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.SUCCESS);
            });
        });
    });

    it("Register user in policy", () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            requestWithAuth(METHOD.POST, chooseRoleUrl(policyId), authorization, {
                body: { role: "Registrant" },
            }).then(() => {
                const waitRegRoleChoosing = {
                    method: METHOD.GET,
                    url: regWorkflowStepsUrl(policyId),
                    headers: { authorization },
                };
                Checks.whileRequestProccessing(waitRegRoleChoosing, "Registrant Application", "blocks.0.uiMetaData.title");
            });
        });
    });

    it("Verify GeoJSON fields - bad type", () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            postCreateApplicationWithAuth(authorization, policyId, {
                document: {
                    field1: {
                        type: "FeatureCollection",
                        features: [
                            {
                                type: "Feature",
                                properties: {},
                                geometry: {
                                    type: "BlaBla",
                                    coordinates: [
                                        [
                                            [
                                                15.780821917808224,
                                                11.480614595188996
                                            ],
                                            [
                                                20.21917808219181,
                                                0.9554351690229197
                                            ],
                                            [
                                                24.164383561643856,
                                                9.054540756317323
                                            ],
                                        ]
                                    ]
                                }
                            }
                        ]
                    }
                },
                ref: null
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.UNPROCESSABLE);
            });
        });
    });

    it("Verify GeoJSON fields - bad Polygon", () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            postCreateApplicationWithAuth(authorization, policyId, {
                document: {
                    field1: {
                        type: "FeatureCollection",
                        features: [
                            {
                                type: "Feature",
                                properties: {},
                                geometry: {
                                    type: "Polygon",
                                    coordinates: [
                                        [
                                            [
                                                15.780821917808224,
                                                11.480614595188996
                                            ],
                                            [
                                                20.21917808219181,
                                                0.9554351690229197
                                            ],
                                            [
                                                24.164383561643856,
                                                9.054540756317323
                                            ],
                                        ]
                                    ]
                                }
                            }
                        ]
                    }
                },
                ref: null
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.UNPROCESSABLE);
            });
        });
    });

    it("Verify GeoJSON fields - bad Point", () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            postCreateApplicationWithAuth(authorization, policyId, {
                document: {
                    field1: {
                        type: "FeatureCollection",
                        features: [
                            {
                                type: "Feature",
                                properties: {},
                                geometry: {
                                    type: "Point",
                                    coordinates: [
                                        [
                                            30.236953455571204,
                                            -0.03173483617712236
                                        ],
                                        [
                                            12, 3
                                        ]
                                    ]
                                }
                            }
                        ]
                    }
                },
                ref: null
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.UNPROCESSABLE);
            });
        });
    });

    it("Verify GeoJSON fields - bad MultiPoint", () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            postCreateApplicationWithAuth(authorization, policyId, {
                document: {
                    field1: {
                        type: "FeatureCollection",
                        features: [
                            {
                                type: "Feature",
                                properties: {},
                                geometry: {
                                    type: "MultiPoint",
                                    coordinates: [
                                        16.162714920660097,
                                        -1.64224653330524
                                    ],
                                }
                            }
                        ]
                    }
                },
                ref: null
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.UNPROCESSABLE);
            });
        });
    });

    it("Verify GeoJSON fields - bad LineString", () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            postCreateApplicationWithAuth(authorization, policyId, {
                document: {
                    field1: {
                        type: "FeatureCollection",
                        features: [
                            {
                                type: "Feature",
                                properties: {},
                                geometry: {
                                    type: "LineString",
                                    coordinates: [
                                        [
                                            22.338694977111512,
                                            0.49982389901992974
                                        ]
                                    ]
                                }
                            }
                        ]
                    }
                },
                ref: null
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.UNPROCESSABLE);
            });
        });
    });

    it("Verify GeoJSON fields - bad MultiLineString", () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            postCreateApplicationWithAuth(authorization, policyId, {
                document: {
                    field1: {
                        type: "FeatureCollection",
                        features: [
                            {
                                type: "Feature",
                                properties: {},
                                geometry: {
                                    type: "Polygon",
                                    coordinates: [
                                        [
                                            [
                                                15.780821917808224,
                                                11.480614595188996
                                            ],
                                            [
                                                20.21917808219181,
                                                0.9554351690229197
                                            ],
                                            [
                                                24.164383561643856,
                                                9.054540756317323
                                            ],
                                        ]
                                    ]
                                }
                            }
                        ]
                    }
                },
                ref: null
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.UNPROCESSABLE);
            });
        });
    });

    it("Verify GeoJSON fields - bad MultiPolygon", () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            postCreateApplicationWithAuth(authorization, policyId, {
                document: {
                    field1: {
                        type: "FeatureCollection",
                        features: [
                            {
                                type: "Feature",
                                properties: {},
                                geometry: {
                                    type: "Polygon",
                                    coordinates: [
                                        [
                                            [
                                                [
                                                    14.062500000000002,
                                                    -0.046691889363188466
                                                ],
                                                [
                                                    14.458007812500005,
                                                    -1.870090234235505
                                                ],
                                                [
                                                    16.040039062500004,
                                                    -0.5959975522614513
                                                ]
                                            ]
                                        ],
                                        [
                                            [
                                                [
                                                    19.341761081898927,
                                                    1.5073868009700817
                                                ],
                                                [
                                                    21.388645737413775,
                                                    -1.5888047153471376
                                                ],
                                                [
                                                    25.01005705101696,
                                                    1.2975129185120835
                                                ]
                                            ]
                                        ]
                                    ]
                                }
                            }
                        ]
                    }
                },
                ref: null
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.UNPROCESSABLE);
            });
        });
    });

});
