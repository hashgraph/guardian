/**
 * ACM0010 — Net Emission Reductions, ER_y
 *
 * CustomLogicBlock expression for Guardian.
 *
 * ER_y = BE_y - PE_y - LEAD,y
 *
 * Where:
 *   BE_y    = total baseline emissions (tCO2e)
 *             BE_y = BE_CH4,y + BE_N2O,y
 *   PE_y    = total project emissions (tCO2e)
 *             PE_y = PE_Aer,y + PE_N2O,y + PE_flare,y + PE_transport,y + PE_elec/heat,y
 *   LEAD,y  = leakage from land application (tCO2e)
 *
 * This block aggregates all baseline and project emission components
 * computed by the other ACM0010 calculation modules and produces
 * the net emission reductions figure.
 */

(function calc() {
    const project = documents[documents.length - 1].document.credentialSubject[0];

    const parameters = project.parameters || {};

    // ---- Baseline emissions (BE_y) ----
    const gwpCh4 = parameters.globalWarmingPotentialCh4;
    if (!(gwpCh4 > 0)) {
        throw new Error('parameters.globalWarmingPotentialCh4 must be > 0 for ER_y');
    }

    const gwpN2o = parameters.globalWarmingPotentialN2O;

    const awms = project.baselineAwms;
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

    // ---- Resolve volatile solids (same logic as calculate-baseline-ch4.js) ----
    const D_CH4 = 0.00067; // t/m3
    const CH4_DENSITY = D_CH4 * 1000; // 0.67 kg CH4/m3
    const DAYS_PER_YEAR = 365;
    const N2O_N_TO_N2O = 44 / 28;

    const volatileSolidsByType = [];
    livestockInput.forEach(function (entry) {
        if (entry.annualVolatileSolids !== undefined && entry.annualVolatileSolids !== null) {
            if (!(entry.annualVolatileSolids >= 0)) {
                throw new Error('annualVolatileSolids must be >= 0 for livestock type ' + entry.type);
            }
            volatileSolidsByType.push(entry.annualVolatileSolids);
        } else {
            const herd = entry.herdParameters;
            if (!herd || typeof herd !== 'object') {
                throw new Error('annualVolatileSolids must be supplied, or herdParameters must be provided, for livestock type ' + entry.type);
            }

            const wSite = herd.averageWeightSiteKg;
            const wDefault = herd.defaultWeightKg;
            const vsDefault = herd.volatileSolidsDefaultKgDmPerDay;
            const operationalDays = herd.operationalDaysPerYear;
            const daysAlive = herd.daysAliveInYear;
            const animalsProduced = herd.animalsProducedAnnually;

            if (!(wSite > 0) || !(wDefault > 0) || !(vsDefault >= 0) ||
                !(operationalDays >= 0 && operationalDays <= DAYS_PER_YEAR) ||
                !(daysAlive >= 0 && daysAlive <= DAYS_PER_YEAR) || !(animalsProduced >= 0)) {
                throw new Error('invalid herd parameters for livestock type ' + entry.type);
            }

            const volatileSolidsPerAnimal = (wSite / wDefault) * vsDefault * operationalDays;
            const annualAverageAnimals = daysAlive * (animalsProduced / DAYS_PER_YEAR);
            volatileSolidsByType.push(annualAverageAnimals * volatileSolidsPerAnimal);
        }
    });

    // ---- BE_CH4,y ----
    const stageDecayFactors = [];
    let decayFactor = 1;
    let totalKgCh4 = 0;

    stages.forEach(function (stage, stageIndex) {
        if (!(stage.methaneConversionFactor >= 0 && stage.methaneConversionFactor <= 1)) {
            throw new Error('methaneConversionFactor must be within [0, 1] at stage ' + stageIndex);
        }

        const eta = stage.volatileSolidsReductionFraction === undefined
            ? 0 : stage.volatileSolidsReductionFraction;
        if (!(eta >= 0 && eta <= 1)) {
            throw new Error('volatileSolidsReductionFraction must be within [0, 1] at stage ' + stageIndex);
        }

        stageDecayFactors.push(decayFactor);

        livestockInput.forEach(function (entry, typeIndex) {
            const volatileSolidsAtStage = volatileSolidsByType[typeIndex] * decayFactor;
            totalKgCh4 += volatileSolidsAtStage * stage.methaneConversionFactor
                * entry.maxMethaneProducingCapacity * CH4_DENSITY;
        });

        decayFactor = decayFactor * (1 - eta);
    });

    const beCh4TCo2e = (totalKgCh4 * gwpCh4) / 1000;

    // ---- BE_N2O,y (optional) ----
    let beN2OTC02e = 0;
    if (gwpN2o !== undefined && gwpN2o !== null) {
        if (!(gwpN2o > 0)) {
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

        let directKgN2ON = 0;
        let indirectKgN2ON = 0;
        livestockInput.forEach(function (entry) {
            const nitrogenExcretion = entry.nitrogenExcretionKgNPerAnimalYear;
            if (!(nitrogenExcretion >= 0)) {
                throw new Error('nitrogenExcretionKgNPerAnimalYear must be >= 0 for livestock type ' + entry.type);
            }

            const herd = entry.herdParameters;
            if (!herd) {
                throw new Error('herdParameters are required for N2O calculation on livestock type ' + entry.type);
            }

            const daysAlive = herd.daysAliveInYear;
            const animalsProduced = herd.animalsProducedAnnually;
            if (!(daysAlive >= 0 && daysAlive <= DAYS_PER_YEAR) || !(animalsProduced >= 0)) {
                throw new Error('invalid herd parameters for livestock type ' + entry.type);
            }

            const nLt = daysAlive * (animalsProduced / DAYS_PER_YEAR);
            const nitrogenKg = nitrogenExcretion * nLt;
            directKgN2ON += nitrogenKg * directFactorSum;
            indirectKgN2ON += nitrogenKg * indirectFactorSum;
        });

        const totalKgN2ON = directKgN2ON + indirectKgN2ON;
        beN2OTC02e = (totalKgN2ON * N2O_N_TO_N2O * gwpN2o) / 1000;
    }

    const beTotalTCo2e = beCh4TCo2e + beN2OTC02e;

    // ---- PE_y (project emissions, optional components) ----
    let peTotalTCo2e = 0;

    // PE_Aer,y
    const aerobicStages = stages.filter(function (s) { return s.aerobicTreatment === true; });
    if (aerobicStages.length > 0) {
        if (aerobicStages.length > 1) {
            throw new Error('exactly one baseline stage may be flagged as aerobicTreatment, found ' + aerobicStages.length);
        }
        const aerobicIdx = stages.indexOf(aerobicStages[0]);
        const directedFraction = aerobicStages[0].volatileSolidsDirectedToAerobicFraction;
        if (!(directedFraction >= 0 && directedFraction <= 1)) {
            throw new Error('volatileSolidsDirectedToAerobicFraction must be within [0, 1] on the aerobic stage');
        }

        let generatingPotentialTCh4 = 0;
        livestockInput.forEach(function (entry, typeIndex) {
            const vsAtStage = volatileSolidsByType[typeIndex] * stageDecayFactors[aerobicIdx];
            const directed = vsAtStage * directedFraction;
            generatingPotentialTCh4 += directed * entry.maxMethaneProducingCapacity * D_CH4;
        });
        peTotalTCo2e += generatingPotentialTCh4 * 0.001 * gwpCh4;
    }

    // PE_N2O,y (Option 1 or Option 2)
    const projectN2OOption = parameters.projectN2OOption;
    if (projectN2OOption !== undefined && projectN2OOption !== null) {
        if (projectN2OOption !== 'option1' && projectN2OOption !== 'option2') {
            throw new Error('parameters.projectN2OOption must be "option1" or "option2", got ' + projectN2OOption);
        }

        const gwpN2oProj = parameters.globalWarmingPotentialN2O;
        if (!(gwpN2oProj > 0)) {
            throw new Error('PE_N2O,y requires parameters.globalWarmingPotentialN2O');
        }

        const fractionVolatilised = parameters.fractionNitrogenVolatilised;
        if (!(fractionVolatilised >= 0 && fractionVolatilised <= 1)) {
            throw new Error('parameters.fractionNitrogenVolatilised must be within [0, 1]');
        }

        if (projectN2OOption === 'option1') {
            let directKgN2ON = 0;
            let indirectKgN2ON = 0;

            stages.forEach(function (stage) {
                const manureFraction = stage.projectManureFraction;
                if (!(manureFraction >= 0 && manureFraction <= 1)) {
                    throw new Error('projectManureFraction must be within [0, 1]');
                }
                const efDirect = stage.projectDirectN2OEmissionFactorKgN2ONPerKgN;
                if (!(efDirect >= 0)) {
                    throw new Error('projectDirectN2OEmissionFactorKgN2ONPerKgN must be >= 0');
                }
                const efIndirect = stage.projectIndirectN2OEmissionFactorKgN2ONPerKgN;
                if (!(efIndirect >= 0)) {
                    throw new Error('projectIndirectN2OEmissionFactorKgN2ONPerKgN must be >= 0');
                }

                livestockInput.forEach(function (entry) {
                    const nitrogenExcretion = entry.nitrogenExcretionKgNPerAnimalYear;
                    if (!(nitrogenExcretion >= 0)) {
                        throw new Error('nitrogenExcretionKgNPerAnimalYear must be >= 0');
                    }
                    const herd = entry.herdParameters;
                    if (!herd) {
                        throw new Error('herdParameters required for PE_N2O Option 1 on ' + entry.type);
                    }
                    const nLt = herd.daysAliveInYear * (herd.animalsProducedAnnually / 365);
                    const nitrogenAtStage = nitrogenExcretion * nLt * manureFraction;
                    directKgN2ON += nitrogenAtStage * efDirect;
                    indirectKgN2ON += nitrogenAtStage * efIndirect * fractionVolatilised;
                });
            });

            const totalKgN2ON = directKgN2ON + indirectKgN2ON;
            peTotalTCo2e += (totalKgN2ON * N2O_N_TO_N2O * gwpN2oProj) / 1000;
        } else {
            // Option 2: measured monthly data
            const efIndirect = parameters.projectIndirectN2OEmissionFactorKgN2ONPerKgN;
            if (!(efIndirect >= 0)) {
                throw new Error('parameters.projectIndirectN2OEmissionFactorKgN2ONPerKgN must be >= 0');
            }

            let totalNitrogenKg = 0;
            let directKgN2ON = 0;
            const MONTHS = 12;

            stages.forEach(function (stage) {
                const volumes = stage.projectEffluentMonthlyVolumeM3;
                const concentrations = stage.projectEffluentNitrogenConcentrationKgNPerM3;
                const efDirect = stage.projectDirectN2OEmissionFactorKgN2ONPerKgN;
                if (!(efDirect >= 0)) {
                    throw new Error('projectDirectN2OEmissionFactorKgN2ONPerKgN must be >= 0');
                }

                if (!Array.isArray(volumes) || volumes.length !== MONTHS) {
                    throw new Error('projectEffluentMonthlyVolumeM3 must hold exactly 12 monthly values');
                }
                if (!Array.isArray(concentrations) || concentrations.length !== MONTHS) {
                    throw new Error('projectEffluentNitrogenConcentrationKgNPerM3 must hold exactly 12 monthly values');
                }

                let stageNitrogenKg = 0;
                for (let m = 0; m < MONTHS; m++) {
                    const vol = volumes[m];
                    const conc = concentrations[m];
                    if (!(vol >= 0) || !isFinite(vol)) {
                        throw new Error('projectEffluentMonthlyVolumeM3 must be a finite number >= 0');
                    }
                    if (!(conc >= 0) || !isFinite(conc)) {
                        throw new Error('projectEffluentNitrogenConcentrationKgNPerM3 must be a finite number >= 0');
                    }
                    stageNitrogenKg += vol * conc;
                }
                directKgN2ON += stageNitrogenKg * efDirect;
                totalNitrogenKg += stageNitrogenKg;
            });

            const indirectKgN2ON = totalNitrogenKg * efIndirect * fractionVolatilised;
            const totalKgN2ON = directKgN2ON + indirectKgN2ON;
            peTotalTCo2e += (totalKgN2ON * N2O_N_TO_N2O * gwpN2oProj) / 1000;
        }
    }

    // PEAD,y / LEAD,y from anaerobic digester (TOOL14 v03.0, ACM0010 v09 5.4.1/5.5.4)
    // Supported: Eq(1)-(5),(7),(8), Step1 Opt2, Step2 Opt2/monitored, Step3-5 monitored/direct as required.
    // Eq(6) liquid monitored COD/MCF/B0 and solid TOOL04 monitored paths require monitoredLeStorageTCo2e.
    // Avoid double counting: AD flare included in PEAD unless flareAccountedInSeparatePeFlareActivity=true.
    let peAdTCo2e = 0;
    let leAdFromTool14TCo2e = 0;
    let adFlareIncludedInPeAd = false;
    if (project.anaerobicDigesterActivity) {
        const ad = project.anaerobicDigesterActivity;
        const RHO_CH4 = 0.00067, FCH4_DEFAULT = 0.6, EFEL_DEFAULT = 1.3;
        function reqNum(v, name, min, max) {
            if (typeof v !== 'number' || !isFinite(v)) throw new Error(name + ' must be a finite number');
            if (min !== undefined && v < min) throw new Error(name + ' must be >= ' + min);
            if (max !== undefined && v > max) throw new Error(name + ' must be <= ' + max);
            return v;
        }
        const efch4Map = { steel_lined_concrete_fiberglass_gas_holder_monolithic:0.028, uasb_floating_gas_holder_no_external_water_seal:0.05, unlined_concrete_ferrocement_brick_masonry_fixed_dome_covered_lagoon:0.10, unknown:0.10 };
        const fecMap = { covered_anaerobic_lagoon_gravity_fed_or_conventional:0, uasb_filter_bed_fluidized_bed_wastewater:0.01, conventional_cstr_wastewater:1.02, any_ad_solid_waste_with_preprocessing:1.54, gravity_fed_no_recirculation_no_electrical:0 };
        const fwwMap = { covered_anaerobic_lagoon:0.10, uasb_anaerobic_filter_fluidized_bed:0.15, conventional_digester:0.20, two_stage_digester:0.05 };
        const fsdMap = { two_phase_digester:0.15, all_other_technologies:0.35 };
        let qCh4;
        if (ad.monitoredQCh4TonnesPerYear !== undefined && ad.monitoredQCh4TonnesPerYear !== null) qCh4 = reqNum(ad.monitoredQCh4TonnesPerYear,'anaerobicDigesterActivity.monitoredQCh4TonnesPerYear',0);
        else if (ad.biogasVolumeM3PerYearAtReference !== undefined && ad.biogasVolumeM3PerYearAtReference !== null) { const qBiogas=reqNum(ad.biogasVolumeM3PerYearAtReference,'anaerobicDigesterActivity.biogasVolumeM3PerYearAtReference',0); const fCh4=(ad.fCh4BiogasFraction!==undefined&&ad.fCh4BiogasFraction!==null)?reqNum(ad.fCh4BiogasFraction,'anaerobicDigesterActivity.fCh4BiogasFraction',0,1):FCH4_DEFAULT; qCh4=qBiogas*fCh4*RHO_CH4; }
        else throw new Error('anaerobicDigesterActivity requires monitoredQCh4TonnesPerYear or biogasVolumeM3PerYearAtReference for QCH4,y (TOOL14 Step 1)');
        let peEc=0;
        if (ad.electricityGeneratedOnSiteRenewableBiomassWindHydroGeothermal===true) peEc=0;
        else if (ad.monitoredPeEcTCo2!==undefined&&ad.monitoredPeEcTCo2!==null) peEc=reqNum(ad.monitoredPeEcTCo2,'anaerobicDigesterActivity.monitoredPeEcTCo2',0);
        else if (ad.monitoredElectricityKwhPerYear!==undefined&&ad.monitoredElectricityKwhPerYear!==null){ const kwh=reqNum(ad.monitoredElectricityKwhPerYear,'anaerobicDigesterActivity.monitoredElectricityKwhPerYear',0); const efEl=(ad.electricityEmissionFactorTCo2PerMwh!==undefined&&ad.electricityEmissionFactorTCo2PerMwh!==null)?reqNum(ad.electricityEmissionFactorTCo2PerMwh,'anaerobicDigesterActivity.electricityEmissionFactorTCo2PerMwh',0):EFEL_DEFAULT; peEc=(kwh/1000)*efEl; }
        else if (ad.digesterElectricityType){ const fec=fecMap[ad.digesterElectricityType]; if(fec===undefined) throw new Error('anaerobicDigesterActivity.digesterElectricityType not recognized for TOOL14 FEC,default'); const efEl=(ad.electricityEmissionFactorTCo2PerMwh!==undefined&&ad.electricityEmissionFactorTCo2PerMwh!==null)?reqNum(ad.electricityEmissionFactorTCo2PerMwh,'anaerobicDigesterActivity.electricityEmissionFactorTCo2PerMwh',0):EFEL_DEFAULT; peEc=qCh4*fec*efEl; }
        else if (ad.noElectricityConsumption===true) peEc=0;
        else throw new Error('anaerobicDigesterActivity requires PEEC input (TOOL14 Step 2)');
        let peFc=0;
        if (ad.monitoredPeFcTCo2!==undefined&&ad.monitoredPeFcTCo2!==null) peFc=reqNum(ad.monitoredPeFcTCo2,'anaerobicDigesterActivity.monitoredPeFcTCo2',0);
        else if (ad.usesFossilFuels===true) throw new Error('anaerobicDigesterActivity.monitoredPeFcTCo2 required when fossil fuels are used (TOOL14 Step 3/TOOL03)');
        let efCh4Leak;
        if (ad.efCh4LeakFraction!==undefined&&ad.efCh4LeakFraction!==null) efCh4Leak=reqNum(ad.efCh4LeakFraction,'anaerobicDigesterActivity.efCh4LeakFraction',0,1);
        else if (ad.digesterPhysicalLeakType){ efCh4Leak=efch4Map[ad.digesterPhysicalLeakType]; if(efCh4Leak===undefined) throw new Error('anaerobicDigesterActivity.digesterPhysicalLeakType not recognized for TOOL14 EFCH4,default'); }
        else throw new Error('anaerobicDigesterActivity requires efCh4LeakFraction or digesterPhysicalLeakType for PECH4,y (TOOL14 Step 4)');
        const peCh4=qCh4*efCh4Leak*gwpCh4;
        let peFlareAd=0;
        if (ad.monitoredPeFlareTCo2e!==undefined&&ad.monitoredPeFlareTCo2e!==null) peFlareAd=reqNum(ad.monitoredPeFlareTCo2e,'anaerobicDigesterActivity.monitoredPeFlareTCo2e',0);
        else if (ad.flareOfBiogas===true) throw new Error('anaerobicDigesterActivity.monitoredPeFlareTCo2e (TOOL06 result/direct) required when flare of biogas is present');
        if (ad.flareAccountedInSeparatePeFlareActivity===true) { adFlareIncludedInPeAd=false; peAdTCo2e=peEc+peFc+peCh4; }
        else { adFlareIncludedInPeAd = peFlareAd>0; peAdTCo2e=peEc+peFc+peCh4+peFlareAd; }
        peTotalTCo2e += peAdTCo2e;
        let leStorage=0;
        if (ad.monitoredLeStorageTCo2e!==undefined&&ad.monitoredLeStorageTCo2e!==null) leStorage=reqNum(ad.monitoredLeStorageTCo2e,'anaerobicDigesterActivity.monitoredLeStorageTCo2e',0);
        else if (ad.liquidDigestateStorage && ad.liquidDigestateStorage.anaerobicStorage===true){ const ls=ad.liquidDigestateStorage; if(ls.fwwCh4DefaultType){ const fww=fwwMap[ls.fwwCh4DefaultType]; if(fww===undefined) throw new Error('liquidDigestateStorage.fwwCh4DefaultType not recognized (TOOL14 Table 8)'); leStorage=fww*qCh4*gwpCh4; } else if(ls.qStoredM3PerYear!==undefined&&ls.qStoredM3PerYear!==null&&ls.pCodTonnesPerM3!==undefined&&ls.pCodTonnesPerM3!==null){ const qStored=reqNum(ls.qStoredM3PerYear,'liquidDigestateStorage.qStoredM3PerYear',0); const pCod=reqNum(ls.pCodTonnesPerM3,'liquidDigestateStorage.pCodTonnesPerM3',0); const b0=(ls.b0TCh4PerTCod!==undefined&&ls.b0TCh4PerTCod!==null)?reqNum(ls.b0TCh4PerTCod,'liquidDigestateStorage.b0TCh4PerTCod',0):0.25; const mcf=(ls.mcf!==undefined&&ls.mcf!==null)?reqNum(ls.mcf,'liquidDigestateStorage.mcf',0,1):null; if(mcf===null) throw new Error('liquidDigestateStorage.mcf required for Eq(6) (TOOL14 Table 10)'); leStorage=qStored*pCod*b0*mcf*gwpCh4; } else throw new Error('liquidDigestateStorage requires fwwCh4DefaultType (Option 2 Eq7), or qStoredM3PerYear+pCodTonnesPerM3+mcf for Eq(6), or monitoredLeStorageTCo2e'); }
        else if (ad.solidDigestateStorage && ad.solidDigestateStorage.disposedInSwdsOrAnaerobic===true){ if(ad.solidDigestateStorage.fsdCh4DefaultType){ const fsd=fsdMap[ad.solidDigestateStorage.fsdCh4DefaultType]; if(fsd===undefined) throw new Error('solidDigestateStorage.fsdCh4DefaultType not recognized (TOOL14 Table 9)'); leStorage=fsd*qCh4*gwpCh4; } else throw new Error('solidDigestateStorage requires fsdCh4DefaultType (Option 2 Eq8) or monitoredLeStorageTCo2e'); }
        let leComp=0;
        if (ad.monitoredLeCompTCo2e!==undefined&&ad.monitoredLeCompTCo2e!==null) leComp=reqNum(ad.monitoredLeCompTCo2e,'anaerobicDigesterActivity.monitoredLeCompTCo2e',0);
        else if (ad.digestateComposted===true) throw new Error('anaerobicDigesterActivity.monitoredLeCompTCo2e required when digestate is composted (TOOL13)');
        leAdFromTool14TCo2e = leStorage + leComp;
    }

    // PE_flare,y (suppressed if AD flare already included in PEAD to avoid double counting)
    if (project.flareActivity && !(project.anaerobicDigesterActivity && adFlareIncludedInPeAd)) {

        const mcfFlare = project.flareActivity.methaneConversionFactor;
        if (!(mcfFlare >= 0 && mcfFlare <= 1)) {
            throw new Error('flareActivity.methaneConversionFactor must be within [0, 1]');
        }
        const efCh4 = project.flareActivity.emissionFactorKgCh4PerM3;
        if (!(efCh4 >= 0)) {
            throw new Error('flareActivity.emissionFactorKgCh4PerM3 must be >= 0');
        }

        let totalFlaringKgCh4 = 0;
        livestockInput.forEach(function (entry) {
            const qFlare = entry.flaredMethaneVolumeM3PerYear;
            if (!(qFlare >= 0)) {
                throw new Error('flaredMethaneVolumeM3PerYear must be >= 0 for livestock type ' + entry.type);
            }
            totalFlaringKgCh4 += mcfFlare * efCh4 * qFlare;
        });
        peTotalTCo2e += (totalFlaringKgCh4 * gwpCh4) / 1000;
    }

    // PE_transport,y
    if (project.transportActivity) {
        const transportTypes = project.transportActivity.transportTypes;
        if (!Array.isArray(transportTypes) || transportTypes.length < 1) {
            throw new Error('transportActivity.transportTypes must be a non-empty array');
        }

        const gwpCo2 = parameters.globalWarmingPotentialCo2;
        if (!(gwpCo2 > 0)) {
            throw new Error('parameters.globalWarmingPotentialCo2 must be > 0 for PE_transport,y');
        }

        let totalTransportKgCo2 = 0;
        transportTypes.forEach(function (entry) {
            const distance = entry.distanceKmPerYear;
            if (!(distance >= 0)) {
                throw new Error('distanceKmPerYear must be >= 0');
            }
            const fuelConsumption = entry.fuelConsumptionLPerKm;
            if (!(fuelConsumption >= 0)) {
                throw new Error('fuelConsumptionLPerKm must be >= 0');
            }
            const efFuel = entry.co2EmissionFactorKgCo2PerL;
            if (!(efFuel >= 0)) {
                throw new Error('co2EmissionFactorKgCo2PerL must be >= 0');
            }
            totalTransportKgCo2 += distance * fuelConsumption * efFuel;
        });
        peTotalTCo2e += (totalTransportKgCo2 * gwpCo2) / 1000;
    }

    // PE_elec/heat,y
    if (project.energyActivity) {
        const efElec = parameters.gridElectricityEmissionFactorKgCo2PerKwh;
        if (!(efElec >= 0)) {
            throw new Error('parameters.gridElectricityEmissionFactorKgCo2PerKwh must be >= 0');
        }
        const efHeat = parameters.heatEmissionFactorKgCo2PerGj;
        if (!(efHeat >= 0)) {
            throw new Error('parameters.heatEmissionFactorKgCo2PerGj must be >= 0');
        }

        const MONTHS = 12;
        const elecMonthly = project.energyActivity.electricityConsumptionKwhPerMonth;
        const heatMonthly = project.energyActivity.heatConsumptionGjPerMonth;

        if (!Array.isArray(elecMonthly) || elecMonthly.length !== MONTHS) {
            throw new Error('electricityConsumptionKwhPerMonth must hold exactly 12 monthly values');
        }
        if (!Array.isArray(heatMonthly) || heatMonthly.length !== MONTHS) {
            throw new Error('heatConsumptionGjPerMonth must hold exactly 12 monthly values');
        }

        let totalElecKgCo2 = 0;
        let totalHeatKgCo2 = 0;
        elecMonthly.forEach(function (kwh) {
            if (!(kwh >= 0) || !isFinite(kwh)) {
                throw new Error('electricityConsumptionKwhPerMonth must be a finite number >= 0');
            }
            totalElecKgCo2 += kwh * efElec;
        });
        heatMonthly.forEach(function (gj) {
            if (!(gj >= 0) || !isFinite(gj)) {
                throw new Error('heatConsumptionGjPerMonth must be a finite number >= 0');
            }
            totalHeatKgCo2 += gj * efHeat;
        });
        peTotalTCo2e += (totalElecKgCo2 + totalHeatKgCo2) / 1000;
    }

    // ---- LE_y (leakage, optional) ----
    // Source: ACM0010 v09.0 Eq (22): LE_y = (LEPJ,N2O,y − LEBL,N2O,y) + (LEPJ,CH4,y − LEBL,CH4,y) + LEAD_y
    // Net leakage is only considered if positive.
    let leTCo2e = 0;
    if (project.leakageActivity) {
        const gwpN2oLeak = parameters.globalWarmingPotentialN2O;
        if (!(gwpN2oLeak > 0)) {
            throw new Error('parameters.globalWarmingPotentialN2O must be > 0 for leakage calculation');
        }

        const dCh4Leak = 0.00067;
        const n2oNToN2oLeak = 44 / 28;

        const ef1 = project.leakageActivity.ef1KgN2ONPerKgN;
        const ef4 = project.leakageActivity.ef4KgN2ONPerKgNH3NAndNOxN;
        const ef5 = project.leakageActivity.ef5KgN2ONPerKgN;
        const fLeach = project.leakageActivity.fLeach;
        const fGasm = project.leakageActivity.fGasm;
        const mcfD = project.leakageActivity.mcfD !== undefined ? project.leakageActivity.mcfD : 1.0;

        if (typeof ef1 !== 'number' || !(ef1 >= 0)) {
            throw new Error('leakageActivity.ef1KgN2ONPerKgN must be >= 0');
        }
        if (typeof ef4 !== 'number' || !(ef4 >= 0)) {
            throw new Error('leakageActivity.ef4KgN2ONPerKgNH3NAndNOxN must be >= 0');
        }
        if (typeof ef5 !== 'number' || !(ef5 >= 0)) {
            throw new Error('leakageActivity.ef5KgN2ONPerKgN must be >= 0');
        }
        if (typeof fLeach !== 'number' || !(fLeach >= 0 && fLeach <= 1)) {
            throw new Error('leakageActivity.fLeach must be within [0, 1]');
        }
        if (typeof fGasm !== 'number' || !(fGasm >= 0 && fGasm <= 1)) {
            throw new Error('leakageActivity.fGasm must be within [0, 1]');
        }
        if (typeof mcfD !== 'number' || !(mcfD >= 0 && mcfD <= 1)) {
            throw new Error('leakageActivity.mcfD must be within [0, 1]');
        }

        // Calculate cumulative RN decay factor
        let rnDecayFactor = 1;
        stages.forEach(function (stage) {
            const rn = stage.relativeNitrogenReduction !== undefined ? stage.relativeNitrogenReduction : 0;
            if (rn < 0 || rn > 1) {
                throw new Error('relativeNitrogenReduction must be within [0, 1]');
            }
            rnDecayFactor *= (1 - rn);
        });

        // Calculate Σ(N_EX_LT,y × N_LT)
        let totalNitrogenExcretionKg = 0;
        livestockInput.forEach(function (entry) {
            const nitrogenExcretion = entry.nitrogenExcretionKgNPerAnimalYear;
            if (typeof nitrogenExcretion !== 'number' || !(nitrogenExcretion >= 0)) {
                throw new Error('nitrogenExcretionKgNPerAnimalYear must be >= 0 for ' + entry.type);
            }
            const herd = entry.herdParameters;
            if (!herd) {
                throw new Error('herdParameters required for leakage on ' + entry.type);
            }
            const nLt = herd.daysAliveInYear * (herd.animalsProducedAnnually / 365);
            totalNitrogenExcretionKg += nitrogenExcretion * nLt;
        });

        // N2O leakage components
        const len2oLand = ef1 * rnDecayFactor * totalNitrogenExcretionKg;
        const len2oRunoff = ef5 * fLeach * rnDecayFactor * totalNitrogenExcretionKg;
        const len2oVol = ef4 * rnDecayFactor * fGasm * totalNitrogenExcretionKg;
        const leblN2o = gwpN2oLeak * n2oNToN2oLeak * (1 / 1000) * (len2oLand + len2oRunoff + len2oVol);
        const lepjN2o = leblN2o; // Project leakage N2O (same structure)

        // CH4 leakage
        let rvsDecayFactor = 1;
        stages.forEach(function (stage) {
            const rvs = stage.volatileSolidsReductionFraction !== undefined ? stage.volatileSolidsReductionFraction : 0;
            rvsDecayFactor *= (1 - rvs);
        });

        let totalCh4Potential = 0;
        livestockInput.forEach(function (entry) {
            const vs = entry.annualVolatileSolids;
            const b0 = entry.maxMethaneProducingCapacity;
            if (typeof vs !== 'number' || !(vs >= 0)) {
                throw new Error('annualVolatileSolids must be >= 0 for ' + entry.type);
            }
            if (typeof b0 !== 'number' || !(b0 >= 0)) {
                throw new Error('maxMethaneProducingCapacity must be >= 0 for ' + entry.type);
            }
            const herd = entry.herdParameters;
            if (!herd) {
                throw new Error('herdParameters required for leakage on ' + entry.type);
            }
            const nLt = herd.daysAliveInYear * (herd.animalsProducedAnnually / 365);
            totalCh4Potential += b0 * nLt * vs;
        });

        const msFraction = project.leakageActivity.msFraction !== undefined ? project.leakageActivity.msFraction : 1.0;
        const leblCh4 = gwpCh4 * dCh4Leak * mcfD * rvsDecayFactor * totalCh4Potential * msFraction;
        const lepjCh4 = leblCh4; // Project leakage CH4 (same structure)

        // LEAD_y: prefer TOOL14-computed LEAD from anaerobicDigesterActivity when present; else leakageActivity.leadYTCo2e
        const leadYInput = project.leakageActivity.leadYTCo2e !== undefined ? project.leakageActivity.leadYTCo2e : 0;
        const leadY = project.anaerobicDigesterActivity ? leAdFromTool14TCo2e : leadYInput;

        // LE_y = (LEPJ,N2O,y − LEBL,N2O,y) + (LEPJ,CH4,y − LEBL,CH4,y) + LEAD_y
        // Net leakage is only considered if positive
        const n2oLeakage = lepjN2o - leblN2o;
        const ch4Leakage = lepjCh4 - leblCh4;
        leTCo2e = Math.max(0, n2oLeakage) + Math.max(0, ch4Leakage) + leadY;
    } else if (project.anaerobicDigesterActivity) {
        leTCo2e = leAdFromTool14TCo2e;
    }

    // ---- MD_y (methane captured and destroyed) ----
    // Source: ACM0010 v09.0 Eq (35): MD_y = BG_burnet,y × w_CH4,y × D_CH4 × GWP_CH4
    let mdTCo2e = 0;
    if (project.methaneCapture) {
        const bgBurnt = project.methaneCapture.biogasVolumeM3PerYear;
        const wCh4 = project.methaneCapture.methaneVolumeFraction;
        if (typeof bgBurnt !== 'number' || !(bgBurnt >= 0)) {
            throw new Error('methaneCapture.biogasVolumeM3PerYear must be >= 0');
        }
        if (typeof wCh4 !== 'number' || !(wCh4 >= 0 && wCh4 <= 1)) {
            throw new Error('methaneCapture.methaneVolumeFraction must be within [0, 1]');
        }
        mdTCo2e = bgBurnt * wCh4 * 0.00067 * gwpCh4;
    }

    // ---- ER_y (ex ante emission reductions) ----
    // Source: ACM0010 v09.0 Eq (33): ER_y = BE_y − PE_y − LE_y
    const erExAnteTCo2e = beTotalTCo2e - peTotalTCo2e - leTCo2e;

    // ---- ER_y,ex post (ex post emission reductions) ----
    // Source: ACM0010 v09.0 Eq (34): ER_y,ex post = min[(BE_CH4,ex post − PE_y,ex post), (MD_y − PE_y − LE_y)]
    let erExPostTCo2e = null;
    if (project.exPostCalculation && project.exPostCalculation.beCh4ExPostTCo2e !== undefined) {
        const beCh4ExPost = project.exPostCalculation.beCh4ExPostTCo2e;
        const peExPost = project.exPostCalculation.peExPostTCo2e !== undefined ? project.exPostCalculation.peExPostTCo2e : peTotalTCo2e;
        const erFromBaseline = beCh4ExPost - peExPost;
        const erFromMethaneCaptured = mdTCo2e - peTotalTCo2e - leTCo2e;
        erExPostTCo2e = Math.min(erFromBaseline, erFromMethaneCaptured);
    }

    done({
        ref: project.id,
        year: project.monitoringYear,
        baselineEmissionsTCo2e: beTotalTCo2e,
        projectEmissionsTCo2e: peTotalTCo2e,
        leakageTCo2e: leTCo2e,
        methaneCapturedTCo2e: mdTCo2e,
        emissionReductionsTCo2e: erExAnteTCo2e,
        emissionReductionsExPostTCo2e: erExPostTCo2e,
        globalWarmingPotentialCh4: gwpCh4,
        globalWarmingPotentialN2O: gwpN2o !== undefined && gwpN2o !== null ? gwpN2o : null,
        components: {
            baselineCh4: beCh4TCo2e,
            baselineN2O: beN2OTC02e,
            projectAnaerobicDigesterTCo2e: peAdTCo2e,
            leakageAnaerobicDigesterTCo2e: leAdFromTool14TCo2e,
        },
    });
})();