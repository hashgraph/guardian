const fs=require('fs');const [pj,pdp,mrp]=process.argv.slice(2);const P=JSON.parse(fs.readFileSync(pj));const code={};(function w(b){if(b.blockType==='mathBlock')code[b.tag]=b.expression.code;(b.children||[]).forEach(w)})(P.config);
const pd=JSON.parse(fs.readFileSync(pdp)),mr=JSON.parse(fs.readFileSync(mrp));
const a=new Function('document','relationships','scope','result',code.pp_err_calculation_pd_vcs_ex_ante)(pd,[],undefined,{});
const b=new Function('document','relationships','scope','result',code.pp_err_calculation_mr_vcs_ex_post)(mr,[{document:pd}],undefined,{});
console.log(JSON.stringify({pd:{rows:a.ex_ante.rows.map(r=>({vs:r.vintageStart,ve:r.vintageEnd,BE:r.BE,PE:r.PE,LE:r.LE,ER:r.reductions})),total:a.ex_ante.ER_total},mr:{BE:b.ex_post.BE_total,PE:b.ex_post.PE_total,ER:b.ER_final_total,exA:b.ex_post.exAnteER_period,pct:b.ex_post.pctDifference,ps:b.ex_post.periodStart,pe:b.ex_post.periodEnd}}));
