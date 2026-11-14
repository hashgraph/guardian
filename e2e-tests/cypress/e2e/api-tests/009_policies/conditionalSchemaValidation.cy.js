import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';
import * as Checks from '../../../support/checkingMethods';
import { deleteDryRunPolicy } from '../../../support/CustomHelpers/policyTests';
import { TIMEOUTS } from '../../../support/CustomHelpers/timeouts';
import { randomInt } from '../../../support/random';

// Server-side validation of a schema's conditions (#7374). The policy has a request block, which
// validates the submitted subject with verifySubject, and a VC upload block, which validates a
// whole VC with verifySchema. Its schema carries the two condition shapes the schema editor saves
// (SchemaHelper.buildDocument): a root field required only while a condition holds, and a
// sub-schema field that the condition requires in one branch and forbids in the other.
context('Policies', { tags: ['policies', 'secondPool', 'api-all', 'all', 'all-no-mgs'] }, () => {
    const SRUsername = Cypress.env('SRUser');

    const run = randomInt(1000000000);
    const policyName = `conditionalValidation${run}`;
    const submitTag = 'submit_document';
    const uploadTag = 'upload_document';

    let policyId; let topicId;
    let inactiveBranchVc;

    const stringField = (name, comment = {}) => ({
        title: name,
        description: name,
        type: 'string',
        readOnly: false,
        $comment: JSON.stringify({ term: name, '@id': 'https://www.schema.org/text', ...comment }),
    });
    const readOnlyField = (name) => ({ ...stringField(name), readOnly: true });
    const systemProperties = () => ({
        '@context': { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }], readOnly: true },
        type: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }], readOnly: true },
        id: { type: 'string', readOnly: true },
    });
    const schemaComment = (uuid) => `{ "@id": "schema:${uuid}#${uuid}", "term": "${uuid}" }`;

    const childUuid = crypto.randomUUID();
    const parentUuid = crypto.randomUUID();

    // A sub-schema whose `note` is base-required.
    const childDocument = () => ({
        $id: `#${childUuid}`,
        $comment: schemaComment(childUuid),
        title: `conditionalValidationDetail${run}`,
        type: 'object',
        properties: { ...systemProperties(), note: stringField('note') },
        required: ['@context', 'type', 'note'],
        additionalProperties: false,
        $defs: {},
    });

    // `b` is required only while `a` is 'x' (flagged in its $comment, enforced by code, not by ajv);
    // `detail.note` is required while `trigger` is 'yes' and forbidden otherwise.
    const parentDocument = (child) => ({
        $id: `#${parentUuid}`,
        $comment: schemaComment(parentUuid),
        title: `conditionalValidation${run}`,
        type: 'object',
        properties: {
            ...systemProperties(),
            policyId: readOnlyField('policyId'),
            ref: readOnlyField('ref'),
            guardianVersion: readOnlyField('guardianVersion'),
            a: stringField('a'),
            b: stringField('b'),
            trigger: stringField('trigger'),
            detail: {
                title: 'detail',
                description: 'detail',
                readOnly: false,
                $ref: child.iri,
                $comment: JSON.stringify({ term: 'detail', '@id': `schema:${parentUuid}${child.iri}` }),
            },
        },
        required: ['@context', 'type', 'policyId', 'trigger', 'detail'],
        additionalProperties: false,
        allOf: [
            {
                if: { properties: { a: { const: 'x' } }, required: ['a'] },
                then: { properties: { b: stringField('b', { conditionRequired: true }) } },
                else: { properties: { b: false } },
            },
            {
                if: { properties: { trigger: { const: 'yes' } }, required: ['trigger'] },
                then: { properties: { detail: { required: ['note'] } } },
                else: { properties: { detail: { properties: { note: false } } } },
            },
        ],
        $defs: { [child.iri]: child.document },
    });

    const policyConfig = (schemaIri) => ({
        id: crypto.randomUUID(),
        blockType: 'interfaceContainerBlock',
        tag: 'root',
        permissions: ['ANY_ROLE'],
        defaultActive: true,
        onErrorAction: 'no-action',
        uiMetaData: { type: 'blank' },
        children: [
            {
                id: crypto.randomUUID(),
                blockType: 'requestVcDocumentBlock',
                tag: submitTag,
                permissions: ['OWNER'],
                defaultActive: true,
                onErrorAction: 'no-action',
                uiMetaData: { type: 'page', title: 'Submit' },
                schema: schemaIri,
                idType: 'UUID',
                presetFields: [],
                children: [],
            },
            {
                id: crypto.randomUUID(),
                blockType: 'sendToGuardianBlock',
                tag: 'save_document',
                permissions: ['OWNER'],
                defaultActive: false,
                onErrorAction: 'no-action',
                dataSource: 'database',
                documentType: 'vc',
                entityType: 'conditionalValidation',
                options: [],
                uiMetaData: {},
                children: [],
            },
            {
                id: crypto.randomUUID(),
                blockType: 'uploadVcDocumentBlock',
                tag: uploadTag,
                permissions: ['OWNER'],
                defaultActive: true,
                onErrorAction: 'no-action',
                stopPropagation: true,
                schema: schemaIri,
                entityType: 'conditionalValidation',
                uiMetaData: { type: 'page' },
                children: [],
            },
        ],
    });

    // The creation response is the list of schemas, so the new one is read back from its topic.
    const createSchema = (authorization, uuid, entity, document) =>
        cy.request({
            method: METHOD.POST,
            url: API.ApiServer + API.Schemas + topicId,
            headers: { authorization },
            body: {
                uuid,
                name: document.title,
                entity,
                status: 'DRAFT',
                readonly: false,
                document,
                topicId,
                active: false,
                system: false,
                category: 'POLICY',
            },
            timeout: TIMEOUTS.backend,
        }).then((response) => {
            expect(response.status, `creation of ${document.title}`).to.eq(STATUS_CODE.SUCCESS);
            return cy.request({
                method: METHOD.GET,
                url: API.ApiServer + API.Schemas + topicId,
                headers: { authorization },
            });
        }).then((response) => {
            const schema = response.body.find((item) => item.uuid === uuid);
            expect(schema, `schema ${document.title}`).to.not.be.undefined;
            const saved = typeof schema.document === 'string' ? JSON.parse(schema.document) : schema.document;
            return cy.wrap({ iri: schema.iri, document: saved }, { log: false });
        });

    const postToBlock = (authorization, tag, body) =>
        cy.request({
            method: METHOD.POST,
            url: API.BlockByTag(policyId, tag),
            headers: { authorization },
            body,
            timeout: TIMEOUTS.backend,
            failOnStatusCode: false,
        });

    const submit = (authorization, document) => postToBlock(authorization, submitTag, { document, ref: null });

    // A bare 422 is not enough: an unprepared policy also answers 422, so check the rejection
    // comes from the schema validation.
    const expectValidationError = (response, text) => {
        expect(response.status).to.eq(STATUS_CODE.UNPROCESSABLE);
        expect(response.body.message).to.contain('JSON_SCHEMA_VALIDATION_ERROR');
        expect(response.body.message).to.contain(text);
    };

    before('Create the policy and its schemas and start the dry run', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            cy.request({
                method: METHOD.POST,
                url: API.ApiServer + API.Policies,
                headers: { authorization },
                body: { name: policyName, policyTag: policyName },
                timeout: TIMEOUTS.backend,
            }).then((response) => {
                expect(response.status).to.eq(STATUS_CODE.SUCCESS);
                const policy = response.body.find((item) => item.name === policyName);
                policyId = policy.id;
                topicId = policy.topicId;
            });
        }).then(() => Authorization.getAccessToken(SRUsername)).then((authorization) =>
            createSchema(authorization, childUuid, 'NONE', childDocument())
                .then((child) => createSchema(authorization, parentUuid, 'VC', parentDocument(child)))
                .then((parent) => cy.request({
                    method: METHOD.GET,
                    url: API.ApiServer + API.Policies + policyId,
                    headers: { authorization },
                }).then((response) => cy.request({
                    method: METHOD.PUT,
                    url: API.ApiServer + API.Policies + policyId,
                    headers: { authorization },
                    body: { ...response.body, config: policyConfig(parent.iri) },
                    timeout: TIMEOUTS.backend,
                })))
                .then((response) => {
                    expect(response.status, 'policy configuration').to.eq(STATUS_CODE.OK);
                    return cy.request({
                        method: METHOD.PUT,
                        url: API.ApiServer + API.Policies + policyId + '/' + API.DryRun,
                        headers: { authorization },
                        body: {},
                        timeout: TIMEOUTS.longOperation,
                    });
                })
                .then((response) => {
                    expect(response.status, 'dry run').to.eq(STATUS_CODE.OK);
                    expect(response.body.isValid, JSON.stringify(response.body.errors)).to.eq(true);
                    return Checks.waitForBlockAvailable(API.BlockByTag(policyId, submitTag), authorization);
                }));
    });

    // Deleting the policy also deletes the schemas of its topic.
    after('Delete the policy', () => {
        if (!policyId) {
            return;
        }
        Authorization.getAccessToken(SRUsername).then((authorization) => deleteDryRunPolicy(authorization, policyId));
    });

    it('Rejects a document missing a field that an active condition requires', () => {
        return Authorization.getAccessToken(SRUsername).then((authorization) =>
            submit(authorization, { a: 'x', trigger: 'no', detail: {} })
                .then((response) => expectValidationError(response, 'Field \\"b\\" is required.')));
    });

    it('Accepts a document that omits a sub-schema field its inactive branch does not require', () => {
        return Authorization.getAccessToken(SRUsername).then((authorization) =>
            submit(authorization, { a: 'other', trigger: 'no', detail: {} })
                .then((response) => {
                    expect(response.status, JSON.stringify(response.body)).to.eq(STATUS_CODE.OK);
                    inactiveBranchVc = response.body.document;
                    expect(inactiveBranchVc.proof, 'signed VC').to.exist;
                }));
    });

    it('Requires the sub-schema field while its branch is active', () => {
        return Authorization.getAccessToken(SRUsername).then((authorization) =>
            submit(authorization, { a: 'other', trigger: 'yes', detail: {} })
                .then((response) => expectValidationError(response, '"missingProperty":"note"')));
    });

    it('Verifies an uploaded VC that omits a sub-schema field its inactive branch does not require', () => {
        expect(inactiveBranchVc, 'VC created by the previous test').to.be.an('object');
        return Authorization.getAccessToken(SRUsername).then((authorization) =>
            postToBlock(authorization, uploadTag, { documents: [inactiveBranchVc] })
                .then((response) => {
                    expect(response.status, JSON.stringify(response.body)).to.eq(STATUS_CODE.OK);
                    expect(response.body.invalid, 'documents the upload rejected').to.have.length(0);
                    expect(response.body.verified, 'documents the upload verified').to.have.length(1);
                }));
    });
});
