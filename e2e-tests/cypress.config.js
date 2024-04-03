const { defineConfig } = require('cypress');
const { verifyDownloadTasks } = require('cy-verify-downloads');

module.exports = defineConfig({
    video: false,
    watchForFileChanges: false,
    defaultCommandTimeout: 10000,
    e2e: {
        experimentalRunAllSpecs: true,
        reporter: 'cypress-multi-reporters',
        reporterOptions: {
            configFile: 'reporter-config.js',
        },
        setupNodeEvents(on, config) {
            require('cypress-grep/src/plugin')(config);
            require('cypress-mochawesome-reporter/plugin')(on);
            on('task', verifyDownloadTasks);
            on('task', {
                checkFile(partialName) {
                    const fs = require('fs');
                    const path = require('path');
                    const files = fs.readdirSync(config.env.downloadFolder);
                    const matchingFiles = files.filter(file => file.includes(partialName));
                    return matchingFiles.length > 0;
                },
            });
            on('task', {
                log (message) {
                  console.log(message)
                  return null
                }
              })
            return config;
        },
        env: {
            downloadFolder: '../e2e-tests/cypress/downloads/'
        }
    }
});
