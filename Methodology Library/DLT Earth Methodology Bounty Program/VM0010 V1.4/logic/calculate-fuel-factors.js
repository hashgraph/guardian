/**
 * VM0010 v1.4 — Equation (48) per-gas fuel factor unit conversion + A03 assembly
 *
 *   EF_FUEL-GHG = EF_IPCC-FUEL * HV_FUEL * rho_FUEL / 1000    (t GHG / kL)     (48)
 *
 * A03 Fuel EF Assembly:
 *   EF_total = EF_CO2 + EF_nonCO2                      (tCO2e / kL)
 *
 * Guardian customLogicBlock expression. Style follows repository precedent:
 *   Methodology Library/DLT Earth Methodology Bounty Program/VM0047 V1.1/VM0047_1.1.policy
 *     -> customLogicBlock.expression  ("function calc() {...} calc();")
 *
 * PROVENANCE. Section 9.1 and Appendix 2 (p. 88) of VM0010 v1.4.
 *
 * Eq 48 converts an IPCC fuel emission factor (kg GHG / TJ) into a per-kilolitre
 * factor (t GHG / kL) using heating value (TJ/kg) and density (kg/kL).
 * The output is per GHG (CO2, CH4, N2O) and only becomes tCO2e when multiplied
 * by the gas's GWP.
 *
 * A03 assembles the final tCO2e/kL factor by adding the CO2 contribution to
 * the non-CO2 equivalent contribution from Equation (47).
 *
 * Scope: pure arithmetic; GWP provenance is external.
 */

function calc() {
    const project = documents[documents.length - 1].document.credentialSubject[0];

    if (!project.fuelInputs || !Array.isArray(project.fuelInputs) || project.fuelInputs.length === 0) {
        throw new Error('project missing fuelInputs array');
    }

    const fuelFactorsDetails = [];
    let efFuelGhg = 0;
    let efTotal = 0;

    project.fuelInputs.forEach(function (input, idx) {
        const ipccEf = input.ipccEmissionFactor; // kg GHG / TJ
        const hv = input.heatingValue;           // TJ / kg
        const rho = input.density;               // kg / kL
        const gas = input.gas;

        if (gas !== 'CO2' && gas !== 'CH4' && gas !== 'N2O') {
            throw new Error('unsupported gas label "' + gas + '" at index ' + idx + '; only CO2, CH4, N2O are permitted');
        }

        if (typeof ipccEf !== 'number' || Number.isNaN(ipccEf) || !Number.isFinite(ipccEf)) {
            throw new Error('EF_IPCC-FUEL must be a finite number at index ' + idx);
        }
        if (ipccEf < 0) {
            throw new Error('EF_IPCC-FUEL must be non-negative at index ' + idx);
        }
        if (typeof hv !== 'number' || Number.isNaN(hv) || !Number.isFinite(hv)) {
            throw new Error('HV_FUEL must be a finite number at index ' + idx);
        }
        if (hv <= 0) {
            throw new Error('HV_FUEL must be positive at index ' + idx);
        }
        if (typeof rho !== 'number' || Number.isNaN(rho) || !Number.isFinite(rho)) {
            throw new Error('rho_FUEL must be a finite number at index ' + idx);
        }
        if (rho <= 0) {
            throw new Error('rho_FUEL must be positive at index ' + idx);
        }

        // Equation (48): EF_FUEL-GHG = EF_IPCC-FUEL * HV_FUEL * rho_FUEL / 1000
        // Result: t GHG / kL
        const efFuelGhgRow = (ipccEf * hv * rho) / 1000;

        // A03: If this is CO2, and we have a non-CO2 contribution, add it
        let efCo2Row = 0;
        let efNonCo2Row = 0;
        if (gas === 'CO2') {
            efCo2Row = efFuelGhgRow;
            if (input.nonCo2EfTco2ePerKl !== undefined) {
                const nonCo2 = input.nonCo2EfTco2ePerKl;
                if (typeof nonCo2 !== 'number' || Number.isNaN(nonCo2) || !Number.isFinite(nonCo2)) {
                    throw new Error('non-CO2 EF must be a finite number at index ' + idx);
                }
                if (nonCo2 < 0) {
                    throw new Error('non-CO2 EF must be non-negative at index ' + idx);
                }
                efNonCo2Row = nonCo2;
            }
        } else {
            efNonCo2Row = efFuelGhgRow;
        }

        const efTotalRow = efCo2Row + efNonCo2Row;

        fuelFactorsDetails.push({
            activityId: input.fuelType || ('fuel-' + idx),
            gas: gas,
            efIcc: ipccEf,
            hvFuel: hv,
            rhoFuel: rho,
            efFuelGhgRow: efFuelGhgRow,
            efCo2Row: efCo2Row,
            efNonCo2Row: efNonCo2Row,
        });

        efFuelGhg += efFuelGhgRow;
        efTotal += efTotalRow;
    });

    done({
        ref: project.id,
        year: project.monitoringYear,
        efFuelGhg: efFuelGhg,
        efTotal: efTotal,
        fuelFactorsDetails: fuelFactorsDetails,
    });
}

calc();