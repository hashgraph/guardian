import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { Schema, Token } from '@guardian/interfaces';
import { IModuleVariables, PolicyBlockModel, SchemaVariables } from 'src/app/policy-engine/structures';

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

    propHidden: any = {
        inputSchemaGroup: false,
        outputSchemaGroup: false
    };

    block!: any;
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
        this.block = block.properties;
        this.block.inputFields = this.block.inputFields || [];
        this.block.outputFields = this.block.outputFields || [];
        if (!this.block.inputSchema) {
            this.block.inputFields = [];
        }
        if (!this.block.outputSchema) {
            this.block.outputFields = [];
        }

        this.schemas = this.moduleVariables?.schemas || [];
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }

    onSelectInput() {
        this.block.inputFields = [];
        const schema = this.schemas.find(e => e.value == this.block.inputSchema);
        if (schema && schema.data) {
            for (const field of schema.data.fields) {
                this.block.inputFields.push({
                    name: field.name,
                    title: field.description,
                    value: field.name
                })
            }
        }
    }

    onSelectOutput() {
        this.block.outputFields = [];
        const schema = this.schemas.find(e => e.value == this.block.outputSchema);
        if (schema && schema.data) {
            for (const field of schema.data.fields) {
                this.block.outputFields.push({
                    name: field.name,
                    title: field.description,
                    value: ''
                })
            }
        }
    }
}
