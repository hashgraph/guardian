import assert from 'node:assert/strict';
import { DefaultDocumentLoader } from '../../../../../common/dist/document-loader/base/document-loader-default.js';
import { LocalDidLoader } from '../../../../../common/dist/document-loader/local-did-loader.js';
import { LocalVcSchemaDocumentLoader } from '../../../../../common/dist/document-loader/local-vc-schema-document-loader.js';
import { VCJS } from '../../../../dist/vcjs/vcjs.js';

void DefaultDocumentLoader;
void LocalDidLoader;

const sectionLinks = [{ on: ['sources'], field: ['targets'], kind: 'array',
    valueMappings: [{ source: ['name'], target: ['name'] }] }];
const entry = { $id: '#Entry', type: 'object', properties: { name: { type: 'string' } }, required: [] };
const document = (parentLinks) => ({
    $id: '#Parent', type: 'object', required: [],
    ...(parentLinks ? { $comment: JSON.stringify({ arrayDependencies: parentLinks }) } : {}),
    properties: {
        regions: { type: 'array', items: { $ref: '#Entry' } },
        section: { $ref: '#Section' }
    },
    $defs: {
        '#Section': { $id: '#Section', type: 'object', required: [], properties: {
            sources: { type: 'array', items: { $ref: '#Entry' } },
            targets: { type: 'array', items: { $ref: '#Entry' } }
        }, $comment: JSON.stringify({ arrayDependencies: sectionLinks }) },
        '#Entry': entry
    }
});
const names = (...values) => values.map(name => ({ name }));

for (const mode of ['subject', 'vc']) {
    describe(`VCJS checks links declared in a sub-schema (${mode})`, () => {
        async function verify(subject, parentLinks) {
            const schema = document(parentLinks);
            const before = JSON.stringify(schema);
            const vcjs = new VCJS();
            vcjs.schemaLoader = async () => mode === 'vc'
                ? LocalVcSchemaDocumentLoader.prototype['vcSchema'](schema)
                : schema;
            const result = mode === 'vc'
                ? await vcjs.verifySchema({ '@context': ['https://www.w3.org/2018/credentials/v1'], credentialSubject: subject })
                : await vcjs.verifySubject(subject);
            assert.equal(JSON.stringify(schema), before);
            return result;
        }
        const errorsOf = (result, keyword) => (result.error?.details || [])
            .filter(error => error.keyword === keyword)
            .map(error => error.instancePath);

        it('rejects a different number of entries with the path inside the sub-schema', async () => {
            const result = await verify({ section: { sources: names('A', 'B'), targets: names('A') } });
            assert.equal(result.ok, false);
            assert.deepEqual(errorsOf(result, 'arrayGroupLength'), ['/section/targets']);
        });

        it('rejects a copied value that differs from its source', async () => {
            const result = await verify({ section: { sources: names('A'), targets: names('B') } });
            assert.equal(result.ok, false);
            assert.deepEqual(errorsOf(result, 'arrayGroupMapping'), ['/section/targets/0/name']);
        });

        it('accepts a document the form would produce', async () => {
            const result = await verify({ section: { sources: names('A', 'B'), targets: names('A', 'B') } });
            assert.equal(result.ok, true);
        });

        it('checks the parent link and the automatic link instead of the sub-schema link they replace', async () => {
            const parentLinks = [{ on: ['regions'], field: ['section', 'targets'], kind: 'array' }];
            const wrongCount = await verify({ regions: names('R'), section: { sources: [], targets: names('T') } }, parentLinks);
            assert.equal(wrongCount.ok, false);
            assert.deepEqual(errorsOf(wrongCount, 'arrayGroupLength'), ['/section/sources']);
            const valid = await verify({ regions: names('R'), section: { sources: names('S'), targets: names('T') } }, parentLinks);
            assert.equal(valid.ok, true);
        });
    });
}
