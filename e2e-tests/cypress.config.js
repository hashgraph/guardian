const { defineConfig } = require('cypress')
const { verifyDownloadTasks } = require('cy-verify-downloads');


module.exports = defineConfig({
  
  projectId: 'ndcsvf',
  video: false,
  watchForFileChanges: false,
  defaultCommandTimeout: 10000,

  video: false,
  e2e: {
    
    // We've imported your old cypress plugins here.
    // You may want to clean this up later by importing these.
    setupNodeEvents(on, config) {
      require('cypress-grep/src/plugin')(config);
      return config;
    
    },
    experimentalRunAllSpecs : true,
    hideXHRInCommandLog: true,
    speed: 4,

    
  },



  
})

module.exports = defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      on('task', verifyDownloadTasks);
    },
  },
});


  


