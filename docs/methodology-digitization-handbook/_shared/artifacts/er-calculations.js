const SOIL_INSITU_APPROACH = ['Proxies', 'Field-collected data', 'Others'];
const SOIL_N2O_APPROACH = ['Proxies', 'IPCC emission factors', 'Others'];
const SOIL_CH4_APPROACH = ['Proxies', 'IPCC emission factors', 'Others'];
const const_12_by_44 = 0.2727272727272727; // 12/44
const const_44_by_12 = 3.6666666666666665; // 44/12

function adjustValues(document) {
    return document;
}

function getStartYear(yearlyDataArray) {
    if (!yearlyDataArray || yearlyDataArray.length === 0) return null;
    // Find the minimum value of year_t
    return Math.min(...yearlyDataArray.map(rec => Number(rec.year_t)));
}

function getProjectBoundaryValue(data, key) {
    return data.project_boundary_baseline_scenario?.[key]?.included ??
        data.project_boundary_project_scenario?.[key]?.included ??
        undefined;
}

function getQuantificationValue(data, key) {
    return data?.quantification_approach?.[key] ?? undefined;
}

function getIndividualParam(data, key) {
    return data?.individual_parameters?.[key] ?? undefined;
}

function getMonitoringValue(data, key) {
    return data?.monitoring_period_inputs?.[key] ?? undefined;
}

function getWoodProductValue(data, key) {
    return data?.project_boundary?.project_boundary_project_scenario?.project_wood_products?.wood_product_project_scenario?.[key] ?? undefined;
}

function processMonitoringSubmergence(subInputs = {}) {
    const years = subInputs.submergence_monitoring_data ?? [];

    for (const yrRec of years) {
        const { monitoring_year, submergence_measurements_for_each_stratum: strata = [] } = yrRec;

        for (const s of strata) {
            const {
                stratum_i,
                is_submerged,
                submergence_T,
                area_submerged_percentage,
                C_BSL_agbiomass_i_t_ar_tool_14,
                C_BSL_agbiomass_i_t_to_T_ar_tool_14,
                delta_C_BSL_agbiomass_i_t
            } = s;

            if (is_submerged) {
                const tempDelta = (C_BSL_agbiomass_i_t_ar_tool_14 - C_BSL_agbiomass_i_t_to_T_ar_tool_14) / submergence_T;
                const tempDeltaFinal = tempDelta * area_submerged_percentage;
                if (tempDeltaFinal < 0) {
                    s.delta_C_BSL_agbiomass_i_t = 0;
                } else {
                    s.delta_C_BSL_agbiomass_i_t = tempDeltaFinal;
                }
            } else {
                s.delta_C_BSL_agbiomass_i_t = 0;
            }
        }
    }
}

function getDeltaCBSLAGBiomassForStratumAndYear(
    subInputs = {},
    stratumId,
    year
) {
    const results = [];

    for (const yrRec of subInputs.submergence_monitoring_data ?? []) {
        // Walk every monitoring-year record
        for (const s of yrRec.submergence_measurements_for_each_stratum ?? []) {
            if (String(s.stratum_i) === String(stratumId) && (year < yrRec.monitoring_year)) {
                results.push({
                    year: yrRec.monitoring_year,
                    delta: s.delta_C_BSL_agbiomass_i_t,
                });
            }
        }
    }

    return results.length ? results : [{ year: null, delta: 0 }];
}



function computeDeductionAllochBaseline(params) {
    const {
        baseline_soil_SOC,
        soil_insitu_approach,
        soil_type, // soil type
        AU5,
        AV5,
        BB5
    } = params;

    if (baseline_soil_SOC !== true) return 0;
    if (soil_type === "Peatsoil") return 0;

    const fraction = AV5 / 100;

    if (soil_insitu_approach === "Proxies" || soil_insitu_approach === "Field-collected data") {
        return AU5 * fraction;
    }

    return BB5 * fraction;
}

function computeDeductionAllochProject(params) {
    const {
        project_soil_SOC,
        soil_insitu_approach,
        soil_type, // soil type
        AK5,
        AL5,
        AR5
    } = params;

    if (project_soil_SOC !== true) return 0;
    if (soil_type === "Peatsoil") return 0;

    const fraction = AL5 / 100;

    if (soil_insitu_approach === "Proxies" || soil_insitu_approach === "Field-collected data") {
        return AK5 * fraction;
    }

    return AR5 * fraction;
}


function getFireReductionPremiumPerYear(data, year_t) {
    return (data ?? [])
        .find(r => String(r.year_t) === String(year_t))
        ?.fire_reduction_premium_per_year ?? 0;
}

function getGHGBSL(data, year_t) {
    return (data ?? [])
        .find(r => String(r.year_t) === String(year_t))
        ?.GHG_BSL ?? 0;
}

function getGHGWPS(data, year_t) {
    return (data ?? [])
        .find(r => String(r.year_t) === String(year_t))
        ?.GHG_WPS ?? 0;
}

function getGHGBSLBiomass(data, year_t) {
    return (data ?? [])
        .find(r => String(r.year_t) === String(year_t))
        ?.GHG_BSL_biomass ?? 0;
}

function getGHGWPSBiomass(data, year_t) {
    return (data ?? [])
        .find(r => String(r.year_t) === String(year_t))
        ?.GHG_WPS_biomass ?? 0;
}

function calculateNetERRChange(O6, O5, T6, T5, U6) {
    if (O6 - O5 === 0) {
        return 0;
    }
    return (T6 - T5) * U6;
}

function calculateNetVCU(O6, O5, V6) {
    return (O6 - O5) - V6;
}

