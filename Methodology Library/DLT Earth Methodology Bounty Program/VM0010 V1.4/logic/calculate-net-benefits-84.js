/**
 * VM0010 v1.4 — Equations (40)-(41) - Corrected Net Emission Reductions and Removals
 *
 * Eq (40): ER_t* = [C_FUEL - MIN(0,DC_NET|BSL,t*) + MIN(0,DC_NET|PRJ)] * (1-LF_ME) * (1-U_total|LtPF); tCO2e
 * Eq (41): CR_t* = [MAX(0,DC_NET|PRJ) - MAX(0,DC_NET|BSL,t*)] * (1-U_total|LtPF); tCO2e
 *
 * Guardian customLogicBlock expression. Style follows repository precedent:
 *   Methodology Library/DLT Earth Methodology Bounty Program/VM0047 V1.1/VM0047_1.1.policy
 *     -> customLogicBlock.expression  ("function calc() {...} calc();")
 *
 * PROVENANCE. Section 8.5 and p.52 of VM0010 v1.4. Eqs 40-41 from the equation ledger.
 *
 * INPUTS:
 *   C_FUEL           tCO2e: baseline fossil fuel total (Eq 12)
 *   DC_NET_BSL_t    tCO2e: baseline annual net change DC_NET|BSL,t* (Eq 28)
 *   DC_NET_PRJ      tCO2e: cumulative project net change DC_NET|PRJ (Eq 39)
 *   LF_ME            dimensionless: leakage adjustment factor in [0,1] (A05/A07) - Eq (40) only
 *   U_TOTAL         dimensionless: combined uncertainty U_total|LtPF (Eq 42)
 *
 * VALIDATION:
 *   - C_FUEL must be a finite number
 *   - DC_NET_BSL_t and DC_NET_PRJ must be finite numbers (signed values allowed)
 *   - LF_ME in [0,1] when provided; U_TOTAL in [0,1] when provided
 */

function calc() {
    const project = documents[documents.length - 1].document.credentialSubject[0];

    const cFuel = project.cFuel;
    const dcNetBsl = project.dcNetBsl;
    const dcNetPrj = project.dcNetPrj;
    const lfMe = project.lfMe;
    const uTotal = project.uTotal;

    if (typeof cFuel !== 'number' || Number.isNaN(cFuel) || !Number.isFinite(cFuel) || cFuel < 0) {
        throw new Error('C_FUEL must be a finite number >= 0');
    }
    if (typeof dcNetBsl !== 'number' || Number.isNaN(dcNetBsl) || !Number.isFinite(dcNetBsl)) {
        throw new Error('DC_NET_BSL_t must be a finite number');
    }
    if (typeof dcNetPrj !== 'number' || Number.isNaN(dcNetPrj) || !Number.isFinite(dcNetPrj)) {
        throw new Error('DC_NET_PRJ must be a finite number');
    }

    if (typeof lfMe !== 'undefined' && (typeof lfMe !== 'number' || Number.isNaN(lfMe) || !Number.isFinite(lfMe) || lfMe < 0 || lfMe > 1)) {
        throw new Error('LF_ME must be in [0,1]');
    }
    if (typeof uTotal !== 'undefined' && (typeof uTotal !== 'number' || Number.isNaN(uTotal) || !Number.isFinite(uTotal) || uTotal < 0 || uTotal > 1)) {
        throw new Error('U_TOTAL must be in [0,1]');
    }

    // Eq (40) numerator: C_FUEL - MIN(0,DC_NET|BSL,t*) + MIN(0,DC_NET|PRJ)
    const numeratorEr = cFuel - Math.min(0, dcNetBsl) + Math.min(0, dcNetPrj);

    // Eq (41) numerator: MAX(0,DC_NET|PRJ) - MAX(0,DC_NET|BSL,t*)
    const numeratorCr = Math.max(0, dcNetPrj) - Math.max(0, dcNetBsl);

    // Eq (40): apply LF_ME and U_total
    let erTco2e = numeratorEr;
    if (typeof lfMe === 'number' && !Number.isNaN(lfMe) && Number.isFinite(lfMe) && lfMe >= 0 && lfMe <= 1) {
        erTco2e = erTco2e * (1 - lfMe);
    }
    if (typeof uTotal === 'number' && !Number.isNaN(uTotal) && Number.isFinite(uTotal) && uTotal >= 0 && uTotal <= 1) {
        erTco2e = erTco2e * (1 - uTotal);
    }

    // Eq (41): apply U_total ONLY (no LF multiplier per methodology)
    let crTco2e = numeratorCr;
    if (typeof uTotal === 'number' && !Number.isNaN(uTotal) && Number.isFinite(uTotal) && uTotal >= 0 && uTotal <= 1) {
        crTco2e = crTco2e * (1 - uTotal);
    }

    done({
        ref: project.id,
        year: project.monitoringYear,
        erTco2e: erTco2e,
        crTco2e: crTco2e,
    });
}

calc();