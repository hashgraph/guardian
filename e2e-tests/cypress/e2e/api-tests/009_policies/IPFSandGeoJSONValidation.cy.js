import { METHOD, STATUS_CODE } from "../../../support/api/api-const";
import API from "../../../support/ApiUrls";
import * as Checks from "../../../support/checkingMethods";
import * as Authorization from "../../../support/authorization";

context("Policies", { tags: ['policies', 'secondPool', 'all'] }, () => {

    const SRUsername = Cypress.env('SRUser');
    const UserUsername = Cypress.env('User');

    let policyId;

    it("Import, publish, assign policy", () => {
        //Create retire contract and save id
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.PolicisImportMsg,
                body: { messageId: "1759843626.057332154" }, //custom policy
                headers: {
                    authorization,
                },
                timeout: 18000000,
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.SUCCESS);
                policyId = response.body.at(0).id;
                Authorization.getAccessToken(SRUsername).then((authorization) => {
                    cy.request({
                        method: METHOD.PUT,
                        url: API.ApiServer + API.Policies + policyId + "/" + API.Publish,
                        body: {
                            policyVersion: "1.2.5"
                        },
                        headers: {
                            authorization
                        },
                        timeout: 18000000,
                    })
                })
            })
        })

        Authorization.getAccessToken(SRUsername).then((authorization) => {
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
    })

    it("Register user in policy", () => {
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
                },
                timeout: 60000
            }).then(() => {
                const waitRegRoleChoosing = {
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId + "/" + API.RegWorkflowSteps,
                    headers: {
                        authorization
                    }
                }
                Checks.whileRequestProccessing(waitRegRoleChoosing, "Registrant Application", "blocks.0.uiMetaData.title")
            })
        })
    })

    it("Verify GeoJSON fields - bad type", () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.Policies + policyId + "/" + API.CreateApplication,
                headers: {
                    authorization
                },
                body: {
                    document: {
                        "field1": {
                            "type": "FeatureCollection",
                            "features": [
                                {
                                    "type": "Feature",
                                    "properties": {},
                                    "geometry": {
                                        "type": "BlaBla",
                                        "coordinates": [
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
                },
                failOnStatusCode: false,
                timeout: 600000
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.UNPROCESSABLE);
            })
        })
    })

    it("Verify GeoJSON fields - bad Polygon", () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.Policies + policyId + "/" + API.CreateApplication,
                headers: {
                    authorization
                },
                body: {
                    document: {
                        "field1": {
                            "type": "FeatureCollection",
                            "features": [
                                {
                                    "type": "Feature",
                                    "properties": {},
                                    "geometry": {
                                        "type": "Polygon",
                                        "coordinates": [
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
                },
                failOnStatusCode: false,
                timeout: 600000
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.UNPROCESSABLE);
            })
        })
    })

    it("Verify GeoJSON fields - bad Point", () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.Policies + policyId + "/" + API.CreateApplication,
                headers: {
                    authorization
                },
                body: {
                    document: {
                        "field1": {
                            "type": "FeatureCollection",
                            "features": [
                                {
                                    "type": "Feature",
                                    "properties": {},
                                    "geometry": {
                                        "type": "Point",
                                        "coordinates": [
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
                },
                failOnStatusCode: false,
                timeout: 600000
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.UNPROCESSABLE);
            })
        })
    })

    it("Verify GeoJSON fields - bad MultiPoint", () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.Policies + policyId + "/" + API.CreateApplication,
                headers: {
                    authorization
                },
                body: {
                    document: {
                        "field1": {
                            "type": "FeatureCollection",
                            "features": [
                                {
                                    "type": "Feature",
                                    "properties": {},
                                    "geometry": {
                                        "type": "MultiPoint",
                                        "coordinates":
                                            [
                                                16.162714920660097,
                                                -1.64224653330524
                                            ],
                                    }
                                }
                            ]
                        }
                    },
                    ref: null
                },
                failOnStatusCode: false,
                timeout: 600000
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.UNPROCESSABLE);
            })
        })
    })

    it("Verify GeoJSON fields - bad LineString", () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.Policies + policyId + "/" + API.CreateApplication,
                headers: {
                    authorization
                },
                body: {
                    document: {
                        "field1": {
                            "type": "FeatureCollection",
                            "features": [
                                {
                                    "type": "Feature",
                                    "properties": {},
                                    "geometry": {
                                        "type": "LineString",
                                        "coordinates": [
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
                },
                failOnStatusCode: false,
                timeout: 600000
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.UNPROCESSABLE);
            })
        })
    })

    it("Verify GeoJSON fields - bad MultiLineString", () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.Policies + policyId + "/" + API.CreateApplication,
                headers: {
                    authorization
                },
                body: {
                    document: {
                        "field1": {
                            "type": "FeatureCollection",
                            "features": [
                                {
                                    "type": "Feature",
                                    "properties": {},
                                    "geometry": {
                                        "type": "Polygon",
                                        "coordinates": [
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
                },
                failOnStatusCode: false,
                timeout: 600000
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.UNPROCESSABLE);
            })
        })
    })

    it("Verify GeoJSON fields - bad MultiPolygon", () => {
        Authorization.getAccessToken(UserUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.Policies + policyId + "/" + API.CreateApplication,
                headers: {
                    authorization
                },
                body: {
                    document: {
                        "field1": {
                            "type": "FeatureCollection",
                            "features": [
                                {
                                    "type": "Feature",
                                    "properties": {},
                                    "geometry": {
                                        "type": "Polygon",
                                        "coordinates":
                                            [
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
                },
                failOnStatusCode: false,
                timeout: 600000
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.UNPROCESSABLE);
            })
        })
    })
})