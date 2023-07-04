const { defineConfig } = require('cypress')
const { verifyDownloadTasks } = require('cy-verify-downloads');

module.exports = defineConfig({
  video: false,
  watchForFileChanges: false,
  defaultCommandTimeout: 10000,
  e2e: {
    setupNodeEvents(on, config) {
      require('cypress-grep/src/plugin')(config);
      on('task', verifyDownloadTasks);
      return config;
    },
    experimentalRunAllSpecs: true,
    reporter: 'cypress-mochawesome-reporter',
    setupNodeEvents(on, config) {
      require('cypress-mochawesome-reporter/plugin')(on);
      return config;
    },
  },
});
