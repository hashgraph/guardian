/**
 * VM0010 v1.4 — Equations (14)-(15), (18)-(21) - Processing Energy, Harvesting Fuel, Grid and Generator Emissions
 *
 * Eq (14): Q_PROCESSING = SUM_{j,i}(V_EX,j,i|BSL * A_i) * E_DEMAND; kWh
 * Eq (15): E_HARVEST = FC_HARVEST * EF_FUEL * SUM_{j,i,p}(V_EX,j,i|BSL * A_i); tCO2e
 * Eq (18): Q_PROCESSING = SUM_{j,i}(V_EX,j,i|BSL * A_i) * E_DEMAND; kWh
 * Eq (19): E_PROCESSING = Q_PROCESSING * EF_ELECTRICITY; tCO2e (grid branch)
 * Eq (20): PR_GENERATOR = Q_PROCESSING / T_GENERATOR; kW (generator branch)
 * Eq (21): E_PROCESSING = FC_GENERATOR * T_GENERATOR * EF_FUEL; tCO2e (generator branch)
 *
 * Guardian customLogicBlock expression. Style follows repository precedent:
 *   Methodology Library/DLT Earth Methodology Bounty Program/VM0047 V1.1/VM0047_1.1.policy
 *     -> customLogicBlock.expression  ("function calc() {...} calc();")
 *
 * PROVENANCE. Section 8.1.4 pp. 31-33 of VM0010 v1.4. Eqs 14-15, 18-21 from the equation ledger.
 *
 * INPUTS:
 *   V_EX,j,i|BSL     m3/ha: approved merchantable extraction (P2)
 *   A_i              ha: plot/stratum area (P1)
 *   E_DEMAND         kWh/m3: electricity demand per processed volume (P5)
 *   FC_HARVEST       kL/m3: harvesting fuel consumption rate (P5)
 *   EF_FUEL          tCO2e/kL: fuel emission factor (P5/P10)
 *   EF_ELECTRICITY   tCO2e/kWh: grid electricity emission factor (P5)
 *   T_GENERATOR      h: matched-period operating hours (P5)
 *   FC_GENERATOR     kL/h: generator fuel consumption rate (P5)
 *   energySource     string: 'grid' or 'generator' (P5)
 *
 * VALIDATION:
 *   - All input parameters must be finite numbers
 *   - E_DEMAND must be non-negative
 *   - FC_HARVEST must be non-negative
 *   - EF_FUEL must be non-negative
 *   - EF_ELECTRICITY must be non-negative (grid branch)
 *   - T_GENERATOR must be positive (generator branch)
 *   - FC_GENERATOR must be non-negative (generator branch)
 */

