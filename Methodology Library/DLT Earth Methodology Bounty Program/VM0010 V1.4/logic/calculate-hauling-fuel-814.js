/**
 * VM0010 v1.4 — Equation (16) - Log Hauling Emissions
 *
 *   E_HAULING = FC_HAULING * EF_FUEL * SUM_{j,i}(V_EX,j,i|BSL * A_i); tCO2e
 *
 * Guardian customLogicBlock expression. Style follows repository precedent:
 *   Methodology Library/DLT Earth Methodology Bounty Program/VM0047 V1.1/VM0047_1.1.policy
 *     -> customLogicBlock.expression  ("function calc() {...} calc();")
 *
 * PROVENANCE. Section 8.1.4 p. 29 of VM0010 v1.4. Eq 16 from the equation ledger.
 *
 * INPUTS:
 *   V_EX,j,i|BSL     m3/ha: approved merchantable extraction (P2)
 *   A_i              ha: plot/stratum area (P1)
 *   FC_HAULING       kL/m3: hauling consumption rate (P5)
 *   EF_FUEL          tCO2e/kL: fuel emission factor (P5/P10)
 *
 * VALIDATION:
 *   - All input parameters must be finite numbers
 *   - FC_HAULING and EF_FUEL must be non-negative
 *   - SUM_{j,i}(V_EX,j,i|BSL * A_i) must be computable from existing plots
 *   - Each species/stratum pair must have valid volume and area
 */

function calc() {
    const project = documents[documents.length - 1].document.credentialSubject[0];

    if (!project.strata || !Array.isArray(project.strata) || project.strata.length === 0) {
        throw new Error('project missing strata array or no species/stratum combinations provided');
    }

    if (!project.plotAreas || !Array.isArray(project.plotAreas)) {
        throw new Error('project missing plotAreas array for hauling calculation');
    }

    // Build area lookup by species:stratum
    const areaLookup = {};
    for (const area of project.plotAreas) {
        const key = area.species + ':' + area.stratum;
        areaLookup[key] = area.area;
    }

    // Build volume lookup by species:stratum
    const volumeLookup = {};
    for (const stratum of project.strata) {
        const key = stratum.species + ':' + stratum.stratum;
        volumeLookup[key] = { volumeSum: stratum.treeVolumes ? stratum.treeVolumes.reduce(function (s, v) { return s + v; }, 0) : 0, area: stratum.plotArea };
    }

    let haulingEmissions = 0;
    const haulingDetails = [];

    project.strata.forEach(function (stratum) {
        const j = stratum.species;
        const i = stratum.stratum;

        if (!Number.isInteger(j) || j < 1 || j > 3) {
            throw new Error('species j must be 1, 2 or 3, got ' + j);
        }
        if (!Number.isInteger(i) || i < 1 || i > 3) {
            throw new Error('stratum i must be 1, 2 or 3, got ' + i);
        }

        const volumeKey = j + ':' + i;
        const volumeData = volumeLookup[volumeKey];
        if (!volumeData) {
            throw new Error('no volume data found for species j=' + j + ' stratum i=' + i);
        }

        const vEx = volumeData.volumeSum;

        const areaKey = j + ':' + i;
        const area = areaLookup[areaKey];
        if (area === undefined) {
            throw new Error('no plot area found for species j=' + j + ' stratum i=' + i);
        }
        if (typeof area !== 'number' || Number.isNaN(area) || !Number.isFinite(area)) {
            throw new Error('plot area must be a finite number at species j=' + j + ' stratum i=' + i);
        }
        if (area <= 0) {
            throw new Error('plot area must be positive at species j=' + j + ' stratum i=' + i);
        }

        const fcHauling = project.fcHauling;
        const efFuel = project.efFuel;

        if (typeof fcHauling !== 'number' || Number.isNaN(fcHauling) || !Number.isFinite(fcHauling)) {
            throw new Error('FC_HAULING must be a finite number');
        }
        if (fcHauling < 0) {
            throw new Error('FC_HAULING must be non-negative');
        }
        if (typeof efFuel !== 'number' || Number.isNaN(efFuel) || !Number.isFinite(efFuel)) {
            throw new Error('EF_FUEL must be a finite number');
        }
        if (efFuel < 0) {
            throw new Error('EF_FUEL must be non-negative');
        }

        const stratumEmissions = fcHauling * efFuel * vEx * area;

        haulingEmissions += stratumEmissions;

        haulingDetails.push({
            species: j,
            stratum: i,
            vExJiBsl: vEx,
            areaHa: area,
            fcHauling: fcHauling,
            efFuel: efFuel,
            emissionsTco2e: stratumEmissions,
        });
    });

    done({
        ref: project.id,
        year: project.monitoringYear,
        haulingFuelEmissions: haulingEmissions,
        haulingFuelDetails: haulingDetails.map(function (d) {
            return {
                plotId: 'plot-' + d.species + '-' + d.stratum,
                species: d.species,
                stratum: d.stratum,
                areaHa: d.areaHa,
                volumeEx: d.vExJiBsl,
                fuelConsumption: d.fcHauling,
                emissionsTco2e: d.emissionsTco2e,
            };
        }),
    });
}

calc();
