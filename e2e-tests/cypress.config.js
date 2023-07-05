const { defineConfig } = require('cypress')
const { verifyDownloadTasks } = require('cy-verify-downloads');


module.exports = defineConfig({

  video: false,
  watchForFileChanges: false,
  defaultCommandTimeout: 10000,
  e2e: {
    env: {
      "downloadFolder": "../e2e-tests/cypress/downloads/"
    },
    // We've imported your old cypress plugins here.
    // You may want to clean this up later by importing these.
   setupNodeEvents(on, config) {
     require('cypress-grep/src/plugin')(config);
     return config;
   },
   setupNodeEvents(on, config) {
    on('task', {
      checkFile(partialName) {
        const fs = require('fs');
        const path = require('path');

        const files = fs.readdirSync(config.env.downloadFolder);
        const matchingFiles = files.filter(file => file.includes(partialName));
        return matchingFiles.length > 0;
      },
    })
   },
  },
})

module.exports = defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      on('task', verifyDownloadTasks);
    },
  },
});





