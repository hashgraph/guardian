const { defineConfig } = require('cypress');
const { verifyDownloadTasks } = require('cy-verify-downloads');
const fetch = require('node-fetch');

module.exports = defineConfig({
    video: false,
    watchForFileChanges: false,
    defaultCommandTimeout: 10000,
    e2e: {
        experimentalRunAllSpecs: true,
        //described to fix spec order via CI
        specPattern: [
            "cypress/e2e/api-tests/000_accounts_creating/*.cy.js",
            "cypress/e2e/api-tests/000_accounts_tests/*.cy.js",
            "cypress/e2e/api-tests/001_demo/*.cy.js",
            "cypress/e2e/api-tests/002_external/*.cy.js",
            "cypress/e2e/api-tests/003_ipfs/*.cy.js",
            "cypress/e2e/api-tests/004_logs/*.cy.js",
            "cypress/e2e/api-tests/005_profiles/*.cy.js",
            "cypress/e2e/api-tests/006_settings/*.cy.js",
            "cypress/e2e/api-tests/007_modules/*.cy.js",
            "cypress/e2e/api-tests/008_artifacts/*.cy.js",
            "cypress/e2e/api-tests/009_policies/*.cy.js",
            "cypress/e2e/api-tests/010_tokens/*.cy.js",
            "cypress/e2e/api-tests/011_schemas/*.cy.js",
            "cypress/e2e/api-tests/012_analytics/*.cy.js",
            "cypress/e2e/api-tests/013_contracts/*.cy.js",
            "cypress/e2e/api-tests/014_tags/*.cy.js",
            "cypress/e2e/api-tests/015_trustchains/*.cy.js",
            "cypress/e2e/api-tests/016_policies_tests_and_flows/*.cy.js",
            "cypress/e2e/api-tests/017_indexer/*.cy.js",
            "cypress/e2e/api-tests/018_worker_tasks/*.cy.js",
            "cypress/e2e/api-tests/019_themes/*.cy.js",
            "cypress/e2e/api-tests/020_branding/*.cy.js",
            "cypress/e2e/api-tests/021_notifications/*.cy.js",
            "cypress/e2e/api-tests/022_wizard/*.cy.js",
            "cypress/e2e/api-tests/023_permissions/*.cy.js",
            "cypress/e2e/api-tests/024_formulas/*.cy.js",
            "cypress/e2e/api-tests/025_policy_labels/*.cy.js",
            "cypress/e2e/api-tests/026_remote_policy/*.cy.js",
            "cypress/e2e/ui-tests/specs/00_account_creating/*.cy.js",
            "cypress/e2e/ui-tests/specs/00_account_registration/*.cy.js",
            "cypress/e2e/ui-tests/specs/01_administration/*.cy.js",
            "cypress/e2e/ui-tests/specs/02_policies/*.cy.js",
            "cypress/e2e/ui-tests/specs/03_artifacts/*.cy.js",
            "cypress/e2e/ui-tests/specs/04_contracts/*.cy.js",
            "cypress/e2e/ui-tests/specs/05_modules/*.cy.js",
            "cypress/e2e/ui-tests/specs/06_policy_schemas/*.cy.js",
            "cypress/e2e/ui-tests/specs/07_system_schemas/*.cy.js",
            "cypress/e2e/ui-tests/specs/08_tag_schemas/*.cy.js",
            "cypress/e2e/ui-tests/specs/09_tokens/*.cy.js",
            "cypress/e2e/ui-tests/specs/10_schema_validation/*.cy.js",
            "**/*.cy.js",
        ],
        reporter: 'cypress-multi-reporters',
        reporterOptions: {
            configFile: 'reporter-config.js',
        },
        setupNodeEvents(on, config) {
            require('@cypress/grep/src/plugin')(config);
            require('cypress-mochawesome-reporter/plugin')(on);
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
                        headers: headers,
                    });
                    return null;
                },
            });
            return config;
        },
        env: {
            downloadFolder: 'cypress/downloads/'
        }
    }
});
