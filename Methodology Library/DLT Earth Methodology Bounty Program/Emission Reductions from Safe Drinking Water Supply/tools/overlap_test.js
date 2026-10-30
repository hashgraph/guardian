const fs=require('fs');const P=JSON.parse(fs.readFileSync(process.argv[2]));let code;
(function w(b){if(b.tag==='admin_mr_period_overlap_check')code=b.expression;(b.children||[]).forEach(w)})(P.config);
const mk=(id,proj,s,e,st)=>({id,option:{status:st},document:{credentialSubject:[{projectRef:proj,monitoringPeriodStart:s,monitoringPeriodEnd:e,mrId:id}]}});
const run=(doc,sources)=>{let out='passed';try{new Function('documents','sources','done',code)([doc],sources,()=>{})}catch(e){out='BLOCKED: '+e.message.slice(0,90)}return out};
const A=mk('mr1','P1','2027-01-01','2027-12-31','Registry approved');
const cases=[
 ['next year, adjacent',            mk('mr2','P1','2028-01-01','2028-12-31'),[A]],
 ['overlaps by one day',            mk('mr2','P1','2027-12-31','2028-12-31'),[A]],
 ['inside the approved period',     mk('mr2','P1','2027-03-01','2027-06-30'),[A]],
 ['same dates, other project',      mk('mr2','P2','2027-01-01','2027-12-31'),[A]],
 ['overlap with a rejected MR',     mk('mr2','P1','2027-01-01','2027-12-31'),[mk('mr0','P1','2027-01-01','2027-12-31','Registry rejected')]],
 ['re-approving the same MR',       mk('mr1','P1','2027-01-01','2027-12-31'),[A]],
 ['end before start',               mk('mr2','P1','2028-12-31','2028-01-01'),[A]],
 ['first MR, no sources',           mk('mr2','P1','2027-01-01','2027-12-31'),[]],
];
for(const [n,d,s] of cases) console.log(n.padEnd(32),run(d,s));
