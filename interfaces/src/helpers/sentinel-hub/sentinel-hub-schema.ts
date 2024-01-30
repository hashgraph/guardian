export default {
    $id: '#SentinelHub',
    type: 'object',
    title: 'SentinelHub',
    properties: {
        layers: {
            type: 'string',
            enum: ['NATURAL-COLOR']
        },
        format: {
            type: 'string',
            enum: ['image/jpeg']
        },
        maxcc: {
            type: 'number'
        },
        width: {
            type: 'number'
        },
        height: {
            type: 'number'
        },
        time: {
            type: 'string'
        }
    }
}
