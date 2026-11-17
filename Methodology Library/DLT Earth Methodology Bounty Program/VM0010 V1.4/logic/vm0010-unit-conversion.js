/**
 * VM0010 v1.4 Unit Conversion and Gas Parameters
 *
 * Validates typed/provenance input contracts for units, gas parameters and evidence gates
 * as required by Task 1 (T01) in the implementation backlog.
 *
 * T01 Acceptance Criteria:
 * - Missing/NaN/infinite numbers reject
 * - explicit percent conversion
 * - required divisors positive
 * - no implicit source or climate constant
 * - existing schemas/tests unchanged
 *
 * This validates the contract structure and basic data integrity, not methodology
 * interpretation or calculation validity.
 */

function calc() {
    const project = documents[documents.length - 1].document.credentialSubject[0];

    // 1. Validate required fields exist (not missing or undefined)
    const requiredFields = [
        'ref', 'monitoringYear', 'carbonToCo2Conversion',
        'gasParameters', 'scope', 'period', 'recordKeys'
    ];

    for (const field of requiredFields) {
        if (!(field in project) || project[field] === undefined) {
            throw new Error(`Missing required field: ${field}`);
        }
    }

    // 2. Validate monitoringYear is a valid number
    const year = project.monitoringYear;
    if (typeof year !== 'number' || Number.isNaN(year) || !Number.isFinite(year)) {
        throw new Error(`monitoringYear must be a valid finite number, got: ${year}`);
    }
    if (year < 1900 || year > 2200) {
        throw new Error(`monitoringYear ${year} is outside valid range 1900-2200`);
    }

    // 3. Validate carbonToCo2Conversion contract structure
    const conversion = project.carbonToCo2Conversion;
    const conversionRequired = ['factor', 'unitFrom', 'unitTo'];

    for (const field of conversionRequired) {
        if (!(field in conversion)) {
            throw new Error(`carbonToCo2Conversion missing required field: ${field}`);
        }
    }

    const factor = conversion.factor;
    if (typeof factor !== 'number' || Number.isNaN(factor) || !Number.isFinite(factor)) {
        throw new Error(`carbonToCo2Conversion.factor must be a valid finite number, got: ${factor}`);
    }
    if (factor <= 0) {
        throw new Error(`carbonToCo2Conversion.factor must be positive, got: ${factor}`);
    }

    if (conversion.unitFrom !== 'tC') {
        throw new Error(`carbonToCo2Conversion.unitFrom must be "tC", got: ${conversion.unitFrom}`);
    }

    if (conversion.unitTo !== 'tCO2e') {
        throw new Error(`carbonToCo2Conversion.unitTo must be "tCO2e", got: ${conversion.unitTo}`);
    }

    // 4. Validate gasParameters contract structure
    const gasParams = project.gasParameters;
    const gasRequired = ['gwpCH4', 'gwpN2O', 'ch4EmissionFactor', 'n2oEmissionFactor'];

    for (const field of gasRequired) {
        if (!(field in gasParams)) {
            throw new Error(`gasParameters missing required field: ${field}`);
        }
    }

    // Validate GWP values
    for (const gwpField of ['gwpCH4', 'gwpN2O']) {
        const value = gasParams[gwpField];
        if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
            throw new Error(`${gwpField} must be a valid finite number, got: ${value}`);
        }
        if (value <= 0) {
            throw new Error(`${gwpField} must be positive, got: ${value}`);
        }
    }

    // Validate emission factor contracts
    for (const efField of ['ch4EmissionFactor', 'n2oEmissionFactor']) {
        const ef = gasParams[efField];
        const efRequired = ['value', 'unit', 'source'];

        for (const field of efRequired) {
            if (!(field in ef)) {
                throw new Error(`${efField} missing required field: ${field}`);
            }
        }

        const efValue = ef.value;
        if (typeof efValue !== 'number' || Number.isNaN(efValue) || !Number.isFinite(efValue)) {
            throw new Error(`${efField}.value must be a valid finite number, got: ${efValue}`);
        }
        if (efValue <= 0) {
            throw new Error(`${efField}.value must be positive, got: ${efValue}`);
        }

        if (!['g/kg', 'kg/t'].includes(ef.unit)) {
            throw new Error(`${efField}.unit must be "g/kg" or "kg/t", got: ${ef.unit}`);
        }

        if (typeof ef.source !== 'string' || ef.source.length === 0) {
            throw new Error(`${efField}.source must be a non-empty string, got: ${ef.source}`);
        }
    }

    // 5. Validate scope contract structure
    const scope = project.scope;
    const scopeRequired = ['baselineScenario', 'projectScenario', 'exclusive'];

    for (const field of scopeRequired) {
        if (!(field in scope)) {
            throw new Error(`scope missing required field: ${field}`);
        }
    }

    if (typeof scope.baselineScenario !== 'string' || scope.baselineScenario.length === 0) {
        throw new Error('scope.baselineScenario must be a non-empty string');
    }

    if (typeof scope.projectScenario !== 'string' || scope.projectScenario.length === 0) {
        throw new Error('scope.projectScenario must be a non-empty string');
    }

    if (!Array.isArray(scope.exclusive)) {
        throw new Error('scope.exclusive must be an array');
    }

    // 6. Validate period contract structure
    const period = project.period;
    const periodRequired = ['startYear', 'endYear', 'durationYears'];

    for (const field of periodRequired) {
        if (!(field in period)) {
            throw new Error(`period missing required field: ${field}`);
        }
    }

    for (const yearField of ['startYear', 'endYear']) {
        const year = period[yearField];
        if (typeof year !== 'number' || Number.isNaN(year) || !Number.isFinite(year)) {
            throw new Error(`${yearField} must be a valid finite number, got: ${year}`);
        }
        if (year < 1900 || year > 2200) {
            throw new Error(`${yearField} ${year} is outside valid range 1900-2200`);
        }
    }

    if (period.startYear >= period.endYear) {
        throw new Error(`period.startYear (${period.startYear}) must be less than period.endYear (${period.endYear})`);
    }

    const duration = period.durationYears;
    if (typeof duration !== 'number' || Number.isNaN(duration) || !Number.isFinite(duration)) {
        throw new Error(`period.durationYears must be a valid finite number, got: ${duration}`);
    }
    if (duration <= 0) {
        throw new Error(`period.durationYears must be positive, got: ${duration}`);
    }

    if (!['years', 'quarters', 'months'].includes(period.units)) {
        throw new Error(`period.units must be "years", "quarters", or "months", got: ${period.units}`);
    }

    // 7. Validate recordKeys contract structure
    const recordKeys = project.recordKeys;
    const recordKeysRequired = ['projectId', 'sliceId', 'methodologyVersion', 'validationHash'];

    for (const field of recordKeysRequired) {
        if (!(field in recordKeys)) {
            throw new Error(`recordKeys missing required field: ${field}`);
        }
    }

    if (typeof recordKeys.projectId !== 'string' || recordKeys.projectId.length === 0) {
        throw new Error('recordKeys.projectId must be a non-empty string');
    }

    if (!['VM0010_V1_4_SLICE', 'VM0010_V1_4_FULL'].includes(recordKeys.sliceId)) {
        throw new Error(`recordKeys.sliceId must be "VM0010_V1_4_SLICE" or "VM0010_V1_4_FULL", got: ${recordKeys.sliceId}`);
    }

    const versionPattern = /^v1\.\d+$/;
    if (!versionPattern.test(recordKeys.methodologyVersion)) {
        throw new Error(`recordKeys.methodologyVersion must match pattern v1.x, got: ${recordKeys.methodologyVersion}`);
    }

    const hashPattern = /^[0-9a-f]{64}$/;
    if (!hashPattern.test(recordKeys.validationHash)) {
        throw new Error(`recordKeys.validationHash must be a valid SHA256 hash, got: ${recordKeys.validationHash}`);
    }

    // 8. Validate evidenceFiles if present
    if (recordKeys.evidenceFiles) {
        if (!Array.isArray(recordKeys.evidenceFiles)) {
            throw new Error('recordKeys.evidenceFiles must be an array if present');
        }

        for (let i = 0; i < recordKeys.evidenceFiles.length; i++) {
            const file = recordKeys.evidenceFiles[i];
            const fileRequired = ['filename', 'sha256', 'url', 'description'];

            for (const field of fileRequired) {
                if (!(field in file)) {
                    throw new Error(`recordKeys.evidenceFiles[${i}] missing required field: ${field}`);
                }
            }

            if (typeof file.filename !== 'string' || file.filename.length === 0) {
                throw new Error(`recordKeys.evidenceFiles[${i}].filename must be a non-empty string`);
            }

            if (!hashPattern.test(file.sha256)) {
                throw new Error(`recordKeys.evidenceFiles[${i}].sha256 must be a valid SHA256 hash, got: ${file.sha256}`);
            }

            if (typeof file.url !== 'string' || file.url.length === 0) {
                throw new Error(`recordKeys.evidenceFiles[${i}].url must be a non-empty string`);
            }

            if (typeof file.description !== 'string' || file.description.length === 0) {
                throw new Error(`recordKeys.evidenceFiles[${i}].description must be a non-empty string`);
            }
        }
    }

    // All validation passed - return the validated input contract
    done({
        ref: project.ref,
        monitoringYear: project.monitoringYear,
        carbonToCo2Conversion: project.carbonToCo2Conversion,
        gasParameters: project.gasParameters,
        scope: project.scope,
        period: project.period,
        recordKeys: project.recordKeys,
        validationStatus: 'contract_valid',
        validatedAt: new Date().toISOString()
    });
}

calc();