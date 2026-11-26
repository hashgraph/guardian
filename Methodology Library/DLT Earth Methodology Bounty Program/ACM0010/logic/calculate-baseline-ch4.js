/**
 * ACM0010 (GHG emission reductions from manure management systems)
 * Baseline methane emissions, BE_CH4,y, across a staged baseline AWMS chain.
 *
 * Guardian customLogicBlock expression.
 * Style copied from the repository precedent:
 *   Methodology Library/DLT Earth Methodology Bounty Program/VM0047 V1.1/VM0047_1.1.policy
 *   -> config ... customLogicBlock.expression  ("function calc() {...} calc();")
 *
 * EQUATIONS
 *   Volatile solids entering treatment stage j, for livestock type i:
 *       VS(i,j) = VS(i,0) * PRODUCT over k < j of ( 1 - eta(k) )
 *   Baseline methane emissions in monitoring year y:
 *       BE_CH4,y = SUM over j, SUM over i of
 *                  [ VS(i,j) * MCF(j) * B0(i) * RHO_CH4 ]
 *   Carbon dioxide equivalent:
 *       BE_CH4,y [tCO2e] = BE_CH4,y [kg CH4] * GWP_CH4 / 1000
 *
 *   RHO_CH4 = D_CH4 = 0.00067 t/m3 = 0.67 kg CH4/m3, the single CH4 density
 *            used by every equation in this policy (see the constant below)
 *   eta(k)  = volatile solids reduction fraction of stage k, in [0, 1]
 *   MCF(j)  = methane conversion factor of stage j,          in [0, 1]
 *   B0(i)   = maximum methane producing capacity of livestock type i (m3 CH4 / kg VS)
 *   VS(i,0) = annual volatile solids excreted by livestock type i         (kg VS / yr)
 *
 * VS(i,0) / VSLT RESOLUTION (ACM0010 v09.0 draft, CDM-MP98-A01, §5.3.1.1-5, pp.14-15)
 *   Precedence per livestock type:
 *   1. annualVolatileSolids supplied directly (kg dm/yr, legacy/supplied total).
 *   2. vsltOption 2 (dietary intake, Eq 3): vsltDietaryIntake provided.
 *        VSLT,y = [GE_LT * (1 - DE_LT/100) + (UE * GE_LT)] * [(1 - ASH)/ED_LT] * nd_y
 *        (GE in MJ/animal/day, DE in %, UE fraction of GE, ASH fraction of dm feed intake,
 *         ED in MJ/kg-dm, nd_y operational days/yr) => kg dm/animal/yr.
 *   3. vsltOption 4 (IPCC default rate form, Eq 5): vsltIpccRate provided.
 *        VSLT,y = VSrate,LT,y/1000 * W_LT,y * nd_y
 *        (VSrate in kg VS per 1000 kg animal mass per day, W in kg, nd_y days) => kg dm/animal/yr.
 *   4. herdParameters (Option 3-style scaling path, implemented pre-existing):
 *        VSLT,y  = (W_site / W_default) * VS_default * nd_y   [kg dm/animal/yr]
 *        N_LT,y  = N_da,y * (N_p,y / 365)                     [animals]
 *        VS_LT,y = N_LT,y * VSLT,y                            [kg dm/yr]
 *      NOTE: ACM0010 v09 draft p.14-15 Eq (4) layout shows "VSdefault VSrate,LT,y/1000"
 *      with both VSdefault and VSrate defined; authoritative term selection is ambiguous
 *      in the extracted/layout text. This existing scaling implementation is retained and
 *      must be confirmed against the governing unambiguous source before being claimed as
 *      exact Eq (4). Not invented.
 *   5. N_LT from vsltNlt (annual average animals) when VSLT per-animal options 2/4 used.
 *
 *   Option 1 (published country-specific daily VS * ndy) can be supplied via annualVolatileSolids
 *   or as a precomputed VSLT with vsltNlt; direct country-data lookup is out of scope. PE_AD/TOOL14
 *   and other external tools remain out of scope.
 *
 * BASELINE N2O (equations 6, 7 and 8)
 *   E_N2O,D,y  = SUM over j of [ EF_N2O,D,j * MS%_Bl,j ] * N_EX_LT,y * N_LT,y
 *   E_N2O,ID,y = SUM over j of [ EF_N2O,ID * MS%_Bl,j * F_gas,m ] * N_EX_LT,y * N_LT,y
 *   BE_N2O,y   = ( E_N2O,D,y + E_N2O,ID,y ) * (44/28) * GWP_N2O / 1000   [t CO2e]
 *
 *   EF_N2O,D,j  direct N2O emission factor for treatment stage j (kg N2O-N/kg N)
 *   EF_N2O,ID   indirect N2O emission factor (kg N2O-N/kg NH3-N and NOx-N)
 *   MS%_Bl,j    fraction of manure handled in baseline system j
 *   F_gas,m     fraction of managed manure nitrogen volatilising as NH3 and NOx
 *   N_EX_LT,y   annual average nitrogen excretion per head (kg N/animal/yr)
 *   N_LT,y      annual average number of animals, from the VS derivation above
 *   44/28       conversion factor from N2O-N to N2O
 *
 *   This block is evaluated ONLY when parameters.globalWarmingPotentialN2O is
 *   supplied. It therefore adds no requirement to documents that do not use it.
 *   N_EX_LT,y is taken as an input; the Annex 2 estimation procedure for it is
 *   deliberately out of scope.
 *
 * STAGE INPUT SHAPE
 *   baselineAwms.stages[] is used when present and non-empty. When it is
 *   absent the single legacy baselineAwms object { name, methaneConversionFactor }
 *   is treated as a one-stage chain with eta = 0, which reproduces the previous
 *   single-stage behaviour exactly. Both shapes are therefore supported and the
 *   one-stage case is bit-identical to the earlier slice.
 *
 * SCOPE OF THIS SLICE (deliberately narrow):
 *   - ONE monitoring year y
 *   - VSLT supplied directly as an input (Option 1, IPCC default value)
 *   N2O, project emissions, leakage, VSLT Options 2-4, the TOOL02 additionality
 *   and baseline-scenario identification, and the digester / flaring / electricity
 *   / fossil-combustion / freight tool equations are all OUT OF SCOPE. Those are
 *   the areas where ACM0010 and the consolidated M0443 are most likely to differ.
 *
 * Guardian sandbox contract (as used by VM0047):
 *   documents : array of submitted VCs, most recent last
 *   done(obj) : emit the output VC payload
 */

