module.exports = {
    'reporterEnabled': 'cypress-mochawesome-reporter, mocha-junit-reporter',
    'cypressMochawesomeReporterReporterOptions': {
        'reportDir': `cypress/reports/html`,
        'reportTitle': `${process.env.ReportName || "Guardian's Cypress Report"}`,
        // Keep the per-spec JSONs after the HTML merge (the option defaults to true).
        // scripts/report-summary.mjs reads them to build the per-spec table shown in
        // the GitHub job summary.
        'removeJsonsFolderAfterMerge': false
    },
    'mochaJunitReporterReporterOptions': {
        'mochaFile': `cypress/test_results/junit/[hash].xml`
    }
}
