import * as Authorization from '../../../support/authorization';
import { prepareTools, importPolicyArchive } from '../../../support/cdmTools';

const CDM_ARCHIVE = '../Methodology Library/Clean Development Mechanism (CDM)/CDM ACM0002/ACM0002.policy';

// The archive references the library's tools by their testnet messageIds; the
// import metadata remaps each reference to its locally published copy.
const TOOL_REFS = {
    'Tool 03': '1706867833.676387003',
    'Tool 05': '1707833182.503204122',
    'Tool 07': '1706867530.884259218',
    'Tool 01': '1707834520.925981198',
    'Tool 32': '1707901421.873176003'
};

// Dependencies before dependents (see cdmTools.js).
const TOOL_IMPORT_ORDER = ['Tool 07', 'Tool 03', 'Tool 01', 'Tool 32', 'Tool 05'];

context('Policy autotest', { tags: ['policyAT'] }, () => {
    const SRUsername = Cypress.env('SRUser');

    it('Import policy ACM0002', () => {
        return Authorization.getAccessToken(SRUsername).then((authorization) => {
            return prepareTools(TOOL_IMPORT_ORDER, authorization).then((local) => {
                const toolRemaps = Object.fromEntries(Object.entries(TOOL_REFS).map(([name, sourceMessageId]) => [sourceMessageId, local[name]]));

                return importPolicyArchive(CDM_ARCHIVE, CDM_ARCHIVE.split('/').pop(), 'ACM0002', authorization, toolRemaps)
                    .then((policy) => {
                        expect(policy.name).to.match(/^ACM0002(_\d+)?$/);
                        expect(policy.tools).to.have.length(5);
                    });
            });
        });
    });
});
