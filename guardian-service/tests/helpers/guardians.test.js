require('module-alias/register');
const { Guardians } = require("../../dist/helpers/guardians");
const { assert } = require('chai');
describe('Guardians', function () {
    it('Create', async function () {
        new Guardians().channel = {
            request: (args) => {
                return {
                    payload: {
                        body: args,
                        error: null
                    }
                }
            }
        };
    });

    it('getRootAddressBook', async function () {
        const ab = await new Guardians().getRootAddressBook();
        assert.equal(ab, 'guardian.*')
    });

    it('getAddressBook', async function () {
        const ab = await new Guardians().getAddressBook();
        assert.equal(ab, 'guardian.*')
    });

    it('getDidDocuments', async function () {
        const ab = await new Guardians().getDidDocuments();
        assert.equal(ab, 'guardian.*')
    });

    it('getVcDocuments', async function () {
        const ab = await new Guardians().getVcDocuments();
        assert.equal(ab, 'guardian.*')
    });

    it('getVpDocuments', async function () {
        const ab = await new Guardians().getVpDocuments();
        assert.equal(ab, 'guardian.*')
    });

    it('getTokens', async function () {
        const ab = await new Guardians().getTokens();
        assert.equal(ab, 'guardian.*')
    });

    it('getRootConfig', async function () {
        const ab = await new Guardians().getRootConfig();
        assert.equal(ab, 'guardian.*')
    });

    it('getChain', async function () {
        const ab = await new Guardians().getChain();
        assert.equal(ab, 'guardian.*')
    });

    it('loadDidDocument', async function () {
        const ab = await new Guardians().loadDidDocument();
        assert.equal(ab, 'guardian.*')
    });

    it('setDidDocument', async function () {
        const ab = await new Guardians().setDidDocument();
        assert.equal(ab, 'guardian.*')
    });

    it('setVcDocument', async function () {
        const ab = await new Guardians().setVcDocument();
        assert.equal(ab, 'guardian.*')
    });

    it('setVpDocument', async function () {
        const ab = await new Guardians().setVpDocument();
        assert.equal(ab, 'guardian.*')
    });

    it('setToken', async function () {
        const ab = await new Guardians().setToken();
        assert.equal(ab, 'guardian.*')
    });

    it('importTokens', async function () {
        const ab = await new Guardians().importTokens();
        assert.equal(ab, 'guardian.*')
    });

    it('setRootConfig', async function () {
        const ab = await new Guardians().setRootConfig();
        assert.equal(ab, 'guardian.*')
    });

    it('setApproveDocuments', async function () {
        const ab = await new Guardians().setApproveDocuments();
        assert.equal(ab, 'guardian.*')
    });

    it('getApproveDocuments', async function () {
        const ab = await new Guardians().getApproveDocuments();
        assert.equal(ab, 'guardian.*')
    });

    it('updateApproveDocument', async function () {
        const ab = await new Guardians().updateApproveDocument();
        assert.equal(ab, 'guardian.*')
    });

    it('generateDemoKey', async function () {
        const ab = await new Guardians().generateDemoKey();
        assert.equal(ab, 'guardian.*')
    });

    it('getSchemesByOwner', async function () {
        const ab = await new Guardians().getSchemesByOwner();
        assert.equal(ab, 'guardian.*')
    });

    it('getSchemesByUUID', async function () {
        const ab = await new Guardians().getSchemesByUUID();
        assert.equal(ab, 'guardian.*')
    });

    it('getSchemaByMessage', async function () {
        const ab = await new Guardians().getSchemaByMessage();
        assert.equal(ab, 'guardian.*')
    });

    it('getSchemaByIRI', async function () {
        const ab = await new Guardians().getSchemaByIRI();
        assert.equal(ab, 'guardian.*')
    });

    it('getSchemaByIRIs', async function () {
        const ab = await new Guardians().getSchemaByIRIs();
        assert.equal(ab, 'guardian.*')
    });

    it('getSchemaByEntity', async function () {
        const ab = await new Guardians().getSchemaByEntity();
        assert.equal(ab, 'guardian.*')
    });

    it('getSchemaById', async function () {
        const ab = await new Guardians().getSchemaById();
        assert.equal(ab, 'guardian.*')
    });

    it('loadSchemaDocument', async function () {
        const ab = await new Guardians().loadSchemaDocument();
        assert.equal(ab, 'guardian.*')
    });

    it('loadSchemaContext', async function () {
        const ab = await new Guardians().loadSchemaContext();
        assert.equal(ab, 'guardian.*')
    });

    it('loadSchemaContexts', async function () {
        const ab = await new Guardians().loadSchemaContexts();
        assert.equal(ab, 'guardian.*')
    });

    it('importSchemesByMessages', async function () {
        const ab = await new Guardians().importSchemesByMessages();
        assert.equal(ab, 'guardian.*')
    });

    it('importSchemesByFile', async function () {
        const ab = await new Guardians().importSchemesByFile();
        assert.equal(ab, 'guardian.*')
    });

    it('previewSchemesByMessages', async function () {
        const ab = await new Guardians().previewSchemesByMessages();
        assert.equal(ab, 'guardian.*')
    });

    it('previewSchemesByFile', async function () {
        const ab = await new Guardians().previewSchemesByFile('test');
        assert.equal(ab, 'test')
    });

    it('setSchema', async function () {
        const ab = await new Guardians().setSchema();
        assert.equal(ab, 'guardian.*')
    });

    it('deleteSchema', async function () {
        const ab = await new Guardians().deleteSchema();
        assert.equal(ab, 'guardian.*')
    });

    it('publishSchema', async function () {
        const ab = await new Guardians().publishSchema();
        assert.equal(ab, 'guardian.*')
    });

    it('exportSchemes', async function () {
        const ab = await new Guardians().exportSchemes();
        assert.equal(ab, 'guardian.*')
    });

    it('incrementSchemaVersion', async function () {
        const ab = await new Guardians().incrementSchemaVersion();
        assert.equal(ab, 'guardian.*')
    });
})
