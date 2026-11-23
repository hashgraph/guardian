/**
 * VM0010 v1.4 Section 8.1.2, Equation (7) - mean carbon stock of biomass that is
 * not harvested during the establishment of forestry infrastructure.
 *
 *   C_notHB,INF,j,i|BSL = V_notEX,INF,j,i|BSL * BCEF_R * CF_j               (7)
 *
 * Equation (7) is on p. 23, with its Where-block on p. 23.
 *
 * Where (per the Where-block, p. 23):
 *   C_notHB,INF,j,i|BSL  mean carbon stock of biomass that is not harvested
 *                       during the establishment of forestry infrastructure per
 *                       unit area for species j in stratum i, tC ha-1
 *   V_notEX,INF,j,i|BSL  mean volume of timber that is not extracted for wood
 *                       processing during the establishment of forestry
 *                       infrastructure per unit area for species j in stratum i,
 *                       m3 ha-1
 *   BCEF_R               biomass conversion and expansion factor applicable to
 *                       wood removals in the project area, t.d.m m-3
 *   CF_j                 carbon fraction of biomass for species j, tC t.d.m.-1
 *   i = 1,2,3 strata; and j = 1,2,3 tree species
 *
 * CORRECTED 6 Oct 2026. An earlier revision of this file implemented Equation (7)
 * with an input named "A_HB,j". That parameter does not exist in VM0010 v1.4; it
 * was a misreading of mojibake glyphs produced by a PDF extraction that omitted
 * layout mode. Layout-mode extraction reads Equation (7) as printed on p. 23 and
 * the multiplier is BCEF_R, which is also the parameter used by Equation (3) and
 * which has its own Section 9.1 Data / Parameter row at p. 67. The factor names
 * and their units are unchanged by this correction; only the parameter identity
 * is. Arithmetic is unaffected.
 *
 * BCEF_R is a positive multiplier in t.d.m m-3, not a fraction, so it is not
 * capped at 1. CF_j is a mass ratio in tC t.d.m.-1 and is therefore bounded to
 * (0, 1].
 *
 * V_notEX,INF,j,i|BSL has a Section 9.1 Data / Parameter row of its own (p. 55).
 * CF_j likewise (p. 63). Both are declared project inputs here; no default is
 * invented.
 *
 * C&C STATUS: neither mandatory 2026 document amends Section 8.1.2
 * Equation (7), C_notHB,INF, V_notEX,INF, BCEF_R or CF_j. The 4 September 2026
 * C&C amends Section 1, Section 4, the Section 8.1 baseline-reassessment
 * narrative, the units of C_FUEL in Eqs 12/13, Eq 26, Eq 37 and Eqs 40/41; the
 * 11 June 2026 correction amends only the Section 8.1 baseline-averaging
 * sentence. Neither mentions wood products or Section 8.1.2.
 *
 * Guardian customLogicBlock expression. Style follows the repository precedent:
 *   Methodology Library/DLT Earth Methodology Bounty Program/VM0047 V1.1/VM0047_1.1.policy
 *     -> customLogicBlock.expression  ("function calc() {...} calc();")
 */

function calc() {
    const project = documents[documents.length - 1].document.credentialSubject[0];

    const rows = [];
    project.infrastructureBiomass.forEach(function (entry) {
        const j = entry.species;
        const i = entry.stratum;

        if (!Number.isInteger(j) || j < 1 || j > 3) {
            throw new Error('species j must be 1, 2 or 3, got ' + j);
        }
        if (!Number.isInteger(i) || i < 1 || i > 3) {
            throw new Error('stratum i must be 1, 2 or 3, got ' + i);
        }

        const vNotExInf = entry.vNotExInfJiBsl;
        const bcefR = entry.bcefR;
        const cfJ = entry.cfJ;

        if (typeof vNotExInf !== 'number' || Number.isNaN(vNotExInf)) {
            throw new Error('V_notEX,INF,j,i|BSL must be a number at j=' + j + ' i=' + i);
        }
        if (vNotExInf < 0) {
            throw new Error('V_notEX,INF,j,i|BSL must be greater than or equal to zero at j=' + j + ' i=' + i);
        }
        if (typeof bcefR !== 'number' || Number.isNaN(bcefR)) {
            throw new Error('BCEF_R must be a number at j=' + j + ' i=' + i);
        }
        // BCEF_R is a biomass conversion and expansion factor: a positive
        // multiplier. It is not a fraction of carbon, so it is not capped at 1.
        if (bcefR <= 0) {
            throw new Error('BCEF_R must be greater than zero at j=' + j + ' i=' + i);
        }
        if (typeof cfJ !== 'number' || Number.isNaN(cfJ)) {
            throw new Error('CF_j must be a number at j=' + j + ' i=' + i);
        }
        // CF_j is a mass ratio of carbon to dry matter, so it cannot exceed unity.
        if (cfJ <= 0 || cfJ > 1) {
            throw new Error('CF_j must be greater than zero and not exceed 1 at j=' + j + ' i=' + i);
        }

        rows.push({
            species: j,
            stratum: i,
            vNotExInfJiBsl: vNotExInf,
            bcefR: bcefR,
            cfJ: cfJ,
            // Equation (7)
            cNotHbInfJiBsl: vNotExInf * bcefR * cfJ,
        });
    });

    if (rows.length === 0) {
        throw new Error('at least one species/stratum combination is required');
    }

    done({
        ref: project.id,
        year: project.monitoringYear,
        rows: rows,
        totalCNotHbInfTCo2eHa: rows.reduce(function (s, r) { return s + r.cNotHbInfJiBsl; }, 0),
    });
}

calc();
