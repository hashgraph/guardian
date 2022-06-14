export class FieldTypesDictionary {
    public static readonly FieldTypes = [
        {
            name: "Number",
            type: 'number',
            format: undefined,
            pattern: undefined,
            isRef: false
        },
        {
            name: "Integer",
            type: 'integer',
            format: undefined,
            pattern: undefined,
            isRef: false
        },
        {
            name: "String",
            type: 'string',
            format: undefined,
            pattern: undefined,
            isRef: false
        },
        {
            name: "Boolean",
            type: 'boolean',
            format: undefined,
            pattern: undefined,
            isRef: false
        },
        {
            name: "Date",
            type: 'string',
            format: 'date',
            pattern: undefined,
            isRef: false
        },
        {
            name: "Time",
            type: 'string',
            format: 'time',
            pattern: undefined,
            isRef: false
        },
        {
            name: "DateTime",
            type: 'string',
            format: 'date-time',
            pattern: undefined,
            isRef: false
        },
        {
            name: "Duration",
            type: 'string',
            format: 'duration',
            pattern: undefined,
            isRef: false
        },
        {
            name: "URL",
            type: 'string',
            format: 'url',
            pattern: undefined,
            isRef: false
        },
        {
            name: "Email",
            type: 'string',
            format: 'email',
            pattern: undefined,
            isRef: false
        },
        {
            name: "Image",
            type: 'string',
            format: undefined,
            pattern: '^((https):\/\/)?ipfs.io\/ipfs\/.+',
            isRef: false
        }
    ];

    public static readonly MeasureFieldTypes = []
}