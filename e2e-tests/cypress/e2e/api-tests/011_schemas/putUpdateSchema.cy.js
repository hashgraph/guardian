import { randomInt } from '../../../support/random';
import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';

context('Schemas', { tags: ['schema', 'thirdPool', 'all', 'all-no-mgs'] }, () => {
  const SRUsername = Cypress.env('SRUser');
  const schemaUUID = ('0000b23a-b1ea-408f-a573' + randomInt(999999) + 'a2060a');
  let topicUid;

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
        topicUid = response.body.at(-1).topicId;
        //Create new schema
        cy.request({
          method: METHOD.POST,
          url: API.ApiServer + API.Schemas + topicUid,
          headers: { authorization },
          body: {
            uuid: schemaUUID,
            name: 'test',
            description: 'new',
            entity: 'VC',
            status: 'DRAFT',
            readonly: false,
            name: 'test',
            entity: 'NONE',
            document:
            {
              $id: schemaUUID,
              $comment: '{\"term\\": \"${schemaUUID}\\", \"@id\\": \"https://localhost/schema#${schemaUUID}\\"}',
              title: 'test',
              description: ' test',
              type: 'object',
              properties: {
                '@context': { 'oneOf': [{ 'type': 'string' }, { 'type': 'array', 'items': { 'type': 'string' } }], 'readOnly': true },
                type: { 'oneOf': [{ 'type': 'string' }, { 'type': 'array', 'items': { 'type': 'string' } }], 'readOnly': true },
                id: { 'type': 'string', 'readOnly': true },
                field0: { 'title': 'test field', 'description': 'test field', 'readOnly': false, '$comment': '{\\"term\\": \\"field0\\", \\"@id\\": \\"https://www.schema.org/text\\"}', 'type': 'string' }
              },
              required: ['@context', 'type'],
              additionalProperties: false
            },
          },
        }).then((response) => {
          expect(response.status).eql(STATUS_CODE.SUCCESS);
        });
      });
    })
  });

  it('Updates the schema with the provided schema ID', () => {
    Authorization.getAccessToken(SRUsername).then((authorization) => {
      cy.request({
        method: METHOD.GET,
        url: API.ApiServer + API.Schemas + topicUid,
        headers: {
          authorization,
        },
      }).then((response) => {
        expect(response.status).eql(STATUS_CODE.OK);
        //The topic is shared with the schemas of earlier runs, so the one created in the before
        //hook is addressed by its own uuid: updating an arbitrary one rewrites unrelated data
        const schema = response.body.find((item) => item?.uuid === schemaUUID);
        expect(schema, `schema ${schemaUUID} in topic ${topicUid}`).to.not.be.undefined;
        const schemaId = schema.id;

        cy.request({
          method: METHOD.PUT,
          url: API.ApiServer + API.Schemas,
          headers: { authorization, schemaID: schemaId },
          body: {
            id: schemaId,
            uuid: schemaUUID,
            name: 'test',
            description: 'new',
            entity: 'VC',
            status: 'DRAFT',
            readonly: false,
            document: {
              '$id': '#${schemaUUID}',
              '$comment': '{ "@id": "schema:${schemaUUID}#${schemaUUID}", "term": "${schemaUUID}" }',
              'title': 'wqe',
              'description': '',
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
            context: null,
            topicId: topicUid,
            contextURL: 'schema:${schemaUUID}',
            fields: [],
            conditions: [],
            active: false,
            system: false,
            category: 'POLICY',
            errors: [],
          },
        }).then((response) => {
          expect(response.status).eql(STATUS_CODE.OK);
        });
      });
    })
  });
});