function calculatePDTSDT(baseline, isProjectQuantifyBSLReduction, temporalBoundary, crediting_period) {
    if (isProjectQuantifyBSLReduction) {
        // Always work on the *earliest* year, regardless of array order
        const baselineEmissionsSorted = (baseline.yearly_data_for_baseline_GHG_emissions || [])
            .slice() // Prevent mutation of original array
            .sort((a, b) => a.year_t - b.year_t);

        if (!baselineEmissionsSorted.length) return;

        baselineEmissionsSorted[0].annual_stratum_parameters.forEach(stratum => {
            const sc = stratum.stratum_characteristics ?? {};
            const asl = stratum.annual_stratum_level_parameters ?? {};

            const META_PEAT = {
                type: temporalBoundary[0]?.peat_depletion_time?.type,
                '@context': temporalBoundary[0]?.peat_depletion_time?.['@context'] ?? [],
            };

            const META_SDT = {
                type: temporalBoundary[0]?.soil_organic_carbon_depletion_time?.type,
                '@context': temporalBoundary[0]?.soil_organic_carbon_depletion_time?.['@context'] ?? [],
            };

            const META_TEMPORAL = {
                type: temporalBoundary?.[0]?.type,
                '@context': temporalBoundary?.[0]?.['@context'] ?? [],
            };

            const {
                soil_disturbance_type,
                drained_20_yr,
                significant_soil_erosion_as_non_peat_soil,
                RateCloss_BSL_i
            } = sc;

            let SDT = {};
            let PDT = {};

            SDT.CBSL_i_t0 =
                (isProjectQuantifyBSLReduction && sc.is_project_quantify_BSL_reduction)
                    ? sc.depth_soil_i_t0 * sc.VC_I_mineral_soil_portion * 10
                    : 0;

            if (isProjectQuantifyBSLReduction && sc.is_project_quantify_BSL_reduction) {
                if (significant_soil_erosion_as_non_peat_soil || drained_20_yr) {
                    SDT.t_SDT_BSL_i = 0;
                } else {
                    const duration = crediting_period - (sc.soil_type_t0 === 'Peatsoil'
                        ? (sc.depth_peat_i_t0 / sc.Ratepeatloss_BSL_i)
                        : 0
                    );
                    if (duration > 0) {
                        SDT.t_SDT_BSL_i = soil_disturbance_type === "Erosion"
                            ? 5
                            : (RateCloss_BSL_i !== 0 ? SDT.CBSL_i_t0 / RateCloss_BSL_i : 0); // avoid division by zero
                    }
                }
            } else {
                SDT.t_SDT_BSL_i = 0;
            }

            if (sc.soil_type_t0 === 'Peatsoil' && sc.is_project_quantify_BSL_reduction) {
                PDT.t_PDT_BSL_i = sc.depth_peat_i_t0 / sc.Ratepeatloss_BSL_i;
                PDT.start_PDT = 0;
                PDT.end_PDT = PDT.t_PDT_BSL_i;
            } else {
                PDT.t_PDT_BSL_i = 0;
                PDT.start_PDT = 0;
                PDT.end_PDT = 0;
            }

            SDT.start_PDT = PDT.start_PDT;
            SDT.end_PDT = Math.min(PDT.end_PDT, crediting_period);

            if (SDT.t_SDT_BSL_i > 0) {
                SDT.start_SDT = SDT.end_PDT;
            } else {
                SDT.start_SDT = 0;
            }

            SDT.end_SDT = SDT.start_SDT + SDT.t_SDT_BSL_i;

            temporalBoundary.push({
                stratum_i: stratum.stratum_i,
                peat_depletion_time: {
                    "t_PDT_BSL_i": PDT.t_PDT_BSL_i,
                    "start_PDT": PDT.start_PDT,
                    "end_PDT": PDT.end_PDT,
                    ...META_PEAT,
                },
                soil_organic_carbon_depletion_time: {
                    "t_SDT_BSL_i": SDT.t_SDT_BSL_i,
                    'CBSL_i_t0': SDT.CBSL_i_t0,
                    "start_SDT": SDT.start_SDT,
                    "end_SDT": SDT.end_SDT,
                    "start_PDT": SDT.start_PDT,
                    "end_PDT": SDT.end_PDT,
                    ...META_SDT,
                },
                ...META_TEMPORAL
            });
        });

        temporalBoundary.shift();
    }
}

function getEndPDTPerStratum(temporal_boundary, stratum_i) {
    const stratumTemporalBoundary = temporal_boundary.find(
        (boundary) => boundary.stratum_i === stratum_i
    );

    if (stratumTemporalBoundary) {
        return stratumTemporalBoundary.soil_organic_carbon_depletion_time.end_PDT;
    }

    return 0;
}

function getEndSDTPerStratum(temporal_boundary, stratum_i) {
    const stratumTemporalBoundary = temporal_boundary.find(
        (boundary) => boundary.stratum_i === stratum_i
    );

    if (stratumTemporalBoundary) {
        return stratumTemporalBoundary.soil_organic_carbon_depletion_time.end_SDT;
    }

    return 0;
}

function calculate_peat_strata_input_coverage_100_years(data, strata) {
    const sum_of_100_years = data
        .filter(row => row.stratum_i === strata)
        .reduce((acc, row) => {
            return acc + (row.ratepeatloass_WPS_i_t || 0); // default to 0 if value is undefined
        }, 0);

    return sum_of_100_years;
}

function calculate_non_peat_strata_input_coverage_100_years(data, strata) {
    const sum_of_100_years = data
        .filter(row => row.stratum_i === strata)
        .reduce((acc, row) => {
            return acc + (row.rateCloss_WPS_i_t || 0); // default to 0 if value is undefined
        }, 0);

    return sum_of_100_years;
}

function getCBSL_i_t0(temporalBoundary = [], strata) {
    const rec = temporalBoundary.find(
        r => String(r.stratum_i) === String(strata)
    );
    return rec?.soil_organic_carbon_depletion_time?.CBSL_i_t0 ?? 0;
}


function calculateRemainingPercentage(match, D41) {
    try {
        if (!match || match === 0) throw new Error("Invalid or zero denominator");

        return 100 - (D41 / match);
    } catch {
        return 100;
    }
}



function totalStockApproach(
    baseline,
    total_stock_approach_parameters,
    peat_strata_input_coverage_100_years,
    non_peat_strata_input_coverage_100_years,
    temporal_boundary
) {
    let sumWPS = 0;   // Σ C_WPS_i_t100 × A_WPS_i_t100
    let sumBSL = 0;   // Σ C_BSL_i_t100 × A_BSL_i_t100

    // ── iterate over each stratum in the first-year baseline record ──
    baseline.yearly_data_for_baseline_GHG_emissions[0].annual_stratum_parameters
        .forEach((stratum) => {
            const { stratum_i } = stratum;
            const charac = stratum.stratum_characteristics ?? {};

            // ---------- guard against undefined / non-numeric inputs ----------
            const depth_peat_i_t0 = Number(charac.depth_peat_i_t0) || 0;
            const VC_I_peat_portion = Number(charac.VC_I_peat_portion) || 0;
            const VC_I_mineral_soil_portion = Number(charac.VC_I_mineral_soil_portion) || 0;
            const Ratepeatloss_BSL_i = Number(charac.Ratepeatloss_BSL_i) || 0;
            const RateCloss_BSL_i = Number(charac.RateCloss_BSL_i) || 0;
            const A_WPS_i_t100 = Number(charac.A_WPS_i_t100) || 0;
            const A_BSL_i_t100 = Number(charac.A_BSL_i_t100) || 0;

            // ---------- derived quantities ----------
            const depth_peat_WPS_t100 =
                depth_peat_i_t0 -
                calculate_peat_strata_input_coverage_100_years(
                    peat_strata_input_coverage_100_years,
                    stratum_i
                );

            const C_WPS_i_t100_organic_soil =
                charac.soil_type_t0 === "Peatsoil"
                    ? depth_peat_WPS_t100 * VC_I_peat_portion * 10
                    : 0;

            const C_WPS_i_t100_mineral_soil =
                getCBSL_i_t0(temporal_boundary, stratum_i) -
                calculate_non_peat_strata_input_coverage_100_years(
                    non_peat_strata_input_coverage_100_years,
                    stratum_i
                );

            const C_WPS_i_t100 =
                C_WPS_i_t100_organic_soil + C_WPS_i_t100_mineral_soil;

            const depth_peat_BSL_t100 =
                depth_peat_i_t0 - 100 * Ratepeatloss_BSL_i;

            const C_BSL_i_t100_organic_soil =
                charac.soil_type_t0 === "Peatsoil"
                    ? depth_peat_BSL_t100 * VC_I_peat_portion * 10
                    : 0;

            const remaining_years_after_peat_depletion_BSL =
                calculateRemainingPercentage(Ratepeatloss_BSL_i, depth_peat_i_t0);

            const C_BSL_i_t100_mineral_soil =
                getCBSL_i_t0(temporal_boundary, stratum_i) -
                remaining_years_after_peat_depletion_BSL * RateCloss_BSL_i;

            const C_BSL_i_t100 =
                charac.soil_type_t0 === "Peatsoil"
                    ? C_BSL_i_t100_organic_soil
                    : C_BSL_i_t100_mineral_soil;

            // ---------- accumulate sums ----------
            sumWPS += C_WPS_i_t100 * A_WPS_i_t100;
            sumBSL += C_BSL_i_t100 * A_BSL_i_t100;

            // ---------- push per-stratum record ----------
            total_stock_approach_parameters.push({
                stratum_i,
                C_WPS_i_t100,
                depthpeat_WPS_i_t100: Math.max(depth_peat_WPS_t100, 0),
                C_WPS_i_t100_organic_soil,
                C_WPS_i_t100_mineral_soil: Math.max(C_WPS_i_t100_mineral_soil, 0),
                Depthpeat_BSL_i_t100: Math.max(depth_peat_BSL_t100, 0),
                C_BSL_i_t100_organic_soil,
                remaining_years_after_peat_depletion_BSL,
                C_BSL_i_t100_mineral_soil:
                    Math.max(
                        getCBSL_i_t0(temporal_boundary, stratum_i) -
                        100 * RateCloss_BSL_i,
                        0
                    ),
                C_BSL_i_t100,
                type: total_stock_approach_parameters?.[0]?.type,
                "@context": total_stock_approach_parameters?.[0]?.["@context"] ?? [],
            });
        });

    // drop the template element that lives at index 0
    total_stock_approach_parameters.shift();

    // ---------- decide if wetland carbon stocks are ≥ 105 % ----------
    const condition = sumWPS >= sumBSL * 1.05;

    return {
        condition,
        sumWPS,
        sumBSL,
        diff: condition ? sumWPS - sumBSL : 0,
    };
}


