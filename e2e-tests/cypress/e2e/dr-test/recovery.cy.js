import { randomInt } from '../../support/random';
import { getAccessToken } from '../../support/authorization';
import { HomePage } from '../ui-tests/pages/homePage';
import { ConfigPage } from '../ui-tests/pages/configPage';
import { TIMEOUTS } from '../../support/CustomHelpers/timeouts';

const homepage = new HomePage();
const configpage = new ConfigPage();

const readDid = (username) => getAccessToken(username)
    .then((token) => cy.getUserProfile(token, username))
    .then((profile) => profile.did);

describe('Disaster Recovery Testing', { tags: ['@recovery', 'dr-all', 'all'] }, () => {
    // A 1e9 space keeps re-runs from colliding with accounts left by earlier runs.
    const originalName = 'TestDRSR' + randomInt(1000000000);
    const recoveredName = 'TestDRRestored' + randomInt(1000000000);

    it('restores a registry from Hedera into a new account', () => {
        cy.viewport(1920, 1080);
        homepage.visit();
        homepage.createAccount('SR', originalName);
        configpage.verifyUserCreated(originalName);

        configpage.hederaSRRegistration('random', undefined, originalName).then((credentials) => {
            homepage.logOut();
            readDid(originalName).then((did) => {
                // A restore refuses a DID the instance already holds, so drop the registry
                // from the database to start from the state of a new, empty instance.
                cy.task('forgetRegistry', did).should('be.greaterThan', 0);

                homepage.createAccount('SR', recoveredName);
                configpage.verifyUserCreated(recoveredName);
                configpage.restoreProfileFromHedera(credentials);
                cy.location('pathname', { timeout: TIMEOUTS.backend }).should('include', '/task');
                cy.location('pathname', { timeout: TIMEOUTS.longOperation }).should('not.include', '/task');
                cy.contains(did, { timeout: TIMEOUTS.ui });
                readDid(recoveredName).should('eq', did);
            });
        });
    });
});
