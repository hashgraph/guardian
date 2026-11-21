/**
 * Focused tests for VM0010 v1.4 Section 8.1.1, Equations (3) and (4):
 *
 *   C_HB,j,i|BSL = ( V_EX,j,i|BSL + V_EX,INF,j,i|BSL ) * BCEF_R * CF_j      (3)
 *   C_EX,j,i|BSL = ( V_EX,j,i|BSL + V_EX,INF,j,i|BSL ) * D_j    * CF_j      (4)
 *
 * The expression executed here is read back out of the built VM0010.policy, so
 * these tests exercise the shipped artifact rather than the source file.
 *
 * C&C status: NEITHER mandatory 2026 document amends Section 8.1.1. The
 * 4 September 2026 C&C amends Section 4, the Section 8.1 baseline-reassessment
 * narrative, Eq 12/13, Eq 37 and Eqs 40/41. The 11 June 2026 C&C amends only
 * the Section 8.1 baseline-averaging sentence, which concerns averaging total
 * emissions over the crediting period and multiplying by t*. Equations (3) and
 * (4) are per-hectare carbon-stock calculations involving neither t* nor
 * crediting-period averaging, so the correction does not reach them.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { loadSlicePolicy, walkBlocks, runExpression, asDocument } from './_artifact.mjs';

const { policy } = loadSlicePolicy();

function section811Expression() {
    let found = null;
    walkBlocks(policy.config, (node) => {
        if (node.blockType === 'customLogicBlock'
            && node.outputSchema === '#carbon-stocks-811') {
            found = node.expression;
        }
    });
    assert.ok(found, 'the Section 8.1.1 customLogicBlock must exist in the artifact');
    return found;
}

function projectDescription(strata) {
    return {
        id: 'vm0010-811-test',
        projectName: 'Slice Test Forest',
        monitoringYear: 2026,
        baselineActivity: [{ stratum: 'I', harvestType: 'Selective logging' }],
        fuelInputs: [],
        strata: strata || [
            {
                species: 1,
                stratum: 1,
                vExJiBsl: 30,
                vExInfJiBsl: 2,
                bcefR: 1.43,
                dJ: 0.6,
                cfJ: 0.47,
            },
        ],
    };
}

test('the Section 8.1.1 block is wired to the right schema and role', () => {
    let block = null;
    walkBlocks(policy.config, (n) => {
        if (n.blockType === 'customLogicBlock' && n.outputSchema === '#carbon-stocks-811') block = n;
    });
    assert.ok(block, 'policy must contain the Section 8.1.1 customLogicBlock');
    assert.deepEqual(block.permissions, ['Project Proponent']);
    assert.equal(block.documentSigner, 'owner');
    assert.equal(block.onErrorAction, 'stop');
    assert.equal(block.children.length, 1);
    assert.equal(block.children[0].blockType, 'documentsSourceAddon');
    assert.equal(block.children[0].schema, '#project-description');
});

test('Eq (3) and Eq (4) match independent hand-computation', () => {
    const pd = projectDescription();
    const row = pd.strata[0];
    const volume = row.vExJiBsl + row.vExInfJiBsl; // 32 m3/ha

    // Eq (3): 32 * 1.43 * 0.47 = 21.5072 tC/ha
    const expectedHb = volume * row.bcefR * row.cfJ;
    // Eq (4): 32 * 0.6  * 0.47 =  9.0240 tC/ha
    const expectedEx = volume * row.dJ * row.cfJ;

    assert.equal(volume, 32);
    assert.ok(Math.abs(expectedHb - 21.5072) < 1e-12, `expected Hb ${expectedHb}`);
    assert.ok(Math.abs(expectedEx - 9.024) < 1e-12, `expected Ex ${expectedEx}`);

    const result = runExpression(section811Expression(), { documents: [asDocument(pd)] });
    assert.equal(result.ref, 'vm0010-811-test');
    assert.equal(result.year, 2026);
    assert.equal(result.strata.length, 1);

    const out = result.strata[0];
    assert.equal(out.species, 1);
    assert.equal(out.stratum, 1);
    assert.equal(out.extractedVolume, 32, 'V_EX + V_EX,INF');

    assert.ok(Math.abs(out.cHbJiBsl - expectedHb) < 1e-12, `C_HB ${out.cHbJiBsl} vs ${expectedHb}`);
    assert.ok(Math.abs(out.cExJiBsl - expectedEx) < 1e-12, `C_EX ${out.cExJiBsl} vs ${expectedEx}`);
    assert.ok(Math.abs(result.totalCHbJiBsl - expectedHb) < 1e-12);
    assert.ok(Math.abs(result.totalCExJiBsl - expectedEx) < 1e-12);
});

test('Eq (3) uses BCEF_R and Eq (4) uses D_j', () => {
    // The two equations differ only in the dry-matter conversion factor:
    // Eq 3 converts with the biomass conversion and expansion factor (which
    // expands to total dry matter incl. residues); Eq 4 converts with the basic
    // wood density of the extracted species.
    const pd = projectDescription([{
        species: 1, stratum: 1,
        vExJiBsl: 10, vExInfJiBsl: 0,
        bcefR: 2.0, dJ: 0.5, cfJ: 0.5,
    }]);
    const result = runExpression(section811Expression(), { documents: [asDocument(pd)] });
    const out = result.strata[0];
    assert.equal(out.cHbJiBsl, 10 * 2.0 * 0.5); // 10
    assert.equal(out.cExJiBsl, 10 * 0.5 * 0.5); // 2.5
    assert.notEqual(out.cHbJiBsl, out.cExJiBsl);
});

test('neither equation divides by area (volumes are already per hectare)', () => {
    // A stray area divisor would show up as the result changing with a
    // notional area. V_EX inputs are m3/ha and results are tC/ha, so the
    // result must depend only on the per-hectare inputs given.
    const pd = projectDescription([{
        species: 1, stratum: 1,
        vExJiBsl: 25, vExInfJiBsl: 5,
        bcefR: 1.6, dJ: 0.55, cfJ: 0.48,
    }]);
    const result = runExpression(section811Expression(), { documents: [asDocument(pd)] });
    const out = result.strata[0];
    assert.equal(out.extractedVolume, 30);
    assert.ok(Math.abs(out.cHbJiBsl - 30 * 1.6 * 0.48) < 1e-12);
    assert.ok(Math.abs(out.cExJiBsl - 30 * 0.55 * 0.48) < 1e-12);
});

test('zero volume yields zero carbon stock', () => {
    const result = runExpression(section811Expression(), {
        documents: [asDocument(projectDescription([{
            species: 1, stratum: 1,
            vExJiBsl: 0, vExInfJiBsl: 0,
            bcefR: 1.43, dJ: 0.6, cfJ: 0.47,
        }]))],
    });
    assert.equal(result.strata[0].extractedVolume, 0);
    assert.equal(result.strata[0].cHbJiBsl, 0);
    assert.equal(result.strata[0].cExJiBsl, 0);
    assert.equal(result.totalCHbJiBsl, 0);
});

test('multiple species/strata rows are summed', () => {
    const rows = [
        { species: 1, stratum: 1, vExJiBsl: 30, vExInfJiBsl: 2, bcefR: 1.43, dJ: 0.6, cfJ: 0.47 },
        { species: 2, stratum: 1, vExJiBsl: 10, vExInfJiBsl: 1, bcefR: 1.30, dJ: 0.55, cfJ: 0.50 },
    ];
    const result = runExpression(section811Expression(), {
        documents: [asDocument(projectDescription(rows))],
    });
    const expectedHb = rows.reduce((s, r) => s + (r.vExJiBsl + r.vExInfJiBsl) * r.bcefR * r.cfJ, 0);
    const expectedEx = rows.reduce((s, r) => s + (r.vExJiBsl + r.vExInfJiBsl) * r.dJ * r.cfJ, 0);
    assert.equal(result.strata.length, 2);
    assert.ok(Math.abs(result.totalCHbJiBsl - expectedHb) < 1e-12);
    assert.ok(Math.abs(result.totalCExJiBsl - expectedEx) < 1e-12);
});

test('species and stratum indices outside 1..3 are rejected', () => {
    for (const bad of [0, 4, -1, 2.5]) {
        assert.throws(
            () => runExpression(section811Expression(), {
                documents: [asDocument(projectDescription([{
                    species: bad, stratum: 1,
                    vExJiBsl: 10, vExInfJiBsl: 0, bcefR: 1.4, dJ: 0.6, cfJ: 0.47,
                }]))],
            }),
            /species j must be 1, 2 or 3/,
            `species ${bad} must be rejected`,
        );
        assert.throws(
            () => runExpression(section811Expression(), {
                documents: [asDocument(projectDescription([{
                    species: 1, stratum: bad,
                    vExJiBsl: 10, vExInfJiBsl: 0, bcefR: 1.4, dJ: 0.6, cfJ: 0.47,
                }]))],
            }),
            /stratum i must be 1, 2 or 3/,
            `stratum ${bad} must be rejected`,
        );
    }
});

test('negative volumes and non-positive conversion factors are rejected', () => {
    const base = { species: 1, stratum: 1, vExJiBsl: 10, vExInfJiBsl: 0, bcefR: 1.4, dJ: 0.6, cfJ: 0.47 };

    assert.throws(
        () => runExpression(section811Expression(), {
            documents: [asDocument(projectDescription([{ ...base, vExJiBsl: -1 }]))],
        }),
        /volume must be greater than or equal to zero/,
    );
    assert.throws(
        () => runExpression(section811Expression(), {
            documents: [asDocument(projectDescription([{ ...base, vExInfJiBsl: -0.5 }]))],
        }),
        /volume must be greater than or equal to zero/,
    );
    assert.throws(
        () => runExpression(section811Expression(), {
            documents: [asDocument(projectDescription([{ ...base, bcefR: 0 }]))],
        }),
        /BCEF_R must be greater than zero/,
    );
    assert.throws(
        () => runExpression(section811Expression(), {
            documents: [asDocument(projectDescription([{ ...base, dJ: 0 }]))],
        }),
        /D_j must be greater than zero/,
    );
    assert.throws(
        () => runExpression(section811Expression(), {
            documents: [asDocument(projectDescription([{ ...base, cfJ: 0 }]))],
        }),
        /CF_j must be greater than zero/,
    );
});

test('CF_j above 1 is rejected as a physical sanity bound', () => {
    assert.throws(
        () => runExpression(section811Expression(), {
            documents: [asDocument(projectDescription([{
                species: 1, stratum: 1,
                vExJiBsl: 10, vExInfJiBsl: 0, bcefR: 1.4, dJ: 0.6, cfJ: 1.5,
            }]))],
        }),
        /CF_j must not exceed 1/,
    );
});

test('an empty strata list is rejected', () => {
    assert.throws(
        () => runExpression(section811Expression(), { documents: [asDocument(projectDescription([]))] }),
        /at least one species\/stratum combination is required/,
    );
});

test('the output satisfies every field required by the output schema', () => {
    const result = runExpression(section811Expression(), { documents: [asDocument(projectDescription())] });
    for (const key of ['ref', 'year', 'strata', 'totalCHbJiBsl', 'totalCExJiBsl']) {
        assert.ok(key in result, `output missing ${key}`);
    }
    const out = result.strata[0];
    for (const key of ['species', 'stratum', 'vExJiBsl', 'vExInfJiBsl', 'extractedVolume',
        'bcefR', 'dJ', 'cfJ', 'cHbJiBsl', 'cExJiBsl']) {
        assert.ok(key in out, `strata row missing ${key}`);
    }
    assert.ok(out.species >= 1 && out.species <= 3);
    assert.ok(out.stratum >= 1 && out.stratum <= 3);
    assert.ok(out.cfJ > 0 && out.cfJ <= 1);
});
