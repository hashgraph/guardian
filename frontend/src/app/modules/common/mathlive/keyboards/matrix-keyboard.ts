export const matrixKeyboard = {
    label: "matrix",
    tooltip: "Matrix",
    rows: [
        [
            {
                label: "1x1",
                latex: "\\begin{pmatrix}#0\\end{pmatrix}",
                shift: "[#0]",
                variants: [
                    { latex: "\\ddots", insert: "\\begin{matrix}#0\\end{matrix}" },
                    { latex: "(\\ddots)", insert: "\\begin{pmatrix}#0\\end{pmatrix}" },
                    { latex: "\\lbrack\\ddots\\rbrack", insert: "\\begin{bmatrix}#0\\end{bmatrix}" },
                    { latex: "\\vert\\ddots\\vert", insert: "\\begin{vmatrix}#0\\end{vmatrix}" },
                    { latex: "\\lbrace\\ddots\\rbrace", insert: "\\begin{Bmatrix}#0\\end{Bmatrix}" },
                ]
            },
            {
                label: "1x2",
                latex: "\\begin{pmatrix}#0 & #0\\end{pmatrix}",
                shift: "[#0]",
                variants: [
                    { latex: "\\ddots", insert: "\\begin{matrix}#0 & #0\\end{matrix}" },
                    { latex: "(\\ddots)", insert: "\\begin{pmatrix}#0 & #0\\end{pmatrix}" },
                    { latex: "\\lbrack\\ddots\\rbrack", insert: "\\begin{bmatrix}#0 & #0\\end{bmatrix}" },
                    { latex: "\\vert\\ddots\\vert", insert: "\\begin{vmatrix}#0 & #0\\end{vmatrix}" },
                    { latex: "\\lbrace\\ddots\\rbrace", insert: "\\begin{Bmatrix}#0 & #0\\end{Bmatrix}" },
                ]
            },
            {
                label: "1x3",
                latex: "\\begin{pmatrix}#0 & #0 & #0\\end{pmatrix}",
                shift: "[#0]",
                variants: [
                    { latex: "\\ddots", insert: "\\begin{matrix}#0 & #0 & #0\\end{matrix}" },
                    { latex: "(\\ddots)", insert: "\\begin{pmatrix}#0 & #0 & #0\\end{pmatrix}" },
                    { latex: "\\lbrack\\ddots\\rbrack", insert: "\\begin{bmatrix}#0 & #0 & #0\\end{bmatrix}" },
                    { latex: "\\vert\\ddots\\vert", insert: "\\begin{vmatrix}#0 & #0 & #0\\end{vmatrix}" },
                    { latex: "\\lbrace\\ddots\\rbrace", insert: "\\begin{Bmatrix}#0 & #0 & #0\\end{Bmatrix}" },
                ]
            },
            {
                label: "1x4",
                latex: "\\begin{pmatrix}#0 & #0 & #0 & #0\\end{pmatrix}",
                shift: "[#0]",
                variants: [
                    { latex: "\\ddots", insert: "\\begin{matrix}#0 & #0 & #0 & #0\\end{matrix}" },
                    { latex: "(\\ddots)", insert: "\\begin{pmatrix}#0 & #0 & #0 & #0\\end{pmatrix}" },
                    { latex: "\\lbrack\\ddots\\rbrack", insert: "\\begin{bmatrix}#0 & #0 & #0 & #0\\end{bmatrix}" },
                    { latex: "\\vert\\ddots\\vert", insert: "\\begin{vmatrix}#0 & #0 & #0 & #0\\end{vmatrix}" },
                    { latex: "\\lbrace\\ddots\\rbrace", insert: "\\begin{Bmatrix}#0 & #0 & #0 & #0\\end{Bmatrix}" },
                ]
            },
            {
                latex: "\\cdots",
                command: ["performWithFeedback", "addRowAfter"],
                aside: "Add Row After",
                shift: "\\cdots",
                variants: [
                    {
                        latex: "\\cdots",
                        command: ["performWithFeedback", "addRowAfter"],
                        aside: "Add Row After",
                    },
                    {
                        latex: "\\cdots",
                        command: ["performWithFeedback", "addRowBefore"],
                        aside: "Add Row Before",
                    }
                ]
            }
        ],
        [
            {
                label: "2x1",
                latex: "\\begin{pmatrix}#0\\\\ #0\\end{pmatrix}",
                shift: "[#0]",
                variants: [
                    { latex: "\\ddots", insert: "\\begin{matrix}#0\\\\ #0\\end{matrix}" },
                    { latex: "(\\ddots)", insert: "\\begin{pmatrix}#0\\\\ #0\\end{pmatrix}" },
                    { latex: "\\lbrack\\ddots\\rbrack", insert: "\\begin{bmatrix}#0\\\\ #0\\end{bmatrix}" },
                    { latex: "\\vert\\ddots\\vert", insert: "\\begin{vmatrix}#0\\\\ #0\\end{vmatrix}" },
                    { latex: "\\lbrace\\ddots\\rbrace", insert: "\\begin{Bmatrix}#0\\\\ #0\\end{Bmatrix}" },
                ]
            },
            {
                label: "2x2",
                latex: "\\begin{pmatrix}#0 & #0\\\\ #0 & #0\\end{pmatrix}",
                shift: "[#0]",
                variants: [
                    { latex: "\\ddots", insert: "\\begin{matrix}#0 & #0\\\\ #0 & #0\\end{matrix}" },
                    { latex: "(\\ddots)", insert: "\\begin{pmatrix}#0 & #0\\\\ #0 & #0\\end{pmatrix}" },
                    { latex: "\\lbrack\\ddots\\rbrack", insert: "\\begin{bmatrix}#0 & #0\\\\ #0 & #0\\end{bmatrix}" },
                    { latex: "\\vert\\ddots\\vert", insert: "\\begin{vmatrix}#0 & #0\\\\ #0 & #0\\end{vmatrix}" },
                    { latex: "\\lbrace\\ddots\\rbrace", insert: "\\begin{Bmatrix}#0 & #0\\\\ #0 & #0\\end{Bmatrix}" },
                ]
            },
            {
                label: "2x3",
                latex: "\\begin{pmatrix}#0 & #0 & #0\\\\ #0 & #0 & #0\\end{pmatrix}",
                shift: "[#0]",
                variants: [
                    { latex: "\\ddots", insert: "\\begin{matrix}#0 & #0 & #0\\\\ #0 & #0 & #0\\end{matrix}" },
                    { latex: "(\\ddots)", insert: "\\begin{pmatrix}#0 & #0 & #0\\\\ #0 & #0 & #0\\end{pmatrix}" },
                    { latex: "\\lbrack\\ddots\\rbrack", insert: "\\begin{bmatrix}#0 & #0 & #0\\\\ #0 & #0 & #0\\end{bmatrix}" },
                    { latex: "\\vert\\ddots\\vert", insert: "\\begin{vmatrix}#0 & #0 & #0\\\\ #0 & #0 & #0\\end{vmatrix}" },
                    { latex: "\\lbrace\\ddots\\rbrace", insert: "\\begin{Bmatrix}#0 & #0 & #0\\\\ #0 & #0 & #0\\end{Bmatrix}" },
                ]
            },
            {
                label: "2x4",
                latex: "\\begin{pmatrix}#0 & #0 & #0 & #0\\\\ #0 & #0 & #0 & #0\\end{pmatrix}",
                shift: "[#0]",
                variants: [
                    { latex: "\\ddots", insert: "\\begin{matrix}#0 & #0 & #0 & #0\\\\ #0 & #0 & #0 & #0\\end{matrix}" },
                    { latex: "(\\ddots)", insert: "\\begin{pmatrix}#0 & #0 & #0 & #0\\\\ #0 & #0 & #0 & #0\\end{pmatrix}" },
                    { latex: "\\lbrack\\ddots\\rbrack", insert: "\\begin{bmatrix}#0 & #0 & #0 & #0\\\\ #0 & #0 & #0 & #0\\end{bmatrix}" },
                    { latex: "\\vert\\ddots\\vert", insert: "\\begin{vmatrix}#0 & #0 & #0 & #0\\\\ #0 & #0 & #0 & #0\\end{vmatrix}" },
                    { latex: "\\lbrace\\ddots\\rbrace", insert: "\\begin{Bmatrix}#0 & #0 & #0 & #0\\\\ #0 & #0 & #0 & #0\\end{Bmatrix}" },
                ]
            },
            {
                latex: "\\vdots",
                command: ["performWithFeedback", "addColumnAfter"],
                aside: "Add Column After",
                shift: "\\vdots",
                variants: [
                    {
                        latex: "\\vdots",
                        command: ["performWithFeedback", "addColumnAfter"],
                        aside: "Add Column After",
                    },
                    {
                        latex: "\\vdots",
                        command: ["performWithFeedback", "addColumnBefore"],
                        aside: "Add Column Before",
                    }
                ]
            }
        ],
        [
            {
                label: "3x1",
                latex: "\\begin{pmatrix}#0\\\\ #0\\\\ #0\\end{pmatrix}",
                shift: "[#0]",
                variants: [
                    { latex: "\\ddots", insert: "\\begin{matrix}#0\\\\ #0\\\\ #0\\end{matrix}" },
                    { latex: "(\\ddots)", insert: "\\begin{pmatrix}#0\\\\ #0\\\\ #0\\end{pmatrix}" },
                    { latex: "\\lbrack\\ddots\\rbrack", insert: "\\begin{bmatrix}#0\\\\ #0\\\\ #0\\end{bmatrix}" },
                    { latex: "\\vert\\ddots\\vert", insert: "\\begin{vmatrix}#0\\\\ #0\\\\ #0\\end{vmatrix}" },
                    { latex: "\\lbrace\\ddots\\rbrace", insert: "\\begin{Bmatrix}#0\\\\ #0\\\\ #0\\end{Bmatrix}" },
                ]
            },
            {
                label: "3x2",
                latex: "\\begin{pmatrix}#0 & #0\\\\ #0 & #0\\\\ #0 & #0\\end{pmatrix}",
                shift: "[#0]",
                variants: [
                    { latex: "\\ddots", insert: "\\begin{matrix}#0 & #0\\\\ #0 & #0\\\\ #0 & #0\\end{matrix}" },
                    { latex: "(\\ddots)", insert: "\\begin{pmatrix}#0 & #0\\\\ #0 & #0\\\\ #0 & #0\\end{pmatrix}" },
                    { latex: "\\lbrack\\ddots\\rbrack", insert: "\\begin{bmatrix}#0 & #0\\\\ #0 & #0\\\\ #0 & #0\\end{bmatrix}" },
                    { latex: "\\vert\\ddots\\vert", insert: "\\begin{vmatrix}#0 & #0\\\\ #0 & #0\\\\ #0 & #0\\end{vmatrix}" },
                    { latex: "\\lbrace\\ddots\\rbrace", insert: "\\begin{Bmatrix}#0 & #0\\\\ #0 & #0\\\\ #0 & #0\\end{Bmatrix}" },
                ]
            },
            {
                label: "3x3",
                latex: "\\begin{pmatrix}#0 & #0 & #0\\\\ #0 & #0 & #0\\\\ #0 & #0 & #0\\end{pmatrix}",
                shift: "[#0]",
                variants: [
                    { latex: "\\ddots", insert: "\\begin{matrix}#0 & #0 & #0\\\\ #0 & #0 & #0\\\\ #0 & #0 & #0\\end{matrix}" },
                    { latex: "(\\ddots)", insert: "\\begin{pmatrix}#0 & #0 & #0\\\\ #0 & #0 & #0\\\\ #0 & #0 & #0\\end{pmatrix}" },
                    { latex: "\\lbrack\\ddots\\rbrack", insert: "\\begin{bmatrix}#0 & #0 & #0\\\\ #0 & #0 & #0\\\\ #0 & #0 & #0\\end{bmatrix}" },
                    { latex: "\\vert\\ddots\\vert", insert: "\\begin{vmatrix}#0 & #0 & #0\\\\ #0 & #0 & #0\\\\ #0 & #0 & #0\\end{vmatrix}" },
                    { latex: "\\lbrace\\ddots\\rbrace", insert: "\\begin{Bmatrix}#0 & #0 & #0\\\\ #0 & #0 & #0\\\\ #0 & #0 & #0\\end{Bmatrix}" },
                ]
            },
            {
                label: "3x4",
                latex: "\\begin{pmatrix}#0 & #0 & #0 & #0\\\\ #0 & #0 & #0 & #0\\\\ #0 & #0 & #0 & #0\\end{pmatrix}",
                shift: "[#0]",
                variants: [
                    { latex: "\\ddots", insert: "\\begin{matrix}#0 & #0 & #0 & #0\\\\ #0 & #0 & #0 & #0\\\\ #0 & #0 & #0 & #0\\end{matrix}" },
                    { latex: "(\\ddots)", insert: "\\begin{pmatrix}#0 & #0 & #0 & #0\\\\ #0 & #0 & #0 & #0\\\\ #0 & #0 & #0 & #0\\end{pmatrix}" },
                    { latex: "\\lbrack\\ddots\\rbrack", insert: "\\begin{bmatrix}#0 & #0 & #0 & #0\\\\ #0 & #0 & #0 & #0\\\\ #0 & #0 & #0 & #0\\end{bmatrix}" },
                    { latex: "\\vert\\ddots\\vert", insert: "\\begin{vmatrix}#0 & #0 & #0 & #0\\\\ #0 & #0 & #0 & #0\\\\ #0 & #0 & #0 & #0\\end{vmatrix}" },
                    { latex: "\\lbrace\\ddots\\rbrace", insert: "\\begin{Bmatrix}#0 & #0 & #0 & #0\\\\ #0 & #0 & #0 & #0\\\\ #0 & #0 & #0 & #0\\end{Bmatrix}" },
                ]
            },
            {
                latex: "\\cdots",
                aside: "Delelte Row",
                command: ["performWithFeedback", "removeRow"],
            }
        ],
        [
            {
                label: "4x1",
                latex: "\\begin{pmatrix}#0\\\\ #0\\\\ #0\\\\ #0\\end{pmatrix}",
                shift: "[#0]",
                variants: [
                    { latex: "\\ddots", insert: "\\begin{matrix}#0\\\\ #0\\\\ #0\\\\ #0\\end{matrix}" },
                    { latex: "(\\ddots)", insert: "\\begin{pmatrix}#0\\\\ #0\\\\ #0\\\\ #0\\end{pmatrix}" },
                    { latex: "\\lbrack\\ddots\\rbrack", insert: "\\begin{bmatrix}#0\\\\ #0\\\\ #0\\\\ #0\\end{bmatrix}" },
                    { latex: "\\vert\\ddots\\vert", insert: "\\begin{vmatrix}#0\\\\ #0\\\\ #0\\\\ #0\\end{vmatrix}" },
                    { latex: "\\lbrace\\ddots\\rbrace", insert: "\\begin{Bmatrix}#0\\\\ #0\\\\ #0\\\\ #0\\end{Bmatrix}" },
                ]
            },
            {
                label: "4x2",
                latex: "\\begin{pmatrix}#0 & #0\\\\ #0 & #0\\\\ #0 & #0\\\\ #0 & #0\\end{pmatrix}",
                shift: "[#0]",
                variants: [
                    { latex: "\\ddots", insert: "\\begin{matrix}#0 & #0\\\\ #0 & #0\\\\ #0 & #0\\\\ #0 & #0\\end{matrix}" },
                    { latex: "(\\ddots)", insert: "\\begin{pmatrix}#0 & #0\\\\ #0 & #0\\\\ #0 & #0\\\\ #0 & #0\\end{pmatrix}" },
                    { latex: "\\lbrack\\ddots\\rbrack", insert: "\\begin{bmatrix}#0 & #0\\\\ #0 & #0\\\\ #0 & #0\\\\ #0 & #0\\end{bmatrix}" },
                    { latex: "\\vert\\ddots\\vert", insert: "\\begin{vmatrix}#0 & #0\\\\ #0 & #0\\\\ #0 & #0\\\\ #0 & #0\\end{vmatrix}" },
                    { latex: "\\lbrace\\ddots\\rbrace", insert: "\\begin{Bmatrix}#0 & #0\\\\ #0 & #0\\\\ #0 & #0\\\\ #0 & #0\\end{Bmatrix}" },
                ]
            },
            {
                label: "4x3",
                latex: "\\begin{pmatrix}#0 & #0 & #0\\\\ #0 & #0 & #0\\\\ #0 & #0 & #0\\\\ #0 & #0 & #0\\end{pmatrix}",
                shift: "[#0]",
                variants: [
                    { latex: "\\ddots", insert: "\\begin{matrix}#0 & #0 & #0\\\\ #0 & #0 & #0\\\\ #0 & #0 & #0\\\\ #0 & #0 & #0\\end{matrix}" },
                    { latex: "(\\ddots)", insert: "\\begin{pmatrix}#0 & #0 & #0\\\\ #0 & #0 & #0\\\\ #0 & #0 & #0\\\\ #0 & #0 & #0\\end{pmatrix}" },
                    { latex: "\\lbrack\\ddots\\rbrack", insert: "\\begin{bmatrix}#0 & #0 & #0\\\\ #0 & #0 & #0\\\\ #0 & #0 & #0\\\\ #0 & #0 & #0\\end{bmatrix}" },
                    { latex: "\\vert\\ddots\\vert", insert: "\\begin{vmatrix}#0 & #0 & #0\\\\ #0 & #0 & #0\\\\ #0 & #0 & #0\\\\ #0 & #0 & #0\\end{vmatrix}" },
                    { latex: "\\lbrace\\ddots\\rbrace", insert: "\\begin{Bmatrix}#0 & #0 & #0\\\\ #0 & #0 & #0\\\\ #0 & #0 & #0\\\\ #0 & #0 & #0\\end{Bmatrix}" },
                ]
            },
            {
                label: "4x4",
                latex: "\\begin{pmatrix}#0 & #0 & #0 & #0\\\\ #0 & #0 & #0 & #0\\\\ #0 & #0 & #0 & #0\\\\ #0 & #0 & #0 & #0\\end{pmatrix}",
                shift: "[#0]",
                variants: [
                    { latex: "\\ddots", insert: "\\begin{matrix}#0 & #0 & #0 & #0\\\\ #0 & #0 & #0 & #0\\\\ #0 & #0 & #0 & #0\\\\ #0 & #0 & #0 & #0\\end{matrix}" },
                    { latex: "(\\ddots)", insert: "\\begin{pmatrix}#0 & #0 & #0 & #0\\\\ #0 & #0 & #0 & #0\\\\ #0 & #0 & #0 & #0\\\\ #0 & #0 & #0 & #0\\end{pmatrix}" },
                    { latex: "\\lbrack\\ddots\\rbrack", insert: "\\begin{bmatrix}#0 & #0 & #0 & #0\\\\ #0 & #0 & #0 & #0\\\\ #0 & #0 & #0 & #0\\\\ #0 & #0 & #0 & #0\\end{bmatrix}" },
                    { latex: "\\vert\\ddots\\vert", insert: "\\begin{vmatrix}#0 & #0 & #0 & #0\\\\ #0 & #0 & #0 & #0\\\\ #0 & #0 & #0 & #0\\\\ #0 & #0 & #0 & #0\\end{vmatrix}" },
                    { latex: "\\lbrace\\ddots\\rbrace", insert: "\\begin{Bmatrix}#0 & #0 & #0 & #0\\\\ #0 & #0 & #0 & #0\\\\ #0 & #0 & #0 & #0\\\\ #0 & #0 & #0 & #0\\end{Bmatrix}" },
                ]
            },
            {
                latex: "\\vdots",
                aside: "Delete Column",
                command: ["performWithFeedback", "removeColumn"],
            }
        ]
    ]
};