/**
 * ACM0010 / TOOL14 v03.0 - Project and leakage emissions from anaerobic digesters (PEAD,y, LEAD,y)
 *
 * CustomLogicBlock expression for Guardian.
 * Source: CDM TOOL14 v03.0 "Project and leakage emissions from anaerobic digesters"
 * (EB 123 Annex 2, valid from 7 Nov 2024; https://cdm.unfccc.int/methodologies/PAmethodologies/tools/am-tool-14-v3.pdf)
 * as referenced by ACM0010 v09.0 draft (CDM-MP98-A01) sections 5.4.1 (PEAD,y) and 5.5.4 (LEAD,y).
 *
 * Implemented (authoritative, supported options):
 *   Eq (1) PEAD,y = PEEC,y + PEFC,y + PECH4,y + PEflare,y
 *   Eq (2) QCH4,y = Qbiogas,y * fCH4,default * rhoCH4   (Step 1 Option 2, default fCH4)
 *   Eq (3) PEEC,y = QCH4,y * FEC,default * EFEl,default  (Step 2 Option 2, default factors)
 *   Eq (4) PECH4,y = QCH4,y * EFCH4,default * GWPCH4     (Step 4 fugitive methane)
 *   Eq (5) LEAD,y = LEstorage,y + LECOMP,y               (leakage total)
 *   Eq (7) LEstorage,y (liquid digestate, Option 2) = Fww,CH4,default * QCH4,y * GWPCH4
 *   Eq (8) LEstorage,y (solid digestate, Option 2)  = FSD,CH4,default * QCH4,y * GWPCH4
 *
 * Monitored/direct-input paths (when normative tool step requires monitored data or other tools):
 *   - QCH4,y: monitoredQCh4TonnesPerYear (TOOL08 / direct) OR Option 2 from monitored biogas volume.
 *   - PEEC,y: monitoredPeEcTCo2 (TOOL05 result) OR monitored electricity kWh * EF OR Option 2 default.
 *   - PEFC,y: monitoredPeFcTCo2 (TOOL03 result / direct fossil fuel emissions input).
 *   - PEflare,y: monitoredPeFlareTCo2 (TOOL06 result / direct input). NOTE: ACM0010 5.4.5 also
 *     defines PEflare,y separately; to avoid double counting, integrate via policy/ER so AD flare
 *     is not counted twice (see integration notes in output).
 *   - LECOMP,y: monitoredLeCompTCo2 (TOOL13 result / direct input) when composting applies.
 *   - Eq (6) liquid storage Option 1 (COD/MCF/B0, monitored Qstored/PCOD with B0 default 0.25 and MCF) is
 *     computable when liquidDigestateStorage.qStoredM3PerYear, pCodTonnesPerM3 and mcf are provided;
 *     alternatively provide monitored/externally derived monitoredLeStorageTCo2e. Solid Option 1 (TOOL04
 *     model) requires monitored/externally derived monitoredLeStorageTCo2e (TOOL04 not fully reimplemented).
 *
 * Defaults from TOOL14 v03.0 tables: fCH4,default=0.6 m3CH4/m3biogas; rhoCH4=0.00067 tCH4/m3CH4;
 * EFCH4,default by digester type 0.028/0.05/0.10 (0.10 if unknown); FEC,default by digester type
 * 0/0.01/1.02/1.54 MWh/tCH4; EFEl,default=1.3 tCO2/MWh; Fww,CH4,default 0.10/0.15/0.20/0.05;
 * FSD,CH4,default 0.15/0.35; MCF 0.8/0.2/0 (Eq6 not implemented). GWPCH4 from parameters.
 *
 * Applicability (TOOL14): project/leakage emissions from anaerobic digestion in an anaerobic digester
 * (not stockpiles/SWDS/un-aerated lagoons). Large-scale: Step 1 Option 1 only for QCH4; small-scale may
 * use Option 1 or 2. PEEC/PEFC/PECH4/PEflare/leakage steps apply as per tool conditions.
 */

