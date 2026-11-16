import assert from 'node:assert/strict';
import { DefaultDocumentLoader } from '../../../../../common/dist/document-loader/base/document-loader-default.js';
import { LocalDidLoader } from '../../../../../common/dist/document-loader/local-did-loader.js';
import { LocalVcSchemaDocumentLoader } from '../../../../../common/dist/document-loader/local-vc-schema-document-loader.js';
import { VCJS } from '../../../../dist/vcjs/vcjs.js';

void DefaultDocumentLoader;
void LocalDidLoader;

const systemProperties = () => ({
    '@context': { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }], readOnly: true },
    type: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }], readOnly: true },
});

// A saved schema document keeps its sub-schemas in its own $defs. `note` is base-required in
// the sub-schema, required by the `then` branch and forbidden by the `else` branch.
const subjectDocument = () => ({
    $id: '#Subject',
    type: 'object',
    properties: { ...systemProperties(), trigger: { type: 'string' }, detail: { $ref: '#Detail' } },
    required: ['trigger', 'detail'],
    additionalProperties: false,
    allOf: [{
        if: { properties: { trigger: { const: 'yes' } }, required: ['trigger'] },
        then: { properties: { detail: { required: ['note'] } } },
        else: { properties: { detail: { properties: { note: false } } } },
    }],
    $defs: {
        '#Detail': {
            $id: '#Detail',
            type: 'object',
            properties: { ...systemProperties(), note: { type: 'string' } },
            required: ['note'],
            additionalProperties: false,
        },
    },
});

async function verify(credentialSubject) {
    const vcjs = new VCJS();
    // The VC loader wraps the saved document, so the sub-schemas sit one $defs level down.
    vcjs.schemaLoader = async () => LocalVcSchemaDocumentLoader.prototype['vcSchema'](subjectDocument());
    return vcjs.verifySchema({
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        credentialSubject: { '@context': [], type: 'Subject', ...credentialSubject },
    });
}

const fieldErrors = (result) => (result.error?.details || [])
    .filter((error) => error.instancePath.startsWith('/credentialSubject/'))
    .map((error) => `${error.instancePath} ${error.message}`);

describe('VCJS verifySchema with the sub-schemas nested in the subject schema', () => {
    it('accepts a document that omits the base-required field while its branch is inactive', async () => {
        const result = await verify({ trigger: 'no', detail: {} });
        assert.deepEqual(fieldErrors(result), []);
        assert.equal(result.ok, true);
    });

    it('still forbids the field while its branch is inactive', async () => {
        const result = await verify({ trigger: 'no', detail: { note: 'should not be here' } });
        assert.equal(result.ok, false);
        assert.equal(fieldErrors(result).some((error) => error.startsWith('/credentialSubject/detail/note')), true);
    });

    it('requires the field while its branch is active', async () => {
        const missing = await verify({ trigger: 'yes', detail: {} });
        assert.equal(missing.ok, false);
        assert.deepEqual(fieldErrors(missing), ["/credentialSubject/detail must have required property 'note'"]);

        const present = await verify({ trigger: 'yes', detail: { note: 'present' } });
        assert.equal(present.ok, true);
    });

    it('builds the schema object without logging an error', async () => {
        const logged = [];
        const original = console.error;
        console.error = (...args) => logged.push(args);
        try {
            await verify({ trigger: 'yes', detail: { note: 'present' } });
        } finally {
            console.error = original;
        }
        assert.deepEqual(logged, []);
    });
});
