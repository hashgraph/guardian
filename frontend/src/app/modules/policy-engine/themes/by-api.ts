export const byApiTheme = {
    readonly: true,
    name: "By API Access",
    rules: [
        {
            description: "POST & GET",
            text: "#031d00",
            background: "#3dff46",
            border: "#00a316",
            shape: "0",
            borderWidth: "2px",
            filterType: "api",
            filterValue: "post"
        },
        {
            description: "Only GET",
            text: "#1e1f00",
            background: "#fff67a",
            border: "#c2a800",
            shape: "0",
            borderWidth: "2px",
            filterType: "api",
            filterValue: "get"
        },
        {
            description: "Not Accessible",
            text: "#6a6a6a",
            background: "#ffecec",
            border: "#e26868",
            shape: "3",
            borderWidth: "2px",
            filterType: "api",
            filterValue: ""
        }
    ]
}