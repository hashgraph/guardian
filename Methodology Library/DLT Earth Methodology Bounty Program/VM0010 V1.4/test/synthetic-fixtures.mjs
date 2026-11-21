/**
 * VM0010 v1.4 — Synthetic Project Fixtures for Offline Development
 *
 * Self-contained synthetic test data for VM0010 Improved Forest Management.
 * All values are independently derived hand-computations from PHASE3-CALCULATION-SPEC.md.
 *
 * These fixtures are for offline testing only — no live Guardian environment required.
 * Project: "Slice Test Forest" — hypothetical IFM conversion project.
 * Monitoring year: 2026 (year t* = 1 of crediting period).
 *
 * Each fixture block includes the equation references and expected results
 * so a reviewer can verify calculations without running Guardian.
 */

export const SYNTHETIC_PROJECT = {
    id: 'vm0010-synthetic-2026-001',
    projectName: 'Slice Test Forest',
    monitoringYear: 2026,
    sectoralScope: '14',
    methodology: 'VM0010 v1.4',
    description: 'Hypothetical IFM conversion from logged to protected forest',
};

/**
 * Eq (1)-(2) Plot Volume — A02 Biomass Factors
 * From PHASE3-CALCULATION-SPEC.md independent tests.
 */
export const PLOT_VOLUME_FIXTURE = {
    // Example: 3 trees in plot, species stratum 1, volumes 0.5, 0.8, 0.3 m3
    treeVolumes: [0.5, 0.8, 0.3], // m3 per tree
    plotArea: 0.04, // ha
    stratumCount: 1,
    speciesCount: 1,
    // Eq (1): V_j,i,sp = SUM V_l,j,i,sp = 0.5 + 0.8 + 0.3 = 1.6 m3 per plot
    expectedPlotVolume: 1.6,
    // Eq (2): V_j,i|BSL = (1/SP) * SUM_sp(V_j,i,sp / A_sp) = (1/1) * (1.6 / 0.04) = 40 m3/ha
    expectedMeanDensity: 40,
};

/**
 * A02 Biomass Factor Construction — BCEF_R = BEF_R * D
 * From PHASE3-CALCULATION-SPEC.md: BEF_R and D validated positive finite.
 */
export const BIOMASS_FACTOR_FIXTURE = {
    befr: 1.25, // BEF_R t.d.m./m3
    d: 0.6, // D t.d.m./m3
    // BCEF_R = 1.25 * 0.6 = 0.75 t.d.m./m3
    expectedBcefR: 0.75,
};

/**
 * Eq (34) Baseline Biomass — B_i,t|PRJ = SUM_j(V_EX,j,i|BSL * BCEF_R)
 * From PHASE3-CALCULATION-SPEC.md independent test for fire disturbance.
 */
export const BASELINE_BIOMASS_FIXTURE = {
    // Single stratum: V_EX = 100 m3/ha, BCEF_R = 0.75
    vEx: 100, // m3/ha
    bcefR: 0.75, // t.d.m./m3
    // B_i,t|PRJ = 100 * 0.75 = 75 tC/ha
    expectedBiomass: 75,
};

/**
 * Eq (40) Corrected Net Emission Reductions
 * From PHASE3-CALCULATION-SPEC.md line 392:
 *   C_FUEL=20, BSL=-100, PRJ=-10, LF=0.4, U=0.2 -> 110*0.6*0.8 = 52.8 tCO2e
 */
export const EQ40_FIXTURE = {
    cFuel: 20, // tCO2e
    dcNetBsl: -100, // tCO2e (DC_NET|BSL,t*)
    dcNetPrj: -10, // tCO2e (DC_NET|PRJ)
    lfMe: 0.4,
    uTotal: 0.2,
    // numerator = 20 - MIN(0,-100) + MIN(0,-10) = 20 - (-100) + (-10) = 110
    expectedErNumerator: 110,
    expectedErTco2e: 52.8, // 110 * (1-0.4) * (1-0.2) = 110 * 0.6 * 0.8
};

/**
 * Eq (41) Corrected Net Removals
 * From PHASE3-CALCULATION-SPEC.md line 400:
 *   PRJ=100, BSL=20, U=0.2 -> 64 tCO2e
 * Note: NO LF multiplier per methodology (line 398).
 */
export const EQ41_FIXTURE = {
    dcNetBsl: 20, // tCO2e (DC_NET|BSL,t*)
    dcNetPrj: 100, // tCO2e (DC_NET|PRJ)
    uTotal: 0.2,
    // numerator = MAX(0,100) - MAX(0,20) = 100 - 20 = 80
    expectedCrNumerator: 80,
    expectedCrTco2e: 64, // 80 * (1-0.2) = 64
};

/**
 * Eq (42) Combined Uncertainty
 * From PHASE3-CALCULATION-SPEC.md line 408:
 *   U_PRJ=0.12, U_BSL=0.16 -> SQRT(0.12^2 + 0.16^2) = SQRT(0.0144+0.0256) = SQRT(0.04) = 0.20
 *   U_PRJ=0.09, U_BSL=0.12 -> SQRT(0.09^2 + 0.12^2) = SQRT(0.0081+0.0144) = SQRT(0.0225) = 0.15
 */
export const EQ42_FIXTURE_A = { uPrj: 0.12, uBsl: 0.16, expectedUTotal: 0.20 };
export const EQ42_FIXTURE_B = { uPrj: 0.09, uBsl: 0.12, expectedUTotal: 0.15 };

