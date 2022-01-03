const {
    DefaultDocumentLoader,
} = require('../../../dist/index');
const { expect, assert } = require('chai');

describe('VCHelper', function () {
    it('Test DefaultDocumentLoader', async function () {
        const loader = new DefaultDocumentLoader();
        assert.equal(await loader.has('https://www.w3.org/ns/did/v1'), true);
        assert.equal(await loader.has('https://ns.did.ai/transmute/v1'), true);
        assert.equal(await loader.has('https://localhost/schema'), false);

        assert.exists(await loader.get('https://www.w3.org/ns/did/v1'));
        assert.exists(await loader.get('https://ns.did.ai/transmute/v1'));

        let doc = true;
        try {
            await loader.get('https://localhost/schema');
        } catch (error) {
            doc = false;
        }
        assert.equal(doc, false);
    });
});