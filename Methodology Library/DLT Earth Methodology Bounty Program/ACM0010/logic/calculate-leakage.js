/**
 * ACM0010 v09.0 — Leakage Emissions, LE_y
 *
 * CustomLogicBlock expression for Guardian.
 *
 * Source: ACM0010 v09.0 Draft (CDM-MP98-A01), Section 5.5
 *
 * EQUATIONS
 *   LE_y = (LEPJ,N2O,y − LEBL,N2O,y) + (LEPJ,CH4,y − LEBL,CH4,y) + LEAD_y   (Eq 22)
 *
 *   LEBL,N2O,y = GWP_N2O × CF_N2O-N,N × 1/1000
 *                × (LEN2O,land,y + LEN2O,runoff,y + LEN2O,vol,y)            (Eq 23)
 *
 *   LEN2O,land,y  = EF1 × Π(1 − RN,n) × Σ(N_EX_LT,y × N_LT)                (Eq 24)
 *   LEN2O,runoff,y = EF5 × F_leach × Π(1 − RN,n) × Σ(N_EX_LT,y × N_LT)     (Eq 25)
 *   LEN2O,vol,y   = EF4 × Π(1 − RN,n) × F_gasm × Σ(N_EX_LT,y × N_LT)       (Eq 26)
 *
 *   LEPJ,N2O,y = same structure as LEBL,N2O,y with project-specific inputs
 *
 *   LEBL,CH4,y = GWP_CH4 × D_CH4 × MCF_d × [Π(1 − RVS,n)]
 *                × Σ(B0_LT × N_LT × VSLT_y × MS%_j)                         (Eq 31)
 *
 *   LEPJ,CH4,y = same structure as LEBL,CH4,y with project-specific inputs  (Eq 32)
 *
 *   LEAD_y = determined using TOOL14 (anaerobic digester leakage)
 *
 * Net leakage is only considered if positive.
 *
 * GUARDIAN SANDBOX CONTRACT
 *   documents : array of submitted VCs, most recent last
 *   done(obj) : emit the output VC payload
 */