// CH4 density at room temperature (20 C) and 1 atm, as stated by ACM0010 for
// parameter DCH4: "0.00067 t/m3 at room temperature (20 C) and 1 atm pressure".
// Confirmed identically in ACM0010 v02 (MP24), v03 (EB35) and v08-draft (MP59).
// This is the single authoritative CH4 density for the whole policy.
const D_CH4_T_PER_M3 = 0.00067;

// The same physical constant expressed in kg/m3 for the baseline methane
// calculation, which works in kg CH4 before converting to t CO2e.
// Derived, never declared independently, so the two cannot drift apart.
const CH4_DENSITY_KG_PER_M3 = D_CH4_T_PER_M3 * 1000; // 0.67 kg CH4/m3

const DAYS_PER_YEAR = 365;

const N2O_N_TO_N2O = 44 / 28;

// IPCC default for aerobic AWMS treatment: aerobic lagoons emit 0.1% of the
// total methane generating potential of the waste processed.
const AEROBIC_METHANE_FRACTION = 0.001;

/**
 * Project-side CH4 emissions from aerobic AWMS treatment, PE_Aer,y.
 *
 *   PE_Aer,y = GWP_CH4 * 0.001 * SUM_i [ VS(i,j_aer) * F_Aer * B0(i) * D_CH4 ]
 *
 * "Methane generating potential" is VS * B0 * density and deliberately carries
 * NO methane conversion factor: MCF scales actual emissions, not potential.
 *
 * Evaluated only when a stage is flagged `aerobicTreatment: true`.
 */
function calculateAerobicProjectEmissions(project, stages, livestockInput, volatileSolidsByType, decayFactors) {
    const aerobicIndexes = [];
    stages.forEach(function (stage, index) {
        if (stage.aerobicTreatment === true) aerobicIndexes.push(index);
    });
    if (aerobicIndexes.length === 0) {
        return null;
    }
    if (aerobicIndexes.length > 1) {
        throw new Error('exactly one baseline stage may be flagged as aerobicTreatment, found '
            + aerobicIndexes.length);
    }

    const stage = stages[aerobicIndexes[0]];
    const directedFraction = stage.volatileSolidsDirectedToAerobicFraction;
    if (!(directedFraction >= 0 && directedFraction <= 1)) {
        throw new Error('volatileSolidsDirectedToAerobicFraction must be within [0, 1] on the aerobic stage');
    }

    const gwp = project.parameters.globalWarmingPotentialCh4;

    // VS reaching the aerobic stage, i.e. after decay through all prior stages.
    let volatileSolidsToAerobicKg = 0;
    let generatingPotentialTCh4 = 0;

    livestockInput.forEach(function (entry, index) {
        const volatileSolidsAtStage = volatileSolidsByType[index] * decayFactors[aerobicIndexes[0]];
        const directed = volatileSolidsAtStage * directedFraction;
        volatileSolidsToAerobicKg += directed;
        // kg VS * m3 CH4/kg VS * t/m3 => t CH4 (units already cancel to tonnes)
        generatingPotentialTCh4 += directed * entry.maxMethaneProducingCapacity * D_CH4_T_PER_M3;
    });

    return {
        aerobicStage: aerobicIndexes[0],
        aerobicStageName: stage.name,
        volatileSolidsDirectedToAerobicFraction: directedFraction,
        volatileSolidsToAerobicKg: volatileSolidsToAerobicKg,
        ch4DensityTPervm3: D_CH4_T_PER_M3,
        aerobicMethaneFraction: AEROBIC_METHANE_FRACTION,
        methaneGeneratingPotentialTCh4: generatingPotentialTCh4,
        globalWarmingPotentialCh4: gwp,
        projectEmissionsAerobicTCo2e: generatingPotentialTCh4 * AEROBIC_METHANE_FRACTION * gwp,
    };
}

/**
 * Baseline N2O emissions: direct (eq. 7), indirect (eq. 8) and total (eq. 6).
 *
 * Evaluated only when parameters.globalWarmingPotentialN2O is present, so the
 * requirement is opt-in and never imposed on CH4-only documents.
 */
