import { METHOD, STATUS_CODE } from '../../../support/api/api-const';
import API from '../../../support/ApiUrls';
import * as Authorization from '../../../support/authorization';
import { prepareTools, parseImportResponse } from '../../../support/cdmTools';

const CDM_ARCHIVE = '../Methodology Library/Clean Development Mechanism (CDM)/CDM AMS-III.H/AMS-III.H.policy';

// The archive references the library's tools by their testnet messageIds; the
// import metadata remaps each reference to its locally published copy.
const TOOL_REFS = {
    'Tool 03': '1706867833.676387003',
    'Tool 06': '1707068762.886477003',
    'Tool 05': '1707833182.503204122',
    'Tool 07': '1706867530.884259218',
    'Tool 04': '1719308234.078552003',
    'Tool 32': '1707901421.873176003'
};

// Dependencies before dependents (see cdmTools.js).
const TOOL_IMPORT_ORDER = ['Tool 07', 'Tool 03', 'Tool 06', 'Tool 04', 'Tool 32', 'Tool 05'];

context('Policy autotest', { tags: ['policyAT'] }, () => {
    const SRUsername = Cypress.env('SRUser');

    it('Import policy AMS-III.H', () => {
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
                        expect(imported[0].name).to.match(/^AMS-III\.H(_\d+)?$/);
                        expect(imported[0].tools).to.have.length(6);
                    });
            });
        });
    });
});
