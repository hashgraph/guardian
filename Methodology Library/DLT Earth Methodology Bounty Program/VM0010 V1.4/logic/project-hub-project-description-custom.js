/**
 * VM0010 v1.4 -> Verra Project Hub CUSTOM template mapping (Project Description).
 *
 * Guardian dataTransformationAddon expression.
 *
 * Style copied from the only Project Hub mapping in the repository:
 *   Methodology Library/Verra/Verified Carbon Standard (VCS)/VM0033/VM0033.policy
 *     -> dataTransformationAddon.expression, tag "project-description",
 *        terminating "return done((jsons.length > 0 && jsons[0]) || null);"
 *
 * VM0033 is also sectoral scope 14 (AFOLU), the same sectoral scope Verra
 * assigns to VM0010, so its skeleton is a closer match here than for a
 * non-AFOLU methodology.
 *
 * SLICE SCOPE:
 *   - Project Description direction only (no Monitoring Report mapping).
 *   - vcs + ccb program sub-objects retained to prove the shape required by
 *     issue #5941 acceptance criterion 1.
 *   - SDVISta is NOT modelled. The issue's own Definition of Done gives the
 *     worked example "sectoral scope 14 methodologies use VCS, CCB, and joint
 *     VCS-CCB templates", so SDVISta is treated as not applicable to this
 *     AFOLU methodology. That is an ASSUMPTION, not a confirmed ruling.
 *   - Joint VCS-CCB is also out of scope for this slice.
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
            const project = doc.document.credentialSubject[0];

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
                fetchProjectBoundaryFromCalculationInput: false,
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
                // Verra places VM0010 under sectoral scope 14,
                // "Agriculture, forestry, and other land use (AFOLU)".
                // The VM0033 mapping hardcodes '14' for the same sectoral scope.
                projectType: '14',
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
                    baselineActivity: [],
                    fossilFuelEmissions: [],
                },
            };

            setDeepValue(json, 'standardTemplate', project.standardTemplate);
            setDeepValue(json, 'standardTemplateName', project.standardTemplateName);
            setDeepValue(json, 'methodologyTemplateTitle', project.methodologyTemplateTitle);
            setDeepValue(json, 'methodologyTemplate', project.methodologyTemplate);

            // Joint VCS-CCB template (acceptance criterion 1: VCS, VCS-CCB,
            // CCB, SDVISta). VM0033 precedent: standardTemplate
            // 'vcs+ccb.v4.4' with both vcs and ccb sub-objects populated. When
            // the project requests a joint VCS-CCB template, reflect it in
            // standardTemplate/standardTemplateName; both program blocks are
            // already populated above.
            if (project.standardTemplate === 'VCS+CCB') {
                setDeepValue(json, 'standardTemplate', 'vcs+ccb.v4.4');
                setDeepValue(json, 'standardTemplateName', 'VCS+CCB Project Description (VCS v4.4, CCB v3.0)');
            }
            setDeepValue(json, 'projectName', project.projectName);
            setDeepValue(json, 'projectDescription', project.projectDescription);
            setDeepValue(json, 'website', project.website);
            setDeepValue(json, 'estimatedProjectStartDate', project.projectStartDate);
            setDeepValue(json, 'creditPeriod.startDate', project.creditPeriodStart);
            setDeepValue(json, 'creditPeriod.endDate', project.creditPeriodEnd);
            setDeepValue(json, 'projectProponents', project.projectProponents);
            setDeepValue(json, 'projectProponentsWithDetails', project.projectProponentsWithDetails);
            setDeepValue(json, 'locations', project.locations);
            setDeepValue(json, 'vcs.projectValidatorId', project.vcsProjectValidatorId);
            setDeepValue(json, 'ccb.projectValidatorId', project.ccbProjectValidatorId);
            setDeepValue(json, 'ccb.ccbStandardName', project.ccbStandardName);
            setDeepValue(json, 'ccb.distinctions', project.ccbDistinctions);
            setDeepValue(json, 'calculationInputs.baselineActivity', project.baselineActivity);
            setDeepValue(
                json,
                'calculationInputs.fossilFuelEmissions',
                project.fuelInputs.map(function (input) {
                    return {
                        fuelType: input.fuelType,
                        source: input.source,
                        consumptionKl: input.consumptionKl,
                    };
                }),
            );

            jsons.push(json);
        });
    }

    return done((jsons.length > 0 && jsons[0]) || null);
})();
