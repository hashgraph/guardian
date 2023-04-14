export const byApiTheme = {
    readonly: true,
    name: "By API Access",
    rules: [
        {
            description: "",
            text: "#031d00",
            background: "#3dff46",
            border: "#00a316",
            shape: "0",
            borderWidth: "2px",
            filterType: "api",
            filterOperation: "eq",
            filterValue: "post"
        },
        {
            description: "",
            text: "#1e1f00",
            background: "#fff67a",
            border: "#c2a800",
            shape: "0",
            borderWidth: "2px",
            filterType: "api",
            filterOperation: "eq",
            filterValue: "get"
        },
        {
            description: "",
            text: "#6a6a6a",
            background: "#ffecec",
            border: "#e26868",
            shape: "3",
            borderWidth: "2px",
            filterType: "api",
            filterOperation: "eq",
            filterValue: ""
        }
    ]
}