function stockLossApproach(baseline, stock_loss_approach_parameters, peat_strata_input_coverage_100_years, non_peat_strata_input_coverage_100_years, temporal_boundary) {
    baseline.yearly_data_for_baseline_GHG_emissions[0].annual_stratum_parameters.forEach(stratum => {
        const { stratum_i } = stratum;
        const META = {
            type: stock_loss_approach_parameters?.[0]?.type,
            '@context': stock_loss_approach_parameters?.[0]?.['@context'] ?? [],
        };

        const total_peat_volume_loss = calculate_peat_strata_input_coverage_100_years(peat_strata_input_coverage_100_years, stratum_i) * stratum.stratum_characteristics.VC_I_peat_portion;
        const Closs_BSL_t100_organic_soil = 10 * 100 * (stratum.stratum_characteristics.Ratepeatloss_BSL_i * stratum.stratum_characteristics.VC_I_peat_portion);
        const Closs_WPS_t100_organic_soil = 10 * total_peat_volume_loss;
        const total_carbon_loss_volume = calculate_non_peat_strata_input_coverage_100_years(non_peat_strata_input_coverage_100_years, stratum_i) * stratum.stratum_characteristics.VC_I_mineral_soil_portion;
        const Closs_BSL_t100_mineral_soil = 10 * 100 * (stratum.stratum_characteristics.RateCloss_BSL_i * stratum.stratum_characteristics.VC_I_mineral_soil_portion);
        const Closs_WPS_t100_mineral_soil = 10 * total_carbon_loss_volume;
        const Closs_BSL_i_t100 = stratum.stratum_characteristics.soil_type_t0 === 'Peatsoil' ? Closs_BSL_t100_organic_soil : Closs_BSL_t100_mineral_soil;
        const Closs_WPS_i_t100 = stratum.stratum_characteristics.soil_type_t0 === 'Peatsoil' ? Closs_WPS_t100_organic_soil : Closs_WPS_t100_mineral_soil;
        const total_baseline_carbon_loss = Closs_BSL_i_t100 * stratum.stratum_characteristics.A_BSL_i;
        const total_project_carbon_loss = Closs_WPS_i_t100 * stratum.stratum_characteristics.A_WPS_i;

        stock_loss_approach_parameters.push({
            "stratum_i": stratum_i,
            "total_peat_volume_loss": total_peat_volume_loss,
            "Closs_BSL_t100_organic_soil": Closs_BSL_t100_organic_soil,
            "Closs_WPS_t100_organic_soil": Closs_WPS_t100_organic_soil,
            "total_carbon_loss_volume": total_carbon_loss_volume,
            "Closs_BSL_t100_mineral_soil": Closs_BSL_t100_mineral_soil,
            "Closs_WPS_t100_mineral_soil": Closs_WPS_t100_mineral_soil,
            "Closs_BSL_i_t100": Closs_BSL_i_t100,
            "Closs_WPS_i_t100": Closs_WPS_i_t100,
            "total_baseline_carbon_loss": total_baseline_carbon_loss,
            "total_project_carbon_loss": total_project_carbon_loss,
            ...META
        })

    })
    stock_loss_approach_parameters.shift();

    const total_baseline_carbon_loss_sum = stock_loss_approach_parameters.reduce((acc, curr) => acc + curr.total_baseline_carbon_loss, 0);
    const total_project_carbon_loss_sum = stock_loss_approach_parameters.reduce((acc, curr) => acc + curr.total_project_carbon_loss, 0);

    return {
        total_baseline_carbon_loss_sum: total_baseline_carbon_loss_sum,
        total_project_carbon_loss_sum: total_project_carbon_loss_sum,
        diff: total_baseline_carbon_loss_sum - total_project_carbon_loss_sum
    }
}

function SOC_MAX_calculation(baseline, peat_strata_input_coverage_100_years, non_peat_strata_input_coverage_100_years, temporal_boundary, approach, ineligible_wetland_areas) {
    if (approach === 'Total stock approach') {
        ineligible_wetland_areas.SOC_MAX = totalStockApproach(baseline, ineligible_wetland_areas.total_stock_approach_parameters, peat_strata_input_coverage_100_years, non_peat_strata_input_coverage_100_years, temporal_boundary).diff
    } else {
        ineligible_wetland_areas.SOC_MAX = stockLossApproach(baseline, ineligible_wetland_areas.stock_loss_approach_parameters, peat_strata_input_coverage_100_years, non_peat_strata_input_coverage_100_years, temporal_boundary).diff
    }
}


