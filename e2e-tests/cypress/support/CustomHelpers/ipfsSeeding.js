import { METHOD, STATUS_CODE } from '../api/api-const';
import API from '../ApiUrls';
import { exportModuleMessage, importModuleFile, parseBinaryJson, publishModule } from '../api/modules';
import * as Authorization from '../authorization';
import { randomInt } from '../random';

const PUBLISH_TIMEOUT = 1800000;

/**
 * Where the seeding spec (000_accounts_creating/seedHederaArtefacts) records the Hedera message of
 * every artefact it published. Runtime state, not a checked-in fixture: see e2e-tests/.gitignore.
 */
const SEEDED_MESSAGES_FILE = 'cypress/fixtures/seededMessages.json';

const HEDERA_MESSAGE_ID = /^\d+\.\d+$/;

/**
 * The suite pins a handful of Hedera message IDs in cypress.env.json, all of them published on
 * testnet. On any other network those messages do not exist, so the artefacts behind them have to
 * be published by the run itself.
 */
export const usesSeededMessages = () => Cypress.env('hederaNet') !== 'testnet';

/** Reads a `*.policy` / `*.tool` / `*.module` archive from the fixtures folder as a Blob. */
const readFixtureArchive = (fixtureName) =>
    cy.fixture(fixtureName, 'binary').then((binary) => Cypress.Blob.binaryStringToBlob(binary));

/** Posts an exported archive to one of the `import/file` endpoints. */
const importArchive = (authorization, url, file) =>
    cy.request({
        method: METHOD.POST,
        url,
        body: file,
        headers: {
            'content-type': 'binary/octet-stream',
            authorization,
        },
        timeout: PUBLISH_TIMEOUT,
    });

/**
 * Every publish endpoint answers 200 with `{ isValid, errors }` whether or not it published: a
 * failed validation leaves the artefact a draft, and only `isValid` says so.
 */
const expectPublished = (response, fixtureName) => {
    expect(response.status, `publish of ${fixtureName}`).to.eq(STATUS_CODE.OK);
    expect(
        response.body.isValid,
        `publish of ${fixtureName} validation: ${JSON.stringify(response.body.errors)}`
    ).to.be.true;
};

/** Yields the Hedera message ID carried by an `export/message` response. */
const yieldExportedMessageId = (response, fixtureName) => {
    expect(response.status, `export/message of ${fixtureName}`).to.eq(STATUS_CODE.OK);
    const { messageId } = response.body;
    expect(messageId, `Hedera message ID of published ${fixtureName}`).to.match(HEDERA_MESSAGE_ID);
    return cy.wrap(messageId, { log: false });
};

/**
 * Imports a policy fixture from file and publishes it, which uploads the policy to IPFS and
 * submits the publishing message to Hedera.
 *
 * Tests that need to exercise the "import from Hedera message" path must seed their own message
 * this way instead of relying on a hardcoded message ID: the IPFS data behind an old message can
 * be unpinned at any time (and testnet is periodically reset), which makes the import fail with
 * IPFS_UNAVAILABLE and leaves the whole spec red.
 *
 * Yields the Hedera message ID of the freshly published policy.
 */
export const publishPolicyFixture = (username, fixtureName, policyVersion = '1.0.0') =>
    Authorization.getAccessToken(username).then((authorization) => readFixtureArchive(fixtureName)
        .then((file) => importArchive(authorization, API.ApiServer + API.PolicisImportFile, file))
        .then((response) => {
            expect(response.status, `import of ${fixtureName}`).to.eq(STATUS_CODE.SUCCESS);
            const policyId = JSON.parse(new TextDecoder().decode(response.body)).at(0).id;
            return cy.request({
                method: METHOD.PUT,
                url: `${API.ApiServer}${API.Policies}${policyId}/${API.Publish}`,
                body: { policyVersion },
                headers: { authorization },
                timeout: PUBLISH_TIMEOUT,
            }).then((publishResponse) => {
                expectPublished(publishResponse, fixtureName);
                return cy.request({
                    method: METHOD.GET,
                    url: `${API.ApiServer}${API.Policies}${policyId}/${API.ExportMessage}`,
                    headers: { authorization },
                    timeout: PUBLISH_TIMEOUT,
                });
            }).then((exportResponse) => yieldExportedMessageId(exportResponse, fixtureName));
        }));

