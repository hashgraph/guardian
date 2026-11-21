/**
 * ACM0010 -> Verra Project Hub CUSTOM template mapping (Monitoring Report).
 *
 * Guardian dataTransformationAddon expression.
 *
 * Style copied from the repository precedent:
 *   Methodology Library/Verra/Verified Carbon Standard (VCS)/VM0033/VM0033.policy
 *     -> dataTransformationAddon.expression
 *
 * SCOPE OF THIS MAPPING:
 *   - Monitoring Report direction only (Project Description is handled by
 *     project-hub-project-description-custom.js).
 *   - vcs + ccb + sdVista program sub-objects retained for structural parity
 *     with the VM0033 Project Hub reference.
 *   - projectType: '15' (livestock and manure management), matching the
 *     Project Description mapping.
 *   - Emission reductions (ER_y) and project/baseline emissions carried from
 *     the ACM0010 calculation output schema.
 */

function setDeepValue(target, path, value) {
    if (value === undefined || value === null || value === '') {
        return;
    }
    const keys = path.split('.');
    let cursor = target;
    for (let i = 0; i < keys.length - 1; i++) {
        if (typeof cursor[keys[i]] !== 'object' || cursor[keys[i]] === null) {
            cursor[keys[i]] = {};
        }
        cursor = cursor[keys[i]];
    }
    cursor[keys[keys.length - 1]] = value;
}

(function calc() {
    const jsons = [];

    if (documents && documents.length > 0) {
        documents.forEach(function (doc) {
            const report = doc.document.credentialSubject[0];

            const json = {
                id: '',
                projectNumber: null,
                accountId: '',
                standardTemplate: '',
                standardTemplateName: '',
                methodologyTemplateTitle: '',
                methodologyTemplate: '',
                projectName: '',
                projectDescription: '',
                website: null,
                projectSubmissionStatus: 'Draft',
                estimatedProjectStartDate: '',
                creditPeriod: {
                    startDate: '',
                    endDate: '',
                },
                projectSize: null,
                averageAnnualVolume: null,
                integratedModules: null,
                integratedTools: null,
                integratedMethodologies: null,
                projectType: '15',
                useManualCalculation: null,
                locations: [],
                projectProponents: [''],
                projectProponentsWithDetails: null,
                vcs: {
                    afoluActivities: [],
                    projectValidatorId: null,
                    additionalProjectTypes: [],
                    earlyAction: null,
                },
                ccb: {
                    ccbStandard: null,
                    ccbStandardName: null,
                    projectTypeId: null,
                    distinctions: [],
                    auditorSiteVisitStartDate: null,
                    auditorSiteVisitEndDate: null,
                    ccbVerifierList: [],
                    projectValidatorId: null,
                },
                sdVista: null,
                registryDocumentUploadData: null,
                calculationInputs: {
                    monitoringYear: null,
                    baselineEmissionsTCo2e: null,
                    projectEmissionsTCo2e: null,
                    emissionReductionsTCo2e: null,
                    leakageTCo2e: null,
                },
            };

            setDeepValue(json, 'standardTemplate', report.standardTemplate);
            setDeepValue(json, 'standardTemplateName', report.standardTemplateName);
            setDeepValue(json, 'methodologyTemplateTitle', report.methodologyTemplateTitle);
            setDeepValue(json, 'methodologyTemplate', report.methodologyTemplate);
            setDeepValue(json, 'projectName', report.projectName);
            setDeepValue(json, 'projectDescription', report.projectDescription);
            setDeepValue(json, 'website', report.website);
            setDeepValue(json, 'estimatedProjectStartDate', report.projectStartDate);
            setDeepValue(json, 'creditPeriod.startDate', report.creditPeriodStart);
            setDeepValue(json, 'creditPeriod.endDate', report.creditPeriodEnd);
            setDeepValue(json, 'projectProponents', report.projectProponents);
            setDeepValue(json, 'projectProponentsWithDetails', report.projectProponentsWithDetails);
            setDeepValue(json, 'locations', report.locations);
            setDeepValue(json, 'vcs.projectValidatorId', report.vcsProjectValidatorId);
            setDeepValue(json, 'ccb.projectValidatorId', report.ccbProjectValidatorId);
            setDeepValue(json, 'ccb.ccbStandardName', report.ccbStandardName);
            setDeepValue(json, 'ccb.distinctions', report.ccbDistinctions);

            // Monitoring-year emission reduction fields
            setDeepValue(json, 'calculationInputs.monitoringYear', report.monitoringYear);
            setDeepValue(json, 'calculationInputs.baselineEmissionsTCo2e', report.baselineEmissionsTCo2e);
            setDeepValue(json, 'calculationInputs.projectEmissionsTCo2e', report.projectEmissionsTCo2e);
            setDeepValue(json, 'calculationInputs.emissionReductionsTCo2e', report.emissionReductionsTCo2e);
            setDeepValue(json, 'calculationInputs.leakageTCo2e', report.leakageTCo2e);

            jsons.push(json);
        });
    }

    return done((jsons.length > 0 && jsons[0]) || null);
})();