function calculateBaselineN2O(project, stages, livestockInput, resolved) {
    const parameters = project.parameters || {};
    const gwpN2O = parameters.globalWarmingPotentialN2O;
    if (gwpN2O === undefined || gwpN2O === null) {
        return null;
    }
    if (!(gwpN2O > 0)) {
        throw new Error('parameters.globalWarmingPotentialN2O must be > 0');
    }

    const efIndirect = parameters.indirectN2OEmissionFactorKgN2ONPerKgN;
    const fractionVolatilised = parameters.fractionNitrogenVolatilised;
    if (!(efIndirect >= 0)) {
        throw new Error('parameters.indirectN2OEmissionFactorKgN2ONPerKgN must be >= 0');
    }
    if (!(fractionVolatilised >= 0 && fractionVolatilised <= 1)) {
        throw new Error('parameters.fractionNitrogenVolatilised must be within [0, 1]');
    }

    // Per-stage manure fraction and direct emission factor.
    let directFactorSum = 0;
    let indirectFactorSum = 0;
    stages.forEach(function (stage, stageIndex) {
        const manureFraction = stage.manureFraction;
        const efDirect = stage.directN2OEmissionFactorKgN2ONPerKgN;

        if (!(manureFraction >= 0 && manureFraction <= 1)) {
            throw new Error('manureFraction must be within [0, 1] at stage ' + stageIndex);
        }
        if (!(efDirect >= 0)) {
            throw new Error('directN2OEmissionFactorKgN2ONPerKgN must be >= 0 at stage ' + stageIndex);
        }

        directFactorSum += efDirect * manureFraction;
        indirectFactorSum += efIndirect * manureFraction * fractionVolatilised;
    });

    // Per livestock type nitrogen excretion and annual average animal count.
    let directKgN2ON = 0;
    let indirectKgN2ON = 0;

    livestockInput.forEach(function (entry, index) {
        const label = entry.type;

        const annualAverageAnimals = resolved[index].annualAverageAnimals;
        if (annualAverageAnimals === null || annualAverageAnimals === undefined) {
            throw new Error('baseline N2O requires the annual average number of animals for livestock '
                + 'type ' + label + '; derive annualVolatileSolids from herdParameters');
        }

        const nitrogenExcretion = entry.nitrogenExcretionKgNPerAnimalYear;
        if (!(nitrogenExcretion >= 0)) {
            throw new Error('nitrogenExcretionKgNPerAnimalYear must be >= 0 for livestock type ' + label);
        }

        const nitrogenKg = nitrogenExcretion * annualAverageAnimals;
        directKgN2ON += nitrogenKg * directFactorSum;
        indirectKgN2ON += nitrogenKg * indirectFactorSum;
    });

    const totalKgN2ON = directKgN2ON + indirectKgN2ON;

    return {
        directEmissionFactorSum: directFactorSum,
        indirectEmissionFactorSum: indirectFactorSum,
        directN2OEmissionsKgN2ON: directKgN2ON,
        indirectN2OEmissionsKgN2ON: indirectKgN2ON,
        totalN2OEmissionsKgN2ON: totalKgN2ON,
        n2oNToN2OConversionFactor: N2O_N_TO_N2O,
        globalWarmingPotentialN2O: gwpN2O,
        baselineN2OEmissionsTCo2e: (totalKgN2ON * N2O_N_TO_N2O * gwpN2O) / 1000,
    };
}

/**
 * Project N2O emissions, PE_N2O,y (ACM0010 v9.0 section 5.4.3).
 *
 *   PE_N2O,y   = GWP_N2O * CF_N2O-N,N / 1000 * ( EN2O,D,y + EN2O,ID,y )
 *   EN2O,D,y   = SUM_LT SUM_j  EF_N2O,D,j  * N_EX_LT,y * N_LT * MS%_j * Pi_{k<j}(1 - RN_k)
 *   EN2O,ID,y  = SUM_LT SUM_j  EF_N2O,ID,j * F_gas,m  * N_EX_LT,y * N_LT * MS%_j * Pi_{k<j}(1 - RN_k)
 *
 * The Pi_{k<j}(1 - RN_k) product is the cumulative nitrogen-reduction factor built
 * by the stage ledger; a stage that supplied no RN applies no reduction of its
 * own. RN is a nitrogen quantity and is never taken from the volatile solids
 * reduction fraction.
 *
 * Option 1 uses the per-stage project manure fraction and emission factors.
 * Option 2 (measured monthly effluent volume and nitrogen concentration) is
 * declared by the methodology to be the preferred option and is not yet
 * implemented here; selecting it fails loudly rather than silently.
 *
 * The option is declared in the PDD and must be used consistently throughout the
 * crediting period, so it is an explicit input rather than something inferred
 * from which fields happen to be present.
 *
 * Returns null when parameters.projectN2OOption is absent, so documents that do
 * not model project N2O are unaffected.
 */
