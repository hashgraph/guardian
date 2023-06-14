export const byApiTheme = {
    'id': 2,
    'uuid': '00000000-0000-0000-0000-000000000002',
    'readonly': true,
    'name': 'By API Access',
    'rules': [
        {
            'description': 'POST & GET',
            'text': '#031d00',
            'background': '#b8ffc7',
            'border': '#16bc2d',
            'shape': '0',
            'borderWidth': '2px',
            'filterType': 'api',
            'filterValue': 'post'
        },
        {
            'description': 'Only GET',
            'text': '#1e1f00',
            'background': '#fff899',
            'border': '#d0b60c',
            'shape': '1',
            'borderWidth': '2px',
            'filterType': 'api',
            'filterValue': 'get'
        },
        {
            'description': 'Not Accessible',
            'text': '#474747',
            'background': '#ffefef',
            'border': '#e97474',
            'shape': '3',
            'borderWidth': '2px',
            'filterType': 'api',
            'filterValue': ''
        }
    ],
    syntaxGroups: [
        {
            id: 'policy-id',
            name: 'Identifiers',
            color: '#3F51B5'
        },
        {
            id: 'policy-name',
            name: 'Names',
            color: '#9C27B0'
        },
        {
            id: 'policy-type',
            name: 'Types',
            color: '#795548'
        },
        {
            id: 'policy-version',
            name: 'Versions',
            color: 'darkgoldenrod'
        },
        {
            id: 'policy-user',
            name: 'Users',
            color: 'darkolivegreen'
        },
        {
            id: 'policy-tag',
            name: 'Tags',
            color: 'darkslategray'
        },
        {
            id: 'policy-complex',
            name: 'Complex Objects',
            color: 'orchid'
        },
        {
            id: 'policy-simple',
            name: 'Simple Objects',
            color: 'midnightblue'
        },
        {
            id: 'policy-date',
            name: 'Dates',
            color: 'salmon'
        },
        {
            id: 'policy-array',
            name: 'Arrays',
            color: 'darkslateblue'
        },
        {
            id: 'policy-flag',
            name: 'Flags',
            color: 'green'
        },
        {
            id: 'policy-error',
            name: 'Errors',
            color: 'crimson'
        },
    ]
}