function processBaselineEmissions(baseline, crediting_period, baseline_soil_CH4, soil_CH4_approach, GWP_CH4, baseline_soil_N2O, soil_N2O_approach, GWP_N2O, monitoring_submergence_data, temporal_boundary) {

    // loop through every monitoring year -------------------------------------
    for (const yearRec of baseline.yearly_data_for_baseline_GHG_emissions ?? []) {
        const { year_t } = yearRec;



        // ---- per-stratum loop -------------------------------------------------
        for (const stratum of yearRec.annual_stratum_parameters ?? []) {
            const { stratum_i } = stratum;

            const sc = stratum.stratum_characteristics ?? {};
            const asl = stratum.annual_stratum_level_parameters ?? {};

            asl.delta_CTREE_BSL_i_t_ar_tool_14 = stratum.ar_tool_14.delta_C_TREE;
            asl.delta_CSHRUB_BSL_i_t_ar_tool_14 = stratum.ar_tool_14.delta_C_SHRUB;
            asl.ET_FC_I_t_ar_tool_5_BSL = stratum.ar_tool_05.ET_FC_y;
            const isProjectQuantifyBSLReduction = sc.is_project_quantify_BSL_reduction

            // Baseline emissions calculations

            if (asl.is_aboveground_non_tree_biomass) {
                asl.delta_CSHRUB_BSL_i_t_ar_tool_14 = 0;
            }

            asl.delta_C_BSL_tree_or_shrub_i_t = const_12_by_44 * (asl.delta_CTREE_BSL_i_t_ar_tool_14 + asl.delta_CSHRUB_BSL_i_t_ar_tool_14);

            if (asl.is_aboveground_non_tree_biomass) {
                asl.delta_C_BSL_herb_i_t = 0;
            }

            // Net GHG emissions from soil in baseline scenario

            if (asl.is_soil) {
                const method = sc.co2_emissions_from_soil;

                switch (method) {
                    case "Field-collected data":
                        asl.GHGBSL_soil_CO2_i_t = -(const_44_by_12 * asl.delta_C_BSL_soil_i_t);
                        break;

                    case "Proxies":
                        asl.GHGBSL_soil_CO2_i_t = asl.GHG_emission_proxy_GHGBSL_soil_CO2_i_t;
                        break;

                    default:
                        asl.GHGBSL_soil_CO2_i_t =
                            (asl.GHGBSL_insitu_CO2_i_t ?? 0) +
                            (asl.GHGBSL_eroded_CO2_i_t ?? 0) +
                            (asl.GHGBSL_excav_CO2_i_t ?? 0);
                }
            } else {
                asl.GHGBSL_soil_CO2_i_t = 0;
            }

            asl.Deduction_alloch = computeDeductionAllochBaseline({
                baseline_soil_SOC: asl.is_soil,
                soil_insitu_approach: sc.co2_emissions_from_soil,
                soil_type: sc.soil_type_t0,
                AU5: asl.GHGBSL_soil_CO2_i_t,
                AV5: asl.is_soil ? asl.percentage_C_alloch_BSL : 0,
                BB5: (asl.is_soil && sc.co2_emissions_from_soil === "Others") ? asl.GHGBSL_insitu_CO2_i_t : 0
            });

            // CH4 emissions from soil

            if (baseline_soil_CH4) {
                const method = soil_CH4_approach;

                switch (method) {
                    case "IPCC emission factors":
                        asl.GHGBSL_soil_CH4_i_t = asl.IPCC_emission_factor_ch4_BSL * GWP_CH4;
                        break;

                    case "Proxies":
                        asl.GHGBSL_soil_CH4_i_t = asl.GHG_emission_proxy_ch4_BSL * GWP_CH4;
                        break;

                    default:
                        asl.GHGBSL_soil_CH4_i_t = asl.CH4_BSL_soil_i_t * GWP_CH4;
                }
            } else {
                asl.GHGBSL_soil_CH4_i_t = 0;
            }

            // N2O emissions from soil

            if (baseline_soil_N2O) {
                const method = soil_N2O_approach;

                switch (method) {
                    case "IPCC emission factors":
                        asl.GHGBSL_soil_N2O_i_t = asl.IPCC_emission_factor_n2o_BSL * GWP_N2O;
                        break;

                    case "Proxies":
                        asl.GHGBSL_soil_N2O_i_t = asl.N2O_emission_proxy_BSL * GWP_N2O;
                        break;

                    default:
                        asl.GHGBSL_soil_N2O_i_t = asl.N2O_BSL_soil_I_t * GWP_N2O;
                }
            } else {
                asl.GHGBSL_soil_N2O_i_t = 0;
            }


            // GHGBSL-soil,i,t (Eq 26)

            const endPDT = isProjectQuantifyBSLReduction ? getEndPDTPerStratum(temporal_boundary, stratum_i) : crediting_period;
            const endSDT = isProjectQuantifyBSLReduction ? getEndSDTPerStratum(temporal_boundary, stratum_i) : crediting_period;

            if (isProjectQuantifyBSLReduction) {
                const emissionsArray = baseline.yearly_data_for_baseline_GHG_emissions || [];
                const startYear = getStartYear(emissionsArray);
                const period = year_t - startYear + 1;

                if (period > endPDT && period > endSDT) {
                    asl.GHGBSL_soil_i_t = 0;
                }
                else {
                    asl.GHGBSL_soil_i_t = asl.A_i_t * (asl.GHGBSL_soil_CO2_i_t - asl.Deduction_alloch + asl.GHGBSL_soil_CH4_i_t + asl.GHGBSL_soil_N2O_i_t);
                }
            } else {
                asl.GHGBSL_soil_i_t = asl.A_i_t * (asl.GHGBSL_soil_CO2_i_t - asl.Deduction_alloch + asl.GHGBSL_soil_CH4_i_t + asl.GHGBSL_soil_N2O_i_t);
            }

            // ∆𝐶𝐵𝑆𝐿−𝑏𝑖𝑜𝑚𝑎𝑠𝑠,𝑖,t (equation 23)
            const monitoring_submergence = getDeltaCBSLAGBiomassForStratumAndYear(monitoring_submergence_data, stratum_i, yearRec.year_t);
            asl.delta_C_BSL_biomass_𝑖_t = asl.delta_C_BSL_tree_or_shrub_i_t + asl.delta_C_BSL_herb_i_t - monitoring_submergence[0].delta;

            // 𝐺𝐻𝐺𝐵��𝐿−𝑓𝑢𝑒𝑙,𝑖,t
            if (asl.is_fossil_fuel_use) {
                asl.GHGBSL_fuel_i_t = asl.ET_FC_I_t_ar_tool_5_BSL;
            } else {
                asl.GHGBSL_fuel_i_t = 0;
            }

        }

        // ---- per-year calculations -------------------------------------------

        const sum_delta_C_BSL_biomass =
            yearRec.annual_stratum_parameters
                .reduce((acc, s) =>
                    acc + (Number(s.annual_stratum_level_parameters
                        .delta_C_BSL_biomass_𝑖_t) || 0), 0);

        yearRec.GHG_BSL_biomass = -(sum_delta_C_BSL_biomass * const_44_by_12);


        const sum_GHG_BSL_soil =
            yearRec.annual_stratum_parameters.reduce(
                (acc, s) =>
                    acc +
                    (Number(
                        s.annual_stratum_level_parameters.GHGBSL_soil_i_t
                    ) || 0),
                0
            );

        yearRec.GHG_BSL_soil = sum_GHG_BSL_soil;

        const sum_GHG_BSL_fuel =
            yearRec.annual_stratum_parameters.reduce(
                (acc, s) =>
                    acc +
                    (Number(
                        s.annual_stratum_level_parameters.GHGBSL_fuel_i_t
                    ) || 0),
                0
            );

        yearRec.GHG_BSL_fuel = sum_GHG_BSL_fuel;

    }

    baseline.yearly_data_for_baseline_GHG_emissions.reduce((acc, rec) => {
        rec.GHG_BSL_biomass = acc + rec.GHG_BSL_biomass;
        return rec.GHG_BSL_biomass;
    }, 0);

    baseline.yearly_data_for_baseline_GHG_emissions.reduce((acc, rec) => {
        rec.GHG_BSL_soil = acc + rec.GHG_BSL_soil;
        return rec.GHG_BSL_soil;
    }, 0);
    baseline.yearly_data_for_baseline_GHG_emissions.reduce((acc, rec) => {
        rec.GHG_BSL_fuel = acc + rec.GHG_BSL_fuel;
        return rec.GHG_BSL_fuel;
    }, 0);

    baseline.yearly_data_for_baseline_GHG_emissions.reduce((acc, rec) => {
        rec.GHG_BSL = rec.GHG_BSL_biomass + rec.GHG_BSL_soil + rec.GHG_BSL_fuel;
        return rec.GHG_BSL;
    }, 0);
}