function calculateProjectN2OOption1(project, stages, livestockInput, resolved, nitrogenDecayFactors) {
    const parameters = project.parameters || {};

    const gwpN2O = parameters.globalWarmingPotentialN2O;
    if (gwpN2O === undefined || gwpN2O === null) {
        throw new Error('PE_N2O,y requires parameters.globalWarmingPotentialN2O');
    }
    if (!(gwpN2O > 0)) {
        throw new Error('parameters.globalWarmingPotentialN2O must be > 0');
    }

    const fractionVolatilised = parameters.fractionNitrogenVolatilised;
    if (!(fractionVolatilised >= 0 && fractionVolatilised <= 1)) {
        throw new Error('parameters.fractionNitrogenVolatilised must be within [0, 1]');
    }

    // Per-stage project factors. Unlike the baseline chain these are the project
    // systems, so each is read from its own field and none is defaulted.
    const stageEntries = [];
    stages.forEach(function (stage, stageIndex) {
        const manureFraction = stage.projectManureFraction;
        if (!(manureFraction >= 0 && manureFraction <= 1)) {
            throw new Error('projectManureFraction must be within [0, 1] at stage ' + stageIndex);
        }

        const efDirect = stage.projectDirectN2OEmissionFactorKgN2ONPerKgN;
        if (!(efDirect >= 0)) {
            throw new Error('projectDirectN2OEmissionFactorKgN2ONPerKgN must be >= 0 at stage ' + stageIndex);
        }

        const efIndirect = stage.projectIndirectN2OEmissionFactorKgN2ONPerKgN;
        if (!(efIndirect >= 0)) {
            throw new Error('projectIndirectN2OEmissionFactorKgN2ONPerKgN must be >= 0 at stage ' + stageIndex);
        }

        stageEntries.push({
            stage: stageIndex,
            name: stage.name,
            projectManureFraction: manureFraction,
            projectDirectN2OEmissionFactorKgN2ONPerKgN: efDirect,
            projectIndirectN2OEmissionFactorKgN2ONPerKgN: efIndirect,
            nitrogenDecayFactor: nitrogenDecayFactors[stageIndex],
            manureFractionNitrogenExcretion: 0,
            directN2OEmissionsKgN2ON: 0,
            indirectN2OEmissionsKgN2ON: 0,
        });
    });

    // Per livestock type nitrogen excretion and annual average animal count.
    livestockInput.forEach(function (entry, index) {
        const label = entry.type;

        const annualAverageAnimals = resolved[index].annualAverageAnimals;
        if (annualAverageAnimals === null || annualAverageAnimals === undefined) {
            throw new Error('PE_N2O,y requires the annual average number of animals for livestock '
                + label + '; derive annualVolatileSolids from herdParameters');
        }

        const nitrogenExcretion = entry.nitrogenExcretionKgNPerAnimalYear;
        if (!(nitrogenExcretion >= 0)) {
            throw new Error('nitrogenExcretionKgNPerAnimalYear must be >= 0 for livestock type ' + label);
        }

        const nitrogenKg = nitrogenExcretion * annualAverageAnimals;

        stageEntries.forEach(function (stageEntry) {
            const nitrogenAtStage = nitrogenKg * stageEntry.nitrogenDecayFactor
                * stageEntry.projectManureFraction;
            stageEntry.manureFractionNitrogenExcretion += nitrogenAtStage;
            stageEntry.directN2OEmissionsKgN2ON += nitrogenAtStage * stageEntry.projectDirectN2OEmissionFactorKgN2ONPerKgN;
            stageEntry.indirectN2OEmissionsKgN2ON += nitrogenAtStage * stageEntry.projectIndirectN2OEmissionFactorKgN2ONPerKgN
                * fractionVolatilised;
        });
    });

    let directKgN2ON = 0;
    let indirectKgN2ON = 0;
    stageEntries.forEach(function (stageEntry) {
        directKgN2ON += stageEntry.directN2OEmissionsKgN2ON;
        indirectKgN2ON += stageEntry.indirectN2OEmissionsKgN2ON;
    });

    const totalKgN2ON = directKgN2ON + indirectKgN2ON;

    return {
        option: 'option1',
        stageBreakdown: stageEntries,
        directN2OEmissionsKgN2ON: directKgN2ON,
        indirectN2OEmissionsKgN2ON: indirectKgN2ON,
        totalN2OEmissionsKgN2ON: totalKgN2ON,
        fractionNitrogenVolatilised: fractionVolatilised,
        n2oNToN2OConversionFactor: N2O_N_TO_N2O,
        globalWarmingPotentialN2O: gwpN2O,
        projectN2OEmissionsTCo2e: (totalKgN2ON * N2O_N_TO_N2O * gwpN2O) / 1000,
    };
}

/**
 * Project N2O emissions, PE_N2O,y Option 2 (ACM0010 v9.0 section 5.4.3.2).
 *
 *   EN_N2O,D,y  = SUM_j  EF_N2O,D,j * SUM_{m=1..12} ( V_m,j * [TN]_m,j )
 *   EN_N2O,ID,y = EF_N2O * SUM_{j,m} V_m,j * [TN]_m,j * f_N2O
 *
 * Option 2 is the methodology's preferred option because it is based on actual
 * measurement rather than on modelled nitrogen excretion. Consequences that
 * differ from Option 1 and are deliberate:
 *
 *   - N_EX_LT,y and N_LT are NOT used. Nitrogen arrives as measured mass,
 *     V_m,j * [TN]_m,j, so no animal count or herd derivation is required.
 *   - MS%_j is NOT used. Measured effluent volume already reflects the share
 *     of manure reaching this system.
 *   - The (1 - RN) nitrogen reduction chain is NOT applied. The measured
 *     concentration entering a stage already reflects whatever upstream
 *     nitrogen loss occurred, so applying a modelled reduction again would
 *     double-count it. The stage ledger remains available for Option 1.
 *   - The direct factor EF_N2O,D,j is per stage, but the indirect factor EF_N2O
 *     is a single parameter applied to the summed nitrogen across all stages,
 *     as the methodology defines it.
 *
 * Twelve monthly values are required per stage, January first.
 *
 * Returns null when parameters.projectN2OOption is absent.
 */
