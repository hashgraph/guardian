/**
 * VM0010 v1.4 Section 8.1.4 p.42-43 - Equation (34) Baseline Biomass Absent
 *
 * Eq (34): B_i,t|PRJ = SUM_j(V_EX,j,i|BSL * BCEF_R); t dry matter/ha.
 *
 * Where:
 *   V_EX,j,i|BSL  approved merchantable extraction volume per species/stratum [m3/ha]
 *   BCEF_R        biomass conversion and expansion factor [t dry matter/m3]
 *   B_i,t|PRJ     baseline biomass absent [t dry matter/ha]
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

    // BCEF_R lookup by species:stratum from A02 biomass factors
    const bcefLookup = {};
    if (Array.isArray(project.biomassFactors)) {
        project.biomassFactors.forEach(function (bf) {
            const key = bf.species + ':' + bf.stratum;
            bcefLookup[key] = bf.bcefR;
        });
    }

    const rows = [];

    project.strata.forEach(function (stratum) {
        const j = stratum.species;
        const i = stratum.stratum;

        if (!Number.isInteger(j) || j < 1 || j > 3) {
            throw new Error('species j must be 1, 2 or 3, got ' + j);
        }
        if (!Number.isInteger(i) || i < 1 || i > 3) {
            throw new Error('stratum i must be 1, 2 or 3, got ' + i);
        }

        const key = j + ':' + i;

        const vEx = stratum.treeVolumes ? stratum.treeVolumes.reduce(function (sum, volume) {
            if (typeof volume !== 'number' || Number.isNaN(volume) || !Number.isFinite(volume)) {
                throw new Error('tree volume must be a finite number at species j=' + j + ' stratum i=' + i);
            }
            if (volume < 0) {
                throw new Error('tree volume must be non-negative at species j=' + j + ' stratum i=' + i);
            }
            return sum + volume;
        }, 0) : 0;

        const bcefR = bcefLookup[key];
        if (typeof bcefR !== 'number' || Number.isNaN(bcefR) || !Number.isFinite(bcefR)) {
            throw new Error('BCEF_R must be a finite number for species j=' + j + ' stratum i=' + i + '; provide via A02 biomass factors');
        }
        if (bcefR <= 0) {
            throw new Error('BCEF_R must be positive for species j=' + j + ' stratum i=' + i);
        }

        // Equation (34): B_i,t|PRJ = SUM_j(V_EX,j,i|BSL * BCEF_R)
        const bAbsent = vEx * bcefR;

        rows.push({
            species: j,
            stratum: i,
            vExJiBsl: vEx,
            bcefR: bcefR,
            bAbsentJiBsl: bAbsent,
        });
    });

    if (rows.length === 0) {
        throw new Error('at least one species/stratum combination is required');
    }

    done({
        ref: project.id,
        year: project.monitoringYear,
        rows: rows,
    });
}

calc();
