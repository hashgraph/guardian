import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { IModuleVariables, PolicyBlockModel, SchemaVariables } from '../../../../structures';

/**
 * Settings for block of 'policyRolesBlock' type.
 */
@Component({
    selector: 'calculate-config',
    templateUrl: './calculate-config.component.html',
    styleUrls: ['./calculate-config.component.css'],
    encapsulation: ViewEncapsulation.Emulated
})
export class CalculateConfigComponent implements OnInit {
    @Input('block') currentBlock!: PolicyBlockModel;
    @Input('readonly') readonly!: boolean;
    @Output() onInit = new EventEmitter();

    private moduleVariables!: IModuleVariables | null;
    private item!: PolicyBlockModel;
    
    propHidden: any = {
        inputSchemaGroup: false,
        outputSchemaGroup: false
    };

    properties!: any;
    schemas!: SchemaVariables[];

    constructor() {
    }

    ngOnInit(): void {
        this.schemas = [];
        this.onInit.emit(this);
        this.load(this.currentBlock);
    }

    ngOnChanges(changes: SimpleChanges) {
        this.load(this.currentBlock);
    }

    load(block: PolicyBlockModel) {
        this.moduleVariables = block.moduleVariables;
        this.item = block;
        this.properties = block.properties;
        this.properties.inputFields = this.properties.inputFields || [];
        this.properties.outputFields = this.properties.outputFields || [];
        if (!this.properties.inputSchema) {
            this.properties.inputFields = [];
        }
        if (!this.properties.outputSchema) {
            this.properties.outputFields = [];
        }

        this.schemas = this.moduleVariables?.schemas || [];
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }

    onSelectInput() {
        this.properties.inputFields = [];
        const schema = this.schemas.find(e => e.value == this.properties.inputSchema);
        if (schema && schema.data) {
            for (const field of schema.data.fields) {
                this.properties.inputFields.push({
                    name: field.name,
                    title: field.description,
                    value: field.name
                })
            }
        }
    }

    onSelectOutput() {
        this.properties.outputFields = [];
        const schema = this.schemas.find(e => e.value == this.properties.outputSchema);
        if (schema && schema.data) {
            for (const field of schema.data.fields) {
                this.properties.outputFields.push({
                    name: field.name,
                    title: field.description,
                    value: ''
                })
            }
        }
    }
    
    onSave() {
        this.item.changed = true;
    }
}
