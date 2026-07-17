// run-fixture.js — runs a single ER fixture through the policy's pp_er_calcs
// JavaScript block locally, without standing up a Guardian instance.
//
// Usage:
//   node run-fixture.js <path-to-pp_er_calcs.js> <path-to-fixture.json>
//
// Where:
//   <pp_er_calcs.js>  is the JavaScript expression body of the
//                     `pp_er_calcs` customLogicBlock from the policy.
//                     Extract it from the policy zip's policy.json (search
//                     for tag: "pp_er_calcs", read the "expression" field),
//                     or use the patched version from /docs/gold-standard.
//   <fixture.json>    is one of the *.json fixtures in this folder.
//
// Example:
//   node run-fixture.js ./pp_er_calcs.js ./atec-gs11817-m2-electric.json

const fs = require('fs');

if (process.argv.length < 4) {
    console.error('Usage: node run-fixture.js <pp_er_calcs.js> <fixture.json>');
    process.exit(1);
}

const blockSrc = fs.readFileSync(process.argv[2], 'utf8');
const cs = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
delete cs._provenance;
if (cs.case3) delete cs.case3._units_note;

const documents = [{ document: { credentialSubject: [cs] } }];
let captured = null;
const fn = new Function('documents', 'sources', 'done', 'debug', blockSrc + '\n');

try {
    fn(documents, [], (r) => { captured = r; }, () => {});
} catch (e) {
    console.error('CALC ERROR:', e.message);
    process.exit(1);
}

const er = (captured && captured.emission_reduction) || {};
const nDevices = cs.leakage_emission?.n_disseminated_y || 0;

console.log('Method:    ', cs.methodology_method);
console.log('Period:    ', cs.monitoring_period?.from, '→', cs.monitoring_period?.to);
console.log('Devices:   ', nDevices);
console.log('-----------');
console.log('BE_unadj_y =', er.be_unadj_y, 'tCO2e');
console.log('BE_y       =', er.be_y,       'tCO2e (after conservativeness)');
console.log('AE_y       =', er.ae_y,       'tCO2e');
console.log('LE_y       =', er.le_y,       'tCO2e (embodied + market)');
console.log('-----------');
console.log('ER_y       =', er.er_y,       'tCO2e');
if (nDevices && er.er_y) {
    console.log('per-stove  =', (er.er_y / nDevices).toFixed(4), 'tCO2e/stove/yr');
}
