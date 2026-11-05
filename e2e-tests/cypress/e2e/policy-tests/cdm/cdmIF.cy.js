import * as Authorization from '../../../support/authorization';
import { prepareTools, importPolicyArchive } from '../../../support/cdmTools';

const CDM_ARCHIVE = '../Methodology Library/Clean Development Mechanism (CDM)/CDM AMS-I.F/CDM AMS-I.F Policy.policy';

// The archive references the library's tools by their testnet messageIds; the
// import metadata remaps each reference to its locally published copy.
const TOOL_REFS = {
    'Tool 16': '1720000738.873798003',
    'Tool 01': '1707834520.925981198',
    'Tool 12': '1709106946.913157840',
    'Tool 03': '1706867833.676387003',
    'Tool 14': '1719310223.735760003',
    'Tool 06': '1707068762.886477003',
    'Tool 13': '1719308448.665936003',
    'Tool 05': '1707833182.503204122',
    'Tool 07': '1706867530.884259218',
    'Tool 04': '1719308234.078552003'
};

// Dependencies before dependents (see cdmTools.js).
const TOOL_IMPORT_ORDER = ['Tool 07', 'Tool 03', 'Tool 06', 'Tool 04', 'Tool 01', 'Tool 05', 'Tool 12', 'Tool 13', 'Tool 14', 'Tool 16'];

context('Policy autotest', { tags: ['policyAT'] }, () => {
    const SRUsername = Cypress.env('SRUser');

    it('Import policy CDM AMS-I.F Policy', () => {
        return Authorization.getAccessToken(SRUsername).then((authorization) => {
            return prepareTools(TOOL_IMPORT_ORDER, authorization).then((local) => {
                const toolRemaps = Object.fromEntries(Object.entries(TOOL_REFS).map(([name, sourceMessageId]) => [sourceMessageId, local[name]]));

                return importPolicyArchive(CDM_ARCHIVE, CDM_ARCHIVE.split('/').pop(), 'CDM AMS-I.F Policy', authorization, toolRemaps)
                    .then((policy) => {
                        expect(policy.name).to.match(/^CDM AMS-I\.F Policy(_\d+)?$/);
                        expect(policy.tools).to.have.length(11);
                    });
            });
        });
    });
});
