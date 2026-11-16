import assert from 'node:assert/strict';
import { SchemaHelper } from '@guardian/interfaces';
import { DefaultDocumentLoader } from '../../../../../common/dist/document-loader/base/document-loader-default.js';
import { LocalDidLoader } from '../../../../../common/dist/document-loader/local-did-loader.js';
import { LocalVcSchemaDocumentLoader } from '../../../../../common/dist/document-loader/local-vc-schema-document-loader.js';
import { VCJS } from '../../../../dist/vcjs/vcjs.js';

void DefaultDocumentLoader;
void LocalDidLoader;

const field = (name, over = {}) => ({
    name, title: name, description: name, type: 'string',
    required: false, isArray: false, isRef: false, readOnly: false, ...over,
});

// A schema as the editor saves it: `b` is required only while `a` is 'x', which the
// document carries in a $comment and only validateConditionFields enforces.
const schemaDocument = () => SchemaHelper.buildDocument(
    { uuid: 'u-1', version: '1.0.0', name: 'N', description: 'D', contextURL: 'schema:u-1' },
    [field('a'), field('b')],
    [{ ifCondition: { field: field('a'), fieldValue: 'x' }, thenFields: [field('b', { required: true })], elseFields: [] }]
);

describe('VCJS verifySubject and verifySchema enforce the same schema', () => {
    const subject = (data) => ({ '@context': ['schema:u-1'], type: 'u-1', ...data });

    async function verifySubject(data) {
        const vcjs = new VCJS();
        vcjs.schemaLoader = async () => schemaDocument();
        return vcjs.verifySubject(subject(data));
    }

    async function verifyVc(data) {
        const vcjs = new VCJS();
        vcjs.schemaLoader = async () => LocalVcSchemaDocumentLoader.prototype['vcSchema'](schemaDocument());
        return vcjs.verifySchema({ '@context': ['https://www.w3.org/2018/credentials/v1'], credentialSubject: subject(data) });
    }

    for (const [name, verify] of [['verifySchema', verifyVc], ['verifySubject', verifySubject]]) {
        it(`${name} rejects a document missing a field its condition makes required`, async () => {
            const result = await verify({ a: 'x' });
            assert.equal(result.ok, false);
            assert.deepEqual(
                result.error.details.filter((error) => error.keyword === 'conditionFields').map((error) => error.message),
                ['Field "b" is required.']
            );
        });

        it(`${name} accepts the document once the field is filled`, async () => {
            const result = await verify({ a: 'x', b: 'filled' });
            assert.equal(result.ok, true, JSON.stringify(result.error?.details));
        });
    }
});
