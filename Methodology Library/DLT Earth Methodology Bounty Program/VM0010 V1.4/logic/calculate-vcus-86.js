/**
 * VM0010 v1.4 — Equations (43)-(46) - Buffer and VCU Arithmetic
 *
 * Eq (43): Bu_CR,t* = [MAX(0,DC_NET|PRJ) - MAX(0,C_NET|BSL,t*)] * NPR%; tCO2e buffer quantity
 * Eq (44): Bu_ER,t* = [MIN(0,DC_NET|PRJ) - MIN(0,C_NET|BSL,t*)] * NPR%; tCO2e buffer quantity
 * Eq (45): VCU_CR,t* = CR_t* - Bu_CR,t*; VCU-equivalent tCO2e before registry issuance
 * Eq (46): VCU_ER,t* = ER_t* - Bu_ER,t*; VCU-equivalent tCO2e before registry issuance
 *
 * Guardian customLogicBlock expression. Style follows repository precedent:
 *   Methodology Library/DLT Earth Methodology Bounty Program/VM0047 V1.1/VM0047_1.1.policy
 *     -> customLogicBlock.expression  ("function calc() {...} calc();")
 *
 * PROVENANCE. S1 pp.51-52 (Eqs 43-44), S1 p.52 (Eqs 45-46) of VM0010 v1.4.
 *
 * INPUTS:
 *   dcNetPrj   tCO2e: cumulative project net change DC_NET|PRJ (Eq 39)
 *   cNetBsl    tCO2e: baseline net stock change C_NET|BSL,t* (distinct from DC_NET|BSL,t* used by Eq 41)
 *   nprPct     dimensionless: non-permanence risk fraction NPR% (e.g. 0.20 for 20%)
 *   crTco2e    tCO2e: Eq (41) corrected net removals CR_t*
 *   erTco2e    tCO2e: Eq (40) corrected net emission reductions ER_t*
 *
 * VALIDATION:
 *   - dcNetPrj must be a finite number (signed values allowed)
 *   - cNetBsl must be a finite number (signed values allowed)
 *   - nprPct in [0,1]; normalize explicitly (20% -> 0.20)
 *   - crTco2e and erTco2e must be finite numbers (signed values allowed)
 *   - No LF/U applied a second time to buffer formulas (PHASE3 spec line 414)
 *   - Negative buffer results require review, not automatic clamping (line 422)
 */

function calc() {
    const project = documents[documents.length - 1].document.credentialSubject[0];

    const dcNetPrj = project.dcNetPrj;
    const cNetBsl = project.cNetBsl;
    const nprPct = project.nprPct;
    const crTco2e = project.crTco2e;
    const erTco2e = project.erTco2e;

    if (typeof dcNetPrj !== 'number' || Number.isNaN(dcNetPrj) || !Number.isFinite(dcNetPrj)) {
        throw new Error('DC_NET_PRJ must be a finite number');
    }
    if (typeof cNetBsl !== 'number' || Number.isNaN(cNetBsl) || !Number.isFinite(cNetBsl)) {
        throw new Error('C_NET_BSL_t must be a finite number');
    }
    if (typeof nprPct !== 'number' || Number.isNaN(nprPct) || !Number.isFinite(nprPct) || nprPct < 0 || nprPct > 1) {
        throw new Error('NPR_PCT must be in [0,1]');
    }
    if (typeof crTco2e !== 'number' || Number.isNaN(crTco2e) || !Number.isFinite(crTco2e)) {
        throw new Error('CR_TCO2E must be a finite number');
    }
    if (typeof erTco2e !== 'number' || Number.isNaN(erTco2e) || !Number.isFinite(erTco2e)) {
        throw new Error('ER_TCO2E must be a finite number');
    }

    // Eq (43): removals buffer Bu_CR,t* = [MAX(0,DC_NET|PRJ) - MAX(0,C_NET|BSL,t*)] * NPR%
    const buCrTco2e = (Math.max(0, dcNetPrj) - Math.max(0, cNetBsl)) * nprPct;

    // Eq (44): reductions buffer Bu_ER,t* = [MIN(0,DC_NET|PRJ) - MIN(0,C_NET|BSL,t*)] * NPR%
    const buErTco2e = (Math.min(0, dcNetPrj) - Math.min(0, cNetBsl)) * nprPct;

    // Eq (45): removals VCUs VCU_CR,t* = CR_t* - Bu_CR,t*
    const vcuCrTco2e = crTco2e - buCrTco2e;

    // Eq (46): reductions VCUs VCU_ER,t* = ER_t* - Bu_ER,t*
    const vcuErTco2e = erTco2e - buErTco2e;

    done({
        ref: project.id,
        year: project.monitoringYear,
        buCrTco2e: buCrTco2e,
        buErTco2e: buErTco2e,
        vcuCrTco2e: vcuCrTco2e,
        vcuErTco2e: vcuErTco2e,
    });
}

calc();