function calculateProjectN2OOption2(project, stages) {
    const parameters = project.parameters || {};

    const gwpN2O = parameters.globalWarmingPotentialN2O;
    if (gwpN2O === undefined || gwpN2O === null) {
        throw new Error('PE_N2O,y requires parameters.globalWarmingPotentialN2O');
    }
    if (!(gwpN2O > 0)) {
        throw new Error('parameters.globalWarmingPotentialN2O must be > 0');
    }

    const efIndirect = parameters.projectIndirectN2OEmissionFactorKgN2ONPerKgN;
    if (!(efIndirect >= 0)) {
        throw new Error('parameters.projectIndirectN2OEmissionFactorKgN2ONPerKgN must be >= 0');
    }

    const fractionVolatilised = parameters.fractionNitrogenVolatilised;
    if (!(fractionVolatilised >= 0 && fractionVolatilised <= 1)) {
        throw new Error('parameters.fractionNitrogenVolatilised must be within [0, 1]');
    }

    const MONTHS_IN_YEAR = 12;
    const stageEntries = [];
    let totalNitrogenKg = 0;
    let directKgN2ON = 0;

    stages.forEach(function (stage, stageIndex) {
        const volumes = stage.projectEffluentMonthlyVolumeM3;
        const concentrations = stage.projectEffluentNitrogenConcentrationKgNPerM3;

        if (!Array.isArray(volumes) || volumes.length !== MONTHS_IN_YEAR) {
            throw new Error('projectEffluentMonthlyVolumeM3 must hold exactly 12 monthly values at stage ' + stageIndex);
        }
        if (!Array.isArray(concentrations) || concentrations.length !== MONTHS_IN_YEAR) {
            throw new Error('projectEffluentNitrogenConcentrationKgNPerM3 must hold exactly 12 monthly values at stage ' + stageIndex);
        }

        const efDirect = stage.projectDirectN2OEmissionFactorKgN2ONPerKgN;
        if (!(efDirect >= 0)) {
            throw new Error('projectDirectN2OEmissionFactorKgN2ONPerKgN must be >= 0 at stage ' + stageIndex);
        }

        let stageNitrogenKg = 0;
        for (let m = 0; m < MONTHS_IN_YEAR; m++) {
            const volume = volumes[m];
            const concentration = concentrations[m];
            if (!(volume >= 0) || !isFinite(volume)) {
                throw new Error('projectEffluentMonthlyVolumeM3 must be a finite number >= 0 at stage '
                    + stageIndex + ' month ' + (m + 1));
            }
            if (!(concentration >= 0) || !isFinite(concentration)) {
                throw new Error('projectEffluentNitrogenConcentrationKgNPerM3 must be a finite number >= 0 at stage '
                    + stageIndex + ' month ' + (m + 1));
            }
            stageNitrogenKg += volume * concentration;
        }

        const stageDirectKgN2ON = stageNitrogenKg * efDirect;
        stageEntries.push({
            stage: stageIndex,
            name: stage.name,
            projectDirectN2OEmissionFactorKgN2ONPerKgN: efDirect,
            effluentNitrogenKg: stageNitrogenKg,
            directN2OEmissionsKgN2ON: stageDirectKgN2ON,
        });

        totalNitrogenKg += stageNitrogenKg;
        directKgN2ON += stageDirectKgN2ON;
    });

    const indirectKgN2ON = totalNitrogenKg * efIndirect * fractionVolatilised;
    const totalKgN2ON = directKgN2ON + indirectKgN2ON;

    return {
        option: 'option2',
        stageBreakdown: stageEntries,
        totalEffluentNitrogenKg: totalNitrogenKg,
        directN2OEmissionsKgN2ON: directKgN2ON,
        indirectN2OEmissionsKgN2ON: indirectKgN2ON,
        totalN2OEmissionsKgN2ON: totalKgN2ON,
        projectIndirectN2OEmissionFactorKgN2ONPerKgN: efIndirect,
        fractionNitrogenVolatilised: fractionVolatilised,
        n2oNToN2OConversionFactor: N2O_N_TO_N2O,
        globalWarmingPotentialN2O: gwpN2O,
        projectN2OEmissionsTCo2e: (totalKgN2ON * N2O_N_TO_N2O * gwpN2O) / 1000,
    };
}

/**
 * Dispatch the selected PE_N2O,y option. Fails loudly on an unknown option
 * rather than defaulting to one.
 */
function calculateProjectN2O(project, stages, livestockInput, resolved, nitrogenDecayFactors) {
    const parameters = project.parameters || {};
    const selected = parameters.projectN2OOption;

    if (selected === undefined || selected === null) {
        return null;
    }
    if (selected !== 'option1' && selected !== 'option2') {
        throw new Error('parameters.projectN2OOption must be "option1" or "option2", got ' + selected);
    }
    if (selected === 'option2') {
        return calculateProjectN2OOption2(project, stages);
    }

    return calculateProjectN2OOption1(project, stages, livestockInput, resolved, nitrogenDecayFactors);
}

/**
 * Resolve the annual volatile solids entering the AWMS for one livestock type.
 *
 * Precedence (ACM0010 v09.0 draft, CDM-MP98-A01, §5.3.1.1-5 pp.14-15):
 *   1. annualVolatileSolids supplied directly (kg dm/yr).
 *   2. vsltOption2 (dietary intake, Eq 3) + N_LT source -> annual VS.
 *   3. vsltOption4 (IPCC rate form, Eq 5) + N_LT source -> annual VS.
 *   4. vsltOption3Eq4Scaling or herdParameters (Option 3 scaling, Eq 4 form) -> annual VS.
 *
 * Eq (3): VSLT,y = [GE_LT*(1 - DE_LT/100) + (UE*GE_LT)] * [(1 - ASH)/ED_LT] * nd_y
 * Eq (5): VSLT,y = VSrate,LT,y/1000 * W_LT,y * nd_y
 * N_LT source for options 2/4/3: vsltAnnualAverageAnimals, or derived from herdParameters
 * (daysAliveInYear * animalsProducedAnnually / 365) when provided.
 *
 * Eq (4) (Option 3, scaling default to site average animal weight):
 *   ACM0010 v03/v04 state: VSLT,y = (Wsite / Wdefault) * VSdefault * ndy (kg-dm/animal/yr),
 *   where VSdefault is the default volatile solid excretion per day on a dry-matter basis
 *   (kg-dm/animal/day) sourced from IPCC/US-EPA as specified. ACM0010 v09 draft (CDM-MP98-A01,
 *   p.14-15) presents Eq (4) with a layout where "VSdefault" and "VSrate,LT,y/1000" appear in
 *   the extracted/rendered equation text while the Where-block defines both VSdefault
 *   (kg-dm/animal/day) and VSrate,LT,y (kg VS per 1000 kg animal mass per day); the exact
 *   printed operator/term selection is not unambiguous from extractable text/PDF layout.
 *   Implemented here as the authoritative v03/v04 scaling form, which is unit-consistent and
 *   matches the stated Option 3 intent ("scaling default ... to adjust for a site-specific
 *   average animal weight"). This is surfaced as source 'vsltOption3_eq4_scaling' and requires
 *   confirmation against the final unambiguous v09 rendering for strict Eq (4) conformance claims.
 */
function resolveAnnualAverageAnimalsFromHerd(herd, label) {
    const daysAlive = herd.daysAliveInYear;
    const animalsProduced = herd.animalsProducedAnnually;
    if (!(daysAlive >= 0 && daysAlive <= DAYS_PER_YEAR)) {
        throw new Error('herdParameters.daysAliveInYear must be within [0, 365] for livestock type ' + label);
    }
    if (!(animalsProduced >= 0)) {
        throw new Error('herdParameters.animalsProducedAnnually must be >= 0 for livestock type ' + label);
    }
    return daysAlive * (animalsProduced / DAYS_PER_YEAR);
}

