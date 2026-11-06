import { randomInt } from '../../support/random';
import { HomePage } from '../ui-tests/pages/homePage';
import { ConfigPage } from '../ui-tests/pages/configPage';
import { TIMEOUTS } from '../../support/CustomHelpers/timeouts';

const homepage = new HomePage();
const configpage = new ConfigPage();

describe('Disaster Recovery Testing', { tags: ['@recovery', 'dr-all', 'all'] }, () => {
    // A 1e9 space keeps re-runs from colliding with accounts left by earlier runs.
    const originalName = 'TestDRSR' + randomInt(1000000000);
    const recoveredName = 'TestDRRestored' + randomInt(1000000000);

    // A full restore needs an instance that does not hold the DID yet (the disaster-recovery
    // case); on the instance that created the registry the restore refuses to overwrite it.
    // See pending-issues/dr-restore-needs-a-clean-instance.md.
    it('finds the registry on Hedera and refuses to restore a DID the instance already holds', () => {
        cy.viewport(1920, 1080);
        homepage.visit();
        homepage.createAccount('SR', originalName);
        configpage.verifyUserCreated(originalName);

        configpage.hederaSRRegistration('random', undefined, originalName).then((credentials) => {
            homepage.logOut();
            homepage.createAccount('SR', recoveredName);
            configpage.verifyUserCreated(recoveredName);
            configpage.restoreProfileFromHedera(credentials);
            cy.contains('The DID document already exists.', { timeout: TIMEOUTS.longOperation });
        });
    });
});
