import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';
import { prepareTools, parseImportResponse } from '../../../support/cdmTools';

const CDM_ARCHIVE = '../Methodology Library/Clean Development Mechanism (CDM)/CDM ACM0007/ACM0007.policy';

// The archive references the library's tools by their testnet messageIds; the
// import metadata remaps each reference to its locally published copy.
const TOOL_REFS = {
    'Tool 03': '1706867833.676387003',
    'Tool 07': '1706867530.884259218',
    'Tool 02': '1706866036.377014003',
    'Tool 10': '1706867224.098467003'
};

// Dependencies before dependents (see cdmTools.js).
const TOOL_IMPORT_ORDER = ['Tool 03', 'Tool 07', 'Tool 02', 'Tool 10'];

context('Policy autotest', { tags: ['policyAT'] }, () => {
    const SRUsername = Cypress.env('SRUser');

    it('Import policy ACM0007', () => {
        Authorization.getAccessToken(SRUsername).then((authorization) => {
            return prepareTools(TOOL_IMPORT_ORDER, authorization).then((local) => {
                const metadata = { tools: Object.fromEntries(Object.entries(TOOL_REFS).map(([name, sourceMessageId]) => [sourceMessageId, local[name]])) };

                return cy.readFile(CDM_ARCHIVE, 'binary')
                    .then((binary) => Cypress.Blob.binaryStringToBlob(binary))
                    .then((file) => {
                        const form = new FormData();
                        form.append('policyFile', file, CDM_ARCHIVE.split('/').pop());
                        form.append('metadata', JSON.stringify(metadata), 'metadata.json');
                        return cy.request({
                            method: METHOD.POST,
                            url: API.ApiServer + API.PolicisImportFileMetadata,
                            body: form,
                            headers: { authorization },
                            timeout: 180000,
                        });
                    })
                    .then((response) => {
                        const imported = parseImportResponse(response.body);

                        expect(response.status).to.eq(STATUS_CODE.SUCCESS);
                        expect(imported).to.be.an('array');
                        expect(imported[0].name).to.match(/^ACM0007(_\d+)?$/);
                        expect(imported[0].tools).to.have.length(4);
                    });
            });
        });
    });
});
