/**
 * VM0010 v1.4 — baseline fossil fuel emissions (CFUEL).
 * Sections 8.1.4 (Eq 12) and Appendix 2 (Eq 48).
 *
 * Guardian customLogicBlock expression.
 * Style copied from:
 *   Methodology Library/DLT Earth Methodology Bounty Program/VM0047 V1.1/VM0047_1.1.policy
 *     -> customLogicBlock.expression  ("function calc() {...} calc();")
 *
 * PROVENANCE. Section 8.1 Baseline Emissions begins at p. 17 and Appendix 2
 * (Converting Units for Fuel Emission Factor) at p. 88, per the Contents on p. 3
 * of VM0010, v1.4. The Contents does NOT index individual equations, so no page
 * is cited here for Equation (12) or Equation (48).
 *
 * Eq (12) is the one equation in this slice whose substance is fixed by readable
 * source: Correction 3 of the 2026 C&C states in prose that the 44/12 denominator
 * "has been removed" and the unit is tCO2e, and its four addend descriptions are
 * readable. The reconstructed operator structure is a plain sum; whether a
 * crediting-period average and a multiplication by t* belong inside Eq (12) is NOT
 * verified. The 2026-06-11 C&C prose for Section 8.1 states baseline emissions are
 * "averaged across the project crediting period ... and are multiplied by t*", but
 * whether that scaling sits inside Eq (12) or is applied by the caller could not be
 * determined from the text layer. This implementation applies neither.
 *
 * The baseline activity (selective logging, plus clearcutting for operations such
 * as log landings) uses forestry and wood processing machinery. CFUEL is the
 * total GHG emissions from that fossil fuel combustion, summed over the four
 * sources given in the methodology's "Where" block.
 *
 * NOTATION PROVENANCE. The four addend names below are IMPLEMENTATION_ALIASES.
 * Verra does not use these identifiers. The source symbols for the Eq 12 addends
 * are unrecoverable from the methodology PDF text layer; only their descriptions
 * are readable. Each alias maps to the Eq 12 "Where" description quoted beside it:
 *
 *   E_HARVEST    -> "Fossil fuel emissions due to harvesting operations such as
 *                   felling and snigging, in tCO2e"          [Eq 12; derived Eq 13]
 *   E_HAULING    -> "Fossil fuel emissions due to log hauling, in tCO2e"
 *                                                                [Eq 12; derived Eq 14]
 *   E_TRANSPORT  -> "Fossil fuel emissions due to log transport from collection
 *                   depot to processing plant, in tCO2e"    [Eq 12; derived Eq 17]
 *   E_PROCESSING -> "Fossil fuel emissions due to electricity consumption in
 *                   sawmill, in tCO2e"                      [Eq 12; derived Eq 19]
 *
 * Two source-internal tensions are recorded, not resolved, because resolving
 * either would require inventing terminology or changing logic:
 *   - E_TRANSPORT: body Eq 17 describes its own LHS as "log transport haulage from
 *     felling location to the collection depot/sawmill", which does not match the
 *     Eq 12 "collection depot to processing plant" wording. This alias follows Eq 12.
 *   - E_PROCESSING: Section 8.1.4.4 defines two mutually exclusive derivations
 *     (grid electricity -> Eqs 18/19; on-site generator -> Eqs 20/21). Eq 12 carries
 *     a single addend covering both, so this alias necessarily spans both branches
 *     and does not itself select between them.
 *
 * Eq 12 as corrected by "Corrections and Clarifications to VM0010 v1.3 and v1.4"
 * (published 4 September 2026), Correction 3: the 44/12 denominator was REMOVED
 * and CFUEL is expressed in tCO2e. The correction states that the inputs were
 * already measured in tCO2e, so "conversion from tC to tCO2e is not required".
 * That instruction is implemented literally: CFUEL is a plain sum of the four
 * terms, with no carbon-to-CO2 divisor applied.
 * CFUEL is a VERIFIED_SOURCE_NAME: it is named as such in Verra prose in both the
 * clean methodology (Section 8.1.4) and the C&C (Corrections 3 and 5).
 *
 * OUTPUT FIELD PROVENANCE:
 *   sumEmissionsTco2e  IMPLEMENTATION_AGGREGATE. No source counterpart exists. The
 *                      methodology expresses Eq 12 as one equation and never names
 *                      an intermediate sum. Unit tCO2e holds only under the CO2-only
 *                      scope declared below.
 *   cFuelTco2e         IMPLEMENTATION_ALIAS for CFUEL, which is tCO2e per
 *                      Correction 3.
 *
 * For reference, the superseded base equation in VM0010 v1.4 Section 8.1.4 was
 *   CFUEL = (E_HARVEST + E_HAULING + E_TRANSPORT + E_PROCESSING) / (44/12)
 * expressed in tC.
 *
 * Eq 48 (Appendix 2) converts an IPCC fuel emission factor into a per-kilolitre
 * factor. Source symbols are VERIFIED_SOURCE_NAME, read from the Eq 48 "Where"
 * block: EF_FUEL-GHG (tGHG/kL), EF_IPCC-FUEL (kgGHG/TJ), HV_FUEL (TJ/kg) and
 * FUEL (kg/kL, the fuel density). Hence
 *   EF_FUEL-GHG = EF_IPCC-FUEL * HV_FUEL * FUEL / 1000
 * Appendix 2 states the factors are "recorded in units of kg of GHG (TJ of fuel)-1"
 * and must be converted to "an emission factor in tGHG kL-1", listing tCO2-e, tCH4
 * and tN2O as three DISTINCT outcomes. The per-fuel emission below is therefore
 * reported in tGHG, not tCO2e, and only coincides with tCO2e when the supplied
 * EF_IPCC-FUEL is a CO2 factor.
 *
 * SCOPE: one monitoring year, CO2 only. This slice does not attempt the CH4/N2O
 * significance testing that the methodology requires for those gases, nor any
 * other baseline emission source. The CO2-only restriction is a scope declaration,
 * not an enforced input constraint: nothing validates that EF_IPCC-FUEL is a CO2
 * factor, so a CH4 or N2O factor would be summed in on a tCO2e-labelled total.
 */

