import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';
import { randomInt } from '../../../support/random';
import { waitForTask } from '../../../support/CustomHelpers/tasks';

context('Schema', { tags: ['schema', 'thirdPool', 'all', 'all-no-mgs'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    // policyTag is unique in the DB, so a hardcoded one makes every run after the first fail with a
    // duplicate key error
    const runId = randomInt(999999);
    const policyName = `forNestedSchemaTest_${runId}`;
    const policyTag = `Tag_${runId}`;
    const schemaNameA = `schemaA_${runId}`;
    const schemaNameB = `schemaB_${runId}`;
    // the uuids of the fixture are rewritten per run as well: a schema left over by an interrupted
    // run makes the creation of the same schema fail
    const fixtureUuidA = 'de21cc0a-18ad-47c0-ae82-aefe7107fc61';
    const fixtureUuidB = 'f5d3e328-cd4e-4819-a807-c98c4a5795f8';
    const schemaUuidA = crypto.randomUUID();
    const schemaUuidB = crypto.randomUUID();

    let topicId; let schemaAId; let schemaBId; let schemas;

    const listTopicSchemas = (authorization) => cy.request({
        method: METHOD.GET,
        url: API.ApiServer + API.Schemas + topicId,
        headers: { authorization },
    }).then((response) => {
        expect(response.status).to.eq(STATUS_CODE.OK);
        return cy.wrap(response.body, { log: false });
    });

    const findSchema = (list, uuid, name) => {
        const schema = list.find((item) => item?.uuid === uuid);
        expect(schema, `${name} in the schemas of topic ${topicId}`).to.not.be.undefined;
        return schema;
    };

    const createSchema = (authorization, schema) => cy.request({
        method: METHOD.POST,
        url: API.ApiServer + API.Schemas + topicId,
        headers: { authorization },
        body: schema,
    }).then((response) => {
        expect(response.status, `creation of ${schema.name}`).to.eq(STATUS_CODE.SUCCESS);
    });

    /**
     * Creates schema A and points the nested field of schema B at it.
     *
     * The reference has to carry the iri the API assigned to A, version included: the parent/child
     * relation is resolved by iri, so a reference to a hardcoded version (as stored in the fixture)
     * silently stops matching as soon as A is created with any other version.
     */
    const createSchemaAAndNestItIntoB = (authorization) => {
        createSchema(authorization, schemas.schemaA);
        return listTopicSchemas(authorization).then((list) => {
            const schemaA = findSchema(list, schemaUuidA, schemaNameA);
            schemaAId = schemaA.id;
            const document = schemas.schemaB.document;
            document.$defs = { [schemaA.iri]: Object.values(document.$defs).at(0) };
            document.properties.field0.$ref = schemaA.iri;
        });
    };

    const createSchemaB = (authorization) => {
        createSchema(authorization, schemas.schemaB);
        return listTopicSchemas(authorization).then((list) => {
            schemaBId = findSchema(list, schemaUuidB, schemaNameB).id;
        });
    };

    // deletion by schema id is asynchronous, the response only carries the task to wait for
    const deleteSchema = (authorization, schemaId, includeChildren) => cy.request({
        method: METHOD.DELETE,
        url: API.ApiServer + API.Schemas + schemaId,
        headers: { authorization },
        qs: { includeChildren },
    }).then((response) => {
        expect(response.status).to.eq(STATUS_CODE.OK);
        return waitForTask(authorization, response.body.taskId);
    });

    before('Create policy', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.Policies,
                headers: {
                    authorization,
                },
                body: {
                    name: policyName,
                    policyTag,
                }
            }).then((response) => {
                expect(response.status).eql(STATUS_CODE.SUCCESS);
                topicId = response.body.at(0).topicId;
                cy.fixture('schemaForNestedTest.json').then((schemasFromJSON) => {
                    // the fixture uuids appear in $id, $ref, $comment, contextURL and the $defs keys,
                    // so they are swapped on the serialized schema to keep all of them consistent
                    const withRunUuids = (schema) => JSON.parse(JSON.stringify(schema)
                        .replaceAll(fixtureUuidA, schemaUuidA)
                        .replaceAll(fixtureUuidB, schemaUuidB));
                    schemas = {
                        schemaA: withRunUuids(schemasFromJSON.schemaA),
                        schemaB: withRunUuids(schemasFromJSON.schemaB),
                    };
                    schemas.schemaA.name = schemaNameA;
                    schemas.schemaA.document.title = schemaNameA;
                    schemas.schemaA.topicId = topicId;
                    schemas.schemaB.name = schemaNameB;
                    schemas.schemaB.document.title = schemaNameB;
                    schemas.schemaB.topicId = topicId;
                    // only the label of the nested field, the nesting itself is the $ref of field0
                    schemas.schemaB.document.properties.field0.description = schemaNameA;
                    Object.values(schemas.schemaB.document.$defs).at(0).title = schemaNameA;
                })
            });
        })
    });

    before('Create schemas and nest one of them', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            createSchemaAAndNestItIntoB(authorization)
                .then(() => createSchemaB(authorization));
        });
    });

    it('Delete schema without child deletion', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            deleteSchema(authorization, schemaBId, false);
            listTopicSchemas(authorization).then((list) => {
                expect(list.length).eql(1);
                expect(list.at(0).id).eql(schemaAId);
            });
        });
    });

    it('Delete schema with child deletion', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            createSchemaB(authorization)
                .then(() => deleteSchema(authorization, schemaBId, true))
                .then(() => listTopicSchemas(authorization))
                .then((list) => {
                    expect(list.length).eql(0);
                });
        })
    });

    it('Delete all policy schemas', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            createSchemaAAndNestItIntoB(authorization)
                .then(() => createSchemaB(authorization))
                .then(() => cy.request({
                    method: METHOD.DELETE,
                    url: API.ApiServer + API.Schemas + API.Topic + topicId,
                    headers: {
                        authorization,
                    }
                }))
                .then((response) => {
                    expect(response.status).eql(STATUS_CODE.OK);
                    return listTopicSchemas(authorization);
                })
                .then((list) => {
                    expect(list.length).eql(0);
                });
        });
    });
});
