/**
 * VM0010 v1.4 Section 8.1.1 - Equations (1) and (2):
 *
 * Eq (1): V_j,i,sp = SUM_{l=1..L} V_l,j,i,sp   (m3)
 *   Plot merchantable volume = sum of individual tree merchantable volumes.
 *
 * Eq (2): V_j,i|BSL = (1/SP) * SUM_sp(V_j,i,sp / A_sp)   (m3/ha)
 *   Mean merchantable volume per hectare = arithmetic mean of per-plot
 *   densities within each species/stratum group.
 *
 * Guardian customLogicBlock expression. Style follows repository precedent:
 *   Methodology Library/DLT Earth Methodology Bounty Program/VM0047 V1.1/VM0047_1.1.policy
 *     -> customLogicBlock.expression  ("function calc() {...} calc();")
 */

function calc() {
    const project = documents[documents.length - 1].document.credentialSubject[0];

    if (!project.strata || !Array.isArray(project.strata) || project.strata.length === 0) {
        throw new Error('project missing strata array or no species/stratum combinations provided');
    }

const plotVolumes = [];
    const seenPlotIds = new Set();

    project.strata.forEach(function (stratum) {
        const j = stratum.species;
        const i = stratum.stratum;

        if (!Number.isInteger(j) || j < 1 || j > 3) {
            throw new Error('species j must be a positive integer between 1 and 3, got ' + j);
        }
        if (!Number.isInteger(i) || i < 1 || i > 3) {
            throw new Error('stratum i must be a positive integer between 1 and 3, got ' + i);
        }
        if (!Number.isInteger(i) || i < 1 || i > 3) {
            throw new Error('stratum i must be a positive integer between 1 and 3, got ' + i);
        }

        if (!Array.isArray(stratum.treeVolumes)) {
            throw new Error('stratum missing treeVolumes array at species j=' + j + ' stratum i=' + i);
        }

        const vEx = stratum.treeVolumes.reduce(function (sum, volume, idx) {
            if (typeof volume !== 'number' || Number.isNaN(volume) || !Number.isFinite(volume)) {
                throw new Error('tree volume must be a finite number at species j=' + j + ' stratum i=' + i + ' tree index ' + idx);
            }
            if (volume < 0) {
                throw new Error('tree volume must be non-negative at species j=' + j + ' stratum i=' + i + ' tree index ' + idx);
            }
            return sum + volume;
        }, 0);

        const area = stratum.plotArea;
        if (typeof area !== 'number' || Number.isNaN(area) || !Number.isFinite(area)) {
            throw new Error('plot area must be a finite number at species j=' + j + ' stratum i=' + i);
        }
        if (area <= 0) {
            throw new Error('plot area must be positive at species j=' + j + ' stratum i=' + i);
        }

        const plotId = stratum.plotId || ('plot-' + j + '-' + i);
        if (seenPlotIds.has(plotId)) {
            throw new Error('duplicate plot ID: ' + plotId);
        }
        seenPlotIds.add(plotId);

        const density = vEx / area;

        plotVolumes.push({
            plotId: plotId,
            species: j,
            stratum: i,
            plotMerchantableVolume: vEx,
            plotArea: area,
            density: density,
            isValid: true,
        });
    });

    // Eq (2): Mean volume per hectare per species/stratum group
    const groupMap = new Map();
    plotVolumes.forEach(function (pv) {
        const key = pv.species + ':' + pv.stratum;
        if (!groupMap.has(key)) {
            groupMap.set(key, {
                species: pv.species,
                stratum: pv.stratum,
                densities: [],
                firstPlotId: pv.plotId,
                firstPlotMerchantableVolume: pv.plotMerchantableVolume,
                firstPlotArea: pv.plotArea,
            });
        }
        groupMap.get(key).densities.push(pv.density);
    });

    const meanVolumes = [];
    groupMap.forEach(function (group) {
        const meanDensity = group.densities.reduce(function (sum, d) { return sum + d; }, 0) / group.densities.length;
        meanVolumes.push({
            plotId: group.firstPlotId,
            species: group.species,
            stratum: group.stratum,
            plotMerchantableVolume: group.firstPlotMerchantableVolume,
            plotArea: group.firstPlotArea,
            meanVolumePerHectare: meanDensity,
            isValid: true,
        });
    });

    done({
        ref: project.id,
        year: project.monitoringYear,
        plotVolumes: plotVolumes,
        meanVolumes: meanVolumes,
        totalPlots: plotVolumes.length,
        totalSpeciesStratumCombinations: meanVolumes.length,
    });
}

calc();