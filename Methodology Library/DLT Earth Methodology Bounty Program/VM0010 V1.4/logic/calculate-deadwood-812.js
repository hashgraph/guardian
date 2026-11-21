/**
 * VM0010 v1.4 Section 8.1.2, Equation (5) - change in carbon stock of dead wood
 * (logging slash) generated in the process of timber harvest.
 *
 *   dC_DWSLASH,i,p|BSL = d [ C_HB,j,i|BSL - C_EX,j,i|BSL
 *                          + C_RSD,j,i|BSL + C_notHB,INF,j,i|BSL ],  F_D = 1   (5)
 *
 * PROVENANCE. Section 8.1 Baseline Emissions begins at p. 17, per the Contents on
 * p. 3 of VM0010, v1.4. The Contents does NOT index individual equations, so no
 * page is cited here for Equation (5).
 *
 * The symbolic expression above is RECONSTRUCTED, NOT TRANSCRIBED. The Where-block
 * symbols, descriptions and units reproduced below WERE read from the source; the
 * operators, grouping and the decay operator were NOT recoverable from the
 * methodology's text layer and have not been verified against the rendered page.
 * Treat the formula as a hypothesis pending reviewer check.
 *
 * Where (per the Where-block):
 *   dC_DWSLASH,i,p|BSL     change in carbon stock of dead wood as logging slash
 *                          resulting from timber harvest, per unit area in
 *                          stratum i in land parcel p, tC ha-1
 *   C_HB,j,i|BSL           mean carbon stock of harvested biomass per unit area
 *                          for species j in stratum i, tC ha-1
 *   C_EX,j,i|BSL           mean carbon stock of extracted timber per unit area
 *                          for species j in stratum i, tC ha-1
 *   C_RSD,j,i|BSL          mean carbon stock in timber from residual stand
 *                          damage per unit area for species j in stratum i,
 *                          tC ha-1
 *   C_notHB,INF,j,i|BSL    mean carbon stock of biomass that is not harvested
 *                          during the establishment of forestry infrastructure
 *                          per unit area for species j in stratum i, tC ha-1
 *   F_D                    dimensionless, = 1
 *   i = 1,2,3 strata; j = 1,2,3 tree species; p = 1,2,3...P land parcels
 *
 * The ten-year linear decay of logging slash is NOT part of Equation (5).
 * Section 8.1.2 states it "is applied when the net greenhouse gas
 * emissions/removals are calculated on an annual basis in Equations 10 and 11",
 * both of which are out of scope here. F_D is therefore applied as its defined
 * value of 1.
 *
 * C_RSD,j,i|BSL is produced by Equation (6) - C_RSD = C_EX * F_RSD|BSL - which is
 * a separate equation and deliberately NOT implemented as a separate step here.
 * It is accepted either supplied directly, or derived inline via Equation (6)
 * from F_RSD|BSL. Exactly one of the two routes must be present.
 *
 * C_HB,j,i|BSL and C_EX,j,i|BSL are produced by Section 8.1.1 Equations (3) and
 * (4). They are supplied here as declared inputs, expected to carry those
 * values, consistent with every customLogicBlock in this slice independently
 * reading the same Project Description.
 *
 * C&C STATUS: neither mandatory 2026 document amends Equation (5). The
 * 4 September 2026 C&C amends Section 4, the Section 8.1 baseline-reassessment
 * narrative, Eq 12/13, Eq 37 and Eqs 40/41. The 11 June 2026 C&C amends only the
 * Section 8.1 baseline-averaging sentence; its Background cites the ten-year
 * dead-wood decay as the v1.2 change, but that decay lives in Eqs 10/11.
 *
 * Guardian customLogicBlock expression. Style follows the repository precedent:
 *   Methodology Library/DLT Earth Methodology Bounty Program/VM0047 V1.1/VM0047_1.1.policy
 *     -> customLogicBlock.expression  ("function calc() {...} calc();")
 */

const F_D = 1;

