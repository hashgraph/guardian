/**
 * VM0010 v1.4 Section 8.1.3, Equation (11) - baseline carbon sequestered in
 * wood products assumed to be retired between 3 and 100 years after harvest.
 *
 *   dC_WP100,i,p|BSL = SUM_k ( C_WP,i|BSL * OF_k )                            (11)
 *
 * PROVENANCE. Section 8.1 Baseline Emissions begins at p. 17, per the Contents on
 * p. 3 of VM0010, v1.4. The Contents does NOT index individual equations, so no
 * page is cited here for Equation (11).
 *
 * The symbolic expression above is RECONSTRUCTED, NOT TRANSCRIBED. The Where-block
 * symbols, descriptions and units below WERE read from the source; the operators
 * and the summation structure were NOT recoverable from the methodology's text
 * layer and have not been verified against the rendered page. Treat the formula as
 * a hypothesis pending reviewer check.
 *
 * Where (per the Where-block; page not verified):
 *   dC_WP100,i,p|BSL   carbon stored in wood products that are assumed to be
 *                      retired between 3 and 100 years after harvest from stratum
 *                      i in land parcel p, tC ha-1
 *   C_WP,i|BSL         carbon stock of extracted timber from stratum i that is
 *                      assumed to enter the wood products pool that is not
 *                      immediately emitted at the time of harvest, tC ha-1
 *   OF_k               fraction of biomass carbon for wood product type k that
 *                      is assumed to be emitted to the atmosphere between 3 and
 *                      100 years of timber harvest, dimensionless
 *   i = 1,2,3 strata; k = type of wood product (sawnwood, wood-based panels,
 *   other industrial roundwood, paper and paper board, and other);
 *   p = 1,2,3...P land parcels
 *
 * NOTE ON THE SUMMATION: Equation (11) sums over wood product classes k, with
 * the same stratum-level C_WP,i|BSL inside every term. This is implemented as
 * published, not as a single-term C_WP * OF.
 *
 * NO DECAY IS APPLIED HERE. Section 8.1.3 states that wood products retired
 * between 3 and 100 years after harvest "must be accounted for according to a
 * 20-year linear decay function", but that "decay function is applied when the
 * net greenhouse gas emissions/removals are calculated on an annual basis as in
 * Equations 10 and 11" - i.e. in Section 8.4, not in Equation (11).
 *
 * C_WP,i|BSL IS AN INPUT, NOT DERIVED HERE. Its methodology derivation is
 * Equation (10): C_WP,i|BSL = SUM_k ( C_EX,i,k|BSL - dC_WP0,i|BSL ), which in turn
 * needs Equation (9), dC_WP0,i|BSL = SUM_k ( C_EX,i,k|BSL * (WW_k + SLF_k) ), and
 * Equation (8) to disaggregate C_EX,j,i|BSL by product-class fractions F_k.
 * Equations (8), (9) and (10) are separate equations and are NOT implemented in
 * this slice, so C_WP,i|BSL is supplied as a declared input.
 *
 * OF_k IS AN INPUT, with the Section 9.1 default table below embedded purely as a
 * traceability reference for bounds checking. Section 9.1 (p. 53) gives OF, SLF
 * and WW with data unit kg/kg, sourced to Winjum, J.K., Brown, S. and
 * Schlamadinger, B. 1998. "Forest harvests and wood products: sources and sinks
 * of atmospheric carbon dioxide." Forest Science 44:272-284. OF is split by
 * forest region because Winjum et al. give annual oxidation fractions per class
 * per region, projected over 95 years to give the additional proportion
 * oxidized between the 3rd and the 100th year after initial harvest.
 *
 *   Wood Product Class           Boreal  Temperate  Tropical
 *   Sawnwood                       0.39     0.62      0.86
 *   Woodbase panels                 0.62     0.86      0.98
 *   Other industrial roundwood      0.86     0.98      0.99
 *   Paper and paperboard            0.39     0.62      0.99
 *
 * Section 9.1 tabulates four named classes; the Where-block's fifth category
 * "other" has no tabulated default, so no value is invented for it.
 *
 * C&C STATUS: neither mandatory 2026 document amends Equation (11) or the
 * Section 9.1 OF table. The 4 September 2026 C&C amends Section 4, the Section
 * 8.1 baseline-reassessment narrative, Eq 12/13, Eq 37 and Eqs 40/41. The
 * 11 June 2026 C&C amends only the Section 8.1 baseline-averaging sentence; its
 * Background cites the 20-year medium-term wood-product decay as the v1.2
 * change, but that decay is applied in Section 8.4.
 *
 * Guardian customLogicBlock expression. Style follows the repository precedent:
 *   Methodology Library/DLT Earth Methodology Bounty Program/VM0047 V1.1/VM0047_1.1.policy
 *     -> customLogicBlock.expression  ("function calc() {...} calc();")
 */