function calc() {
    const project = documents[documents.length - 1].document.credentialSubject[0];

    // Appendix 2, Equation 48: IPCC fuel EF -> tGHG per kilolitre.
    const emissionFactors = project.fuelInputs.map(function (input) {
        const factor = (input.ipccEmissionFactor * input.heatingValue * input.density) / 1000;
        if (!(input.ipccEmissionFactor >= 0) || !(input.heatingValue > 0) || !(input.density > 0)) {
            throw new Error('fuel inputs must be non-negative with positive heating value and density for ' + input.fuelType);
        }
        return {
            fuelType: input.fuelType,
            emissionFactorTGhgPerKl: factor,
            consumptionKl: input.consumptionKl,
            emissionsTGhg: factor * input.consumptionKl,
        };
    });

    // Attribute each fuel record to one of the four methodology sources.
    const SOURCES = ['E_HARVEST', 'E_HAULING', 'E_TRANSPORT', 'E_PROCESSING'];
    const bySource = { E_HARVEST: 0, E_HAULING: 0, E_TRANSPORT: 0, E_PROCESSING: 0 };
    const detail = { E_HARVEST: [], E_HAULING: [], E_TRANSPORT: [], E_PROCESSING: [] };

    emissionFactors.forEach(function (entry, index) {
        const source = project.fuelInputs[index].source;
        if (SOURCES.indexOf(source) === -1) {
            throw new Error('unknown emission source ' + source);
        }
        bySource[source] += entry.emissionsTGhg;
        detail[source].push({
            fuelType: entry.fuelType,
            emissionFactorTGhgPerKl: entry.emissionFactorTGhgPerKl,
            consumptionKl: entry.consumptionKl,
            emissionsTGhg: entry.emissionsTGhg,
        });
    });

    const sumEmissions = SOURCES.reduce(function (sum, key) { return sum + bySource[key]; }, 0);

    // Eq 12 as corrected by "Corrections and Clarifications to VM0010 v1.3 and
    // v1.4" (4 September 2026), Correction 3: the 44/12 denominator was removed
    // and C_FUEL is expressed in tCO2e. The four E terms are already measured in
    // tCO2e, so the corrected equation is a plain sum with no divisor.
    const cFuel = sumEmissions;

    done({
        ref: project.id,
        year: project.monitoringYear,
        emissionSources: bySource,
        emissionSourceDetail: detail,
        sumEmissionsTco2e: sumEmissions,
        cFuelTco2e: cFuel,
    });
}

calc();