function processProjectEmissions(project, project_soil_CH4, project_soil_CH4_approach, GWP_CH4, project_soil_N2O, soil_N2O_approach, GWP_N2O, EF_N2O_Burn, EF_CH4_Burn, isPrescribedBurningOfBiomass) {

    // loop through every monitoring year -------------------------------------
    for (const yearRec of project.yearly_data_for_project_GHG_emissions ?? []) {
        const { year_t } = yearRec;

        // ---- per-stratum loop -------------------------------------------------
        for (const stratum of yearRec.annual_stratum_parameters ?? []) {
            const { stratum_i } = stratum;

            const sc = stratum.stratum_characteristics ?? {};
            const asl = stratum.annual_stratum_level_parameters ?? {};

            asl.delta_C_TREE_PROJ_i_t_ar_tool_14 = stratum.ar_tool_14.delta_C_TREE;
            asl.delta_C_SHRUB_PROJ_i_t_ar_tool_14 = stratum.ar_tool_14.delta_C_SHRUB;
            asl.ET_FC_I_t_ar_tool_5_WPS = stratum.ar_tool_05.ET_FC_y;

            if (asl.is_aboveground_tree_biomass !== true) {
                asl.delta_C_TREE_PROJ_i_t_ar_tool_14 = 0;
            }

            if (asl.is_aboveground_non_tree_biomass !== true) {
                asl.delta_C_SHRUB_PROJ_i_t_ar_tool_14 = 0;
            }

            asl.delta_C_WPS_tree_or_shrub_i_t = const_12_by_44 * (asl.delta_C_TREE_PROJ_i_t_ar_tool_14 + asl.delta_C_SHRUB_PROJ_i_t_ar_tool_14);

            if (asl.is_aboveground_non_tree_biomass !== true) {
                asl.delta_C_WPS_herb_i_t = 0;
            }

            asl.delta_C_WPS_biomass_i_t = asl.delta_C_WPS_tree_or_shrub_i_t + asl.delta_C_WPS_herb_i_t;

            // Net GHG emissions from soil in baseline scenario

            if (asl.is_soil) {
                const method = sc.co2_emissions_from_soil;

                switch (method) {
                    case "Field-collected data":
                        asl.GHGWPS_soil_CO2_i_t = -(const_44_by_12 * asl.delta_C_WPS_soil_i_t);
                        break;

                    case "Proxies":
                        asl.GHGWPS_soil_CO2_i_t = asl.GHG_emission_proxy_GHGWPS_soil_CO2_i_t;
                        break;

                    default:
                        asl.GHGWPS_soil_CO2_i_t =
                            (asl.GHGWPS_insitu_CO2_i_t ?? 0) +
                            (asl.GHGWPS_eroded_CO2_i_t ?? 0) +
                            (asl.GHGWPS_excav_CO2_i_t ?? 0);
                }
            } else {
                asl.GHGWPS_soil_CO2_i_t = 0;
            }

            asl.Deduction_alloch_WPS = computeDeductionAllochProject({
                project_soil_SOC: asl.is_soil,
                soil_insitu_approach: sc.co2_emissions_from_soil,
                soil_type: sc.soil_type_t0,
                AK5: asl.GHGWPS_soil_CO2_i_t,
                AL5: asl.is_soil ? asl.percentage_C_alloch_WPS : 0,
                AR5: (asl.is_soil && sc.co2_emissions_from_soil === "Others") ? asl.GHGWPS_insitu_CO2_i_t : 0
            });

            // CH4 emissions from soil

            if (project_soil_CH4) {
                const method = project_soil_CH4_approach;

                switch (method) {
                    case "IPCC emission factors":
                        asl.GHGWPS_soil_CH4_i_t = asl.IPCC_emission_factor_ch4_WPS * GWP_CH4;
                        break;

                    case "Proxies":
                        asl.GHGWPS_soil_CH4_i_t = asl.GHG_emission_proxy_ch4_WPS * GWP_CH4;
                        break;

                    default:
                        asl.GHGWPS_soil_CH4_i_t = asl.CH4_WPS_soil_I_t * GWP_CH4;
                }
            } else {
                asl.GHGWPS_soil_CH4_i_t = 0;
            }

            // N2O emissions from soil
            if (project_soil_N2O) {
                const method = soil_N2O_approach;

                switch (method) {
                    case "IPCC emission factors":
                        asl.GHGWPS_soil_N2O_i_t = asl.IPCC_emission_factor_n2o_WPS * GWP_N2O;
                        break;

                    case "Proxies":
                        asl.GHGWPS_soil_N2O_i_t = asl.N2O_emission_proxy_WPS * GWP_N2O;
                        break;

                    default:
                        asl.GHGWPS_soil_N2O_i_t = asl.N2O_WPS_soil_I_t * GWP_N2O;
                }
            } else {
                asl.GHGWPS_soil_N2O_i_t = 0;
            }

            // GHGWPS-soil,i,t
            asl.GHGWPS_soil_i_t = asl.A_i_t * (asl.GHGWPS_soil_CO2_i_t - asl.Deduction_alloch_WPS + asl.GHGWPS_soil_CH4_i_t + asl.GHGWPS_soil_N2O_i_t);

            // Net non-CO2 emissions from prescribed burning of herbaceous biomass and shrub in project scenario

            if (asl.is_burning_of_biomass) {
                asl.CO2_e_N2O_i_t = asl.biomassi_t * EF_N2O_Burn * GWP_N2O * Math.pow(10, -6) * asl.A_i_t;
                asl.CO2_e_CH4_i_t = asl.biomassi_t * EF_CH4_Burn * GWP_CH4 * Math.pow(10, -6) * asl.A_i_t;
                asl.GHGWPS_burn_i_t = asl.CO2_e_N2O_i_t + asl.CO2_e_CH4_i_t;
            } else {
                asl.GHGWPS_burn_i_t = 0;
            }

            // 𝐺𝐻𝐺WPS−𝑓𝑢𝑒𝑙,𝑖,t
            if (asl.is_fossil_fuel_use) {
                asl.GHGWPS_fuel_i_t = asl.ET_FC_I_t_ar_tool_5_WPS;
            } else {
                asl.GHGWPS_fuel_i_t = 0;
            }

        }


        // ---- per-year calculations ------------------------------------------------------
        const sum_delta_C_WPS_biomass =
            yearRec.annual_stratum_parameters.reduce(
                (acc, s) =>
                    acc +
                    (Number(
                        s.annual_stratum_level_parameters.delta_C_WPS_biomass_i_t
                    ) || 0),
                0
            );

        yearRec.GHG_WPS_biomass = -(sum_delta_C_WPS_biomass * const_44_by_12);

        const sum_GHG_WPS_soil =
            yearRec.annual_stratum_parameters.reduce(
                (acc, s) =>
                    acc +
                    (Number(
                        s.annual_stratum_level_parameters.GHGWPS_soil_i_t
                    ) || 0),
                0
            );

        yearRec.GHG_WPS_soil = sum_GHG_WPS_soil;

        const sum_GHG_WPS_fuel =
            yearRec.annual_stratum_parameters.reduce(
                (acc, s) =>
                    acc +
                    (Number(
                        s.annual_stratum_level_parameters.GHGWPS_fuel_i_t
                    ) || 0),
                0
            );

        yearRec.GHG_WPS_fuel = sum_GHG_WPS_fuel;

        if (isPrescribedBurningOfBiomass) {
            const sum_GHG_WPS_burn =
                yearRec.annual_stratum_parameters.reduce(
                    (acc, s) =>
                        acc +
                        (Number(
                            s.annual_stratum_level_parameters.GHGWPS_burn_i_t
                        ) || 0),
                    0
                );

            yearRec.GHG_WPS_burn = sum_GHG_WPS_burn;
        } else {
            yearRec.GHG_WPS_burn = 0;
        }

        yearRec.GHG_WPS = yearRec.GHG_WPS_biomass + yearRec.GHG_WPS_soil + yearRec.GHG_WPS_fuel + yearRec.GHG_WPS_burn;
    }

    project.yearly_data_for_project_GHG_emissions.reduce((acc, rec) => {
        rec.GHG_WPS_biomass = acc + rec.GHG_WPS_biomass;
        return rec.GHG_WPS_biomass;
    }, 0);

    project.yearly_data_for_project_GHG_emissions.reduce((acc, rec) => {
        rec.GHG_WPS_soil = acc + rec.GHG_WPS_soil;
        return rec.GHG_WPS_soil;
    }, 0);

    project.yearly_data_for_project_GHG_emissions.reduce((acc, rec) => {
        rec.GHG_WPS_fuel = acc + rec.GHG_WPS_fuel;
        return rec.GHG_WPS_fuel;
    }, 0);

    project.yearly_data_for_project_GHG_emissions.reduce((acc, rec) => {
        rec.GHG_WPS_burn = acc + rec.GHG_WPS_burn;
        return rec.GHG_WPS_burn;
    }, 0);

    project.yearly_data_for_project_GHG_emissions.reduce((acc, rec) => {
        rec.GHG_WPS = (rec.GHG_WPS_biomass + rec.GHG_WPS_soil + rec.GHG_WPS_fuel + rec.GHG_WPS_burn) * -1;
        return rec.GHG_WPS;
    }, 0);
}

