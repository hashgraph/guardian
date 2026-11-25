import json,sys,re
T=sys.argv[1]; P=json.load(open(T+'/policy.json'))
R=lambda n:'\\mathrm{'+n+'}'
ECB=f"\\mathrm{{Boole}}\\left({R('EGP')} > 0\\right) \\times \\min\\left({R('ECG')}, \\frac{{{R('EGP')}}}{{1 + {R('TDLB')}}}\\right)"
F={
 'fnIEShare':(['Hi','Hs'],f"\\frac{{{R('Hi')}}}{{{R('Hs')}}}","VMR0015 s9.3(1): share of surveyed households that use the purified water for the interactive-effects case (H_ie / H_surveyed); BE of the affected section is reduced in proportion"),
 'fnPELoad':(['ECG','EFA','TDLA','EGP','TDLB','EFB'],f"\\left({R('ECG')} - {ECB}\\right) \\times {R('EFA')} \\times (1 + {R('TDLA')}) + {ECB} \\times {R('EFB')} \\times (1 + {R('TDLB')})","VT0010 v1.1 Eq.(5), (7)-(9) for one load L: EC_PE,B = MIN(EC_Grid,L ; EG_PBWA/(1+TDL_PE,B)) when EG_PBWA > 0, else 0; PE = (EC_Grid,L - EC_PE,B) x EF_PE,A,L x (1+TDL_PE,A,L) + EC_PE,B x EF_PE,B x (1+TDL_PE,B)"),
 'fnPEFFRow':(['FC','COEF'],f"{R('FC')} \\times {R('COEF')}","TOOL03 Eq.(1) for one fuel i and source j: FC_i,j,y x COEF_i,y"),
 'fnQPWSample':(['Vs','Nin','Ns'],f"\\frac{{{R('Vs')} \\times {R('Nin')}}}{{{R('Ns')}}}","AMS-III.AV table 10(a), continuous metering of a statistically valid sample: QPW of the section = metered volume x appliances in service / appliances metered"),
 'fnQPWRepr':(['Vr','ADs','ADin'],f"\\frac{{{R('Vr')}}}{{{R('ADs')}}} \\times {R('ADin')}","AMS-III.AV table 10(a), metering of a sample over a representative period: QPW of the section = metered volume / metered appliance-days x appliance-days in service"),
 'fnWACC':(['re','We','rd','Tc','Wd'],f"{R('re')} \\times {R('We')} + {R('rd')} \\times (1 - {R('Tc')}) \\times {R('Wd')}","VT0008 v1.0 A2.3 eq.(1): WACC = r_e x W_e + r_d x (1 - T_c) x W_d"),
}
def walk(b):
    if b.get('blockType')=='mathBlock':
        e=b['expression']; code=e['code']
        g=[x for x in e['formulas'] if x['name'].startswith('VMR0015 / AMS-III.AV core equations')][0]
        have={i['name'] for i in g['items']}
        for n,(ps,body,d) in F.items():
            if n in code and n not in have:
                g['items'].append({'type':'function','name':n,'params':ps,'body':body,'relationships':[],'description':d}); print(b['tag'],'+',n)
        for grp in e['formulas']:
            for it in grp['items']:
                if it['name']=='eqECPEB':
                    it['body']="\\mathrm{Boole}\\left(\\mathrm{EGPBWA} > 0\\right) \\times \\min\\left(\\mathrm{ECGrid}, \\frac{\\mathrm{EGPBWA}}{1 + \\mathrm{TDLPEB}}\\right)"
                    it['relationships']=['Boole','ECGrid','EGPBWA','TDLPEB']
                    it['description']='VT0010 v1.1 Eq.(9): EC_PE,B = MIN(sum EC_Grid,L ; EG_PBWA/(1+TDL_PE,B)) when electricity is supplied under a purpose-built wheeling arrangement (EG_PBWA > 0); otherwise 0 (no typed fallback: VT0010 gives none)'
                    print(b['tag'],'eqECPEB updated')
    for c in b.get('children',[]): walk(c)
walk(P['config']); json.dump(P,open(T+'/policy.json','w'),ensure_ascii=False)

# fnPELoad was first declared with Boole/min; Guardian's compute engine cannot assign that body, and math-context.js then drops every later
# function (one try block). Final form: Eq.(5)+(8) only, with EC_PE,A and EC_PE,B computed in the code (Eq.(7), (9)). See formulas_check.mjs.