function calc() {
    const project = documents[documents.length - 1].document.credentialSubject[0];

    if (!project.strata || !Array.isArray(project.strata) || project.strata.length === 0) {
        throw new Error('project missing strata array or no species/stratum combinations provided');
    }

    if (!project.plotAreas || !Array.isArray(project.plotAreas)) {
        throw new Error('project missing plotAreas array for processing energy calculation');
    }

    if (typeof project.eDemand !== 'number' || Number.isNaN(project.eDemand) || project.eDemand < 0) {
        throw new Error('E_DEMAND must be a non-negative number');
    }

    // Eq (14): Q_PROCESSING = SUM_{j,i}(V_EX,j,i|BSL * A_i) * E_DEMAND; kWh
    let totalVolumeAreaProduct = 0;
    const processingDetails = [];

    project.strata.forEach(function (stratum) {
        const j = stratum.species;
        const i = stratum.stratum;

        if (!Number.isInteger(j) || j < 1 || j > 3) {
            throw new Error('species j must be 1, 2 or 3, got ' + j);
        }
        if (!Number.isInteger(i) || i < 1 || i > 3) {
            throw new Error('stratum i must be 1, 2 or 3, got ' + i);
        }

        const vEx = stratum.treeVolumes ? stratum.treeVolumes.reduce(function (s, v) { return s + v; }, 0) : 0;
        const area = project.plotAreas.find(function (a) { return a.species === j && a.stratum === i; });
        if (!area) {
            throw new Error('no plot area found for species j=' + j + ' stratum i=' + i);
        }
        const a = area.area;

        if (typeof a !== 'number' || Number.isNaN(a) || !Number.isFinite(a)) {
            throw new Error('plot area must be a finite number at species j=' + j + ' stratum i=' + i);
        }
        if (a <= 0) {
            throw new Error('plot area must be positive at species j=' + j + ' stratum i=' + i);
        }

        const volumeAreaProduct = vEx * a;
        totalVolumeAreaProduct += volumeAreaProduct;

        const qProcessingKwh = volumeAreaProduct * project.eDemand;

        processingDetails.push({
            species: j,
            stratum: i,
            areaHa: a,
            qProcessingKwh: qProcessingKwh,
        });
    });

    // Eq (14): Q_PROCESSING = SUM_{j,i}(V_EX,j,i|BSL * A_i) * E_DEMAND
    const qProcessingKwh = totalVolumeAreaProduct * project.eDemand;

    // Eq (15): E_HARVEST = FC_HARVEST * EF_FUEL * SUM_{j,i,p}(V_EX,j,i|BSL * A_i); tCO2e
    // Note: the p index in the spec is per-parcel; here we sum over all strata/parcels
    const fcHarvest = project.fcHarvest;
    if (typeof fcHarvest !== 'number' || Number.isNaN(fcHarvest) || !Number.isFinite(fcHarvest) || fcHarvest < 0) {
        throw new Error('FC_HARVEST must be a non-negative number');
    }

    const efFuel = project.efFuel;
    if (typeof efFuel !== 'number' || Number.isNaN(efFuel) || !Number.isFinite(efFuel) || efFuel < 0) {
        throw new Error('EF_FUEL must be a non-negative number');
    }

    const eHarvestTco2e = fcHarvest * efFuel * totalVolumeAreaProduct;

    // Per-plot breakdown matching processingDetails schema: plotId, areaHa, qProcessingKwh, eHarvestTco2e
    const perPlotEmissions = eHarvestTco2e / (processingDetails.length || 1);
    const processingDetailRows = processingDetails.map(function (d) {
        return {
            plotId: 'plot-' + d.species + '-' + d.stratum,
            areaHa: d.areaHa,
            qProcessingKwh: d.qProcessingKwh,
            eHarvestTco2e: perPlotEmissions,
        };
    });

    // ---- Eq (18): Q_PROCESSING = SUM_{j,i}(V_EX,j,i|BSL * A_i) * E_DEMAND; kWh ----
    // This is the same as Eq (14), so we reuse qProcessingKwh

    // ---- Eq (19): E_PROCESSING = Q_PROCESSING * EF_ELECTRICITY; tCO2e (grid branch) ----
    // ---- Eq (20): PR_GENERATOR = Q_PROCESSING / T_GENERATOR; kW (generator branch) ----
    // ---- Eq (21): E_PROCESSING = FC_GENERATOR * T_GENERATOR * EF_FUEL; tCO2e (generator branch) ----
    let eProcessingGridTco2e = null;
    let prGeneratorKw = null;
    let eProcessingGeneratorTco2e = null;

    const energySource = project.energySource || 'grid';

    if (energySource === 'grid') {
        // Grid branch: Eq (19)
        const efElectricity = project.efElectricity;
        if (typeof efElectricity !== 'number' || Number.isNaN(efElectricity) || !Number.isFinite(efElectricity) || efElectricity < 0) {
            throw new Error('EF_ELECTRICITY must be a non-negative number for grid processing emissions');
        }
        eProcessingGridTco2e = qProcessingKwh * efElectricity;
    } else if (energySource === 'generator') {
        // Generator branch: Eq (20) and Eq (21)
        const tGenerator = project.tGenerator;
        if (typeof tGenerator !== 'number' || Number.isNaN(tGenerator) || !Number.isFinite(tGenerator) || tGenerator <= 0) {
            throw new Error('T_GENERATOR must be a positive number for generator power calculation');
        }
        prGeneratorKw = qProcessingKwh / tGenerator;

        const fcGenerator = project.fcGenerator;
        if (typeof fcGenerator !== 'number' || Number.isNaN(fcGenerator) || !Number.isFinite(fcGenerator) || fcGenerator < 0) {
            throw new Error('FC_GENERATOR must be a non-negative number for generator emissions');
        }
        eProcessingGeneratorTco2e = fcGenerator * tGenerator * efFuel;
    } else {
        throw new Error('energySource must be "grid" or "generator", got ' + energySource);
    }

    done({
        ref: project.id,
        year: project.monitoringYear,
        qProcessingKwh: qProcessingKwh,
        eHarvestTco2e: eHarvestTco2e,
        processingDetails: processingDetailRows,
        // Eq (18) output (same as Eq 14)
        qProcessingKwhEq18: qProcessingKwh,
        // Eq (19) output (grid branch)
        eProcessingGridTco2e: eProcessingGridTco2e,
        // Eq (20) output (generator branch)
        prGeneratorKw: prGeneratorKw,
        // Eq (21) output (generator branch)
        eProcessingGeneratorTco2e: eProcessingGeneratorTco2e,
        // Energy source used
        energySource: energySource,
    });
}

calc();
