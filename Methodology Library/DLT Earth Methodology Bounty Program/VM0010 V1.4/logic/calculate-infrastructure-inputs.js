/**
 * VM0010 v1.4 Section 9.1 Data / Parameter, pp. 54-55 - Infrastructure Volume Partition
 *
 * A01 Infrastructure Volume Partition:
 *   V_EX,INF  = F_V,INF,HWP * V_cleared      (m3/ha)
 *   V_notEX,INF = (1 - F_V,INF,HWP) * V_cleared  (m3/ha)
 *
 * Where:
 *   V_cleared           total volume of timber cleared [m3]
 *   F_V,INF,HWP         fraction of cleared timber allocated to infrastructure [HWP],
 *                       dimensionless, 0 <= F <= 1
 *   V_EX,INF            extracted/infrastructure volume portion [m3/ha]
 *   V_notEX,INF         non-extracted (left standing) infrastructure volume [m3/ha]
 *
 * If no credible F_V,INF,HWP can be established, p.54 explicitly prescribes
 * all cleared timber processed into sawnwood: F_V,INF,HWP = 1, not zero.
 *
 * BCEF_R = BEF_R * D is permitted only with local applicability/correlation
 * safeguards on p.68 (A02).
 *
 * Guardian customLogicBlock expression. Style follows repository precedent:
 *   Methodology Library/DLT Earth Methodology Bounty Program/VM0047 V1.1/VM0047_1.1.policy
 *     -> customLogicBlock.expression  ("function calc() {...} calc();")
 */

function calc() {
    const project = documents[documents.length - 1].document.credentialSubject[0];

    if (!project.infrastructureClearedVolumes || !Array.isArray(project.infrastructureClearedVolumes)) {
        throw new Error('project missing infrastructureClearedVolumes array');
    }

    const rows = [];

    project.infrastructureClearedVolumes.forEach(function (entry) {
        const j = entry.species;
        const i = entry.stratum;
        const f = entry.vInfHwp; // F_V,INF,HWP fraction

        if (!Number.isInteger(j) || j < 1 || j > 3) {
            throw new Error('species j must be 1, 2 or 3, got ' + j);
        }
        if (!Number.isInteger(i) || i < 1 || i > 3) {
            throw new Error('stratum i must be 1, 2 or 3, got ' + i);
        }

        if (typeof f !== 'number' || Number.isNaN(f) || !Number.isFinite(f)) {
            throw new Error('F_V,INF,HWP must be a finite number at j=' + j + ' i=' + i);
        }
        if (f < 0 || f > 1) {
            throw new Error('F_V,INF,HWP must be in [0,1] at j=' + j + ' i=' + i);
        }

        const vCleared = entry.vCleared; // V_cleared total volume [m3]

        if (typeof vCleared !== 'number' || Number.isNaN(vCleared) || !Number.isFinite(vCleared)) {
            throw new Error('V_cleared must be a finite number at j=' + j + ' i=' + i);
        }
        if (vCleared < 0) {
            throw new Error('V_cleared must be non-negative at j=' + j + ' i=' + i);
        }

        // Equation A01: Infrastructure volume partition
        const vExInf = f * vCleared;     // V_EX,INF = F * V_cleared
        const vNotExInf = (1 - f) * vCleared;  // V_notEX,INF = (1-F) * V_cleared

        rows.push({
            species: j,
            stratum: i,
            vCleared: vCleared,
            vInfHwp: f,
            vExInfJiBsl: vExInf,
            vNotExInfJiBsl: vNotExInf,
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