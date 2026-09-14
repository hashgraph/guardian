import * as IpfsSeeding from '../../../support/CustomHelpers/ipfsSeeding';

/**
 * cypress.env.json pins the Hedera messages the suite imports artefacts from, and every one of them
 * was published on testnet. A run against any other network -- the local Hiero network the E2E
 * workflow provisions with Solo, for instance -- starts from an empty ledger, so those messages do
 * not resolve and every consuming spec fails on the import.
 *
 * This spec publishes the same artefacts on whatever network the run is against, once per run, and
 * records their message IDs for `IpfsSeeding.seededMessageId` to hand back. On testnet it is skipped
 * entirely: the pinned messages are already there, and re-publishing would cost HBAR and ~10 minutes.
 *
 * Where a consumer is written against a *specific* artefact rather than any valid one of its kind,
 * the fixture is that artefact and the reason is spelled out below. Changing one of those pairings
 * breaks the consumer in a way that looks like an unrelated assertion failure.
 */
const SEEDED_ARTEFACTS = [
    // preview + dry-run only, so any publishable policy will do
    { envKey: 'irec_policy', fixture: 'iRec_3_BtnFix.policy', publish: IpfsSeeding.publishPolicyFixture },
    // 002_external posts external data into it, which needs its external data block
    { envKey: 'policy_with_artifacts', fixture: 'remoteWorkGHGPolicy.policy', publish: IpfsSeeding.publishPolicyFixture },
    // `getOrCreateIRec4Policy` (cypress/support/commands.js) looks the imported copy up by the name `iRec_4`
    { envKey: 'policy_for_compare1', fixture: 'iRec_4.policy', publish: IpfsSeeding.publishPolicyFixture },
    // 016_policies_tests_and_flows/dryRunPolicyFlowAndRecord drives the iRec 5 block tags
    { envKey: 'policy_for_compare2', fixture: 'iRec5.policy', publish: IpfsSeeding.publishPolicyFixture },
    // 007_modules/11_importModuleIPFS asserts the imported module is named `ComparedModuleIPFS`
    { envKey: 'module_for_import', fixture: 'comparedModuleIPFS.module', publish: IpfsSeeding.publishModuleFixture },
    // 012_analytics/compareTools only needs two distinct tools
    { envKey: 'tool_for_compare1', fixture: 'AR-Tool-05-v3.0.2.tool', publish: IpfsSeeding.publishToolFixture },
    { envKey: 'tool_for_compare2', fixture: 'AR-Tool-14-v5.0.7.tool', publish: IpfsSeeding.publishToolFixture },
];

context('Seed the Hedera artefacts the suite imports from', { tags: ['preparing', 'smoke', 'all', 'all-no-mgs', 'ui'] }, () => {

    const SRUsername = Cypress.env('SRUser');

    const seededMessageIds = {};

    before(function () {
        if (!IpfsSeeding.usesSeededMessages()) {
            this.skip();
        }
    });

    // One `it` per artefact rather than a single loop, so a publishing failure names the artefact
    // that failed and the rest still get seeded.
    SEEDED_ARTEFACTS.forEach(({ envKey, fixture, publish }) => {
        it(`Publish ${fixture} as "${envKey}"`, () => {
            publish(SRUsername, fixture).then((messageId) => {
                seededMessageIds[envKey] = messageId;
            });
        });
    });

    it('Record the seeded message IDs for the specs that import them', () => {
        const expectedKeys = SEEDED_ARTEFACTS.map(({ envKey }) => envKey).sort();
        expect(Object.keys(seededMessageIds).sort(), 'seeded artefacts').to.deep.eq(expectedKeys);
        IpfsSeeding.writeSeededMessageIds(seededMessageIds);
    });
});