/**
 * Imports a module fixture from file and publishes it. Same reasoning as publishPolicyFixture.
 *
 * Yields the Hedera message ID of the freshly published module.
 */
export const publishModuleFixture = (username, fixtureName) =>
    Authorization.getAccessToken(username).then((authorization) => readFixtureArchive(fixtureName)
        .then((file) => importModuleFile(authorization, file, { timeout: PUBLISH_TIMEOUT }))
        .then((response) => {
            expect(response.status, `import of ${fixtureName}`).to.eq(STATUS_CODE.SUCCESS);
            const { uuid } = parseBinaryJson(response.body);
            return publishModule(authorization, uuid, { timeout: PUBLISH_TIMEOUT })
                .then((publishResponse) => {
                    expectPublished(publishResponse, fixtureName);
                    return exportModuleMessage(authorization, uuid, { timeout: PUBLISH_TIMEOUT });
                })
                .then((exportResponse) => yieldExportedMessageId(exportResponse, fixtureName));
        }));

/**
 * Imports a tool fixture from file and publishes it. Same reasoning as publishPolicyFixture.
 *
 * Yields the Hedera message ID of the freshly published tool.
 */
export const publishToolFixture = (username, fixtureName, toolVersion = '1.0.0') =>
    Authorization.getAccessToken(username).then((authorization) => readFixtureArchive(fixtureName)
        .then((file) => importArchive(authorization, API.ApiServer + API.ToolsImportFile, file))
        .then((response) => {
            expect(response.status, `import of ${fixtureName}`).to.eq(STATUS_CODE.SUCCESS);
            const toolId = parseBinaryJson(response.body).id;
            return cy.request({
                method: METHOD.PUT,
                url: `${API.ApiServer}${API.Tools}${toolId}/${API.Publish}`,
                body: { toolVersion },
                headers: { authorization },
                timeout: PUBLISH_TIMEOUT,
            }).then((publishResponse) => {
                expectPublished(publishResponse, fixtureName);
                return cy.request({
                    method: METHOD.GET,
                    url: `${API.ApiServer}${API.Tools}${toolId}/${API.ExportMessage}`,
                    headers: { authorization },
                    timeout: PUBLISH_TIMEOUT,
                });
            }).then((exportResponse) => yieldExportedMessageId(exportResponse, fixtureName));
        }));

/**
 * Records the Hedera messages the seeding spec published, so the specs that consume them can look
 * them up through `seededMessageId`.
 */
export const writeSeededMessageIds = (messageIdsByEnvKey) =>
    cy.writeFile(SEEDED_MESSAGES_FILE, messageIdsByEnvKey);

/**
 * Resolves one of the artefact message IDs the suite imports from, and is the only place that knows
 * which network the run is against: on testnet it is the ID pinned in cypress.env.json, anywhere
 * else the one the seeding spec published on that network. Consuming specs stay network-agnostic.
 *
 * Yields the Hedera message ID.
 */
export const seededMessageId = (envKey) => {
    if (!usesSeededMessages()) {
        return cy.wrap(Cypress.env(envKey), { log: false });
    }
    return cy.readFile(SEEDED_MESSAGES_FILE).then((seeded) => {
        const messageId = seeded?.[envKey];
        expect(
            messageId,
            `Hedera message seeded for "${envKey}" (published by 000_accounts_creating/seedHederaArtefacts)`
        ).to.match(HEDERA_MESSAGE_ID);
        return cy.wrap(messageId, { log: false });
    });
};

/**
 * Creates a minimal schema in an existing topic and publishes it, which uploads the schema to IPFS
 * and submits the publishing message to Hedera. Same reasoning as publishPolicyFixture: a schema
 * message hardcoded in the test config eventually becomes unretrievable.
 *
 * Yields `{ messageId, topicId }` of the freshly published schema.
 */
