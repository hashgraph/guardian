// run-fixture.js - runs a single SMEC v4.0 ER fixture through the policy's
// pp_er_calcs customLogicBlock locally, without standing up a Guardian instance.
//
// Usage:
//   node run-fixture.js <path-to-pp_er_calcs.js> <path-to-fixture.json>
//
// Where:
//   <pp_er_calcs.js>  is the JavaScript expression body of the
//                     `pp_er_calcs` customLogicBlock from the policy.
//                     Extract it from the policy zip's policy.json (search
//                     for tag: "pp_er_calcs", read the "expression" field).
//   <fixture.json>    is one of the T*.json fixtures in this folder.
//
// Example:
//   node run-fixture.js ./pp_er_calcs.js ./T1_optB_shortlived_2026.json

const fs = require('fs');

if (process.argv.length < 4) {
    console.error('Usage: node run-fixture.js <pp_er_calcs.js> <fixture.json>');
    process.exit(1);
}

const blockSrc = fs.readFileSync(process.argv[2], 'utf8');
const fx = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const expected = fx._provenance && fx._provenance.expected_emission_reduction;
delete fx._provenance;

const documents = [{ document: { credentialSubject: [fx] } }];
let captured = null;
const fn = new Function('documents', 'sources', 'done', 'debug', blockSrc + '\n');

try {
    fn(documents, [], (r) => { captured = r; }, () => {});
} catch (e) {
    console.error('CALC ERROR:', e.message);
    process.exit(1);
}

const er = (captured && captured.emission_reduction) || {};

console.log('Method:    ', fx.methodology_method);
console.log('Period:    ', fx.monitoring_period && fx.monitoring_period.from, '->', fx.monitoring_period && fx.monitoring_period.to);
console.log('-----------');
console.log('BE_unadj_y =', er.be_unadj_y, 'tCO2e');
console.log('BE_y       =', er.be_y, 'tCO2e (crediting baseline)');
console.log('AE_y       =', er.ae_y, 'tCO2e');
console.log('LE_y       =', er.le_y, 'tCO2e');
console.log('HE_ind     =', er.he_ind);
console.log('ER_y       =', er.er_y, 'tCO2e');
if (er.threshold_justification_required !== undefined)
    console.log('Threshold justification required:', er.threshold_justification_required);

if (expected) {
    const keys = Object.keys(expected);
    const bad = keys.filter((k) => JSON.stringify(er[k]) !== JSON.stringify(expected[k]));
    console.log('-----------');
    if (bad.length === 0) {
        console.log('EXPECTED-VALUE CHECK: PASS (' + keys.length + ' fields byte-identical)');
    } else {
        console.log('EXPECTED-VALUE CHECK: FAIL on', bad.join(', '));
        process.exit(1);
    }
}