function resolveNLTForVsltOption(entry, label) {
    if (entry.vsltAnnualAverageAnimals !== undefined && entry.vsltAnnualAverageAnimals !== null) {
        if (!(entry.vsltAnnualAverageAnimals >= 0)) {
            throw new Error('vsltAnnualAverageAnimals must be >= 0 for livestock type ' + label);
        }
        return { value: entry.vsltAnnualAverageAnimals, source: 'vsltAnnualAverageAnimals' };
    }
    const herd = entry.herdParameters;
    if (herd && typeof herd === 'object') {
        return { value: resolveAnnualAverageAnimalsFromHerd(herd, label), source: 'herdParameters' };
    }
    throw new Error('vsltOption2/vsltOption4 requires vsltAnnualAverageAnimals or herdParameters (daysAliveInYear, animalsProducedAnnually) for livestock type ' + label);
}

function resolveVolatileSolids(entry) {
    const label = entry.type;

    if (entry.annualVolatileSolids !== undefined && entry.annualVolatileSolids !== null) {
        if (!(entry.annualVolatileSolids >= 0)) {
            throw new Error('annualVolatileSolids must be >= 0 for livestock type ' + label);
        }
        return {
            value: entry.annualVolatileSolids,
            annualAverageAnimals: null,
            derivation: {
                type: label,
                source: 'supplied',
                annualVolatileSolidsKgDm: entry.annualVolatileSolids,
            },
        };
    }

    // Eq (3) Option 2: dietary intake
    if (entry.vsltOption2 !== undefined && entry.vsltOption2 !== null) {
        const o = entry.vsltOption2;
        if (!o || typeof o !== 'object') {
            throw new Error('vsltOption2 must be an object for livestock type ' + label);
        }
        const ge = o.dailyAverageGrossEnergyIntakeMjPerAnimalDay;
        const de = o.digestibleEnergyPercent;
        const ue = o.urinaryEnergyFractionOfGe;
        const ash = o.ashContentFractionOfDryMatterFeedIntake;
        const ed = o.energyDensityOfFeedMjPerKgDm;
        const ndy = o.operationalDaysPerYear;
        if (!(ge >= 0)) throw new Error('vsltOption2.dailyAverageGrossEnergyIntakeMjPerAnimalDay must be >= 0 for livestock type ' + label);
        if (!(de >= 0 && de <= 100)) throw new Error('vsltOption2.digestibleEnergyPercent must be within [0, 100] for livestock type ' + label);
        if (!(ue >= 0 && ue <= 1)) throw new Error('vsltOption2.urinaryEnergyFractionOfGe must be within [0, 1] for livestock type ' + label);
        if (!(ash >= 0 && ash < 1)) throw new Error('vsltOption2.ashContentFractionOfDryMatterFeedIntake must be within [0, 1) for livestock type ' + label);
        if (!(ed > 0)) throw new Error('vsltOption2.energyDensityOfFeedMjPerKgDm must be > 0 for livestock type ' + label);
        if (!(ndy >= 0 && ndy <= DAYS_PER_YEAR)) throw new Error('vsltOption2.operationalDaysPerYear must be within [0, 365] for livestock type ' + label);
        const vsltPerAnimal = (ge * (1 - de / 100) + (ue * ge)) * ((1 - ash) / ed) * ndy;
        const nlt = resolveNLTForVsltOption(entry, label);
        const annualVolatileSolids = nlt.value * vsltPerAnimal;
        return {
            value: annualVolatileSolids,
            annualAverageAnimals: nlt.value,
            derivation: {
                type: label,
                source: 'vsltOption2_eq3',
                equation: 'ACM0010 v09 Eq (3)',
                dailyAverageGrossEnergyIntakeMjPerAnimalDay: ge,
                digestibleEnergyPercent: de,
                urinaryEnergyFractionOfGe: ue,
                ashContentFractionOfDryMatterFeedIntake: ash,
                energyDensityOfFeedMjPerKgDm: ed,
                operationalDaysPerYear: ndy,
                volatileSolidsPerAnimalKgDm: vsltPerAnimal,
                annualAverageAnimals: nlt.value,
                annualAverageAnimalsSource: nlt.source,
                annualVolatileSolidsKgDm: annualVolatileSolids,
            },
        };
    }

    // Eq (5) Option 4: IPCC default rate form
    if (entry.vsltOption4 !== undefined && entry.vsltOption4 !== null) {
        const o = entry.vsltOption4;
        if (!o || typeof o !== 'object') {
            throw new Error('vsltOption4 must be an object for livestock type ' + label);
        }
        const vsRate = o.vsRateKgPer1000KgAnimalMassPerDay;
        const w = o.averageAnimalWeightKg;
        const ndy = o.operationalDaysPerYear;
        if (!(vsRate >= 0)) throw new Error('vsltOption4.vsRateKgPer1000KgAnimalMassPerDay must be >= 0 for livestock type ' + label);
        if (!(w > 0)) throw new Error('vsltOption4.averageAnimalWeightKg must be > 0 for livestock type ' + label);
        if (!(ndy >= 0 && ndy <= DAYS_PER_YEAR)) throw new Error('vsltOption4.operationalDaysPerYear must be within [0, 365] for livestock type ' + label);
        const vsltPerAnimal = (vsRate / 1000) * w * ndy;
        const nlt = resolveNLTForVsltOption(entry, label);
        const annualVolatileSolids = nlt.value * vsltPerAnimal;
        return {
            value: annualVolatileSolids,
            annualAverageAnimals: nlt.value,
            derivation: {
                type: label,
                source: 'vsltOption4_eq5',
                equation: 'ACM0010 v09 Eq (5)',
                vsRateKgPer1000KgAnimalMassPerDay: vsRate,
                averageAnimalWeightKg: w,
                operationalDaysPerYear: ndy,
                volatileSolidsPerAnimalKgDm: vsltPerAnimal,
                annualAverageAnimals: nlt.value,
                annualAverageAnimalsSource: nlt.source,
                annualVolatileSolidsKgDm: annualVolatileSolids,
            },
        };
    }

    // Eq (4) Option 3: scaling default to site-specific average animal weight.
    // Preferred explicit input: vsltOption3Eq4Scaling. Legacy alias: herdParameters (same fields/form).
    const eq4 = (entry.vsltOption3Eq4Scaling !== undefined && entry.vsltOption3Eq4Scaling !== null)
        ? entry.vsltOption3Eq4Scaling
        : entry.herdParameters;
    if (!eq4 || typeof eq4 !== 'object') {
        throw new Error('annualVolatileSolids must be supplied, or herdParameters/vsltOption2/vsltOption3Eq4Scaling/vsltOption4 must be '
            + 'provided to derive it, for livestock type ' + label);
    }

    const herd = eq4;

    const wSite = herd.averageWeightSiteKg;
    const wDefault = herd.defaultWeightKg;
    const vsDefault = herd.volatileSolidsDefaultKgDmPerDay;
    const operationalDays = herd.operationalDaysPerYear;
    const daysAlive = herd.daysAliveInYear;
    const animalsProduced = herd.animalsProducedAnnually;

    if (!(wSite > 0)) {
        throw new Error('herdParameters.averageWeightSiteKg must be > 0 for livestock type ' + label);
    }
    if (!(wDefault > 0)) {
        throw new Error('herdParameters.defaultWeightKg must be > 0 for livestock type ' + label);
    }
    if (!(vsDefault >= 0)) {
        throw new Error('herdParameters.volatileSolidsDefaultKgDmPerDay must be >= 0 for livestock type ' + label);
    }
    if (!(operationalDays >= 0 && operationalDays <= DAYS_PER_YEAR)) {
        throw new Error('herdParameters.operationalDaysPerYear must be within [0, 365] for livestock type ' + label);
    }
    if (!(daysAlive >= 0 && daysAlive <= DAYS_PER_YEAR)) {
        throw new Error('herdParameters.daysAliveInYear must be within [0, 365] for livestock type ' + label);
    }
    if (!(animalsProduced >= 0)) {
        throw new Error('herdParameters.animalsProducedAnnually must be >= 0 for livestock type ' + label);
    }

    const volatileSolidsPerAnimal = (wSite / wDefault) * vsDefault * operationalDays;
    const annualAverageAnimals = daysAlive * (animalsProduced / DAYS_PER_YEAR);
    const annualVolatileSolids = annualAverageAnimals * volatileSolidsPerAnimal;

    const eq4Explicit = entry.vsltOption3Eq4Scaling !== undefined && entry.vsltOption3Eq4Scaling !== null;
    return {
        value: annualVolatileSolids,
        annualAverageAnimals: annualAverageAnimals,
        derivation: {
            type: label,
            source: eq4Explicit ? 'vsltOption3_eq4_scaling' : 'herdParameters',
            equation: 'ACM0010 Option 3 Eq (4) scaling form (v03/v04 aligned; v09 draft p.14 layout ambiguous, see implementation note)',
            averageWeightSiteKg: wSite,
            defaultWeightKg: wDefault,
            volatileSolidsDefaultKgDmPerDay: vsDefault,
            operationalDaysPerYear: operationalDays,
            daysAliveInYear: daysAlive,
            animalsProducedAnnually: animalsProduced,
            volatileSolidsPerAnimalKgDm: volatileSolidsPerAnimal,
            annualAverageAnimals: annualAverageAnimals,
            annualVolatileSolidsKgDm: annualVolatileSolids,
        },
    };
}