export const publishSchema = (username) =>
    Authorization.getAccessToken(username).then((authorization) => cy.request({
        method: METHOD.GET,
        url: API.ApiServer + API.Policies,
        headers: { authorization },
    }).then((response) => {
        expect(response.status).to.eq(STATUS_CODE.OK);
        // a policy topic, so the schema is created where POLICY category schemas belong
        const topicId = response.body.at(0)?.topicId;
        expect(topicId, 'topic of an existing policy to create the schema in').to.be.a('string');
        const uuid = `0000b23a-b1ea-408f-a573${randomInt(999999)}a2060a`;
        return cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.Schemas + topicId,
            headers: { authorization },
            body: {
                uuid,
                name: `seededSchema${randomInt(999999)}`,
                entity: 'VC',
                status: 'DRAFT',
                readonly: false,
                document: {
                    $id: `#${uuid}`,
                    $comment: `{ "@id": "schema:${uuid}#${uuid}", "term": "${uuid}" }`,
                    title: 'seededSchema',
                    type: 'object',
                    properties: {
                        '@context': {
                            oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
                            readOnly: true,
                        },
                        type: {
                            oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
                            readOnly: true,
                        },
                        id: { type: 'string', readOnly: true },
                        policyId: {
                            title: 'policyId',
                            description: 'policyId',
                            readOnly: true,
                            type: 'string',
                            $comment: '{"term":"policyId","@id":"https://www.schema.org/text"}',
                        },
                    },
                    required: ['@context', 'type', 'policyId'],
                    additionalProperties: false,
                    $defs: {},
                },
                topicId,
                active: false,
                system: false,
                category: 'POLICY',
            },
            timeout: PUBLISH_TIMEOUT,
        }).then((createResponse) => {
            expect(createResponse.status, 'schema creation').to.be.oneOf([STATUS_CODE.OK, STATUS_CODE.SUCCESS]);
            // The creation response is the paginated list of every schema, so the new schema has to
            // be looked up by topic instead. Both the filtered `schemas?topicId=` listing and the
            // per-topic route are cache-invalidated on schema mutations (#6634).
            return cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Schemas + topicId,
                headers: { authorization },
            });
        }).then((listResponse) => {
            expect(listResponse.status).to.eq(STATUS_CODE.OK);
            const schema = listResponse.body.find((item) => item?.uuid === uuid);
            expect(schema, 'created schema').to.not.be.undefined;
            return cy.request({
                method: METHOD.PUT,
                url: `${API.ApiServer}${API.Schemas}${schema.id}/publish`,
                headers: { authorization },
                body: { version: `1.${randomInt(999)}` },
                timeout: PUBLISH_TIMEOUT,
            }).then((publishResponse) => {
                expect(publishResponse.status, 'schema publish').to.be.oneOf([STATUS_CODE.OK, STATUS_CODE.SUCCESS]);
                const published = publishResponse.body.find((item) => item?.uuid === uuid);
                expect(published, 'published schema').to.not.be.undefined;
                expect(published.status, 'published schema status').to.eq('PUBLISHED');
                return cy.request({
                    method: METHOD.GET,
                    url: `${API.ApiServer}${API.Schemas}${schema.id}/${API.ExportMessage}`,
                    headers: { authorization },
                    timeout: PUBLISH_TIMEOUT,
                });
            }).then((exportResponse) => {
                expect(exportResponse.status).to.eq(STATUS_CODE.OK);
                const { messageId } = exportResponse.body;
                expect(messageId, 'Hedera message ID of the published schema').to.match(HEDERA_MESSAGE_ID);
                return cy.wrap({ messageId, topicId }, { log: false });
            });
        });
    }));

/**
 * Imports a policy from a Hedera message, retrying while the freshly pinned IPFS content is still
 * propagating to the gateway the Guardian instance reads from.
 *
 * Yields the imported policies as returned by the API.
 */
export const importPolicyFromMessage = (username, messageId, body = {}, attempts = 0) =>
    Authorization.getAccessToken(username).then((authorization) => cy.request({
        method: METHOD.POST,
        url: API.ApiServer + API.PolicisImportMsg,
        body: { messageId, ...body },
        headers: { authorization },
        timeout: PUBLISH_TIMEOUT,
        failOnStatusCode: false,
    }).then((response) => {
        if (response.status === STATUS_CODE.SUCCESS) {
            return cy.wrap(response.body, { log: false });
        }
        const message = String(response.body?.message ?? '');
        // each failed attempt already costs the Guardian side IPFS timeout, so keep the budget small
        if (attempts < 3 && message.includes('IPFS_UNAVAILABLE')) {
            cy.log(`IPFS content for ${messageId} not available yet, retry ${attempts + 1}`);
            // eslint-disable-next-line cypress/no-unnecessary-waiting -- back off while the gateway catches up
            cy.wait(30000);
            return importPolicyFromMessage(username, messageId, body, attempts + 1);
        }
        throw new Error(`Import of policy ${messageId} failed: ${response.status} ${message}`);
    }));