function processNETERR(baseline, project, netErrData, SOC_MAX, emission_reduction_from_stock_loss, fire_reduction_premium, FireReductionPremiumArray, NERRWE_Cap, NERRWE_Max, NERError, allowable_uncert, buffer_percentage) {
    /* ───────── meta kept from original array (if present) ──────── */
    const META = {
        type: netErrData.net_ERR_calculation_per_year?.[0]?.type,
        '@context': netErrData.net_ERR_calculation_per_year?.[0]?.['@context'] ?? [],
    };

    /* ───────── aggregate baseline ───────── */
    const perYear = new Map();                      // key = year_t

    for (const yr of baseline.yearly_data_for_baseline_GHG_emissions ?? []) {
        const total = (yr.annual_stratum_parameters ?? []).reduce(
            (a, s) =>
                a +
                +(s.annual_stratum_level_parameters?.GHGBSL_soil_CO2_i_t ?? 0) *
                +(s.annual_stratum_level_parameters?.A_i_t ?? 0),
            0,
        );

        const total_GHG_BSL_SOIL_DEDUCTED_CO2_i_t = (yr.annual_stratum_parameters ?? []).reduce(
            (a, s) => {
                const ghgbsl_soil_co2 = +(s.annual_stratum_level_parameters?.GHGBSL_soil_CO2_i_t ?? 0);
                const deduction_alloch = +(s.annual_stratum_level_parameters?.Deduction_alloch ?? 0);
                const a_i_t = +(s.annual_stratum_level_parameters?.A_i_t ?? 0);
                return a + (ghgbsl_soil_co2 - deduction_alloch) * a_i_t;
            },
            0,
        );

        perYear.set(yr.year_t, {
            year_t: yr.year_t,
            sumation_GHG_BSL_soil_CO2_i_A_i: total,
            sumation_GHG_WPS_soil_CO2_i_A_i: 0,        // will be filled next loop
            GHG_BSL_SOIL_DEDUCTED_CO2_i_t: total_GHG_BSL_SOIL_DEDUCTED_CO2_i_t
        });
    }

    /* ───────── aggregate project ───────── */
    for (const yr of project.yearly_data_for_project_GHG_emissions ?? []) {
        const total = (yr.annual_stratum_parameters ?? []).reduce(
            (a, s) =>
                a +
                +(s.annual_stratum_level_parameters?.GHGWPS_soil_CO2_i_t ?? 0) *
                +(s.annual_stratum_level_parameters?.A_i_t ?? 0),
            0,
        );

        const total_GHG_WPS_SOIL_DEDUCTED_CO2_i_t = (yr.annual_stratum_parameters ?? []).reduce(
            (a, s) => {
                const ghgwps_soil_co2 = +(s.annual_stratum_level_parameters?.GHGWPS_soil_CO2_i_t ?? 0);
                const deduction_alloch_wps = +(s.annual_stratum_level_parameters?.Deduction_alloch_WPS ?? 0);
                const a_i_t = +(s.annual_stratum_level_parameters?.A_i_t ?? 0);
                return a + (ghgwps_soil_co2 - deduction_alloch_wps) * a_i_t;
            },
            0,
        );

        if (!perYear.has(yr.year_t)) {
            perYear.set(yr.year_t, {
                year_t: yr.year_t,
                sumation_GHG_BSL_soil_CO2_i_A_i: 0,
                sumation_GHG_WPS_soil_CO2_i_A_i: 0,
                GHG_WPS_SOIL_DEDUCTED_CO2_i_t: 0,
            });
        }
        perYear.get(yr.year_t).sumation_GHG_WPS_soil_CO2_i_A_i = total;
        perYear.get(yr.year_t).GHG_WPS_SOIL_DEDUCTED_CO2_i_t = total_GHG_WPS_SOIL_DEDUCTED_CO2_i_t;
    }

    /* ───────── cumulative sums + final array ───────── */
    let cumBSL = 0;
    let cumWPS = 0;
    let cumBSL_DEDUCTED = 0;
    let cumWPS_DEDUCTED = 0;

    netErrData.net_ERR_calculation_per_year = [...perYear.values()]
        .sort((a, b) => a.year_t - b.year_t)
        .map(rec => {
            cumBSL += rec.sumation_GHG_BSL_soil_CO2_i_A_i;
            cumWPS += rec.sumation_GHG_WPS_soil_CO2_i_A_i;
            cumBSL_DEDUCTED += rec.GHG_BSL_SOIL_DEDUCTED_CO2_i_t;
            cumWPS_DEDUCTED += rec.GHG_WPS_SOIL_DEDUCTED_CO2_i_t;
            return {
                year_t: rec.year_t,
                sumation_GHG_BSL_soil_CO2_i_A_i: cumBSL,
                sumation_GHG_WPS_soil_CO2_i_A_i: cumWPS,
                GHG_BSL_SOIL_DEDUCTED_CO2_i_t: cumBSL_DEDUCTED,
                GHG_WPS_SOIL_DEDUCTED_CO2_i_t: cumWPS_DEDUCTED,
                ...META,                       // ONLY type + @context copied in
            };
        });

    if (emission_reduction_from_stock_loss) {
        netErrData.net_ERR_calculation_per_year.map(rec => {
            const temp_deduction = (rec.sumation_GHG_BSL_soil_CO2_i_A_i - rec.sumation_GHG_WPS_soil_CO2_i_A_i - SOC_MAX);
            rec.GHG_WPS_soil_deduction = temp_deduction > 0 ? temp_deduction : 0;
            return rec;
        }
        );
    } else {
        netErrData.net_ERR_calculation_per_year.map(rec => {
            rec.GHG_WPS_soil_deduction = 0;
            return rec;
        }
        );
    }

    if (fire_reduction_premium) {
        netErrData.net_ERR_calculation_per_year.map(rec => {
            rec.FRP = getFireReductionPremiumPerYear(FireReductionPremiumArray, rec.year_t);
            return rec;
        }
        );
    }
    else {
        netErrData.net_ERR_calculation_per_year.map(rec => {
            rec.FRP = 0;
            return rec;
        }
        );
    }

    netErrData.net_ERR_calculation_per_year.map(rec => {
        rec.GHG_LK = 0;
        return rec;
    });

    netErrData.net_ERR_calculation_per_year.map(rec => {
        rec.NERRWE = getGHGBSL(baseline.yearly_data_for_baseline_GHG_emissions, rec.year_t) + getGHGWPS(project.yearly_data_for_project_GHG_emissions, rec.year_t) + rec.FRP - rec.GHG_LK - rec.GHG_WPS_soil_deduction;
        return rec;
    });

    netErrData.net_ERR_calculation_per_year.map(rec => {
        if (NERRWE_Cap) {
            rec.NERRWE_capped = rec.NERRWE <= NERRWE_Max ? rec.NERRWE : NERRWE_Max;
            rec.NER_t = rec.NERRWE_capped;
            return rec;
        } else {
            rec.NERRWE_capped = rec.NERRWE;
            rec.NER_t = rec.NERRWE;
            return rec;
        }
    });

    netErrData.net_ERR_calculation_per_year.map(rec => {
        rec.adjusted_NER_t = rec.NER_t * (1 - NERError + allowable_uncert);
        return rec;
    }
    );

    netErrData.net_ERR_calculation_per_year.map(rec => {
        rec.NER_stock_t = (rec.GHG_BSL_SOIL_DEDUCTED_CO2_i_t + getGHGBSLBiomass(baseline.yearly_data_for_baseline_GHG_emissions, rec.year_t)) - (rec.GHG_WPS_SOIL_DEDUCTED_CO2_i_t + getGHGWPSBiomass(project.yearly_data_for_project_GHG_emissions, rec.year_t));
        return rec;
    }
    );

    // First, sort by year_t (ascending)
    const netErrArr = netErrData.net_ERR_calculation_per_year.sort((a, b) => a.year_t - b.year_t);

    netErrArr.forEach((rec, idx, arr) => {
        if (idx === 0) {
            rec.buffer_deduction = rec.NER_stock_t * buffer_percentage;
        } else {
            const prevRec = arr[idx - 1];
            rec.buffer_deduction = calculateNetERRChange(
                rec.adjusted_NER_t,
                prevRec.adjusted_NER_t,
                rec.NER_stock_t,
                prevRec.NER_stock_t,
                buffer_percentage
            );
        }
    });


    netErrArr.forEach((rec, idx, arr) => {
        if (idx === 0) {
            rec.VCU = rec.adjusted_NER_t - rec.buffer_deduction;
        } else {
            const prevRec = arr[idx - 1];
            rec.VCU = calculateNetVCU(
                rec.adjusted_NER_t,
                prevRec.adjusted_NER_t,
                rec.buffer_deduction
            );
        }
    });


    netErrData.total_VCU_per_instance = calculateTotalVCUPerInstance(netErrData);

}