function calc() {
    const project = documents[documents.length - 1].document.credentialSubject[0];

    const year = project.monitoringYear;
    const awms = project.baselineAwms;

    // ---- resolve the ordered stage chain -----------------------------------
    // An absent `stages` key falls back to the legacy single-AWMS shape. A
    // `stages` key that is present but empty or malformed is a user error.
    let stages;
    if (Array.isArray(awms.stages)) {
        if (awms.stages.length < 1) {
            throw new Error('at least one baseline AWMS stage must be supplied');
        }
        stages = awms.stages;
    } else {
        stages = [{ name: awms.name, methaneConversionFactor: awms.methaneConversionFactor,
            volatileSolidsReductionFraction: 0 }];
    }

    const livestockInput = project.livestock;
    if (!Array.isArray(livestockInput) || livestockInput.length < 1) {
        throw new Error('at least one livestock type must be supplied');
    }

    // ---- validate and resolve livestock inputs up front -------------------
    // annualVolatileSolids may be supplied directly, or derived from herd
    // parameters. Direct supply takes precedence so that previously submitted
    // documents keep their meaning unchanged.
    const volatileSolidsDerivation = [];
    const volatileSolidsByType = [];

    const resolved = [];
    livestockInput.forEach(function (entry) {
        if (!(entry.maxMethaneProducingCapacity >= 0)) {
            throw new Error('maxMethaneProducingCapacity must be >= 0 for livestock type ' + entry.type);
        }

        const r = resolveVolatileSolids(entry);
        resolved.push(r);
        volatileSolidsByType.push(r.value);
        volatileSolidsDerivation.push(r.derivation);
    });

    // ---- forward pass: volatile solids decay factor per stage --------------
    // decayFactor(j) = PRODUCT over k < j of ( 1 - eta(k) ), so stage 0 is exactly 1.
    //
    // The nitrogen chain below is a SEPARATE, physically distinct quantity.
    // RN is the relative nitrogen reduction of a stage; volatile solids
    // reduction (eta) is a carbon-side quantity. They are never substituted for
    // one another and never share a fallback.
    const stageBreakdown = [];
    const decayFactors = [];
    const nitrogenDecayFactors = [];
    const nitrogenReductionSupplied = [];
    const perTypeTotals = livestockInput.map(function () { return 0; });

    let decayFactor = 1;
    let nitrogenFactor = 1;
    let totalKgCh4 = 0;

    stages.forEach(function (stage, stageIndex) {
        if (!(stage.methaneConversionFactor >= 0 && stage.methaneConversionFactor <= 1)) {
            throw new Error('methaneConversionFactor must be within [0, 1] at stage ' + stageIndex);
        }

        const eta = stage.volatileSolidsReductionFraction === undefined
            ? 0
            : stage.volatileSolidsReductionFraction;
        if (!(eta >= 0 && eta <= 1)) {
            throw new Error('volatileSolidsReductionFraction must be within [0, 1] at stage ' + stageIndex);
        }

        // Relative nitrogen reduction for this stage. Absent RN is NOT read as a
        // methodology-approved zero: the stage is simply recorded as not supplied
        // and applies no reduction of its own. A supplied value must be a finite
        // number in [0, 1]; undefined is never coerced.
        const rnSupplied = stage.relativeNitrogenReduction !== undefined
            && stage.relativeNitrogenReduction !== null;
        const rn = rnSupplied ? stage.relativeNitrogenReduction : 0;
        if (rnSupplied) {
            if (typeof rn !== 'number' || !isFinite(rn)) {
                throw new Error('relativeNitrogenReduction must be a finite number at stage ' + stageIndex);
            }
            if (!(rn >= 0 && rn <= 1)) {
                throw new Error('relativeNitrogenReduction must be within [0, 1] at stage ' + stageIndex);
            }
        }

        let stageVolatileSolids = 0;
        let stageKgCh4 = 0;
        decayFactors.push(decayFactor);
        nitrogenDecayFactors.push(nitrogenFactor);
        nitrogenReductionSupplied.push(rnSupplied);

        livestockInput.forEach(function (entry, typeIndex) {
            const volatileSolidsAtStage = volatileSolidsByType[typeIndex] * decayFactor;
            const kgCh4 = volatileSolidsAtStage * stage.methaneConversionFactor
                * entry.maxMethaneProducingCapacity * CH4_DENSITY_KG_PER_M3;

            stageVolatileSolids += volatileSolidsAtStage;
            stageKgCh4 += kgCh4;
            perTypeTotals[typeIndex] += kgCh4;
        });

        const stageEntry = {
            stage: stageIndex,
            name: stage.name,
            methaneConversionFactor: stage.methaneConversionFactor,
            volatileSolidsReductionFraction: eta,
            volatileSolidsDecayFactor: decayFactor,
            volatileSolidsInKg: stageVolatileSolids,
            methaneEmissionsKgCh4: stageKgCh4,
        };

        // Nitrogen ledger fields are attached only when RN was supplied, so a
        // document that never mentions RN produces byte-identical output to the
        // pre-RN slice.
        if (rnSupplied) {
            stageEntry.relativeNitrogenReduction = rn;
            stageEntry.nitrogenDecayFactor = nitrogenFactor;
        }

        stageBreakdown.push(stageEntry);

        totalKgCh4 += stageKgCh4;

        // decay the volatile solids that reach the next stage
        decayFactor = decayFactor * (1 - eta);
        // decay the nitrogen that reaches the next stage, independently
        nitrogenFactor = nitrogenFactor * (1 - rn);
    });

    const nitrogenStageBreakdown = [];
    stages.forEach(function (stage, stageIndex) {
        if (!nitrogenReductionSupplied[stageIndex]) {
            return;
        }
        nitrogenStageBreakdown.push({
            stage: stageIndex,
            name: stage.name,
            relativeNitrogenReduction: stage.relativeNitrogenReduction,
            nitrogenDecayFactor: nitrogenDecayFactors[stageIndex],
        });
    });

    const perType = livestockInput.map(function (entry, typeIndex) {
        return {
            type: entry.type,
            annualVolatileSolids: volatileSolidsByType[typeIndex],
            maxMethaneProducingCapacity: entry.maxMethaneProducingCapacity,
            baselineMethaneEmissionsKgCh4: perTypeTotals[typeIndex],
        };
    });

    const gwp = project.parameters.globalWarmingPotentialCh4;

    const baselineN2O = calculateBaselineN2O(project, stages, livestockInput, resolved);
    const aerobic = calculateAerobicProjectEmissions(
        project, stages, livestockInput, volatileSolidsByType, decayFactors);

    const output = {
        ref: project.id,
        year: year,
        // Legacy single-value fields. For a multi-stage chain these report the
        // first stage; stageBreakdown is authoritative.
        baselineAwms: stages.map(function (stage) { return stage.name; }).join(' -> '),
        methaneConversionFactor: stages[0].methaneConversionFactor,
        livestockBreakdown: perType,
        baselineMethaneEmissionsKgCh4: totalKgCh4,
        globalWarmingPotentialCh4: gwp,
        baselineMethaneEmissionsTCo2e: (totalKgCh4 * gwp) / 1000,
        stageBreakdown: stageBreakdown,
        volatileSolidsDerivation: volatileSolidsDerivation,
    };

    if (baselineN2O !== null) {
        output.baselineN2O = baselineN2O;
        // Total baseline emissions: CH4 plus N2O, both already in t CO2e.
        output.baselineEmissionsTCo2e = output.baselineMethaneEmissionsTCo2e
            + baselineN2O.baselineN2OEmissionsTCo2e;
    }

    if (aerobic !== null) {
        output.projectEmissionsAerobic = aerobic;
    }

    // Nitrogen stage ledger. Present only when at least one stage supplied RN,
    // so documents that never mention nitrogen reduction are unaffected. This
    // carries stage factors only; no project N2O arithmetic is performed here.
    if (nitrogenStageBreakdown.length > 0) {
        output.nitrogenStageBreakdown = nitrogenStageBreakdown;
    }

    // PE_N2O,y. Present only when parameters.projectN2OOption is declared.
    const projectN2O = calculateProjectN2O(
        project, stages, livestockInput, resolved, nitrogenDecayFactors);
    if (projectN2O !== null) {
        output.projectN2O = projectN2O;
    }

    done(output);
}

calc();