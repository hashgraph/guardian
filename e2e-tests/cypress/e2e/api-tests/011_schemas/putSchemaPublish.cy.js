import { randomInt } from '../../../support/random';
import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';

context('Schemas', { tags: ['schema', 'thirdPool', 'all', 'all-no-mgs'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    const schemaUUID = ('0000b23a-b1ea-408f-a573' + randomInt(999999) + 'a2060a')

    let schemaId;

    before(() => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Schemas,
                // a single entry is enough here, and the full schema listing grows with every run
                qs: { pageIndex: 0, pageSize: 1 },
                headers: {
                    authorization,
                },
            }).then((response) => {
                const topicUid = response.body.at(-1).topicId;
                //Create new schema
                cy.request({
                    method: METHOD.POST,
                    url: API.ApiServer + API.Schemas + topicUid,
                    headers: { authorization },
                    body: {
                        uuid: schemaUUID,
                        name: 'q',
                        entity: 'VC',
                        status: 'DRAFT',
                        readonly: false,
                        document: {
                            '$id': '#' + schemaUUID + '',
                            '$comment': '{ "@id": "schema:' + schemaUUID + '#' + schemaUUID + '", "term": "' + schemaUUID + '" }',
                            'title': 'q',
                            'type': 'object',
                            'properties': {
                                '@context': {
                                    'oneOf': [
                                        {
                                            'type': 'string'
                                        },
                                        {
                                            'type': 'array',
                                            'items': {
                                                'type': 'string'
                                            }
                                        }
                                    ],
                                    'readOnly': true
                                },
                                'type': {
                                    'oneOf': [
                                        {
                                            'type': 'string'
                                        },
                                        {
                                            'type': 'array',
                                            'items': {
                                                'type': 'string'
                                            }
                                        }
                                    ],
                                    'readOnly': true
                                },
                                'id': {
                                    'type': 'string',
                                    'readOnly': true
                                },
                                'policyId': {
                                    'title': 'policyId',
                                    'description': 'policyId',
                                    'readOnly': true,
                                    'type': 'string',
                                    '$comment': '{"term":"policyId","@id":"https://www.schema.org/text"}'
                                },
                                'ref': {
                                    'title': 'ref',
                                    'description': 'ref',
                                    'readOnly': true,
                                    'type': 'string',
                                    '$comment': '{"term":"ref","@id":"https://www.schema.org/text"}'
                                }
                            },
                            'required': [
                                '@context',
                                'type',
                                'policyId'
                            ],
                            'additionalProperties': false,
                            '$defs': {}
                        },
                        topicId: topicUid,
                        active: false,
                        system: false,
                        category: 'POLICY',
                    },
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.SUCCESS);
                });
                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Schemas + topicUid,
                    headers: { authorization },
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    const schema = response.body.find((item) => item?.uuid === schemaUUID);
                    expect(schema, `schema ${schemaUUID} in topic ${topicUid}`).to.not.be.undefined;
                    schemaId = schema.id;
                });
            })
        });
    })

    it('Publish the schema with the provided (internal) schema ID', { tags: ['smoke'] }, () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            const versionNum = '1.' + randomInt(999);
            //Publish the schema created in the before hook: picking an arbitrary one from the
            //listing publishes an already published schema on any run after the first
            cy.request({
                method: METHOD.PUT,
                url:
                    API.ApiServer +
                    API.Schemas +
                    schemaId +
                    '/publish',
                headers: { authorization },
                body: {
                    version: versionNum,
                },
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.OK);
                const schema = response.body.find((item) => item?.uuid === schemaUUID);
                expect(schema, `schema ${schemaUUID} in the published schemas`).to.not.be.undefined;
                expect(schema.status).eql('PUBLISHED');
                expect(schema.version).eql(versionNum);
            });
        });
    })
});