function calculateTotalVCUPerInstance(netErrData) {
    return netErrData.net_ERR_calculation_per_year[0].VCU;
}


function processInstance(instance, project_boundary) {
    const data = instance.project_instance;
    // Project Boundary
    const projectBoundary = project_boundary;

    // Project Boundary - Baseline Scenario
    const BaselineAboveGroundTreeBiomass = getProjectBoundaryValue(projectBoundary, 'baseline_aboveground_tree_biomass');
    const BaselineAboveGroundNonTreeBiomass = getProjectBoundaryValue(projectBoundary, 'baseline_aboveground_non_tree_biomass');
    const BaselineBelowGroundBiomass = getProjectBoundaryValue(projectBoundary, 'baseline_below_ground_biomass');
    const BaselineLitter = getProjectBoundaryValue(projectBoundary, 'baseline_litter');
    const BaselineDeadWood = getProjectBoundaryValue(projectBoundary, 'baseline_dead_wood');
    const BaselineSoil = getProjectBoundaryValue(projectBoundary, 'baseline_soil');
    const BaselineWoodProducts = getProjectBoundaryValue(projectBoundary, 'baseline_wood_products');
    const BaselineMethaneProductionByMicrobes = getProjectBoundaryValue(projectBoundary, 'baseline_methane_production_by_microbes');
    const BaselineDenitrificationNitrification = getProjectBoundaryValue(projectBoundary, 'baseline_denitrification_nitrification');
    const BaselineBurningBiomassOrganicSoil = getProjectBoundaryValue(projectBoundary, 'baseline_burning_of_biomass_and_organic_soil');
    const BaselineFossilFuelUseCO2 = getProjectBoundaryValue(projectBoundary, 'baseline_fossil_fuel_use_CO2');
    const BaselineFossilFuelUseCH4 = getProjectBoundaryValue(projectBoundary, 'baseline_fossil_fuel_use_CH4');
    const BaselineFossilFuelUseN2O = getProjectBoundaryValue(projectBoundary, 'baseline_fossil_fuel_use_N2O');

    // Project Boundary - Project Scenario
    const ProjectAboveTreeBiomass = getProjectBoundaryValue(projectBoundary, 'project_aboveground_tree_biomass');
    const ProjectAboveNonTreeBiomass = getProjectBoundaryValue(projectBoundary, 'project_aboveground_non_tree_biomass');
    const ProjectBelowGroundBiomass = getProjectBoundaryValue(projectBoundary, 'project_below_ground_biomass');
    const ProjectLitter = getProjectBoundaryValue(projectBoundary, 'project_litter');
    const ProjectDeadWood = getProjectBoundaryValue(projectBoundary, 'project_dead_wood');
    const ProjectSoil = getProjectBoundaryValue(projectBoundary, 'project_soil');
    const ProjectWoodProducts = getProjectBoundaryValue(projectBoundary, 'project_wood_products');
    const ProjectMethaneProductionByMicrobes = getProjectBoundaryValue(projectBoundary, 'project_methane_production_by_microbes');
    const ProjectDenitrificationNitrification = getProjectBoundaryValue(projectBoundary, 'project_denitrification_nitrification');
    const ProjectBurningBiomass = getProjectBoundaryValue(projectBoundary, 'project_burning_of_biomass');
    const ProjectFossilFuelUseCO2 = getProjectBoundaryValue(projectBoundary, 'project_fossil_fuel_use_CO2');
    const ProjectFossilFuelUseCH4 = getProjectBoundaryValue(projectBoundary, 'project_fossil_fuel_use_CH4');
    const ProjectFossilFuelUseN2O = getProjectBoundaryValue(projectBoundary, 'project_fossil_fuel_use_N2O');


    // --- Quantification Approach ---
    const QuantificationCO2EmissionsSoil = getQuantificationValue(data, 'quantification_co2_emissions_soil');
    const QuantificationCH4EmissionsSoil = getQuantificationValue(data, 'quantification_ch4_emissions_soil');
    const QuantificationN2OEmissionsSoil = getQuantificationValue(data, 'quantification_n2o_emissions_soil');
    const QuantificationSOCCapApproach = getQuantificationValue(data, 'quantification_soc_cap_approach');
    const QuantificationBaselineCO2Reduction = getQuantificationValue(data, 'quantification_baseline_co2_reduction');
    const QuantificationNERRWEMaxCap = getQuantificationValue(data, 'quantification_nerrwe_max_cap');
    const QuantificationFireReductionPremium = getQuantificationValue(data, 'quantification_fire_reduction_premium');
    const FireReductionPremiumArray = QuantificationFireReductionPremium ? getQuantificationValue(data, 'fire_reduction_premium') : [];


    // --- Individual Parameters ---
    const GWP_CH4 = (BaselineMethaneProductionByMicrobes || BaselineBurningBiomassOrganicSoil || ProjectMethaneProductionByMicrobes || ProjectBurningBiomass) ? getIndividualParam(data, 'gwp_ch4') : 0;
    const GWP_N2O = (BaselineDenitrificationNitrification || BaselineBurningBiomassOrganicSoil || ProjectDenitrificationNitrification || ProjectBurningBiomass) ? getIndividualParam(data, 'gwp_n2o') : 0;
    const IsBurningOfBiomass = getIndividualParam(data, 'is_burning_of_biomass');
    const IsNERRWEMaxCap = getIndividualParam(data, 'is_NERRWE_max_cap');
    const AllowableUncertainty = getIndividualParam(data, 'individual_params_allowable_uncert');
    const BufferPercent = getIndividualParam(data, 'individual_params_buffer_%');
    const NERError = getIndividualParam(data, 'individual_params_NER_ERROR');
    const CreditingPeriod = getIndividualParam(data, 'individual_params_crediting_period');
    const EF_N2O_Burn = IsBurningOfBiomass ? getIndividualParam(data, 'EF_n20_burn') : 0;
    const EF_CH4_Burn = IsBurningOfBiomass ? getIndividualParam(data, 'EF_ch4_burn') : 0;
    const NERRWE_Max = IsNERRWEMaxCap ? getIndividualParam(data, 'NERRWE_max') : 0;

    // --- Monitoring Period Inputs ---

    const IsBaselineAbovegroundNonTreeBiomass = getMonitoringValue(data, 'is_baseline_aboveground_non_tree_biomass');
    const IsProjectAbovegroundNonTreeBiomass = getMonitoringValue(data, 'is_project_aboveground_non_tree_biomass');

    let BaselineSoilCarbonStockMonitoringData = [];
    let ProjectSoilCarbonStockMonitoringData = [];
    let BaselineHerbaceousVegetationMonitoringData = [];
    let ProjectHerbaceousVegetationMonitoringData = [];

    const SubmergenceMonitoringData = getMonitoringValue(data, 'submergence_monitoring_data');
    BaselineSoilCarbonStockMonitoringData = (BaselineSoil && QuantificationCO2EmissionsSoil === 'Field-collected data') ? getMonitoringValue(data, 'baseline_soil_carbon_stock_monitoring_data') : [];
    ProjectSoilCarbonStockMonitoringData = (ProjectSoil && QuantificationCO2EmissionsSoil === 'Field-collected data') ? getMonitoringValue(data, 'project_soil_carbon_stock_monitoring_data') : [];
    BaselineHerbaceousVegetationMonitoringData = IsBaselineAbovegroundNonTreeBiomass ? getMonitoringValue(data, 'baseline_herbaceous_vegetation_monitoring_data') : [];
    ProjectHerbaceousVegetationMonitoringData = IsProjectAbovegroundNonTreeBiomass ? getMonitoringValue(data, 'project_herbaceous_vegetation_monitoring_data') : [];


    // --- Wood Product Project Scenario ---

    let WoodProductDjCFjBCEF = [];
    let WoodProductSLFty = [];
    let WoodProductOfty = [];
    let WoodProductVexPcomi = [];
    let WoodProductCAVGTREEi = [];

    // Check if wood product project scenario is present
    if (ProjectWoodProducts) {
        WoodProductDjCFjBCEF = getWoodProductValue(data, 'wood_product_Dj_CFj_BCEF');
        WoodProductSLFty = getWoodProductValue(data, 'wood_product_SLFty');
        WoodProductOfty = getWoodProductValue(data, 'wood_product_Ofty');
        WoodProductVexPcomi = getWoodProductValue(data, 'wood_product_Vex_Pcomi');
        WoodProductCAVGTREEi = getWoodProductValue(data, 'wood_product_CAVG_TREE_i');
    }

    // --- Monitoring Period Inputs ---
    processMonitoringSubmergence(data.monitoring_period_inputs);

    // Temporal Boundary
    const temporalBoundary = data.temporal_boundary;
    calculatePDTSDT(data.baseline_emissions, QuantificationBaselineCO2Reduction, temporalBoundary, CreditingPeriod);

    // ── Baseline-emission calculations ──────────────────────────────────────
    processBaselineEmissions(data.baseline_emissions, CreditingPeriod, BaselineMethaneProductionByMicrobes, QuantificationCH4EmissionsSoil, GWP_CH4, BaselineDenitrificationNitrification, QuantificationN2OEmissionsSoil, GWP_N2O, data.monitoring_period_inputs, temporalBoundary);

    // ── Project-emission calculations ───────────────────────────────────────
    processProjectEmissions(data.project_emissions, ProjectMethaneProductionByMicrobes, QuantificationCH4EmissionsSoil, GWP_CH4, ProjectDenitrificationNitrification, QuantificationN2OEmissionsSoil, GWP_N2O, EF_N2O_Burn, EF_CH4_Burn, ProjectBurningBiomass);


    // Total Stock Approach and Stock loss Approach
    SOC_MAX_calculation(data.baseline_emissions, data.peat_strata_input_coverage_100_years, data.non_peat_strata_input_coverage_100_years, temporalBoundary, QuantificationSOCCapApproach, data.ineligible_wetland_areas);


    // ── Net emissions reductions calculations ───────────────────────────────
    processNETERR(data.baseline_emissions, data.project_emissions, data.net_ERR, data.ineligible_wetland_areas.SOC_MAX, QuantificationBaselineCO2Reduction, QuantificationFireReductionPremium, FireReductionPremiumArray, IsNERRWEMaxCap, NERRWE_Max, NERError, AllowableUncertainty, BufferPercent);

}


function calc() {
    const document = documents[0].document;

    const creds = document.credentialSubject;

    let totalVcus = 0;

    for (const cred of creds) {
        for (const instance of cred.project_data_per_instance) {
            processInstance(instance, cred.project_boundary);
            totalVcus += instance.project_instance.net_ERR.total_VCU_per_instance;
        }
        cred.total_vcus = totalVcus;
    }

    done(adjustValues(document.credentialSubject[0]));
}

calc();