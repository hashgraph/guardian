/**
 * VM0010 v1.4 Section 8.1.2, Equation (6) - mean carbon stock in timber from
 * residual stand damage.
 *
 *   C_RSD,j,i|BSL = C_EX,j,i|BSL * F_RSD|BSL                                     (6)
 *
 * Equation (6) is on p. 23, with its Where-block on p. 23.
 *
 * Where (per the Where-block, p. 23):
 *   C_RSD,j,i|BSL  mean carbon stock in timber from residual stand damage per
 *                  unit area for species j in stratum i, tC ha-1
 *   C_EX,j,i|BSL   mean carbon stock of extracted timber per unit area for
 *                  species j in stratum i, tC ha-1
 *   F_RSD|BSL      factor for residual stand damage, dimensionless
 *   i = 1,2,3 strata; and j = 1,2,3 tree species
 *
 * Note that Equation (6) carries NO land parcel index p; that index belongs to
 * Equation (5).
 *
 * F_RSD|BSL IS AN INPUT. Section 9.1 (p. 56) gives its source of data as
 * "Choose data from peer reviewed literature ... or published by a government
 * agency", with a "Value applied" table keyed on country and commercial log
 * length:
 *
 *   F_RSD (tC_damaged / tC_extracted)  Log length (m)  Country  Reference
 *   1.74                               22              Congo     Brown et al. (2005)
 *   2.30                               17              Malaysia  Pinard and Putz (1996)
 *   2.78                               10.8            Belize    Brown et al. (2005)
 *   3.10                               9.8             Bolivia   Pearson et al. (2005)
 *
 * IMPORTANT - F_RSD IS NOT BOUNDED BY UNITY. The Section 9.1 row declares the
 * data unit "Dimensionless" and the Equation (6) Where-block calls F_RSD|BSL a
 * dimensionless "factor", but every tabulated value EXCEEDS 1 and the row's own
 * unit expression is tC_damaged / tC_extracted. This is an internal tension in
 * the methodology between the declared unit and the tabulated data. It is
 * recorded, not resolved: the implementation therefore enforces F_RSD >= 0 with
 * NO upper bound of 1, because capping at 1 would reject all four methodology
 * defaults. This differs deliberately from OF_k in Equation (11), which is a
 * genuine fraction of biomass carbon and IS bounded by 1.
 *
 * C_EX,j,i|BSL is an input produced by Section 8.1.1 Equation (4). Its index
 * shape - species j by stratum i - matches Equation (6) exactly, so no
 * re-indexing is required.
 *
 * C&C STATUS: neither mandatory 2026 document amends Section 8.1.2
 * Equation (6), C_RSD, C_EX or F_RSD|BSL. The 4 September 2026 C&C amends
 * Section 4, the Section 8.1 baseline-reassessment narrative, Eq 12/13,
 * Eq 37 and Eqs 40/41; the 11 June 2026 C&C amends only the Section 8.1
 * baseline-averaging sentence.
 *
 * Guardian customLogicBlock expression. Style follows the repository precedent:
 *   Methodology Library/DLT Earth Methodology Bounty Program/VM0047 V1.1/VM0047_1.1.policy
 *     -> customLogicBlock.expression  ("function calc() {...} calc();")
 */

/** Section 9.1, p. 56 "Value applied" table, for traceability only. */
const F_RSD_TABLE = [
    { fRsd: 1.74, commercialLogLengthM: 22, country: 'Congo', reference: 'Brown et al. (2005)' },
    { fRsd: 2.30, commercialLogLengthM: 17, country: 'Malaysia', reference: 'Pinard and Putz (1996)' },
    { fRsd: 2.78, commercialLogLengthM: 10.8, country: 'Belize', reference: 'Brown et al. (2005)' },
    { fRsd: 3.10, commercialLogLengthM: 9.8, country: 'Bolivia', reference: 'Pearson et al. (2005)' },
];

function calc() {
    const project = documents[documents.length - 1].document.credentialSubject[0];

    const rows = [];
    project.residualStandDamage.forEach(function (entry) {
        const j = entry.species;
        const i = entry.stratum;

        if (!Number.isInteger(j) || j < 1 || j > 3) {
            throw new Error('species j must be 1, 2 or 3, got ' + j);
        }
        if (!Number.isInteger(i) || i < 1 || i > 3) {
            throw new Error('stratum i must be 1, 2 or 3, got ' + i);
        }

        const cEx = entry.cExJiBsl;
        const fRsd = entry.fRsdBsl;

        if (typeof cEx !== 'number' || Number.isNaN(cEx)) {
            throw new Error('C_EX,j,i|BSL must be a number at j=' + j + ' i=' + i);
        }
        if (cEx < 0) {
            throw new Error('C_EX,j,i|BSL must be greater than or equal to zero at j=' + j + ' i=' + i);
        }
        if (typeof fRsd !== 'number' || Number.isNaN(fRsd)) {
            throw new Error('F_RSD|BSL must be a number at j=' + j + ' i=' + i);
        }
        // No upper bound: every Section 9.1 default exceeds 1.
        if (fRsd < 0) {
            throw new Error('F_RSD|BSL must be greater than or equal to zero at j=' + j + ' i=' + i);
        }

        rows.push({
            species: j,
            stratum: i,
            cExJiBsl: cEx,
            fRsdBsl: fRsd,
            // Equation (6)
            cRsdJiBsl: cEx * fRsd,
        });
    });

    if (rows.length === 0) {
        throw new Error('at least one species/stratum combination is required');
    }

    done({
        ref: project.id,
        year: project.monitoringYear,
        rows: rows,
        section91FRsdValueAppliedTable: F_RSD_TABLE,
    });
}

calc();
