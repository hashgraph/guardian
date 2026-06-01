module.exports = {
    "reporterEnabled": "cypress-mochawesome-reporter, mocha-junit-reporter",
    "cypressMochawesomeReporterReporterOptions": {
        "reportDir": `cypress/reports/html`,
        "reportTitle": `${process.env.ReportName}`
    },
    "mochaJunitReporterReporterOptions": {
        "mochaFile": `cypress/test_results/junit/[hash].xml`
    }
}
