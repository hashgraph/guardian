export const byRolesTheme = {
    readonly: true,
    name: 'By Roles',
    rules: [
        {
            description: "",
            text: "#000",
            background: "#b3e5fc",
            border: "#0288d1",
            shape: "0",
            borderWidth: "2px",
            filterType: "role",
            filterOperation: "eq",
            filterValue: "0"
        },
        {
            description: "",
            text: "#000",
            background: "#c3efed",
            border: "#00796b",
            shape: "0",
            borderWidth: "2px",
            filterType: "role",
            filterOperation: "eq",
            filterValue: "1"
        },
        {
            description: "",
            text: "#000",
            background: "#edd2f1",
            border: "#7b1fa2",
            shape: "0",
            borderWidth: "2px",
            filterType: "role",
            filterOperation: "eq",
            filterValue: "2"
        },
        {
            description: "",
            text: "#000",
            background: "#c8e6c9",
            border: "#43a047",
            shape: "0",
            borderWidth: "2px",
            filterType: "role",
            filterOperation: "eq",
            filterValue: "OWNER"
        },
        {
            description: "",
            text: "#000",
            background: "#ffecb3",
            border: "#c47b00",
            shape: "1",
            borderWidth: "2px",
            filterType: "role",
            filterOperation: "eq",
            filterValue: "ANY_ROLE"
        },
        {
            description: "",
            text: "#000",
            background: "#fff",
            border: "#000",
            shape: "4",
            borderWidth: "2px",
            filterType: "all",
            filterOperation: "eq",
            filterValue: ""
        }
    ]
}