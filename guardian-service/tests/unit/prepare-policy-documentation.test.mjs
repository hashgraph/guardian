import assert from 'node:assert/strict';
import { preparePolicyDocumentation } from '../../dist/policy-engine/helpers/prepare-policy-documentation.js';

const config = { blockType: 'interfaceContainerBlock', tag: 'root', children: [{ blockType: 'requestVcDocumentBlock', tag: 'tagA' }] };
const policy = (o = {}) => ({ id: 'p1', status: 'PUBLISH', locationType: 'local', config, ...o });
const entry = (o = {}) => ({ name: 'n', description: '', target: 'tagA', method: 'POST', alias: 'create', url: '', dmrvUrl: '', ...o });

describe('preparePolicyDocumentation', () => {
    for (const status of ['DRAFT', 'DRY-RUN', 'PUBLISH', 'DISCONTINUED']) {
        it(`accepts a ${status} policy and builds the urls`, () => {
            const [out] = preparePolicyDocumentation(policy({ status }), [entry()]);
            assert.equal(out.dmrvUrl, '/api/v1/dmrv/p1/create');
            assert.equal(out.url, '/api/v1/policies/p1/tag/tagA/blocks');
        });
    }

    for (const status of ['VIEW', 'DEMO', 'PUBLISH_ERROR']) {
        it(`rejects a ${status} policy`, () => {
            assert.throws(() => preparePolicyDocumentation(policy({ status }), [entry()]), /cannot be changed/);
        });
    }

    it('rejects a remote policy', () => {
        assert.throws(() => preparePolicyDocumentation(policy({ locationType: 'remote' }), [entry()]), /cannot be changed/);
    });

    it('rejects a target that does not exist in a published policy', () => {
        assert.throws(() => preparePolicyDocumentation(policy(), [entry({ target: 'gone' })]), /no longer exists/);
    });

    it('allows a target that is not saved yet in a draft policy', () => {
        assert.equal(preparePolicyDocumentation(policy({ status: 'DRAFT' }), [entry({ target: 'gone' })]).length, 1);
    });

    it('rejects duplicate alias and method', () => {
        assert.throws(() => preparePolicyDocumentation(policy({ status: 'DRAFT' }), [entry(), entry()]), /more than once/);
    });

    it('rejects an invalid alias', () => {
        assert.throws(() => preparePolicyDocumentation(policy(), [entry({ alias: 'Bad Alias' })]), /Invalid alias/);
    });

    it('rejects non-array entries', () => {
        assert.throws(() => preparePolicyDocumentation(policy(), {}), /must be an array/);
    });
});
