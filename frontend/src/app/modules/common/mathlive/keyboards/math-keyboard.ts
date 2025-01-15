export const mathKeyboard = {
    label: "math",
    tooltip: "Math",
    rows: [
        [
            {
                latex: "+",
                shift: "\\oplus",
                variants: [
                    { latex: "+" },
                    { latex: "\\oplus" },
                ]
            },
            {
                latex: "-",
                shift: "\\pm",
                variants: [
                    { latex: "-", },
                    { latex: "\\pm" },
                    { latex: "\\ominus" },
                ]
            },
            {
                latex: "\\times",
                shift: "\\otimes",
                variants: [
                    { latex: "\\times" },
                    { latex: "\\otimes" },
                    { latex: "\\cdot" },
                ]
            },
            {
                latex: "\\frac{#@}{#?}",
                shift: "\\%",
                variants: [
                    { latex: "\\frac{#@}{#?}" },
                    { latex: "/" },
                    { latex: "\\div" },
                    { latex: "\\%" },
                    { latex: "\\oslash" },
                ]
            },
            {
                latex: "=",
                shift: "\\neq",
                variants: [
                    { latex: "=" },
                    { latex: "\\neq" },
                    { latex: "\\equiv" },
                    { latex: "\\varpropto" },
                    { latex: "\\thickapprox" },
                    { latex: "\\lt" },
                    { latex: "\\gt" },
                    { latex: "\\le" },
                    { latex: "\\ge" },
                ]
            },
            {
                latex: ".",
                shift: ",",
                variants: [
                    { latex: "." },
                    { latex: "," },
                    { latex: ";" },
                    { latex: "\\colon" },
                    { latex: "\\Colon" },
                    { latex: "?" },
                    { latex: "\\cdotp" },
                    { latex: "\\ldots" },
                    { latex: "\\cdots" },
                    { latex: "\\therefore" },
                    { latex: "\\because" },
                    { latex: "\\Colon:" },
                    { latex: "\\vdots" },
                    { latex: "\\ddots" },
                    { latex: "\\ldotp" },
                ]
            },
            {
                latex: "(",
                shift: "\\lbrack",
                variants: [
                    { latex: "(" },
                    { latex: "\\lbrack" },
                    { latex: "\\langle" },
                    { latex: "\\lfloor" },
                    { latex: "\\lceil" },
                    { latex: "\\lbrace" },
                ]
            },
            {
                latex: ")",
                shift: "\\rbrack",
                variants: [
                    { latex: ")" },
                    { latex: "\\rbrack" },
                    { latex: "\\rangle" },
                    { latex: "\\rfloor" },
                    { latex: "\\rceil" },
                    { latex: "\\rbrace" },
                ]
            },
            "\\sqrt{#0}",
            "#0^2",
        ],
        [
            "#@^{#?}",
            "#@_{#?}",
            "|#0|",
            "\\sqrt[#0]{#0}",
            {
                class: 'small',
                latex: "\\log_{#0}#0",
                shift: "\\ln",
                variants: [
                    { class: 'small', latex: "\\log_{#0}#0" },
                    { class: 'small', latex: "\\ln#0" },
                    { class: 'small', latex: "\\log_{10}#0" },
                ]
            },
            {
                latex: "\\exponentialE",
                shift: "\\exp",
                variants: [
                    { class: 'small', latex: "\\exponentialE" },
                    { class: 'small', latex: "\\exp\\left(#0\\right)" },
                    { class: 'small', latex: "\\times10^{#0}" },
                ]
            },
            "\\lim_{#0}",
            {
                class: 'small',
                latex: "\\sum_{#0}^{#0}#0",
                shift: "\\Sigma",
                variants: [
                    { class: 'small', latex: "\\sum_{#0}^{#0}#0" },
                    { class: 'small', latex: "\\sum #0" },
                ]
            },
            {
                class: 'small',
                latex: "\\prod_{#0}^{#0}#0",
                shift: "\\Pi",
                variants: [
                    { class: 'small', latex: "\\prod_{#0}^{#0}#0", },
                    { class: 'small', latex: "\\prod#0", },
                ]
            },
            {
                class: 'small',
                latex: "\\int_{#0}^{#0}#0",
                shift: "\\smallint",
                variants: [
                    { class: 'small', latex: "\\int_{#0}^{#0}#0" },
                    { class: 'small', latex: "\\int#0" },
                    { class: 'small', latex: "\\iint #0" },
                    { class: 'small', latex: "\\iiint#0" },
                    { class: 'small', latex: "\\oint#0" },
                    { class: 'small', latex: "\\intclockwise#0" },
                    { class: 'small', latex: "\\varointclockwise#0" },
                    { class: 'small', latex: "\\ointctrclockwise#0" },
                    { class: 'small', latex: "\\intctrclockwise#0" },
                    { class: 'small', latex: "\\oiint#0" },
                    { class: 'small', latex: "\\oiiint#0" },
                ]
            },
        ],
        [
            {
                latex: "\\overrightarrow{#@}",
                shift: "\\overleftarrow{#@}",
                variants: [
                    { latex: "\\overrightarrow{#@}" },
                    { latex: "\\overleftarrow{#@}" },
                    { latex: "\\underleftarrow{#@}" },
                    { latex: "\\underrightarrow{#@}" },
                    { latex: "\\overleftrightarrow{#@}" },
                    { latex: "\\underleftrightarrow{#@}" },
                ]
            },
            {
                latex: "\\overline{#@}",
                shift: "\\underline{#@}",
                variants: [
                    { latex: "\\overline{#@}" },
                    { latex: "\\underline{#@}" },
                    { latex: "\\tilde{#@}" },
                    { latex: "\\grave{#@}" },
                    { latex: "\\dot{#@}" },
                    { latex: "\\ddot{#@}" },
                    { latex: "\\mathring{#@}" },
                    { latex: "\\breve{#@}" },
                    { latex: "\\acute{#@}" },
                    { latex: "\\bar{#@}" },
                    { latex: "\\vec{#@}" },
                    { latex: "\\hat{#@}" },
                    { latex: "\\check{#@}" },
                    { latex: "\\undergroup{#@}" },
                    { latex: "\\overgroup{#@}" },
                    { latex: "\\underbrace{#@}" },
                    { latex: "\\overbrace{#@}" },
                    { latex: "\\overlinesegment{#@}" },
                    { latex: "\\underlinesegment{#@}" },
                ]
            },
            {
                latex: "#@^{\\prime}",
                shift: "#@^{\\doubleprime}",
                variants: [
                    { latex: "#@^{\\prime}" },
                    { latex: "#@^{\\doubleprime}" },
                    { latex: "#@\\degree" },
                ]
            },
            {
                class: 'small',
                latex: "\\mathrm{abs}\\left(#0\\right)",
            },
            {
                latex: "\\cup",
                shift: "\\cap",
                variants: [
                    { latex: "\\cup" },
                    { latex: "\\cap" },
                    { latex: "\\subset" },
                    { latex: "\\subseteq" },
                    { latex: "\\subsetneq" },
                    { latex: "\\varsubsetneq" },
                    { latex: "\\subsetneqq" },
                    { latex: "\\nsubset" },
                    { latex: "\\nsubseteq" },
                    { latex: "\\supset" },
                    { latex: "\\supseteq" },
                    { latex: "\\supsetneq" },
                    { latex: "\\supsetneqq" },
                    { latex: "\\nsupset" },
                    { latex: "\\nsupseteq" },
                ]
            },

            {
                latex: "\\exists",
                shift: "\\forall",
                variants: [
                    { latex: "\\exists" },
                    { latex: "\\nexists" },
                    { latex: "\\forall" },
                    { latex: "\\lnot" },
                    { latex: "\\land" },
                    { latex: "\\lor" },
                    { latex: "\\oplus" },
                    { latex: "\\downarrow" },
                    { latex: "\\uparrow" },
                    { latex: "\\curlywedge" },
                    { latex: "\\bar{\\curlywedge}" },
                    { latex: "\\in" },
                    { latex: "\\owns" },
                    { latex: "\\notin" },
                    { latex: "\\ni" },
                    { latex: "\\not\\owns" },
                ]
            },
            {
                latex: "\\rightarrow",
                shift: "\\larr",
                variants: [
                    { latex: "\\rightarrow" },
                    { latex: "\\implies" },
                    { latex: "\\to" },
                    { latex: "\\dashv" },
                    { latex: "\\roundimplies" },
                    { latex: "\\larr" },
                    { latex: "\\impliedby" },
                    { latex: "\\gets" },
                    { latex: "\\lArr" },
                    { latex: "\\vdash" },
                    { latex: "\\models" },
                    { latex: "\\in" },
                    { latex: "\\lrArr" },
                    { latex: "\\iff" },
                    { latex: "\\leftrightarrow" },
                    { latex: "\\leftrightarrows" },
                    { latex: "\\Leftrightarrow" },
                    { latex: "^{\\biconditional}" },
                ]
            },
            {
                latex: "\\infty",
                shift: "\\omega",
                variants: [
                    { latex: "\\infty" },
                    { latex: "\\aleph_0" },
                    { latex: "\\aleph_1" },
                    { latex: "\\omega" },
                    { latex: "\\mathfrak{m}" },
                ]
            },
            {
                latex: "\\imaginaryI",
                shift: "\\Re",
                variants: [
                    { latex: "\\Re" },
                    { latex: "\\Im" },
                    { latex: "\\imaginaryJ" },
                    { latex: "\\imaginaryI" },
                    { latex: "\\Vert#0\\Vert" },
                ]
            },
            {
                latex: "\\mathrm{d}#0",
                shift: "\\partial",
                variants: [
                    { latex: "\\mathrm{d}#0" },
                    { latex: "\\dfrac{\\mathrm{d}}{\\mathrm{d}#0}" },
                    { latex: "\\frac{\\partial}{\\partial #0}" },
                    { latex: "\\mathrm{d}" },
                    { latex: "\\partial" },
                ]
            },
        ],
        [
            {
                latex: "\\sin",
                shift: "\\sin^{-1}",
                variants: [
                    { class: 'small', latex: "\\sin" },
                    { class: 'small', latex: "\\sinh" },
                    { class: 'small', latex: "\\sin^{-1}" },
                    { class: 'small', latex: "\\arsinh" },
                ]
            },
            {
                latex: "\\cos",
                shift: "\\cos^{-1}",
                variants: [
                    { class: 'small', latex: "\\cos" },
                    { class: 'small', latex: "\\cosh" },
                    { class: 'small', latex: "\\cos^{-1}" },
                    { class: 'small', latex: "\\arcosh" },
                ]
            },
            {
                latex: "\\tan",
                shift: "\\tan^{-1}",
                variants: [
                    { class: 'small', latex: "\\tan" },
                    { class: 'small', latex: "\\tg" },
                    { class: 'small', latex: "\\tan^{-1}" },
                    { class: 'small', latex: "\\tanh" },
                    { class: 'small', latex: "\\artanh" },
                    { class: 'small', latex: "\\arctan" },
                    { class: 'small', latex: "\\arctg" },
                    { class: 'small', latex: "\\cot" },
                ]
            },
            "\\Delta",
            {
                latex: "\\pi",
                shift: "\\tau",
                variants: [
                    { latex: "\\pi" },
                    { latex: "\\tau" },
                    { latex: "\\rho" },
                    { latex: "\\theta" },
                ]
            },
            {
                latex: "f(#0)",
                shift: "x_{i}",
                variants: [
                    { class: 'small', latex: "f(#0)" },
                    { class: 'small', latex: "g(#0)" },
                    { latex: "x^{n}" },
                    { latex: "x^{#0}" },
                    { latex: "x_{n}" },
                    { latex: "x_{i}" },
                    { latex: "x_{#0}" },
                ]
            },

            {
                latex: "#@_{i}",
                shift: "#@^{n}",
                variants: [
                    { latex: "#@_{i}" },
                    { latex: "#@_{n}" },
                    { latex: "#@^{n}" },
                    { latex: "#@_{ij}" },
                    { latex: "#@_{t}" },
                ]
            },
            {
                latex: "\\text{\\_}",
                shift: "\\circ",
                variants: [
                    { latex: "\\ast" },
                    { latex: "\\circ" },
                    { latex: "\\bigcirc" },
                    { latex: "\\bullet" },
                    { latex: "\\odot" },
                    { latex: "\\oslash" },
                    { latex: "\\circledcirc" },
                    { latex: "\\star" },
                    { latex: "\\times" },
                    { latex: "\\doteq" },
                    { latex: "\\doteqdot" },
                ]
            },
            {
                latex: '+',
                class: 'action',
                command: ['performWithFeedback', 'addRowAfter'],
            },
            {
                label: "Text",
                class: 'action',
                command: ['switchMode', 'text'],
                shift: {
                    label: "Math",
                    class: 'small action',
                    command: ['switchMode', 'math'],
                },
                variants: [
                    {
                        label: "Text",
                        class: 'small',
                        command: ['switchMode', 'text'],
                    },
                    {
                        label: "Math",
                        class: 'small',
                        command: ['switchMode', 'math'],
                    },
                    {
                        label: "LaTeX",
                        class: 'small',
                        command: ['switchMode', 'latex'],
                    },
                ]
            },
        ]
    ]
};