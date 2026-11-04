import * as Authorization from '../../../support/authorization';
import { importPolicyFile } from '../../../support/cdmTools';

const CDM_ARCHIVE = '../Methodology Library/Clean Development Mechanism (CDM)/CDM AR-ACM0003/CDM AR-ACM0003.policy';

// The CDM AR-ACM0003 archive references no tools, so it imports cleanly
// through the plain import route without any metadata remapping.
context('Policy autotest', { tags: ['policyAT'] }, () => {
    const SRUsername = Cypress.env('SRUser');

    it('Import policy CDM AR-ACM0003 Policy', () => {
        return Authorization.getAccessToken(SRUsername).then((authorization) => {
            return importPolicyFile(CDM_ARCHIVE, CDM_ARCHIVE.split('/').pop(), 'CDM AR-ACM0003 Policy', authorization).then((policy) => {
                expect(policy.name).to.match(/^CDM AR-ACM0003 Policy(_\d+)?$/);
                expect(policy.tools ?? []).to.have.length(0);
            });
        });
    });
});
