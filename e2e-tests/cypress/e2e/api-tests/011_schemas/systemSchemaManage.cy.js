import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';

context('Schemas', { tags: ['schema', 'thirdPool', 'all', 'all-no-mgs'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    //A run interrupted before the deletion at the end leaves its schema behind, so the uuid is
    //drawn per run to keep the creation below free of collisions
    const schemaUUID = crypto.randomUUID();
    const username = 'StandartRegistry';

    it('Delete the system schema with the provided schema ID', () => {
        //Create new schema
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.SchemasSystem + username,
                headers: { authorization },
                body: {
                    uuid: schemaUUID,
                    name: 'test',
                    description: 'new',
                    entity: 'USER',
                    status: 'DRAFT',
                    readonly: false,
                    document:
                    {
                        $id: schemaUUID,
                        $comment: '{"term": "${schemaUUID}", "@id": "https://localhost/schema#${schemaUUID}"}',
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

                cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.SchemasSystem + username,
                    headers: {
                        authorization,
                    },
                }).then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    expect(response.body[0]).to.have.property('uuid');

                    //The listing also holds the system schemas of earlier runs, so the one created
                    //above is addressed by its own uuid instead of by position
                    const schema = response.body.find((item) => item?.uuid === schemaUUID);
                    expect(schema, `system schema ${schemaUUID} in the listing`).to.not.be.undefined;
                    let schemaUd = schema.uuid;
                    let schemaId = schema.id;

                    cy.request({
                        method: METHOD.PUT,
                        url: API.ApiServer + API.SchemasSystem + schemaId,
                        headers: { authorization },
                        body: {
                            id: schemaId,
                            uuid: schemaUd,
                            description: 'new',
                            hash: '',
                            status: 'DRAFT',
                            readonly: false,
                            name: 'test',
                            entity: 'USER',
                            document:
                            {
                                $id: schemaUUID,
                                $comment: '{"term": "${schemaUUID}", "@id": "https://localhost/schema#${schemaUUID}"}',
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
                        expect(response.status).eql(STATUS_CODE.OK);

                        //Delete schema
                        cy.request({
                            method: METHOD.DELETE,
                            url:
                                API.ApiServer +
                                API.SchemasSystem +
                                schemaId,
                            headers: { authorization },
                        }).then((response) => {
                            expect(response.status).eql(STATUS_CODE.OK);
                        });
                    });
                });
            });
        });
    })
});
