export const byRolesTheme = {
    id: 3,
    uuid: '00000000-0000-0000-0000-000000000003',
    readonly: true,
    name: 'By Roles',
    rules: [
        {
            description: "Role 1",
            text: "#000",
            background: "#b3e5fc",
            border: "#0288d1",
            shape: "0",
            borderWidth: "2px",
            filterType: "role",
            filterValue: "0"
        },
        {
            description: "Role 2",
            text: "#000",
            background: "#c3efed",
            border: "#00796b",
            shape: "0",
            borderWidth: "2px",
            filterType: "role",
            filterValue: "1"
        },
        {
            description: "Role 3",
            text: "#000",
            background: "#edd2f1",
            border: "#7b1fa2",
            shape: "0",
            borderWidth: "2px",
            filterType: "role",
            filterValue: "2"
        },
        {
            description: "Owner",
            text: "#000",
            background: "#c8e6c9",
            border: "#43a047",
            shape: "0",
            borderWidth: "2px",
            filterType: "role",
            filterValue: "OWNER"
        },
        {
            description: "Any Role",
            text: "#000",
            background: "#ffecb3",
            border: "#c47b00",
            shape: "1",
            borderWidth: "2px",
            filterType: "role",
            filterValue: "ANY_ROLE"
        },
        {
            default: true,
            description: "Other",
            text: "#000",
            background: "#fff",
            border: "#000",
            shape: "4",
            borderWidth: "2px"
        }
    ]
}