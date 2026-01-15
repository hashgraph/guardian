export const evaluateKeyboard = {
    label: "Math",
    tooltip: "Math",
    rows: [
        [
            {
                latex: "+",
                variants: [
                    { latex: "+" }
                ]
            },
            {
                latex: "-",
                variants: [
                    { latex: "-" }
                ]
            },
            {
                latex: "\\times",
                variants: [
                    { latex: "\\times" },
                    { latex: "\\cdot" },
                ]
            },
            {
                latex: "\\frac{#@}{#?}",
                shift: "\\%",
                variants: [
                    { latex: "\\frac{#@}{#?}" },
                    { latex: "\\%" },
                ]
            },
            {
                latex: "=",
                variants: [
                    { latex: "=" }
                ]
            },
            {
                latex: "(",
                variants: [
                    { latex: "(" }
                ]
            },
            {
                latex: ")",
                variants: [
                    { latex: ")" }
                ]
            },
            "#@^2",
            "\\sqrt{#0}"
        ],
        [
            "#@^{#?}",
            "#@_{#?}",
            "|#0|",
            "\\sqrt[#0]{#0}",
            {
                class: "small",
                latex: "\\mathrm{Len}\\left(#0\\right)",
                insert: "\\mathrm{Length}\\left(#0\\right)",
            },
            {
                class: "small",
                latex: "\\sum_{#0}^{#0}#0",
                variants: [
                    { class: "small", latex: "\\sum_{#0}^{#0}#0" },
                    { class: "small", latex: "\\sum #0" },
                    {
                        class: "small",
                        latex: "\\sum_{i=1}^{N}#0",
                        insert: "\\sum_{#0=1}^{\\mathrm{Length}\\left(#0\\right)}#0"
                    },
                ]
            },
            {
                class: "small",
                latex: "\\prod_{#0}^{#0}#0",
                variants: [
                    { class: "small", latex: "\\prod_{#0}^{#0}#0", },
                    { class: "small", latex: "\\prod#0", },
                ]
            },
            {
                class: "small",
                latex: "\\int_{#0}^{#0}#0",
                variants: [
                    { class: "small", latex: "\\int_{#0}^{#0}#0" }
                ]
            },
            {
                latex: "\\mathrm{d}#0",
                variants: [
                    { latex: "\\mathrm{d}#0" },
                    { latex: "\\dfrac{\\mathrm{d}}{\\mathrm{d}#0}" }
                ]
            }
        ],
        [
            {
                latex: "\\sin",
                shift: "\\sin^{-1}",
                variants: [
                    { class: "small", latex: "\\sin" },
                    { class: "small", latex: "\\sinh" },
                    { class: "small", latex: "\\sin^{-1}" },
                    { class: "small", latex: "\\arsinh" },
                ]
            },
            {
                latex: "\\cos",
                shift: "\\cos^{-1}",
                variants: [
                    { class: "small", latex: "\\cos" },
                    { class: "small", latex: "\\cosh" },
                    { class: "small", latex: "\\cos^{-1}" },
                    { class: "small", latex: "\\arcosh" },
                ]
            },
            {
                latex: "\\tan",
                shift: "\\tan^{-1}",
                variants: [
                    { class: "small", latex: "\\tan" },
                    { class: "small", latex: "\\tg" },
                    { class: "small", latex: "\\tan^{-1}" },
                    { class: "small", latex: "\\tanh" },
                    { class: "small", latex: "\\artanh" },
                    { class: "small", latex: "\\arctan" },
                    { class: "small", latex: "\\arctg" },
                    { class: "small", latex: "\\cot" },
                ]
            },
            {
                latex: "\\pi",
                variants: [
                    { latex: "\\pi" },
                ]
            },
            {
                class: "small",
                latex: "\\log_{#0}#0",
                shift: "\\ln",
                variants: [
                    { class: "small", latex: "\\log_{#0}#0" },
                    { class: "small", latex: "\\ln#0" },
                    { class: "small", latex: "\\log_{10}#0" },
                ]
            },
            {
                latex: "\\exponentialE",
                shift: "\\exp",
                variants: [
                    { class: "small", latex: "\\exponentialE" },
                    { class: "small", latex: "\\exp\\left(#0\\right)" },
                    { class: "small", latex: "\\times10^{#0}" },
                ]
            },
            "\\lim_{#0}",
            {
                latex: "\\infty",
                variants: [
                    { latex: "\\infty" }
                ]
            },
            {
                latex: "\\imaginaryI",
                variants: [
                    { latex: "\\imaginaryI" },
                ]
            }
        ]
    ]
};