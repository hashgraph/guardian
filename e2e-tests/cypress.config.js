const { defineConfig } = require('cypress');
const { verifyDownloadTasks } = require('cy-verify-downloads');

const MIN_SR_USER_HBAR_BALANCE = 10;

// Logs in as the configured SRUser and warns if their HBAR balance is low.
// Runs once per full test run (not per spec) since it is wired to the
// `before:run` node event rather than a cypress/support hook.
async function checkSrUserHbarBalance(config) {
    const apiServer = config.env.apiServer
        ? (config.env.apiServer.endsWith('/') ? config.env.apiServer : `${config.env.apiServer}/`)
        : `http://localhost:${config.env.portApi}/`;
    const username = config.env.SRUser;
    const password = config.env.Password;

    try {
        const loginResponse = await fetch(`${apiServer}accounts/login/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        if (!loginResponse.ok) {
            throw new Error(`login failed with status ${loginResponse.status}`);
        }
        const { refreshToken } = await loginResponse.json();

        const tokenResponse = await fetch(`${apiServer}accounts/access-token/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
        });
        if (!tokenResponse.ok) {
            throw new Error(`access-token request failed with status ${tokenResponse.status}`);
        }
        const { accessToken } = await tokenResponse.json();

        const balanceResponse = await fetch(`${apiServer}accounts/balance`, {
            headers: { authorization: `Bearer ${accessToken}` },
        });
        if (!balanceResponse.ok) {
            throw new Error(`balance request failed with status ${balanceResponse.status}`);
        }
        const { balance } = await balanceResponse.json();
        const hbarBalance = parseFloat(balance);

        if (Number.isNaN(hbarBalance)) {
            console.warn(`[HBAR balance check] Could not parse balance value returned for ${username}: "${balance}"`);
            return;
        }

        console.log(`[HBAR balance check] ${username} balance: ${hbarBalance} Hbar`);
        if (hbarBalance < MIN_SR_USER_HBAR_BALANCE) {
            console.warn(
                `\n[HBAR balance check] WARNING: ${username}'s HBAR balance (${hbarBalance}) is below the ` +
                `recommended minimum of ${MIN_SR_USER_HBAR_BALANCE} Hbar. Tests that deploy contracts or ` +
                `perform other HBAR-costly operations may fail with INSUFFICIENT_PAYER_BALANCE.\n`
            );
        }
    } catch (error) {
        console.warn(`[HBAR balance check] Skipped: could not verify ${username}'s HBAR balance (${error.message})`);
    }
}

