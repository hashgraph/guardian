module.exports = {
    "reporterEnabled": "mochawesome, mocha-junit-reporter",
    "mochawesomeReporterOptions": {
        "reportDir": `cypress/reports/html/.jsons`
    },
    "mochaJunitReporterReporterOptions": {
        "mochaFile": `cypress/test_results/junit/[hash].xml`
    }
}
