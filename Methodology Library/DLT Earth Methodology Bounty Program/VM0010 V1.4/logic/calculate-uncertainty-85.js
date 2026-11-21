/**
 * VM0010 v1.4 Section 9.1 Data / Parameter, p.51 - Combined Uncertainty
 *
 * Equation (42): U_total|LtPF = SQRT(U_PRJ^2 + U_BSL^2); dimensionless.
 *
 * Where:
 *   U_PRJ    project scenario uncertainty estimate [0,1], same 95% confidence convention
 *   U_BSL    baseline scenario uncertainty estimate [0,1], same 95% confidence convention
 *   U_total  combined scenario uncertainty, dimensionless
 *
 * Inputs come from P9 quantified 95%-confidence uncertainty evidence; arbitrary
 * unweighted pool percentages are not permitted.
 *
 * Guardian customLogicBlock expression. Style follows repository precedent:
 *   Methodology Library/DLT Earth Methodology Bounty Program/VM0047 V1.1/VM0047_1.1.policy
 *     -> customLogicBlock.expression  ("function calc() {...} calc();")
 */

function calc() {
    const project = documents[documents.length - 1].document.credentialSubject[0];

    const uncertainty = project.scenarioUncertainty;
    if (!uncertainty || typeof uncertainty !== 'object') {
        throw new Error('project missing scenarioUncertainty object');
    }

    const uPrj = uncertainty.uPrj;
    const uBsl = uncertainty.uBsl;

    if (typeof uPrj !== 'number' || Number.isNaN(uPrj) || !Number.isFinite(uPrj)) {
        throw new Error('U_PRJ must be a finite number');
    }
    if (uPrj < 0 || uPrj > 1) {
        throw new Error('U_PRJ must be in [0,1]');
    }

    if (typeof uBsl !== 'number' || Number.isNaN(uBsl) || !Number.isFinite(uBsl)) {
        throw new Error('U_BSL must be a finite number');
    }
    if (uBsl < 0 || uBsl > 1) {
        throw new Error('U_BSL must be in [0,1]');
    }

    // Equation (42): U_total|LtPF = SQRT(U_PRJ^2 + U_BSL^2)
    const uTotal = Math.sqrt(uPrj * uPrj + uBsl * uBsl);

    done({
        ref: project.id,
        year: project.monitoringYear,
        uPrj: uPrj,
        uBsl: uBsl,
        uTotal: uTotal,
    });
}

calc();
