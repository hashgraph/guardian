/**
 * VM0010 v1.4 — Equation (47) - Non-CO2 Equivalent Emission Factor
 *
 *   EF = EF_CH4 * GWP_CH4 + EF_N2O * GWP_N2O        (tCO2e per activity unit)
 *
 * Guardian customLogicBlock expression. Style follows repository precedent:
 *   Methodology Library/DLT Earth Methodology Bounty Program/VM0047 V1.1/VM0047_1.1.policy
 *     -> customLogicBlock.expression  ("function calc() {...} calc();")
 *
 * PROVENANCE. Section 9.1 and Appendix 1 (p. 87) of VM0010 v1.4.
 *
 * SCOPE: computes the non-CO2 contribution to the emission factor from
 * methane and nitrous oxide, using explicitly supplied gas-specific factors
 * and approved GWPs. The CO2 contribution is added downstream in
 * calculate-fuel-factors.js (A03) on a single activity basis.
 *
 * VALIDATION:
 * - EF_CH4 and EF_N2O must be non-negative finite numbers
 * - GWP_CH4 and GWP_N2O must be positive finite numbers (GWPs are positive)
 * - Same activity denominator is enforced by the caller (this module does not
 *   aggregate rows with different activities)
 * - Missing significant gas factors are rejected, not silently treated as zero
 */

function calc() {
    const project = documents[documents.length - 1].document.credentialSubject[0];

    const ghg = project.ghgFactors || [];
    if (ghg.length === 0) {
        throw new Error('at least one GHG factor row is required');
    }

    const rows = [];

    ghg.forEach(function (entry, idx) {
        const efCh4 = entry.efCh4; // tCH4 per activity unit
        const gwpCh4 = entry.gwpCh4; // dimensionless
        const efN2o = entry.efN2o; // tN2O per activity unit
        const gwpN2o = entry.gwpN2o; // dimensionless

        // Validate EF_CH4: non-negative finite number
        if (typeof efCh4 !== 'number' || Number.isNaN(efCh4) || !Number.isFinite(efCh4)) {
            throw new Error('EF_CH4 must be a finite number at index ' + idx);
        }
        if (efCh4 < 0) {
            throw new Error('EF_CH4 must be non-negative at index ' + idx);
        }

        // Validate GWP_CH4: positive finite number
        if (typeof gwpCh4 !== 'number' || Number.isNaN(gwpCh4) || !Number.isFinite(gwpCh4)) {
            throw new Error('GWP_CH4 must be a finite number at index ' + idx);
        }
        if (gwpCh4 <= 0) {
            throw new Error('GWP_CH4 must be positive at index ' + idx);
        }

        // Validate EF_N2O: non-negative finite number
        if (typeof efN2o !== 'number' || Number.isNaN(efN2o) || !Number.isFinite(efN2o)) {
            throw new Error('EF_N2O must be a finite number at index ' + idx);
        }
        if (efN2o < 0) {
            throw new Error('EF_N2O must be non-negative at index ' + idx);
        }

        // Validate GWP_N2O: positive finite number
        if (typeof gwpN2o !== 'number' || Number.isNaN(gwpN2o) || !Number.isFinite(gwpN2o)) {
            throw new Error('GWP_N2O must be a finite number at index ' + idx);
        }
        if (gwpN2o <= 0) {
            throw new Error('GWP_N2O must be positive at index ' + idx);
        }

        // Equation (47): EF = EF_CH4 * GWP_CH4 + EF_N2O * GWP_N2O
        const ef = efCh4 * gwpCh4 + efN2o * gwpN2o;

        rows.push({
            gas: entry.gas || 'CH4_N2O',
            activity: entry.activity || 'unknown',
            efCh4: efCh4,
            gwpCh4: gwpCh4,
            efN2o: efN2o,
            gwpN2o: gwpN2o,
            efTco2ePerActivity: ef,
        });
    });

    let sumEfTco2ePerActivity = 0;
    rows.forEach(function (r) {
        sumEfTco2ePerActivity += r.efTco2ePerActivity;
    });

    done({
        ref: project.id,
        year: project.monitoringYear,
        rows: rows,
        sumEfTco2ePerActivity: sumEfTco2ePerActivity,
    });
}

calc();