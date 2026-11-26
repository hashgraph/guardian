/**
 * VM0010 v1.4 Section 8.1.1 - mean carbon stocks in harvested biomass and in
 * extracted timber.
 *
 *     C_HB,j,i|BSL = ( V_EX,j,i|BSL + V_EX,INF,j,i|BSL ) * BCEF_R * CF_j      (3)
 *     C_EX,j,i|BSL = ( V_EX,j,i|BSL + V_EX,INF,j,i|BSL ) * D_j    * CF_j      (4)
 *
 * PROVENANCE. Section 8.1 Baseline Emissions begins at p. 17 and Section 8.4 at
 * p. 49, per the Contents on p. 3 of VM0010, v1.4. The Contents does NOT index
 * individual equations, so no page is cited here for Equation (3) or (4).
 *
 * The symbolic expressions above are RECONSTRUCTED, NOT TRANSCRIBED. The
 * Where-block symbols, descriptions and units reproduced below WERE read from the
 * source; the operators, grouping and any omitted factors were NOT recoverable
 * from the methodology's text layer and have not been verified against the
 * rendered page. Treat the formulas as a hypothesis pending reviewer check.
 *
 * Units, from the Where-blocks:
 *   C_HB,j,i|BSL       mean carbon stock of harvested biomass per unit area
 *                      for species j in stratum i, tC ha-1
 *   C_EX,j,i|BSL       mean carbon stock of extracted timber per unit area
 *                      for species j in stratum i, tC ha-1
 *   V_EX,j,i|BSL       mean volume of extracted timber per unit area for
 *                      species j in stratum i, m3 ha-1
 *   V_EX,INF,j,i|BSL   mean volume of extracted timber for forestry
 *                      infrastructure per unit area for species j in stratum
 *                      i, m3 ha-1
 *   BCEF_R             biomass conversion and expansion factor applicable to
 *                      wood removals in the project area, t.d.m m-3
 *   D_j                basic wood density of species j, t.d.m m-3
 *   CF_j               carbon fraction of biomass for species j, tC t.d.m-1
 *   i = 1,2,3 strata;  j = 1,2,3 species
 *
 * Neither equation divides by area: V_EX is already expressed per hectare, and
 * the results are per hectare, so a further division by A would double-count
 * the area normalisation.
 *
 * C&C STATUS: neither mandatory 2026 document amends Section 8.1.1.
 * The 4 September 2026 C&C amends Section 4 applicability, the Section 8.1
 * baseline-reassessment narrative, Eq 12/13, Eq 37 (v1.3) and Eqs 40/41.
 * The 11 June 2026 C&C amends only the Section 8.1 baseline-averaging
 * sentence, which concerns averaging total emissions across the crediting
 * period and multiplying by t*; Eqs (3) and (4) are per-hectare carbon-stock
 * calculations involving neither t* nor crediting-period averaging.
 *
 * Guardian customLogicBlock expression. Style follows the repository precedent:
 *   Methodology Library/DLT Earth Methodology Bounty Program/VM0047 V1.1/VM0047_1.1.policy
 *     -> customLogicBlock.expression  ("function calc() {...} calc();")
 */

function calc() {
    const project = documents[documents.length - 1].document.credentialSubject[0];

    const inputs = [];
    project.strata.forEach(function (entry) {
        // j: tree species 1..3, i: stratum 1..3 (methodology notation)
        const j = entry.species;
        const i = entry.stratum;

        if (!Number.isInteger(j) || j < 1 || j > 3) {
            throw new Error('species j must be 1, 2 or 3, got ' + j);
        }
        if (!Number.isInteger(i) || i < 1 || i > 3) {
            throw new Error('stratum i must be 1, 2 or 3, got ' + i);
        }

        const vEx = entry.vExJiBsl;
        const vExInf = entry.vExInfJiBsl;
        const bcefR = entry.bcefR;
        const dJ = entry.dJ;
        const cfJ = entry.cfJ;

        [vEx, vExInf].forEach(function (v, n) {
            if (typeof v !== 'number' || Number.isNaN(v)) {
                throw new Error('volume must be a number at j=' + j + ' i=' + i);
            }
            if (v < 0) {
                throw new Error('volume must be greater than or equal to zero at j=' + j + ' i=' + i);
            }
            void n;
        });
        if (!(bcefR > 0)) {
            throw new Error('BCEF_R must be greater than zero at j=' + j + ' i=' + i);
        }
        if (!(dJ > 0)) {
            throw new Error('D_j must be greater than zero at j=' + j + ' i=' + i);
        }
        if (!(cfJ > 0)) {
            throw new Error('CF_j must be greater than zero at j=' + j + ' i=' + i);
        }
        // Sanity bound, not a methodology-quoted limit: a carbon fraction is a
        // mass ratio of carbon to dry matter and cannot exceed unity.
        if (cfJ > 1) {
            throw new Error('CF_j must not exceed 1 at j=' + j + ' i=' + i);
        }

        // Extracted volume to market plus that taken for forestry infrastructure.
        const extractedVolume = vEx + vExInf;

        inputs.push({
            species: j,
            stratum: i,
            vExJiBsl: vEx,
            vExInfJiBsl: vExInf,
            extractedVolume,
            bcefR: bcefR,
            dJ: dJ,
            cfJ: cfJ,
            // Equation (3)
            cHbJiBsl: extractedVolume * bcefR * cfJ,
            // Equation (4)
            cExJiBsl: extractedVolume * dJ * cfJ,
        });
    });

    if (inputs.length === 0) {
        throw new Error('at least one species/stratum combination is required');
    }

    function total(key) {
        return inputs.reduce(function (sum, row) { return sum + row[key]; }, 0);
    }

    done({
        ref: project.id,
        year: project.monitoringYear,
        strata: inputs,
        totalCHbJiBsl: total('cHbJiBsl'),
        totalCExJiBsl: total('cExJiBsl'),
    });
}

calc();
