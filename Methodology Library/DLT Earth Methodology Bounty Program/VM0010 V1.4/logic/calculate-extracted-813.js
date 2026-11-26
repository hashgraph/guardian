/**
 * VM0010 v1.4 Section 8.1.3, Equation (8) - carbon stock of extracted timber
 * across species.
 *
 *   C_EX,i|BSL = SUM over j = 1..J of  C_EX,j,i|BSL                       (8)
 *
 * Equation (8) is on p. 24, with its Where-block on p. 24.
 *
 * Where (per the Where-block, p. 24):
 *   C_EX,i|BSL    change in carbon stock of extracted wood products resulting
 *                 from timber harvest per unit area in stratum i, in tC ha-1;
 *   C_EX,j,i|BSL  mean carbon stock of extracted wood per hectare, tC ha-1;
 *   i             1, 2, 3 ... M strata; and
 *   j             1, 2, 3 ... J tree species.
 *
 * The summand C_EX,j,i|BSL is itself Equation (4) (Section 8.1.1, p. 21):
 *
 *   C_EX,j,i|BSL = (V_EX,j,i|BSL + V_EX,INF,j,i|BSL) * D_j * CF_j         (4)
 *
 * so Equation (8) adds no new Section 9.1 parameter and no new project input.
 * It consumes C_EX,j,i|BSL, which is already carried on each entry of the
 * project description's "strata" array by logic/calculate-carbon-stocks-811.js.
 *
 * SCOPE: Equation (8) ranges over species j only. It contains no WW_k, no
 * SLF_k, no OF_k and no wood-product class index k. The wood-product classes
 * (sawnwood, wood-based panels, other industrial roundwood, paper and paper
 * board, and other) are introduced in prose after Equation (8) and first enter
 * an equation at Equation (9) (p. 25). The unresolved provenance of SLF_k for
 * the "other" class therefore does not touch Equation (8), and no treatment
 * for "other" is assumed, invented or excluded here.
 *
 * DUPLICATE (i, j) PAIRS ARE REJECTED: j indexes distinct tree species, so two
 * entries sharing a stratum i and a species j would double-count the same
 * summand. Equation (8) is a sum over species, not over records.
 *
 * C&C STATUS: NEITHER mandatory 2026 document amends Section 8.1.3 or
 * Equation (8). The 4 September 2026 C&C amends Section 1, Section 4, the
 * Section 8.1 baseline-reassessment instructions, the units of C_FUEL in
 * Equations 12/13, the range of t* in Equation 26, Equation 37 and Equations
 * 40/41. The 11 June 2026 correction amends only the Section 8.1
 * baseline-averaging sentence. Neither mentions wood products or Equation (8).
 *
 * NOTE: Equation (8) is in Section 8.1.3, not Section 8.1.2. Section 8.1.2
 * (pp. 22-23) contains Equations (5), (6) and (7).
 *
 * Guardian customLogicBlock expression. Style follows the repository precedent:
 *   Methodology Library/DLT Earth Methodology Bounty Program/VM0047 V1.1/VM0047_1.1.policy
 *     -> customLogicBlock.expression  ("function calc() {...} calc();")
 */

function calc() {
    const project = documents[documents.length - 1].document.credentialSubject[0];

    const strataSeen = {};
    const order = [];

    project.strata.forEach(function (entry) {
        const j = entry.species;
        const i = entry.stratum;

        if (!Number.isInteger(j) || j < 1 || j > 3) {
            throw new Error('species j must be 1, 2 or 3, got ' + j);
        }
        if (!Number.isInteger(i) || i < 1 || i > 3) {
            throw new Error('stratum i must be 1, 2 or 3, got ' + i);
        }

        // C_EX,j,i|BSL, supplied by Equation (4).
        const cExJiBsl = entry.cExJiBsl;
        if (typeof cExJiBsl !== 'number' || Number.isNaN(cExJiBsl)) {
            throw new Error('C_EX,j,i|BSL must be a number at j=' + j + ' i=' + i);
        }
        if (cExJiBsl < 0) {
            throw new Error('C_EX,j,i|BSL must be greater than or equal to zero at j=' + j + ' i=' + i);
        }

        if (!strataSeen[i]) {
            strataSeen[i] = { stratum: i, species: [], cExJiBsl: [] };
            order.push(i);
        }
        if (strataSeen[i].species.indexOf(j) !== -1) {
            throw new Error('duplicate species j=' + j + ' in stratum i=' + i + '; Equation (8) sums over distinct tree species');
        }
        strataSeen[i].species.push(j);
        strataSeen[i].cExJiBsl.push(cExJiBsl);
    });

    if (order.length === 0) {
        throw new Error('at least one species/stratum combination is required');
    }

    const rows = order.map(function (i) {
        const bucket = strataSeen[i];
        return {
            stratum: i,
            species: bucket.species.slice().sort(function (a, b) { return a - b; }),
            cExJiBsl: bucket.cExJiBsl.slice(),
            // Equation (8): C_EX,i|BSL = SUM over j of C_EX,j,i|BSL
            cExIBsl: bucket.cExJiBsl.reduce(function (s, v) { return s + v; }, 0),
        };
    });

    done({
        ref: project.id,
        year: project.monitoringYear,
        rows: rows,
        // Not an Equation (8) term: the plain sum across strata, carried only so
        // that a multi-stratum project can be inspected. Projects must not read
        // it as a per-hectare quantity, because the summands are each per hectare.
        sumOfStrataTotalsTC: rows.reduce(function (s, r) { return s + r.cExIBsl; }, 0),
    });
}

calc();