(function calc() {
    const project = documents[documents.length - 1].document.credentialSubject[0];

    const parameters = project.parameters || {};
    const leakage = project.leakageActivity;

    // Gate: no leakage activity declared -> no output.
    if (!leakage) {
        done(null);
        return;
    }

    const gwpCh4 = parameters.globalWarmingPotentialCh4;
    const gwpN2o = parameters.globalWarmingPotentialN2O;
    const dCh4 = 0.00067; // t/m3, ACM0010 v09 D_CH4
    const n2oNToN2o = 44 / 28;
    const daysPerYear = 365;

    if (!(gwpCh4 > 0)) {
        throw new Error('parameters.globalWarmingPotentialCh4 must be > 0 for leakage calculation');
    }
    if (!(gwpN2o > 0)) {
        throw new Error('parameters.globalWarmingPotentialN2O must be > 0 for leakage N2O calculation');
    }

    // ---- Input validation ----
    const ef1 = leakage.ef1KgN2ONPerKgN;
    const ef4 = leakage.ef4KgN2ONPerKgNH3NAndNOxN;
    const ef5 = leakage.ef5KgN2ONPerKgN;
    const fLeach = leakage.fLeach;
    const fGasm = leakage.fGasm;
    const mcfD = leakage.mcfD !== undefined ? leakage.mcfD : 1.0; // MCF_d = 1 by default

    if (typeof ef1 !== 'number' || !(ef1 >= 0)) {
        throw new Error('leakageActivity.ef1KgN2ONPerKgN must be a finite number >= 0');
    }
    if (typeof ef4 !== 'number' || !(ef4 >= 0)) {
        throw new Error('leakageActivity.ef4KgN2ONPerKgNH3NAndNOxN must be a finite number >= 0');
    }
    if (typeof ef5 !== 'number' || !(ef5 >= 0)) {
        throw new Error('leakageActivity.ef5KgN2ONPerKgN must be a finite number >= 0');
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

    // ---- Resolve livestock and nitrogen excretion ----
    const livestockInput = project.livestock || [];
    if (!Array.isArray(livestockInput) || livestockInput.length < 1) {
        throw new Error('at least one livestock type is required for leakage calculation');
    }

    // Resolve annual average animals and nitrogen excretion per livestock type
    const livestockData = livestockInput.map(function (entry) {
        const nitrogenExcretion = entry.nitrogenExcretionKgNPerAnimalYear;
        if (typeof nitrogenExcretion !== 'number' || !(nitrogenExcretion >= 0)) {
            throw new Error('nitrogenExcretionKgNPerAnimalYear must be >= 0 for livestock type ' + entry.type);
        }

        let annualAverageAnimals;
        if (entry.annualVolatileSolids !== undefined && entry.annualVolatileSolids !== null) {
            // When VS is supplied directly, we still need N_LT for N2O leakage
            const herd = entry.herdParameters;
            if (!herd) {
                throw new Error('herdParameters are required for leakage N2O calculation on livestock type ' + entry.type);
            }
            const daysAlive = herd.daysAliveInYear;
            const animalsProduced = herd.animalsProducedAnnually;
            if (!(daysAlive >= 0 && daysAlive <= daysPerYear) || !(animalsProduced >= 0)) {
                throw new Error('invalid herd parameters for livestock type ' + entry.type);
            }
            annualAverageAnimals = daysAlive * (animalsProduced / daysPerYear);
        } else {
            const herd = entry.herdParameters;
            if (!herd) {
                throw new Error('herdParameters are required for leakage calculation on livestock type ' + entry.type);
            }
            const daysAlive = herd.daysAliveInYear;
            const animalsProduced = herd.animalsProducedAnnually;
            if (!(daysAlive >= 0 && daysAlive <= daysPerYear) || !(animalsProduced >= 0)) {
                throw new Error('invalid herd parameters for livestock type ' + entry.type);
            }
            annualAverageAnimals = daysAlive * (animalsProduced / daysPerYear);
        }

        return {
            type: entry.type,
            nitrogenExcretion: nitrogenExcretion,
            annualAverageAnimals: annualAverageAnimals,
            maxMethaneProducingCapacity: entry.maxMethaneProducingCapacity,
            annualVolatileSolids: entry.annualVolatileSolids,
        };
    });

    // ---- Resolve stages for RVS and RN decay factors ----
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

    // Calculate cumulative RVS and RN decay factors
    let rvsDecayFactor = 1; // Π(1 − RVS,n)
    let rnDecayFactor = 1;  // Π(1 − RN,n)
    stages.forEach(function (stage) {
        const rvs = stage.volatileSolidsReductionFraction !== undefined ? stage.volatileSolidsReductionFraction : 0;
        const rn = stage.relativeNitrogenReduction !== undefined ? stage.relativeNitrogenReduction : 0;
        if (rvs < 0 || rvs > 1) {
            throw new Error('volatileSolidsReductionFraction must be within [0, 1]');
        }
        if (rn < 0 || rn > 1) {
            throw new Error('relativeNitrogenReduction must be within [0, 1]');
        }
        rvsDecayFactor *= (1 - rvs);
        rnDecayFactor *= (1 - rn);
    });

    // ---- Calculate Σ(N_EX_LT,y × N_LT) ----
    let totalNitrogenExcretionKg = 0;
    livestockData.forEach(function (entry) {
        totalNitrogenExcretionKg += entry.nitrogenExcretion * entry.annualAverageAnimals;
    });

    // ---- Leakage N2O (baseline and project) ----
    // LEN2O,land,y = EF1 × Π(1 − RN,n) × Σ(N_EX_LT,y × N_LT)
    const len2oLand = ef1 * rnDecayFactor * totalNitrogenExcretionKg;
    // LEN2O,runoff,y = EF5 × F_leach × Π(1 − RN,n) × Σ(N_EX_LT,y × N_LT)
    const len2oRunoff = ef5 * fLeach * rnDecayFactor * totalNitrogenExcretionKg;
    // LEN2O,vol,y = EF4 × Π(1 − RN,n) × F_gasm × Σ(N_EX_LT,y × N_LT)
    const len2oVol = ef4 * rnDecayFactor * fGasm * totalNitrogenExcretionKg;

    // LEBL,N2O,y = GWP_N2O × CF_N2O-N,N × 1/1000 × (LEN2O,land,y + LEN2O,runoff,y + LEN2O,vol,y)
    const leblN2o = gwpN2o * n2oNToN2o * (1 / 1000) * (len2oLand + len2oRunoff + len2oVol);

    // Project leakage N2O uses the same structure with project-specific inputs
    // For simplicity, we use the same values as baseline unless project-specific inputs are provided
    const lepjN2o = leblN2o; // TODO: implement project-specific inputs if needed

    // ---- Leakage CH4 (baseline and project) ----
    // LEBL,CH4,y = GWP_CH4 × D_CH4 × MCF_d × [Π(1 − RVS,n)] × Σ(B0_LT × N_LT × VSLT_y × MS%_j)
    let totalCh4Potential = 0;
    livestockData.forEach(function (entry) {
        const vs = entry.annualVolatileSolids;
        if (typeof vs !== 'number' || !(vs >= 0)) {
            throw new Error('annualVolatileSolids must be >= 0 for livestock type ' + entry.type);
        }
        const b0 = entry.maxMethaneProducingCapacity;
        if (typeof b0 !== 'number' || !(b0 >= 0)) {
            throw new Error('maxMethaneProducingCapacity must be >= 0 for livestock type ' + entry.type);
        }
        totalCh4Potential += b0 * entry.annualAverageAnimals * vs;
    });

    // Apply MS%_j (manure fraction) - use 1.0 if not specified
    const msFraction = leakage.msFraction !== undefined ? leakage.msFraction : 1.0;
    if (typeof msFraction !== 'number' || !(msFraction >= 0 && msFraction <= 1)) {
        throw new Error('leakageActivity.msFraction must be within [0, 1]');
    }

    // LEBL,CH4,y = GWP_CH4 × D_CH4 × MCF_d × [Π(1 − RVS,n)] × Σ(B0_LT × N_LT × VSLT_y × MS%_j)
    const leblCh4 = gwpCh4 * dCh4 * mcfD * rvsDecayFactor * totalCh4Potential * msFraction;

    // Project leakage CH4 uses the same structure with project-specific inputs
    const lepjCh4 = leblCh4; // TODO: implement project-specific inputs if needed

    // ---- LEAD,y (anaerobic digester leakage, TOOL14 v03.0) ----
    // Prefer TOOL14-computed LEAD from anaerobicDigesterActivity if provided; else leakageActivity.leadYTCo2e.
    let leadY = 0;
    if (project.anaerobicDigesterActivity) {
        const ad = project.anaerobicDigesterActivity;
        // minimal QCH4 for default-option LEAD (Eq7/8) consistent with calculate-pe-ad/calculate-er
        const RHO_CH4 = 0.00067, FCH4_DEFAULT = 0.6;
        function reqNum(v,name,min,max){ if(typeof v!=='number'||!isFinite(v)) throw new Error(name+' must be a finite number'); if(min!==undefined&&v<min) throw new Error(name+' must be >= '+min); if(max!==undefined&&v>max) throw new Error(name+' must be <= '+max); return v; }
        let qCh4;
        if (ad.monitoredQCh4TonnesPerYear !== undefined && ad.monitoredQCh4TonnesPerYear !== null) qCh4=reqNum(ad.monitoredQCh4TonnesPerYear,'anaerobicDigesterActivity.monitoredQCh4TonnesPerYear',0);
        else if (ad.biogasVolumeM3PerYearAtReference !== undefined && ad.biogasVolumeM3PerYearAtReference !== null){ const qBiogas=reqNum(ad.biogasVolumeM3PerYearAtReference,'anaerobicDigesterActivity.biogasVolumeM3PerYearAtReference',0); const fCh4=(ad.fCh4BiogasFraction!==undefined&&ad.fCh4BiogasFraction!==null)?reqNum(ad.fCh4BiogasFraction,'anaerobicDigesterActivity.fCh4BiogasFraction',0,1):FCH4_DEFAULT; qCh4=qBiogas*fCh4*RHO_CH4; }
        else throw new Error('anaerobicDigesterActivity requires monitoredQCh4TonnesPerYear or biogasVolumeM3PerYearAtReference for QCH4,y (TOOL14)');
        const fwwMap={covered_anaerobic_lagoon:0.10,uasb_anaerobic_filter_fluidized_bed:0.15,conventional_digester:0.20,two_stage_digester:0.05};
        const fsdMap={two_phase_digester:0.15,all_other_technologies:0.35};
        let leStorage=0;
        if (ad.monitoredLeStorageTCo2e!==undefined&&ad.monitoredLeStorageTCo2e!==null) leStorage=reqNum(ad.monitoredLeStorageTCo2e,'anaerobicDigesterActivity.monitoredLeStorageTCo2e',0);
        else if (ad.liquidDigestateStorage && ad.liquidDigestateStorage.anaerobicStorage===true){ const ls=ad.liquidDigestateStorage; if(ls.fwwCh4DefaultType){ const fww=fwwMap[ls.fwwCh4DefaultType]; if(fww===undefined) throw new Error('liquidDigestateStorage.fwwCh4DefaultType not recognized (TOOL14 Table 8)'); leStorage=fww*qCh4*gwpCh4; } else if(ls.qStoredM3PerYear!==undefined&&ls.qStoredM3PerYear!==null&&ls.pCodTonnesPerM3!==undefined&&ls.pCodTonnesPerM3!==null){ const qStored=reqNum(ls.qStoredM3PerYear,'liquidDigestateStorage.qStoredM3PerYear',0); const pCod=reqNum(ls.pCodTonnesPerM3,'liquidDigestateStorage.pCodTonnesPerM3',0); const b0=(ls.b0TCh4PerTCod!==undefined&&ls.b0TCh4PerTCod!==null)?reqNum(ls.b0TCh4PerTCod,'liquidDigestateStorage.b0TCh4PerTCod',0):0.25; const mcf=(ls.mcf!==undefined&&ls.mcf!==null)?reqNum(ls.mcf,'liquidDigestateStorage.mcf',0,1):null; if(mcf===null) throw new Error('liquidDigestateStorage.mcf required for Eq(6) (TOOL14 Table 10)'); leStorage=qStored*pCod*b0*mcf*gwpCh4; } else throw new Error('liquidDigestateStorage requires fwwCh4DefaultType (Option 2 Eq7), or qStoredM3PerYear+pCodTonnesPerM3+mcf for Eq(6), or monitoredLeStorageTCo2e'); }
        else if (ad.solidDigestateStorage && ad.solidDigestateStorage.disposedInSwdsOrAnaerobic===true){ if(ad.solidDigestateStorage.fsdCh4DefaultType){ const fsd=fsdMap[ad.solidDigestateStorage.fsdCh4DefaultType]; if(fsd===undefined) throw new Error('solidDigestateStorage.fsdCh4DefaultType not recognized (TOOL14 Table 9)'); leStorage=fsd*qCh4*gwpCh4; } else throw new Error('solidDigestateStorage requires fsdCh4DefaultType (Option 2 Eq8) or monitoredLeStorageTCo2e'); }
        let leComp=0;
        if (ad.monitoredLeCompTCo2e!==undefined&&ad.monitoredLeCompTCo2e!==null) leComp=reqNum(ad.monitoredLeCompTCo2e,'anaerobicDigesterActivity.monitoredLeCompTCo2e',0);
        else if (ad.digestateComposted===true) throw new Error('anaerobicDigesterActivity.monitoredLeCompTCo2e required when digestate is composted (TOOL13)');
        leadY = leStorage + leComp;
    } else {
        leadY = leakage.leadYTCo2e !== undefined ? leakage.leadYTCo2e : 0;
    }
    if (typeof leadY !== 'number' || !(leadY >= 0)) {
        throw new Error('LEAD_y (leadYTCo2e) must be >= 0');
    }

    // ---- LE_y = (LEPJ,N2O,y − LEBL,N2O,y) + (LEPJ,CH4,y − LEBL,CH4,y) + LEAD_y ----
    const n2oLeakage = lepjN2o - leblN2o;
    const ch4Leakage = lepjCh4 - leblCh4;

    // Net leakage is only considered if positive
    const leY = Math.max(0, n2oLeakage) + Math.max(0, ch4Leakage) + leadY;

    done({
        ref: project.id,
        year: project.monitoringYear,
        // N2O leakage components
        leblN2oTCo2e: leblN2o,
        lepjN2oTCo2e: lepjN2o,
        n2oLeakageTCo2e: Math.max(0, n2oLeakage),
        len2oLandKgN2ON: len2oLand,
        len2oRunoffKgN2ON: len2oRunoff,
        len2oVolKgN2ON: len2oVol,
        // CH4 leakage components
        leblCh4TCo2e: leblCh4,
        lepjCh4TCo2e: lepjCh4,
        ch4LeakageTCo2e: Math.max(0, ch4Leakage),
        // Digester leakage
        leadYTCo2e: leadY,
        // Total leakage
        leakageTCo2e: leY,
        // Input parameters used
        parameters: {
            gwpCh4: gwpCh4,
            gwpN2o: gwpN2o,
            dCh4: dCh4,
            n2oNToN2o: n2oNToN2o,
            ef1: ef1,
            ef4: ef4,
            ef5: ef5,
            fLeach: fLeach,
            fGasm: fGasm,
            mcfD: mcfD,
            msFraction: msFraction,
            rvsDecayFactor: rvsDecayFactor,
            rnDecayFactor: rnDecayFactor,
        },
    });
})();
