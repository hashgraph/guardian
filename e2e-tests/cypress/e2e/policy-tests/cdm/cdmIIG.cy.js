import * as Authorization from '../../../support/authorization';
import { prepareTools, importPolicyArchive } from '../../../support/cdmTools';

const CDM_ARCHIVE = '../Methodology Library/Clean Development Mechanism (CDM)/CDM AMS-II.G/CDM AMS-II.G Policy.policy';

// The archive references the library's tools by their testnet messageIds; the
// import metadata remaps each reference to its locally published copy.
const TOOL_REFS = {
    'Tool 33': '1726593517.484578000',
    'Tool 19': '1706869798.177938003',
    'Tool 21': '1706873385.455822873',
    'Tool 30': '1707417996.173398196'
};

// Dependencies before dependents (see cdmTools.js).
const TOOL_IMPORT_ORDER = ['Tool 33', 'Tool 19', 'Tool 21', 'Tool 30'];

context('Policy autotest', { tags: ['policyAT', 'policy-all', 'all', 'all-no-mgs'] }, () => {
    const SRUsername = Cypress.env('SRUser');

    it('Import policy CDM AMS-II.G Policy', () => {
        return Authorization.getAccessToken(SRUsername).then((authorization) => {
            return prepareTools(TOOL_IMPORT_ORDER, authorization).then((local) => {
                const toolRemaps = Object.fromEntries(Object.entries(TOOL_REFS).map(([name, sourceMessageId]) => [sourceMessageId, local[name]]));

                return importPolicyArchive(CDM_ARCHIVE, CDM_ARCHIVE.split('/').pop(), 'CDM AMS-II.G Policy', authorization, toolRemaps)
                    .then((policy) => {
                        expect(policy.name).to.match(/^CDM AMS-II\.G Policy(_\d+)?$/);
                        expect(policy.tools).to.have.length(4);
                    });
            });
        });
    });
});