/** Section 9.1, p. 53 default OF values by wood product class and forest region. */
const OF_DEFAULTS = {
    sawnwood: { boreal: 0.39, temperate: 0.62, tropical: 0.86 },
    woodbasePanels: { boreal: 0.62, temperate: 0.86, tropical: 0.98 },
    otherIndustrialRoundwood: { boreal: 0.86, temperate: 0.98, tropical: 0.99 },
    paperAndPaperboard: { boreal: 0.39, temperate: 0.62, tropical: 0.99 },
};

const REGIONS = ['boreal', 'temperate', 'tropical'];

function calc() {
    const project = documents[documents.length - 1].document.credentialSubject[0];

    const rows = [];
    project.woodProducts.forEach(function (entry) {
        const i = entry.stratum;
        const p = entry.parcel;

        if (!Number.isInteger(i) || i < 1 || i > 3) {
            throw new Error('stratum i must be 1, 2 or 3, got ' + i);
        }
        if (!Number.isInteger(p) || p < 1) {
            throw new Error('land parcel p must be a positive integer, got ' + p);
        }

        const cWp = entry.cWpJiBsl;
        if (typeof cWp !== 'number' || Number.isNaN(cWp)) {
            throw new Error('C_WP,i|BSL must be a number at i=' + i + ' p=' + p);
        }
        if (cWp < 0) {
            throw new Error('C_WP,i|BSL must be greater than or equal to zero at i=' + i + ' p=' + p);
        }

        if (!Array.isArray(entry.classes) || entry.classes.length === 0) {
            throw new Error('at least one wood product class is required at i=' + i + ' p=' + p);
        }

        const terms = entry.classes.map(function (c) {
            const k = c.productClass;
            const ofK = c.ofK;

            if (!Object.prototype.hasOwnProperty.call(OF_DEFAULTS, k)) {
                throw new Error('unknown wood product class ' + k);
            }
            if (typeof ofK !== 'number' || Number.isNaN(ofK)) {
                throw new Error('OF_k must be a number for class ' + k);
            }
            // OF is a fraction of biomass carbon, so the only restriction stated
            // by the methodology is that it lies between zero and one. The
            // Section 9.1 table is reported for traceability but is NOT used to
            // reject inputs: the methodology gives those as defaults, and
            // permits project-specific data selection, so capping at the
            // tabulated maximum would impose a constraint the text does not
            // state.
            if (ofK < 0 || ofK > 1) {
                throw new Error('OF_k must be between 0 and 1 for class ' + k + ', got ' + ofK);
            }

            return {
                productClass: k,
                ofK: ofK,
                region: c.region || null,
                section91Defaults: OF_DEFAULTS[k],
                // Equation (11): C_WP,i|BSL * OF_k
                termTCo2eHa: cWp * ofK,
            };
        });

        // Equation (11): SUM_k ( C_WP,i|BSL * OF_k )
        const total = terms.reduce(function (s, t) { return s + t.termTCo2eHa; }, 0);

        rows.push({
            stratum: i,
            parcel: p,
            cWpJiBsl: cWp,
            classes: terms,
            dCWp100JiPBsl: total,
        });
    });

    if (rows.length === 0) {
        throw new Error('at least one stratum/parcel combination is required');
    }

    done({
        ref: project.id,
        year: project.monitoringYear,
        rows: rows,
        section91OfDefaults: OF_DEFAULTS,
        section91OfRegions: REGIONS,
        totalDCWp100TCo2eHa: rows.reduce(function (s, r) { return s + r.dCWp100JiPBsl; }, 0),
    });
}

calc();
