import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { Schema, Token } from 'interfaces';
import { BlockNode } from '../../../../helpers/tree-data-source/tree-data-source';

/**
 * Settings for block of 'policyRolesBlock' type.
 */
@Component({
    selector: 'calculate-config',
    templateUrl: './calculate-config.component.html',
    styleUrls: [
        './../../../common-properties/common-properties.component.css',
        './calculate-config.component.css'
    ]
})
export class CalculateConfigComponent implements OnInit {
    @Input('target') target!: BlockNode;
    @Input('all') all!: BlockNode[];
    @Input('schemes') schemes!: Schema[];
    @Input('tokens') tokens!: Token[];
    @Input('readonly') readonly!: boolean;
    @Input('roles') roles!: string[];
    @Output() onInit = new EventEmitter();

    propHidden: any = {
        inputSchemaGroup: false,
        outputSchemaGroup: false
    };

    block!: BlockNode;

    constructor() {
    }

    ngOnInit(): void {
        this.onInit.emit(this);
        this.load(this.target);
    }

    ngOnChanges(changes: SimpleChanges) {
        this.load(this.target);
    }

    load(block: BlockNode) {
        this.block = block;
        this.block.inputFields = this.block.inputFields || [];
        this.block.outputFields = this.block.outputFields || [];
        if (!this.block.inputSchema) {
            this.block.inputFields = [];
        }
        if (!this.block.outputSchema) {
            this.block.outputFields = [];
        }
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }

    onSelectInput() {
        this.block.inputFields = [];
        const schema = this.schemes.find(e => e.iri == this.block.inputSchema)
        if (schema) {
            for (let i = 0; i < schema.fields.length; i++) {
                const field = schema.fields[i];
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
        const schema = this.schemes.find(e => e.iri == this.block.outputSchema)
        if (schema) {
            for (let i = 0; i < schema.fields.length; i++) {
                const field = schema.fields[i];
                this.block.outputFields.push({
                    name: field.name,
                    title: field.description,
                    value: ''
                })
            }
        }
    }
}
