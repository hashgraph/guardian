import { METHOD, STATUS_CODE } from '../api/api-const';
import API from '../ApiUrls';
import * as Authorization from '../authorization';
import { randomInt } from '../random';

/**
 * Creates a draft system schema through the API, for the specs that drive the system list rather than
 * the schema editor.
 *
 * Yields the name of the schema.
 */
export const createSystemSchema = (username, name, entity = 'USER') => {
    const uuid = `0000b23a-b1ea-408f-a573${randomInt(999999)}a2060a`;
    const document = {
        $id: `#${uuid}`,
        $comment: `{"term": "${uuid}", "@id": "https://localhost/schema#${uuid}"}`,
        title: name,
        description: name,
        type: 'object',
        properties: {
            '@context': { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }], readOnly: true },
            type: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }], readOnly: true },
            id: { type: 'string', readOnly: true },
            field0: {
                title: 'test field',
                description: 'test field',
                readOnly: false,
                $comment: '{"term": "field0", "@id": "https://www.schema.org/text"}',
                type: 'string',
            },
        },
        required: ['@context', 'type'],
        additionalProperties: false,
    };
    return Authorization.getAccessToken(username).then((authorization) => cy.request({
        method: METHOD.POST,
        url: API.ApiServer + API.SchemasSystem + username,
        headers: { authorization },
        body: { uuid, description: name, hash: '', status: 'DRAFT', readonly: false, name, entity, document: JSON.stringify(document) },
    })).then((response) => {
        expect(response.status, `creation of system schema ${name}`).to.eq(STATUS_CODE.SUCCESS);
        return cy.wrap(name, { log: false });
    });
};
