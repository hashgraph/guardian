import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';

enum FieldType {
    Text = "https://www.schema.org/text",
    Value = "https://www.schema.org/value",
    Identifier = "https://www.schema.org/identifier",
    DateTime = "https://www.schema.org/DateTime",
    Amount = "https://www.schema.org/amount",
    Duration = "https://www.schema.org/duration",
}

interface IField {
    name: string,
    type: FieldType
}

@Component({
    selector: 'app-schema-configuration',
    templateUrl: './schema-configuration.component.html',
    styleUrls: ['./schema-configuration.component.css']
})
export class SchemaConfigurationComponent implements OnInit {
    @Input('schemes') schemes!: any[];
    @Output('document') document = new EventEmitter<any | null>();

    started = false;
    fieldsForm: FormGroup;
    dataForm: FormGroup;
    defaultFields: FormControl;
    defaultFieldsMap: any;
    typesMap: any;
    types: any;
    fields: any;
    schemaTypes: any;

    constructor(
        private fb: FormBuilder
    ) {
        this.defaultFieldsMap = {};
        this.defaultFieldsMap["NONE"] = [];
        this.defaultFieldsMap["INSTALLER"] = [{ name: "policyId", type: "https://www.schema.org/identifier" }];
        this.defaultFieldsMap["INVERTER"] = [{ name: "policyId", type: "https://www.schema.org/identifier" }];
        this.defaultFieldsMap["MRV"] = [
            { name: "accountId", type: "https://www.schema.org/text" },
            { name: "policyId", type: "https://www.schema.org/identifier" }
        ];
        this.defaultFieldsMap["TOKEN"] = [];

        this.types = [
            { name: "Text", value: FieldType.Text },
            { name: "Value", value: FieldType.Value },
            { name: "Identifier", value: FieldType.Identifier },
            { name: "DateTime", value: FieldType.DateTime },
            { name: "Amount", value: FieldType.Amount },
            { name: "Duration", value: FieldType.Duration },
        ];

        this.typesMap = {};
        for (let i = 0; i < this.types.length; i++) {
            const element = this.types[i];
            this.typesMap[element.value] = element.name
        }

        this.fieldsForm = this.fb.group({});
        this.defaultFields = new FormControl("NONE", Validators.required);
        this.dataForm = this.fb.group({
            type: ['', Validators.required],
            entity: this.defaultFields,
            fields: this.fieldsForm
        });
        this.fields = [];
    }

    ngOnInit(): void {
        setTimeout(() => {
            this.started = true;
        });
    }

    onAdd(event: MouseEvent) {
        event.preventDefault();

        const fieldName = "fieldName" + this.fields.length;
        const fieldType = "fieldType" + this.fields.length;
        const controlName = new FormControl('', Validators.required);
        const controlType = new FormControl(this.types[0].value, Validators.required);
        this.fields.push({
            name: "",
            type: FieldType.Text,
            fieldName: fieldName,
            fieldType: fieldType,
            controlName: controlName,
            controlType: controlType
        });
        this.fieldsForm.addControl(fieldName, controlName);
        this.fieldsForm.addControl(fieldType, controlType);
        this.fields = this.fields.slice();
    }

    onNoClick(): void {
        this.document.emit(null);
    }

    onSubmit() {
        const value = this.dataForm.value;
        const schema: any = {}

        const defaultFields = this.defaultFieldsMap[value.entity];

        for (let i = 0; i < defaultFields.length; i++) {
            const element = defaultFields[i];

            const name = element.name;
            const type = { "@id": element.type };
            if (name && !schema[name]) {
                schema[name] = type;
            }
        }

        const fields = value.fields;

        for (let i = 0; i < this.fields.length; i++) {
            const element = this.fields[i];
            const name = fields[element.fieldName];
            const type = { "@id": fields[element.fieldType] };
            if (name && !schema[name]) {
                schema[name] = type;
            }
        }

        const type = value.type.replace(/\s/ig, "_");
        const document = {
            "@id": "https://localhost/schema#" + type,
            "@context": schema
        }

        this.document.emit({
            type: type,
            entity: value.entity,
            document: document,
        });
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.schemes) {
            if (this.schemes) {
                this.schemaTypes = this.schemes.map(e => ({
                    name: e.type,
                    value: e.document["@id"]
                }));
            } else {
                this.schemaTypes = [];
            }
        }
    }
}
