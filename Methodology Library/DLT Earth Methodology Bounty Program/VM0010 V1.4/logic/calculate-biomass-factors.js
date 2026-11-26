/**
 * VM0010 v1.4 Section 9.1 Data / Parameter, p.68 - Alternative Factor Construction
 *
 * A02 Alternative factor construction:
 *   BCEF_R = BEF_R * D      (t dry matter / m3)
 *
 * Where:
 *   BEF_R     biomass expansion factor for merchantable volume, dimensionless
 *   D         wood density, t dry matter / m3
 *   BCEF_R    biomass conversion and expansion factor, t dry matter / m3
 *
 * BCEF_R = BEF_R * D is permitted only with local applicability/correlation
 * safeguards on p.68. Same-sample or locally checked applicability/correlation
 * evidence is mandatory.
 *
 * Guardian customLogicBlock expression. Style follows repository precedent:
 *   Methodology Library/DLT Earth Methodology Bounty Program/VM0047 V1.1/VM0047_1.1.policy
 *     -> customLogicBlock.expression  ("function calc() {...} calc();")
 */

function calc() {
    const project = documents[documents.length - 1].document.credentialSubject[0];

    if (!project.biomassFactors || !Array.isArray(project.biomassFactors) || project.biomassFactors.length === 0) {
        throw new Error('project missing biomassFactors array or no factor combinations provided');
    }

    const rows = [];

    project.biomassFactors.forEach(function (entry, idx) {
        const j = entry.species;
        const i = entry.stratum;
        const befR = entry.befR;
        const d = entry.d;

        if (!Number.isInteger(j) || j < 1 || j > 3) {
            throw new Error('species j must be 1, 2 or 3, got ' + j);
        }
        if (!Number.isInteger(i) || i < 1 || i > 3) {
            throw new Error('stratum i must be 1, 2 or 3, got ' + i);
        }

        if (typeof befR !== 'number' || Number.isNaN(befR) || !Number.isFinite(befR)) {
            throw new Error('BEF_R must be a finite number at index ' + idx);
        }
        if (befR <= 0) {
            throw new Error('BEF_R must be positive at index ' + idx);
        }

        if (typeof d !== 'number' || Number.isNaN(d) || !Number.isFinite(d)) {
            throw new Error('D must be a finite number at index ' + idx);
        }
        if (d <= 0) {
            throw new Error('D must be positive at index ' + idx);
        }

        // A02: BCEF_R = BEF_R * D
        const bcefR = befR * d;

        rows.push({
            species: j,
            stratum: i,
            befR: befR,
            d: d,
            bcefR: bcefR,
        });
    });

    done({
        ref: project.id,
        year: project.monitoringYear,
        rows: rows,
    });
}

calc();
