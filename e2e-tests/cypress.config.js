const { defineConfig } = require('cypress')


module.exports = defineConfig({
  video: false,
  watchForFileChanges: false,
  e2e: {
    
    // We've imported your old cypress plugins here.
    // You may want to clean this up later by importing these.
    setupNodeEvents(on, config) {
      require('cypress-grep/src/plugin')(config);
      return config;
    },
    
  },
})