module.exports = defineConfig({
    video: false,
    watchForFileChanges: false,
    defaultCommandTimeout: 10000,
    e2e: {
        experimentalRunAllSpecs: true,
        specPattern: [
            'cypress/e2e/api-tests/000_accounts_creating/*.cy.js',
            'cypress/e2e/api-tests/000_accounts_tests/*.cy.js',
            'cypress/e2e/api-tests/001_demo/*.cy.js',
            'cypress/e2e/api-tests/002_external/*.cy.js',
            'cypress/e2e/api-tests/003_ipfs/*.cy.js',
            'cypress/e2e/api-tests/004_logs/*.cy.js',
            'cypress/e2e/api-tests/005_profiles/*.cy.js',
            'cypress/e2e/api-tests/006_settings/*.cy.js',
            'cypress/e2e/api-tests/007_modules/*.cy.js',
            'cypress/e2e/api-tests/008_artifacts/*.cy.js',
            'cypress/e2e/api-tests/009_policies/*.cy.js',
            'cypress/e2e/api-tests/010_tokens/*.cy.js',
            'cypress/e2e/api-tests/011_schemas/*.cy.js',
            'cypress/e2e/api-tests/012_analytics/*.cy.js',
            'cypress/e2e/api-tests/013_contracts/*.cy.js',
            'cypress/e2e/api-tests/014_tags/*.cy.js',
            'cypress/e2e/api-tests/015_trustchains/*.cy.js',
            'cypress/e2e/api-tests/016_policies_tests_and_flows/*.cy.js',
            'cypress/e2e/api-tests/017_indexer/*.cy.js',
            'cypress/e2e/api-tests/018_worker_tasks/*.cy.js',
            'cypress/e2e/api-tests/019_themes/*.cy.js',
            'cypress/e2e/api-tests/020_branding/*.cy.js',
            'cypress/e2e/api-tests/021_notifications/*.cy.js',
            'cypress/e2e/api-tests/022_wizard/*.cy.js',
            'cypress/e2e/api-tests/023_permissions/*.cy.js',
            'cypress/e2e/api-tests/024_formulas/*.cy.js',
            'cypress/e2e/api-tests/025_policy_labels/*.cy.js',
            'cypress/e2e/api-tests/026_remote_policy/*.cy.js',
            'cypress/e2e/ui-tests/specs/00_account_creating/*.cy.js',
            'cypress/e2e/ui-tests/specs/00_account_registration/*.cy.js',
            'cypress/e2e/ui-tests/specs/01_administration/*.cy.js',
            'cypress/e2e/ui-tests/specs/02_policies/*.cy.js',
            'cypress/e2e/ui-tests/specs/03_artifacts/*.cy.js',
            'cypress/e2e/ui-tests/specs/04_contracts/*.cy.js',
            'cypress/e2e/ui-tests/specs/05_modules/*.cy.js',
            'cypress/e2e/ui-tests/specs/06_policy_schemas/*.cy.js',
            'cypress/e2e/ui-tests/specs/07_system_schemas/*.cy.js',
            'cypress/e2e/ui-tests/specs/08_tag_schemas/*.cy.js',
            'cypress/e2e/ui-tests/specs/09_tokens/*.cy.js',
            'cypress/e2e/ui-tests/specs/10_schema_validation/*.cy.js',
            '**/*.cy.js',
        ],
        reporter: 'cypress-multi-reporters',
        reporterOptions: {
            configFile: 'reporter-config.js',
        },
        setupNodeEvents(on, config) {
            // Normalize `grepTags` / `grepFilterSpecs` from CLI / Docker env.
            if (typeof config.env.grepTags === 'string') {
                config.env.grepTags = config.env.grepTags
                    .replace(/,/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();
            }
            if (typeof config.env.grepFilterSpecs === 'string') {
                config.env.grepFilterSpecs = config.env.grepFilterSpecs.toLowerCase() === 'true';
            }

            // @cypress/grep v6 reads its options from `config.expose`, not `config.env`.
            // CI/Docker still pass them via CYPRESS_grepTags/--env, so forward them here.
            config.expose = {
                ...config.expose,
                grep: config.env.grep,
                grepTags: config.env.grepTags,
                grepFilterSpecs: config.env.grepFilterSpecs,
                grepOmitFiltered: config.env.grepOmitFiltered,
            };

            require('@cypress/grep/plugin').plugin(config);
            const { beforeRunHook } = require('cypress-mochawesome-reporter/lib');
            require('cypress-mochawesome-reporter/plugin')(on);
            on('before:run', async (details) => {
                await beforeRunHook(details);
                await checkSrUserHbarBalance(config);
            });
            on('task', verifyDownloadTasks);
            on('task', {
                checkFile(partialName) {
                    const fs = require('fs');
                    const files = fs.readdirSync(config.env.downloadFolder);
                    const matchingFiles = files.filter(file => file.includes(partialName));
                    return matchingFiles.length > 0;
                },
            });
            on('task', {
                log(message) {
                    console.log(message)
                    return null
                }
            })
            on('task', {
                fireAndForget({ url, method, data, headers }) {
                    fetch(url, {
                        method,
                        body: JSON.stringify(data),
                        headers,
                    });
                    return null;
                },
            });
            on('task', {
                // Uploads a fixture to the local Kubo node through its RPC API.
                // `add` is content-addressed and idempotent: re-adding the same bytes always
                // yields the same CID and is a no-op when the node already holds the blocks.
                async ipfsAddFixture(fixtureName) {
                    const fs = require('fs');
                    const path = require('path');
                    const file = path.join(config.fixturesFolder, fixtureName);
                    // Cypress runs either on the host or inside the runner container, so fall
                    // back to the docker host alias when `localhost` is not the IPFS node.
                    const nodes = config.env.ipfsApi
                        ? [config.env.ipfsApi]
                        : ['http://localhost:5001', 'http://host.docker.internal:5001'];
                    const form = new FormData();
                    form.append('file', new Blob([fs.readFileSync(file)]), fixtureName);
                    const errors = [];
                    for (const node of nodes) {
                        let response;
                        try {
                            // cid-version 0 keeps the default UnixFS layout that produces `Qm...` CIDs
                            response = await fetch(`${node}/api/v0/add?cid-version=0&pin=true`, { method: 'POST', body: form });
                        } catch (error) {
                            errors.push(`${node}: ${error.message}`);
                            continue;
                        }
                        const body = await response.text();
                        if (!response.ok) {
                            throw new Error(`IPFS add failed on ${node}: ${response.status} ${body}`);
                        }
                        // `add` answers with one JSON object per added entry, the file itself being the last one
                        return JSON.parse(body.trim().split('\n').pop()).Hash;
                    }
                    throw new Error(`No reachable IPFS node. Tried:\n${errors.join('\n')}`);
                },
            });
            return config;
        },
        env: {
            downloadFolder: 'cypress/downloads/'
        }
    }
});