function calc() {
    const project = documents[documents.length - 1].document.credentialSubject[0];

    const inputs = [];
    project.deadWood.forEach(function (entry) {
        const j = entry.species;
        const i = entry.stratum;
        const p = entry.parcel;

        if (!Number.isInteger(j) || j < 1 || j > 3) {
            throw new Error('species j must be 1, 2 or 3, got ' + j);
        }
        if (!Number.isInteger(i) || i < 1 || i > 3) {
            throw new Error('stratum i must be 1, 2 or 3, got ' + i);
        }
        if (!Number.isInteger(p) || p < 1) {
            throw new Error('land parcel p must be a positive integer, got ' + p);
        }

        const cHb = entry.cHbJiBsl;
        const cEx = entry.cExJiBsl;
        const cNotHbInf = entry.cNotHbInfJiBsl;

        // C_RSD,j,i|BSL may be supplied directly, or derived here from
        // Section 8.1.2 Equation (6): C_RSD,j,i|BSL = C_EX,j,i|BSL * F_RSD|BSL.
        // Exactly one of the two routes must be present. Deriving it here closes
        // what was previously an input-only dependency.
        const hasCrsd = entry.cRsdJiBsl !== undefined && entry.cRsdJiBsl !== null;
        const hasFrsd = entry.fRsdBsl !== undefined && entry.fRsdBsl !== null;

        if (hasCrsd === hasFrsd) {
            throw new Error(
                'supply exactly one of cRsdJiBsl or fRsdBsl at j=' + j + ' i=' + i + ' p=' + p,
            );
        }

        let cRsd;
        let cRsdDerivedFrom = null;
        if (hasCrsd) {
            cRsd = entry.cRsdJiBsl;
        } else {
            const fRsd = entry.fRsdBsl;
            if (typeof fRsd !== 'number' || Number.isNaN(fRsd)) {
                throw new Error('F_RSD|BSL must be a number at j=' + j + ' i=' + i + ' p=' + p);
            }
            // No upper bound of 1: every Section 9.1 p.56 default exceeds 1.
            if (fRsd < 0) {
                throw new Error('F_RSD|BSL must be greater than or equal to zero at j=' + j + ' i=' + i + ' p=' + p);
            }
            cRsd = cEx * fRsd;   // Equation (6)
            cRsdDerivedFrom = 'E6';
        }

        [cHb, cEx, cRsd, cNotHbInf].forEach(function (v) {
            if (typeof v !== 'number' || Number.isNaN(v)) {
                throw new Error('carbon stock inputs must be numbers at j=' + j + ' i=' + i + ' p=' + p);
            }
            if (v < 0) {
                throw new Error('carbon stock inputs must be greater than or equal to zero at j=' + j + ' i=' + i + ' p=' + p);
            }
        });

        // Harvested biomass that leaves the forest as merchantable timber is not
        // left behind as slash: that part is C_HB - C_EX.
        const slashFromHarvest = cHb - cEx;
        const total = slashFromHarvest + cRsd + cNotHbInf;

        inputs.push({
            species: j,
            stratum: i,
            parcel: p,
            cHbJiBsl: cHb,
            cExJiBsl: cEx,
            cRsdJiBsl: cRsd,
            cRsdDerivedFrom: cRsdDerivedFrom,
            cNotHbInfJiBsl: cNotHbInf,
            slashFromHarvestTCo2eHa: slashFromHarvest,
            totalBeforeDecayTCo2eHa: total,
            // F_D = 1: no decay is applied at Equation (5).
            dCDwslashJiPBsl: total * F_D,
        });
    });

    if (inputs.length === 0) {
        throw new Error('at least one species/stratum/parcel combination is required');
    }

    done({
        ref: project.id,
        year: project.monitoringYear,
        fD: F_D,
        rows: inputs,
        totalDCDwslashTCo2eHa: inputs.reduce(function (s, r) { return s + r.dCDwslashJiPBsl; }, 0),
    });
}

calc();
