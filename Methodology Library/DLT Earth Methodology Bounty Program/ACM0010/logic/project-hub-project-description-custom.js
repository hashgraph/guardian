/**
 * ACM0010 -> Verra Project Hub CUSTOM template mapping (Project Description).
 *
 * Guardian dataTransformationAddon expression.
 *
 * Style copied from the repository precedent:
 *   Methodology Library/Verra/Verified Carbon Standard (VCS)/VM0033/VM0033.policy
 *   -> dataTransformationAddon.expression
 *      (tag "project-description", 259268 chars, ends with
 *       "return done((jsons.length > 0 && jsons[0]) || null);")
 *
 * Why VM0033 is the reference (not VM0047):
 *   A census of all 152 *.policy files in the repository shows
 *   dataTransformationAddon appears in exactly ONE policy (VM0033, twice),
 *   and httpRequestBlock in exactly ONE (an unrelated weather lookup).
 *   VM0033 is therefore the only existing Project Hub CUSTOM mapping,
 *   and it already carries the vcs / ccb / sdVista program sub-objects
 *   required by issue #5945 acceptance criterion 1.
 *
 * SCOPE OF THIS SLICE:
 *   - Project Description direction only (no Monitoring Report mapping yet).
 *   - vcs + ccb + sdVista skeletons retained so the program-template shape is
 *     proven; only the fields backed by an ACM0010 input are populated.
 *   - plasticWRP and otherJsonContents are omitted: they are CCB/PWRM-specific
 *     and not applicable to a livestock and manure management methodology.
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
                // ASSUMPTION: Verra lists ACM0010 under sectoral scope
                // "15. Livestock and manure management". VM0033 uses '14'.
                // To be confirmed against the VCS v5.0 project description template.
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
                    baselineAwms: [],
                    livestock: [],
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
            setDeepValue(json, 'calculationInputs.baselineAwms', [
                {
                    name: project.baselineAwms.name,
                    methaneConversionFactor: project.baselineAwms.methaneConversionFactor,
                },
            ]);
            setDeepValue(
                json,
                'calculationInputs.livestock',
                project.livestock.map(function (entry) {
                    return {
                        type: entry.type,
                        annualVolatileSolids: entry.annualVolatileSolids,
                        maxMethaneProducingCapacity: entry.maxMethaneProducingCapacity,
                    };
                }),
            );

            jsons.push(json);
        });
    }

    return done((jsons.length > 0 && jsons[0]) || null);
})();
