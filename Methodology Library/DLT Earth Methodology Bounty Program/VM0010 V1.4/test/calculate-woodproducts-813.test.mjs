/**
 * Focused tests for VM0010 v1.4 Section 8.1.3, Equation (11):
 *
 *   dC_WP100,i,p|BSL = SUM_k ( C_WP,i|BSL * OF_k )
 *
 * The expression executed here is read back out of the built VM0010.policy.
 *
 * OF_k fixtures use the Section 9.1 (p. 69) default table, sourced to
 * Winjum, J.K., Brown, S. and Schlamadinger, B. 1998, Forest Science 44:272-284:
 *   Wood Product Class           Boreal  Temperate  Tropical
 *   Sawnwood                       0.39     0.62      0.86
 *   Woodbase panels                 0.62     0.86      0.98
 *   Other industrial roundwood      0.86     0.98      0.99
 *   Paper and paperboard            0.39     0.62      0.99
 *
 * C&C status: NEITHER mandatory 2026 document amends Equation (11) or the
 * Section 9.1 OF table. The 20-year medium-term wood-product decay is applied in
 * Section 8.4, not in Equation (11).
 *
 * C_WP,i|BSL is an input: its derivation is Equation (10), which is not
 * implemented in this slice.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { loadSlicePolicy, walkBlocks, runExpression, asDocument } from './_artifact.mjs';

const { policy } = loadSlicePolicy();

// Section 9.1, p. 69 defaults
const OF_BOREAL = { sawnwood: 0.39, woodbasePanels: 0.62, otherIndustrialRoundwood: 0.86, paperAndPaperboard: 0.39 };
const OF_TEMPERATE = { sawnwood: 0.62, woodbasePanels: 0.86, otherIndustrialRoundwood: 0.98, paperAndPaperboard: 0.62 };
const OF_TROPICAL = { sawnwood: 0.86, woodbasePanels: 0.98, otherIndustrialRoundwood: 0.99, paperAndPaperboard: 0.99 };

function woodProductsExpression() {
    let found = null;
    walkBlocks(policy.config, (node) => {
        if (node.blockType === 'customLogicBlock' && node.outputSchema === '#wood-products-813') {
            found = node.expression;
        }
    });
    assert.ok(found, 'the Section 8.1.3 Eq (11) customLogicBlock must exist in the artifact');
    return found;
}

function projectDescription(woodProducts) {
    return {
        id: 'vm0010-813-test',
        projectName: 'Slice Test Forest',
        monitoringYear: 2026,
        baselineActivity: [{ stratum: 'I', harvestType: 'Selective logging' }],
        fuelInputs: [],
        deadWood: [
            { species: 1, stratum: 1, parcel: 1, cHbJiBsl: 21.5072, cExJiBsl: 9.024, cRsdJiBsl: 0.5, cNotHbInfJiBsl: 0.3 },
        ],
        strata: [
            { species: 1, stratum: 1, vExJiBsl: 30, vExInfJiBsl: 2, bcefR: 1.43, dJ: 0.6, cfJ: 0.47 },
        ],
        woodProducts: woodProducts || [
            {
                stratum: 1,
                parcel: 1,
                cWpJiBsl: 10,
                classes: [
                    { productClass: 'sawnwood', ofK: OF_BOREAL.sawnwood },
                    { productClass: 'woodbasePanels', ofK: OF_BOREAL.woodbasePanels },
                ],
            },
        ],
    };
}

test('the Section 8.1.3 block is wired to the right schema and role', () => {
    let block = null;
    walkBlocks(policy.config, (n) => {
        if (n.blockType === 'customLogicBlock' && n.outputSchema === '#wood-products-813') block = n;
    });
    assert.ok(block, 'policy must contain the Section 8.1.3 Eq (11) customLogicBlock');
    assert.deepEqual(block.permissions, ['Project Proponent']);
    assert.equal(block.documentSigner, 'owner');
    assert.equal(block.onErrorAction, 'stop');
    assert.equal(block.children.length, 1);
    assert.equal(block.children[0].blockType, 'documentsSourceAddon');
    assert.equal(block.children[0].schema, '#project-description');
});

test('Eq (11) sums over k and matches independent hand-computation', () => {
    // C_WP = 10 ; sawnwood OF 0.39 ; woodbase panels OF 0.62  (boreal)
    // 10*0.39 = 3.9 ; 10*0.62 = 6.2 ; sum = 10.1 tC/ha
    const cWp = 10;
    const classes = [
        { productClass: 'sawnwood', ofK: OF_BOREAL.sawnwood },
        { productClass: 'woodbasePanels', ofK: OF_BOREAL.woodbasePanels },
    ];
    const expected = classes.reduce((s, c) => s + cWp * c.ofK, 0);
    assert.ok(Math.abs(expected - 10.1) < 1e-12, `expected ${expected}`);

    const result = runExpression(woodProductsExpression(), {
        documents: [asDocument(projectDescription([{ stratum: 1, parcel: 1, cWpJiBsl: cWp, classes }]))],
    });
    const row = result.rows[0];
    assert.equal(result.ref, 'vm0010-813-test');
    assert.equal(row.cWpJiBsl, 10);
    assert.equal(row.classes.length, 2);
    assert.ok(Math.abs(row.classes[0].termTCo2eHa - 3.9) < 1e-12);
    assert.ok(Math.abs(row.classes[1].termTCo2eHa - 6.2) < 1e-12);
    assert.ok(Math.abs(row.dCWp100JiPBsl - expected) < 1e-12, `dC ${row.dCWp100JiPBsl}`);
    assert.ok(Math.abs(result.totalDCWp100TCo2eHa - expected) < 1e-12);
});

test('the summation is present, not a single-term product', () => {
    // Guards against silently implementing C_WP * OF instead of SUM_k (C_WP * OF_k).
    const cWp = 10;
    const classes = [
        { productClass: 'sawnwood', ofK: 0.39 },
        { productClass: 'woodbasePanels', ofK: 0.62 },
    ];
    const result = runExpression(woodProductsExpression(), {
        documents: [asDocument(projectDescription([{ stratum: 1, parcel: 1, cWpJiBsl: cWp, classes }]))],
    });
    const row = result.rows[0];
    const singleTerm = cWp * classes[0].ofK;                 // 3.9
    const summed = cWp * (classes[0].ofK + classes[1].ofK); // 10.1
    assert.notEqual(row.dCWp100JiPBsl, singleTerm, 'must not equal the first term alone');
    assert.ok(Math.abs(row.dCWp100JiPBsl - summed) < 1e-12);
});

test('no decay is applied at Equation (11)', () => {
    // The 20-year linear decay is applied in Section 8.4, not Equation (11).
    const result = runExpression(woodProductsExpression(), { documents: [asDocument(projectDescription())] });
    const row = result.rows[0];
    const summed = row.classes.reduce((s, c) => s + c.termTCo2eHa, 0);
    assert.ok(Math.abs(row.dCWp100JiPBsl - summed) < 1e-12, 'result must be the undiscounted sum');
});

test('all four Section 9.1 product classes are supported with tabulated defaults', () => {
    const all = [
        { productClass: 'sawnwood', ofK: OF_TROPICAL.sawnwood },
        { productClass: 'woodbasePanels', ofK: OF_TROPICAL.woodbasePanels },
        { productClass: 'otherIndustrialRoundwood', ofK: OF_TROPICAL.otherIndustrialRoundwood },
        { productClass: 'paperAndPaperboard', ofK: OF_TROPICAL.paperAndPaperboard },
    ];
    const cWp = 4;
    const result = runExpression(woodProductsExpression(), {
        documents: [asDocument(projectDescription([{ stratum: 1, parcel: 1, cWpJiBsl: cWp, classes: all }]))],
    });
    const expected = all.reduce((s, c) => s + cWp * c.ofK, 0);
    assert.equal(result.rows[0].classes.length, 4);
    assert.ok(Math.abs(result.rows[0].dCWp100JiPBsl - expected) < 1e-12);
});

test('representative OF values across all three forest regions are honoured', () => {
    const cases = [
        ['boreal', OF_BOREAL],
        ['temperate', OF_TEMPERATE],
        ['tropical', OF_TROPICAL],
    ];
    for (const [region, table] of cases) {
        const classes = [
            { productClass: 'sawnwood', ofK: table.sawnwood },
            { productClass: 'paperAndPaperboard', ofK: table.paperAndPaperboard },
        ];
        const cWp = 5;
        const result = runExpression(woodProductsExpression(), {
            documents: [asDocument(projectDescription([{ stratum: 1, parcel: 1, cWpJiBsl: cWp, classes }]))],
        });
        const expected = classes.reduce((s, c) => s + cWp * c.ofK, 0);
        assert.ok(
            Math.abs(result.rows[0].dCWp100JiPBsl - expected) < 1e-12,
            `${region}: expected ${expected}, got ${result.rows[0].dCWp100JiPBsl}`,
        );
    }
});

test('boundary OF values are accepted; out-of-range and unknown classes rejected', () => {
    // OF = 0 and OF = 1 are the natural bounds of a fraction
    for (const ofK of [0, 1]) {
        const result = runExpression(woodProductsExpression(), {
            documents: [asDocument(projectDescription([{
                stratum: 1, parcel: 1, cWpJiBsl: 10,
                classes: [{ productClass: 'sawnwood', ofK }],
            }]))],
        });
        assert.equal(result.rows[0].dCWp100JiPBsl, 10 * ofK);
    }

    // above 1
    assert.throws(
        () => runExpression(woodProductsExpression(), {
            documents: [asDocument(projectDescription([{
                stratum: 1, parcel: 1, cWpJiBsl: 10,
                classes: [{ productClass: 'sawnwood', ofK: 1.2 }],
            }]))],
        }),
        /must be between 0 and 1/,
    );

    // negative
    assert.throws(
        () => runExpression(woodProductsExpression(), {
            documents: [asDocument(projectDescription([{
                stratum: 1, parcel: 1, cWpJiBsl: 10,
                classes: [{ productClass: 'sawnwood', ofK: -0.1 }],
            }]))],
        }),
        /must be between 0 and 1/,
    );

    // above the Section 9.1 tabulated regional maximum for that class is still
    // permitted: the methodology states those values as defaults and allows
    // project-specific data selection, so no cap is imposed here.
    const aboveTabulated = runExpression(woodProductsExpression(), {
        documents: [asDocument(projectDescription([{
            stratum: 1, parcel: 1, cWpJiBsl: 10,
            classes: [{ productClass: 'sawnwood', ofK: 0.95 }],
        }]))],
    });
    assert.equal(aboveTabulated.rows[0].dCWp100JiPBsl, 9.5);
    assert.equal(
        JSON.stringify(aboveTabulated.rows[0].classes[0].section91Defaults),
        JSON.stringify({ boreal: 0.39, temperate: 0.62, tropical: 0.86 }),
        'the Section 9.1 defaults are reported for traceability',
    );

    // unknown class
    assert.throws(
        () => runExpression(woodProductsExpression(), {
            documents: [asDocument(projectDescription([{
                stratum: 1, parcel: 1, cWpJiBsl: 10,
                classes: [{ productClass: 'other', ofK: 0.5 }],
            }]))],
        }),
        /unknown wood product class other/,
    );
});

test('zero C_WP yields zero wood product sequestration', () => {
    const result = runExpression(woodProductsExpression(), {
        documents: [asDocument(projectDescription([{
            stratum: 1, parcel: 1, cWpJiBsl: 0,
            classes: [{ productClass: 'sawnwood', ofK: OF_TEMPERATE.sawnwood }],
        }]))],
    });
    assert.equal(result.rows[0].dCWp100JiPBsl, 0);
    assert.equal(result.totalDCWp100TCo2eHa, 0);
});

test('index and collection errors are rejected', () => {
    const base = { cWpJiBsl: 10, classes: [{ productClass: 'sawnwood', ofK: 0.39 }] };

    for (const bad of [0, 4, -1, 2.5]) {
        assert.throws(
            () => runExpression(woodProductsExpression(), {
                documents: [asDocument(projectDescription([{ ...base, stratum: bad, parcel: 1 }]))],
            }),
            /stratum i must be 1, 2 or 3/,
            `stratum ${bad} must be rejected`,
        );
    }

    // p runs 1..P, so it is only bounded below
    for (const bad of [0, -1, 1.5]) {
        assert.throws(
            () => runExpression(woodProductsExpression(), {
                documents: [asDocument(projectDescription([{ ...base, stratum: 1, parcel: bad }]))],
            }),
            /land parcel p must be a positive integer/,
            `parcel ${bad} must be rejected`,
        );
    }
    const largeParcel = runExpression(woodProductsExpression(), {
        documents: [asDocument(projectDescription([{ ...base, stratum: 1, parcel: 250 }]))],
    });
    assert.equal(largeParcel.rows[0].parcel, 250, 'p may exceed 3');

    assert.throws(
        () => runExpression(woodProductsExpression(), {
            documents: [asDocument(projectDescription([{ ...base, cWpJiBsl: -1, stratum: 1, parcel: 1 }]))],
        }),
        /C_WP,i\|BSL must be greater than or equal to zero/,
    );

    assert.throws(
        () => runExpression(woodProductsExpression(), {
            documents: [asDocument(projectDescription([{ stratum: 1, parcel: 1, cWpJiBsl: 10, classes: [] }]))],
        }),
        /at least one wood product class is required/,
    );

    assert.throws(
        () => runExpression(woodProductsExpression(), { documents: [asDocument(projectDescription([]))] }),
        /at least one stratum\/parcel combination is required/,
    );
});

test('multiple strata and parcels are summed', () => {
    const rows = [
        { stratum: 1, parcel: 1, cWpJiBsl: 10, classes: [{ productClass: 'sawnwood', ofK: 0.39 }] },
        { stratum: 2, parcel: 2, cWpJiBsl: 6, classes: [{ productClass: 'paperAndPaperboard', ofK: 0.62 }] },
    ];
    const result = runExpression(woodProductsExpression(), {
        documents: [asDocument(projectDescription(rows))],
    });
    const expected = rows.reduce(
        (s, r) => s + r.cWpJiBsl * r.classes.reduce((a, c) => a + c.ofK, 0), 0,
    );
    assert.equal(result.rows.length, 2);
    assert.ok(Math.abs(result.totalDCWp100TCo2eHa - expected) < 1e-12);
});

test('the output satisfies every field required by the output schema', () => {
    const result = runExpression(woodProductsExpression(), { documents: [asDocument(projectDescription())] });
    for (const key of ['ref', 'year', 'rows', 'totalDCWp100TCo2eHa']) {
        assert.ok(key in result, `output missing ${key}`);
    }
    const row = result.rows[0];
    for (const key of ['stratum', 'parcel', 'cWpJiBsl', 'classes', 'dCWp100JiPBsl']) {
        assert.ok(key in row, `row missing ${key}`);
    }
    for (const c of row.classes) {
        for (const key of ['productClass', 'ofK', 'termTCo2eHa']) {
            assert.ok(key in c, `class term missing ${key}`);
        }
        assert.ok(c.ofK >= 0 && c.ofK <= 1);
    }
});
