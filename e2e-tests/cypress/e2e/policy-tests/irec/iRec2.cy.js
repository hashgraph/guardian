import * as Authorization from '../../../support/authorization';
import { importPolicyFile } from '../../../support/cdmTools';
import { deleteDryRunPolicy, runPolicyTest, uploadPolicyTest } from '../../../support/CustomHelpers/policyTests';

const POLICY_ARCHIVE = '../Methodology Library/International Renewable Energy Certificate (iREC)/Policies/iRec Policy 2 (1707125414.999819805).policy';
// Registrant, device and issue request created and approved, then the mint. Recorded on testnet on
// `iRecDRF.policy`, which has the same blocks and schemas as iRec Policy 2.
const RECORD_FIXTURE = 'iRecFullFlow.record';

context('Policy autotest', { tags: ['policyAT', 'policy-all', 'all', 'all-no-mgs'] }, () => {
    const SRUsername = Cypress.env('SRUser');
    let policyId;

    after(() => {
        if (policyId) {
            Authorization.getAccessToken(SRUsername).then((authorization) => deleteDryRunPolicy(authorization, policyId));
        }
    });

    it('Import policy iRec_2', () => {
        return Authorization.getAccessToken(SRUsername)
            .then((authorization) => importPolicyFile(POLICY_ARCHIVE, POLICY_ARCHIVE.split('/').pop(), 'iRec_2', authorization))
            .then((policy) => {
                policyId = policy.id;
            });
    });

    it('Replay the recorded flow and get the same documents', () => {
        return Authorization.getAccessToken(SRUsername).then((authorization) =>
            uploadPolicyTest(authorization, policyId, RECORD_FIXTURE)
                .then((testId) => runPolicyTest(authorization, policyId, testId))
                .then(({ test, details }) => {
                    expect(test.error, 'replay error').to.eq(null);
                    // A record with no actions also scores 100, so check that the replay produced documents.
                    expect(details.left.documents, 'recorded documents').to.be.greaterThan(0);
                    expect(details.right, 'replayed documents and tokens').to.deep.eq(details.left);
                    expect(test.result.total, 'match between recorded and replayed documents').to.eq(100);
                    expect(test.status).to.eq('Success');
                })
        );
    });
});
