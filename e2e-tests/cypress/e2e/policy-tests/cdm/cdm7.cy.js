import * as Authorization from '../../../support/authorization';
import { prepareTools, importPolicyArchive } from '../../../support/cdmTools';

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
        return Authorization.getAccessToken(SRUsername).then((authorization) => {
            return prepareTools(TOOL_IMPORT_ORDER, authorization).then((local) => {
                const toolRemaps = Object.fromEntries(Object.entries(TOOL_REFS).map(([name, sourceMessageId]) => [sourceMessageId, local[name]]));

                return importPolicyArchive(CDM_ARCHIVE, CDM_ARCHIVE.split('/').pop(), 'ACM0007', authorization, toolRemaps)
                    .then((policy) => {
                        expect(policy.name).to.match(/^ACM0007(_\d+)?$/);
                        expect(policy.tools).to.have.length(4);
                    });
            });
        });
    });
});
