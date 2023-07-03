const { defineConfig } = require('cypress');
const { verifyDownloadTasks } = require('cy-verify-downloads');

module.exports = defineConfig({
 

  defaultCommandTimeout: 10000,

  e2e: {
    setupNodeEvents(on, config) {
      require('cypress-grep/src/plugin')(config);
      on('task', verifyDownloadTasks);
      return config;
    },
    experimentalRunAllSpecs: true, // Enable experimentalRunAllSpecs
    video: true,
    watchForFileChanges:false
  },
});
