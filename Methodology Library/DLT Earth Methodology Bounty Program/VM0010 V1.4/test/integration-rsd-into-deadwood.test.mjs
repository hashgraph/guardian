/**
 * Integration: Eq (5) derives C_RSD,j,i|BSL via Eq (6) instead of receiving it.
 *
 * This closes the last input-only dependency in the already-verified Eq (5).
 * The chain under test is:
 *   C_EX,j,i|BSL  (Section 8.1.1 Eq 4, verified)
 *     -> Eq (6)  C_RSD,j,i|BSL = C_EX,j,i|BSL * F_RSD|BSL
 *       -> Eq (5)  dC_DWSLASH = [ (C_HB - C_EX) + C_RSD + C_notHB,INF ] * F_D
 *
 * F_RSD fixtures come from the Section 9.1 p.56 value-applied table.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { loadSlicePolicy, walkBlocks, runExpression, asDocument } from './_artifact.mjs';

const { policy } = loadSlicePolicy();

function exprFor(outputSchema) {
    let found = null;
    walkBlocks(policy.config, (n) => {
        if (n.blockType === 'customLogicBlock' && n.outputSchema === outputSchema) found = n.expression;
    });
    assert.ok(found, `no customLogicBlock for ${outputSchema}`);
    return found;
}

const eq6 = () => exprFor('#rsd-812');
const eq5 = () => exprFor('#deadwood-812');

const FRSD_CONGO = 1.74;   // Section 9.1 p.56, Congo, 22 m
const FRSD_BOLIVIA = 3.10; // Section 9.1 p.56, Bolivia, 9.8 m

function pd(deadWoodRow, rsdRows) {
    return {
        id: 'vm0010-integration-test',
        projectName: 'Integration Forest',
        monitoringYear: 2026,
        baselineActivity: [{ stratum: 'I', harvestType: 'Selective logging' }],
        fuelInputs: [],
        strata: [
            { species: 1, stratum: 1, vExJiBsl: 30, vExInfJiBsl: 2, bcefR: 1.43, dJ: 0.6, cfJ: 0.47 },
        ],
        woodProducts: [
            {
                stratum: 1, parcel: 1, cWpJiBsl: 10,
                classes: [{ productClass: 'sawnwood', ofK: 0.39 }, { productClass: 'woodbasePanels', ofK: 0.62 }],
            },
        ],
        residualStandDamage: rsdRows,
        deadWood: deadWoodRow,
    };
}

test('Eq (6) output feeds Eq (5) unchanged', () => {
    const cEx = 9.024;

    // Step 1 - Eq (6) derives C_RSD
    const rsdResult = runExpression(eq6(), {
        documents: [asDocument(pd([{ species: 1, stratum: 1, parcel: 1, cHbJiBsl: 0, cExJiBsl: cEx, cRsdJiBsl: 0, cNotHbInfJiBsl: 0 }],
            [{ species: 1, stratum: 1, cExJiBsl: cEx, fRsdBsl: FRSD_CONGO }]))],
    });
    const derivedCrsd = rsdResult.rows[0].cRsdJiBsl;
    assert.ok(Math.abs(derivedCrsd - cEx * FRSD_CONGO) < 1e-12);

    // Step 2 - Eq (5) derives the same value internally from F_RSD
    const dw = [{
        species: 1, stratum: 1, parcel: 1,
        cHbJiBsl: 21.5072,
        cExJiBsl: cEx,
        fRsdBsl: FRSD_CONGO,          // derive, do not supply
        cNotHbInfJiBsl: 0.3,
    }];
    const eq5Result = runExpression(eq5(), { documents: [asDocument(pd(dw, []))] });
    const row = eq5Result.rows[0];

    assert.ok(
        Math.abs(row.cRsdJiBsl - derivedCrsd) < 1e-12,
        `Eq (5) derived C_RSD ${row.cRsdJiBsl} must equal Eq (6) output ${derivedCrsd}`,
    );
    assert.equal(row.cRsdDerivedFrom, 'E6', 'provenance must record the Eq (6) derivation');
});

test('Eq (5) total using derived C_RSD matches independent hand-computation', () => {
    const cHb = 21.5072;
    const cEx = 9.024;
    const cNotHbInf = 0.3;

    const dw = [{
        species: 1, stratum: 1, parcel: 1,
        cHbJiBsl: cHb, cExJiBsl: cEx, fRsdBsl: FRSD_BOLIVIA, cNotHbInfJiBsl: cNotHbInf,
    }];
    const result = runExpression(eq5(), { documents: [asDocument(pd(dw, []))] });
    const row = result.rows[0];

    // (21.5072 - 9.024) + (9.024 * 3.10) + 0.3
    // = 12.4832 + 27.9744 + 0.3 = 40.7576
    const cRsd = cEx * FRSD_BOLIVIA;   // 27.9744
    const expected = (cHb - cEx) + cRsd + cNotHbInf;
    assert.ok(Math.abs(cRsd - 27.9744) < 1e-12, `C_RSD ${cRsd}`);
    assert.ok(Math.abs(expected - 40.7576) < 1e-12, `expected ${expected}`);
    assert.ok(Math.abs(row.totalBeforeDecayTCo2eHa - expected) < 1e-12);
    assert.ok(Math.abs(row.dCDwslashJiPBsl - expected) < 1e-12, 'F_D = 1 so no decay');
});

test('supplying C_RSD directly still works and is marked as not derived', () => {
    const dw = [{
        species: 1, stratum: 1, parcel: 1,
        cHbJiBsl: 21.5072, cExJiBsl: 9.024, cRsdJiBsl: 0.5, cNotHbInfJiBsl: 0.3,
    }];
    const result = runExpression(eq5(), { documents: [asDocument(pd(dw, []))] });
    assert.equal(result.rows[0].cRsdJiBsl, 0.5);
    assert.equal(result.rows[0].cRsdDerivedFrom, null, 'provenance must be null when supplied');
    // (21.5072 - 9.024) + 0.5 + 0.3 = 12.4832 + 0.8 = 13.2832
    assert.ok(Math.abs(result.rows[0].dCDwslashJiPBsl - 13.2832) < 1e-12);
});

test('supplying both C_RSD and F_RSD, or neither, is rejected', () => {
    const both = [{
        species: 1, stratum: 1, parcel: 1,
        cHbJiBsl: 21.5072, cExJiBsl: 9.024, cRsdJiBsl: 0.5, fRsdBsl: 1.74, cNotHbInfJiBsl: 0.3,
    }];
    assert.throws(
        () => runExpression(eq5(), { documents: [asDocument(pd(both, []))] }),
        /supply exactly one of cRsdJiBsl or fRsdBsl/,
        'both routes must be rejected as ambiguous',
    );

    const neither = [{
        species: 1, stratum: 1, parcel: 1,
        cHbJiBsl: 21.5072, cExJiBsl: 9.024, cNotHbInfJiBsl: 0.3,
    }];
    assert.throws(
        () => runExpression(eq5(), { documents: [asDocument(pd(neither, []))] }),
        /supply exactly one of cRsdJiBsl or fRsdBsl/,
        'neither route must be rejected',
    );
});

test('a negative F_RSD is rejected on the Eq (6) derivation path', () => {
    const dw = [{
        species: 1, stratum: 1, parcel: 1,
        cHbJiBsl: 21.5072, cExJiBsl: 9.024, fRsdBsl: -0.5, cNotHbInfJiBsl: 0.3,
    }];
    assert.throws(
        () => runExpression(eq5(), { documents: [asDocument(pd(dw, []))] }),
        /F_RSD\|BSL must be greater than or equal to zero/,
    );
});