(function calc() {
    const project = documents[documents.length - 1].document.credentialSubject[0];
    const ad = project.anaerobicDigesterActivity;
    if (!ad) { done(null); return; }

    const params = project.parameters || {};
    const gwpCh4 = params.globalWarmingPotentialCh4;
    if (!(gwpCh4 > 0)) throw new Error('parameters.globalWarmingPotentialCh4 must be > 0 for PEAD,y (TOOL14)');

    const RHO_CH4 = 0.00067; // tCH4/m3CH4, TOOL14 Table 2
    const FCH4_DEFAULT = 0.6; // m3CH4/m3biogas, TOOL14 Table 1
    const EFEL_DEFAULT = 1.3; // tCO2/MWh, TOOL14 Table 6

    function reqNum(v, name, min, max) {
        if (typeof v !== 'number' || !isFinite(v)) throw new Error(name + ' must be a finite number');
        if (min !== undefined && v < min) throw new Error(name + ' must be >= ' + min);
        if (max !== undefined && v > max) throw new Error(name + ' must be <= ' + max);
        return v;
    }

    const efch4Map = {
        steel_lined_concrete_fiberglass_gas_holder_monolithic: 0.028,
        uasb_floating_gas_holder_no_external_water_seal: 0.05,
        unlined_concrete_ferrocement_brick_masonry_fixed_dome_covered_lagoon: 0.10,
        unknown: 0.10
    };
    const fecMap = {
        covered_anaerobic_lagoon_gravity_fed_or_conventional: 0,
        uasb_filter_bed_fluidized_bed_wastewater: 0.01,
        conventional_cstr_wastewater: 1.02,
        any_ad_solid_waste_with_preprocessing: 1.54,
        gravity_fed_no_recirculation_no_electrical: 0
    };
    const fwwMap = {
        covered_anaerobic_lagoon: 0.10,
        uasb_anaerobic_filter_fluidized_bed: 0.15,
        conventional_digester: 0.20,
        two_stage_digester: 0.05
    };
    const fsdMap = {
        two_phase_digester: 0.15,
        all_other_technologies: 0.35
    };

    // Step 1: QCH4,y (t CH4)
    let qCh4;
    let qCh4Source;
    if (ad.monitoredQCh4TonnesPerYear !== undefined && ad.monitoredQCh4TonnesPerYear !== null) {
        qCh4 = reqNum(ad.monitoredQCh4TonnesPerYear, 'anaerobicDigesterActivity.monitoredQCh4TonnesPerYear', 0);
        qCh4Source = 'monitored_tool08_or_direct';
    } else if (ad.biogasVolumeM3PerYearAtReference !== undefined && ad.biogasVolumeM3PerYearAtReference !== null) {
        const qBiogas = reqNum(ad.biogasVolumeM3PerYearAtReference, 'anaerobicDigesterActivity.biogasVolumeM3PerYearAtReference', 0);
        const fCh4 = ad.fCh4BiogasFraction !== undefined && ad.fCh4BiogasFraction !== null ? reqNum(ad.fCh4BiogasFraction, 'anaerobicDigesterActivity.fCh4BiogasFraction', 0, 1) : FCH4_DEFAULT;
        qCh4 = qBiogas * fCh4 * RHO_CH4; // Eq (2)
        qCh4Source = 'option2_default_or_provided_fraction';
    } else {
        throw new Error('anaerobicDigesterActivity requires monitoredQCh4TonnesPerYear or biogasVolumeM3PerYearAtReference for QCH4,y (TOOL14 Step 1)');
    }

    // Step 2: PEEC,y (t CO2)
    let peEc = 0;
    let peEcSource = 'not_applicable';
    if (ad.electricityGeneratedOnSiteRenewableBiomassWindHydroGeothermal === true) {
        peEc = 0; peEcSource = 'onsite_renewable_zero';
    } else if (ad.monitoredPeEcTCo2 !== undefined && ad.monitoredPeEcTCo2 !== null) {
        peEc = reqNum(ad.monitoredPeEcTCo2, 'anaerobicDigesterActivity.monitoredPeEcTCo2', 0);
        peEcSource = 'monitored_tool05_or_direct';
    } else if (ad.monitoredElectricityKwhPerYear !== undefined && ad.monitoredElectricityKwhPerYear !== null) {
        const kwh = reqNum(ad.monitoredElectricityKwhPerYear, 'anaerobicDigesterActivity.monitoredElectricityKwhPerYear', 0);
        const efEl = ad.electricityEmissionFactorTCo2PerMwh !== undefined && ad.electricityEmissionFactorTCo2PerMwh !== null ? reqNum(ad.electricityEmissionFactorTCo2PerMwh, 'anaerobicDigesterActivity.electricityEmissionFactorTCo2PerMwh', 0) : EFEL_DEFAULT;
        peEc = (kwh / 1000) * efEl;
        peEcSource = 'monitored_kwh_times_ef';
    } else if (ad.digesterElectricityType) {
        const fec = fecMap[ad.digesterElectricityType];
        if (fec === undefined) throw new Error('anaerobicDigesterActivity.digesterElectricityType not recognized for TOOL14 FEC,default');
        const efEl = ad.electricityEmissionFactorTCo2PerMwh !== undefined && ad.electricityEmissionFactorTCo2PerMwh !== null ? reqNum(ad.electricityEmissionFactorTCo2PerMwh, 'anaerobicDigesterActivity.electricityEmissionFactorTCo2PerMwh', 0) : EFEL_DEFAULT;
        peEc = qCh4 * fec * efEl; // Eq (3)
        peEcSource = 'option2_default_fec';
    } else {
        // if no electricity consumption claimed, allow 0 but be explicit via flag
        if (ad.noElectricityConsumption === true) { peEc = 0; peEcSource = 'none'; }
        else { throw new Error('anaerobicDigesterActivity requires PEEC input (monitoredPeEcTCo2, monitoredElectricityKwhPerYear, digesterElectricityType for Option 2, onsite renewable flag, or noElectricityConsumption)'); }
    }

    // Step 3: PEFC,y (t CO2)
    let peFc = 0;
    if (ad.monitoredPeFcTCo2 !== undefined && ad.monitoredPeFcTCo2 !== null) {
        peFc = reqNum(ad.monitoredPeFcTCo2, 'anaerobicDigesterActivity.monitoredPeFcTCo2', 0);
    } else if (ad.usesFossilFuels === true) {
        throw new Error('anaerobicDigesterActivity.monitoredPeFcTCo2 (TOOL03 result/direct tCO2) required when fossil fuels are used');
    }

    // Step 4: PECH4,y (t CO2e) Eq (4)
    let efCh4Leak;
    if (ad.efCh4LeakFraction !== undefined && ad.efCh4LeakFraction !== null) {
        efCh4Leak = reqNum(ad.efCh4LeakFraction, 'anaerobicDigesterActivity.efCh4LeakFraction', 0, 1);
    } else if (ad.digesterPhysicalLeakType) {
        efCh4Leak = efch4Map[ad.digesterPhysicalLeakType];
        if (efCh4Leak === undefined) throw new Error('anaerobicDigesterActivity.digesterPhysicalLeakType not recognized for TOOL14 EFCH4,default');
    } else {
        throw new Error('anaerobicDigesterActivity requires efCh4LeakFraction or digesterPhysicalLeakType for PECH4,y (TOOL14 Step 4)');
    }
    const peCh4 = qCh4 * efCh4Leak * gwpCh4; // Eq (4)

    // Step 5: PEflare,y (t CO2e) - TOOL06 result/direct; ACM0010 5.4.5 handled separately in policy -> avoid double counting
    let peFlare = 0;
    if (ad.monitoredPeFlareTCo2e !== undefined && ad.monitoredPeFlareTCo2e !== null) {
        peFlare = reqNum(ad.monitoredPeFlareTCo2e, 'anaerobicDigesterActivity.monitoredPeFlareTCo2e', 0);
    } else if (ad.flareOfBiogas === true) {
        throw new Error('anaerobicDigesterActivity.monitoredPeFlareTCo2e (TOOL06 result/direct tCO2e) required when flare of biogas is present');
    }

    const peAd = peEc + peFc + peCh4 + peFlare; // Eq (1)

    // Leakage Eq (5): LEAD,y = LEstorage,y + LECOMP,y
    let leStorage = 0;
    let leStorageSource = 'none';
    if (ad.monitoredLeStorageTCo2e !== undefined && ad.monitoredLeStorageTCo2e !== null) {
        leStorage = reqNum(ad.monitoredLeStorageTCo2e, 'anaerobicDigesterActivity.monitoredLeStorageTCo2e', 0);
        leStorageSource = 'monitored_or_tool04_or_eq6_direct';
    } else if (ad.liquidDigestateStorage) {
        const ls = ad.liquidDigestateStorage;
        if (ls.anaerobicStorage === true) {
            if (ls.fwwCh4DefaultType) {
                const fww = fwwMap[ls.fwwCh4DefaultType];
                if (fww === undefined) throw new Error('liquidDigestateStorage.fwwCh4DefaultType not recognized (TOOL14 Table 8)');
                leStorage = fww * qCh4 * gwpCh4; // Eq (7)
                leStorageSource = 'liquid_option2_eq7';
            } else if (ls.qStoredM3PerYear !== undefined && ls.qStoredM3PerYear !== null && ls.pCodTonnesPerM3 !== undefined && ls.pCodTonnesPerM3 !== null) {
                // TOOL14 Eq (6): LEstorage = Qstored * PCOD * B0 * MCF * GWPCH4 (monitored-data form)
                const qStored = reqNum(ls.qStoredM3PerYear, 'liquidDigestateStorage.qStoredM3PerYear', 0);
                const pCod = reqNum(ls.pCodTonnesPerM3, 'liquidDigestateStorage.pCodTonnesPerM3', 0);
                const b0 = (ls.b0TCh4PerTCod !== undefined && ls.b0TCh4PerTCod !== null) ? reqNum(ls.b0TCh4PerTCod, 'liquidDigestateStorage.b0TCh4PerTCod', 0) : 0.25; // Table 7 default
                const mcf = (ls.mcf !== undefined && ls.mcf !== null) ? reqNum(ls.mcf, 'liquidDigestateStorage.mcf', 0, 1) : null;
                if (mcf === null) throw new Error('liquidDigestateStorage.mcf required for Eq(6) (0.8 depth>=2m, 0.2 1m<=depth<2m, 0 <1m per TOOL14 Table 10)');
                leStorage = qStored * pCod * b0 * mcf * gwpCh4; // Eq (6)
                leStorageSource = 'liquid_option1_eq6_monitored';
            } else {
                throw new Error('liquidDigestateStorage requires fwwCh4DefaultType (Option 2 Eq7), or qStoredM3PerYear+pCodTonnesPerM3+mcf for Eq(6), or provide monitoredLeStorageTCo2e');
            }
        }
    } else if (ad.solidDigestateStorage) {
        const ss = ad.solidDigestateStorage;
        if (ss.disposedInSwdsOrAnaerobic === true) {
            if (ss.fsdCh4DefaultType) {
                const fsd = fsdMap[ss.fsdCh4DefaultType];
                if (fsd === undefined) throw new Error('solidDigestateStorage.fsdCh4DefaultType not recognized (TOOL14 Table 9)');
                leStorage = fsd * qCh4 * gwpCh4; // Eq (8)
                leStorageSource = 'solid_option2_eq8';
            } else {
                throw new Error('solidDigestateStorage requires fsdCh4DefaultType (Option 2 Eq8) or provide monitoredLeStorageTCo2e for TOOL04 monitored path');
            }
        }
    }

    let leComp = 0;
    if (ad.monitoredLeCompTCo2e !== undefined && ad.monitoredLeCompTCo2e !== null) {
        leComp = reqNum(ad.monitoredLeCompTCo2e, 'anaerobicDigesterActivity.monitoredLeCompTCo2e', 0);
    } else if (ad.digestateComposted === true) {
        throw new Error('anaerobicDigesterActivity.monitoredLeCompTCo2e (TOOL13 result/direct tCO2e) required when digestate is composted');
    }

    const leAd = leStorage + leComp; // Eq (5)

    done({
        ref: project.id,
        year: project.monitoringYear,
        tool: 'TOOL14',
        toolVersion: '03.0',
        applicability: 'anaerobic digester only (not stockpiles/SWDS/un-aerated lagoons); see ACM0010 5.4.1/5.5.4',
        qCh4Tonnes: qCh4,
        qCh4Source: qCh4Source,
        peEcTCo2: peEc,
        peEcSource: peEcSource,
        peFcTCo2: peFc,
        peCh4TCo2e: peCh4,
        peFlareTCo2e: peFlare,
        peAdTCo2e: peAd,
        leStorageTCo2e: leStorage,
        leStorageSource: leStorageSource,
        leCompTCo2e: leComp,
        leAdTCo2e: leAd,
        factors: {
            rhoCh4TPerM3: RHO_CH4,
            fCh4Default: FCH4_DEFAULT,
            efElDefaultTCo2PerMwh: EFEL_DEFAULT,
            efCh4LeakFraction: efCh4Leak,
            gwpCh4: gwpCh4
        },
        integrationNote: 'PEAD includes PEflare per TOOL14 Eq1; ACM0010 5.4.5 also lists PEflare,y separately and 5.4.4 excludes AD-related electricity/heat. ER integration must avoid double counting AD flare/electricity components.'
    });
})();