/**
 * Eq (43) Removals Buffer — Bu_CR,t* = [MAX(0,DC_NET|PRJ) - MAX(0,C_NET|BSL,t*)] * NPR%
 * From PHASE3-CALCULATION-SPEC.md line 416:
 *   PRJ=100, BSL=20, NPR=0.20 -> 16 tCO2e buffer
 * NOTE: Uses C_NET|BSL,t* (cNetBsl), NOT DC_NET|BSL,t* (dcNetBsl).
 * These are distinct variables per PHASE3 spec line 412.
 */
export const EQ43_FIXTURE = {
    dcNetPrj: 100,
    cNetBsl: 20, // C_NET|BSL,t* — distinct from dcNetBsl
    nprPct: 0.20,
    // [MAX(0,100) - MAX(0,20)] * 0.20 = [100 - 20] * 0.20 = 80 * 0.20 = 16
    expectedBuCrTco2e: 16,
};

/**
 * Eq (44) Reductions Buffer — Bu_ER,t* = [MIN(0,DC_NET|PRJ) - MIN(0,C_NET|BSL,t*)] * NPR%
 * From PHASE3-CALCULATION-SPEC.md line 424:
 *   PRJ=-10, BSL=-100, NPR=0.20 -> 18 tCO2e
 *   Reversed changes: PRJ=-100, BSL=-10 -> -18 (review case)
 */
export const EQ44_FIXTURE_A = {
    dcNetPrj: -10,
    cNetBsl: -100,
    nprPct: 0.20,
    // [MIN(0,-10) - MIN(0,-100)] * 0.20 = [-10 - (-100)] * 0.20 = 90 * 0.20 = 18
    expectedBuErTco2e: 18,
};

export const EQ44_FIXTURE_B = {
    dcNetPrj: -100,
    cNetBsl: -10,
    nprPct: 0.20,
    // [MIN(0,-100) - MIN(0,-10)] * 0.20 = [-100 - (-10)] * 0.20 = -90 * 0.20 = -18
    expectedBuErTco2e: -18, // review case — negative buffer
};

/**
 * Eq (45) Removals VCUs — VCU_CR,t* = CR_t* - Bu_CR,t*
 * From PHASE3-CALCULATION-SPEC.md line 432: 64-16 -> 48
 */
export const EQ45_FIXTURE = {
    crTco2e: 64, // from Eq (41) fixture
    buCrTco2e: 16, // from Eq (43) fixture
    expectedVcuCrTco2e: 48,
};

/**
 * Eq (46) Reductions VCUs — VCU_ER,t* = ER_t* - Bu_ER,t*
 * From PHASE3-CALCULATION-SPEC.md line 440: 52.8-18 -> 34.8
 *   do not silently floor to 34
 */
export const EQ46_FIXTURE = {
    erTco2e: 52.8, // from Eq (40) fixture
    buErTco2e: 18, // from Eq (44) fixture A
    expectedVcuErTco2e: 34.8,
};

/**
 * Complete chain fixture — all equations together
 * Combines Eq (40)->(41)->(43)->(44)->(45)->(46) end-to-end
 */
export const COMPLETE_CHAIN_FIXTURE = {
    id: 'vm0010-complete-chain-2026',
    projectName: 'Complete Chain Test Forest',
    monitoringYear: 2026,
    // Eq (40) inputs
    cFuel: 20,
    dcNetBsl: -100,
    dcNetPrj: -10,
    lfMe: 0.4,
    uTotal: 0.2,
    // Eq (41) inputs (same dcNetBsl/dcNetPrj)
    // Eq (43)-(44) inputs — NOTE cNetBsl distinct from dcNetBsl
    cNetBsl: 20,
    nprPct: 0.20,
    // Expected Eq (40): ER_t* = [20 - (-100) + (-10)] * 0.6 * 0.8 = 110 * 0.48 = 52.8
    expectedErTco2e: 52.8,
    // Expected Eq (41): CR_t* = [MAX(0,-10) - MAX(0,-100)] * 0.8 = [0 - 0] * 0.8 = 0
    expectedCrTco2e: 0,
    // Expected Eq (43): Bu_CR = [MAX(0,-10) - MAX(0,20)] * 0.20 = [0 - 20] * 0.20 = -4
    expectedBuCrTco2e: -4,
    // Expected Eq (44): Bu_ER = [MIN(0,-10) - MIN(0,20)] * 0.20 = [-10 - 0] * 0.20 = -2
    expectedBuErTco2e: -2,
    // Expected Eq (45): VCU_CR = 0 - (-4) = 4
    expectedVcuCrTco2e: 4,
    // Expected Eq (46): VCU_ER = 52.8 - (-2) = 54.8
    expectedVcuErTco2e: 54.8,
};

/**
 * Invalid input fixtures — each should cause the expression to throw.
 */
export const INVALID_FIXTURES = {
    missingFuel: { description: 'Eq (40) missing C_FUEL', missingKey: 'cFuel' },
    negativeFuel: { description: 'Eq (40) C_FUEL = -5', key: 'cFuel', value: -5 },
    invalidLfMe: { description: 'Eq (40) LF_ME = 1.5', key: 'lfMe', value: 1.5 },
    invalidUTotal: { description: 'Eq (40) U_TOTAL = 1.5', key: 'uTotal', value: 1.5 },
    invalidNprPctHigh: { description: 'Eq (43) NPR_PCT = 1.5', key: 'nprPct', value: 1.5 },
    invalidNprPctLow: { description: 'Eq (43) NPR_PCT = -0.1', key: 'nprPct', value: -0.1 },
};