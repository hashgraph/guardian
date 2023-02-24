import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { Schema, Token } from '@guardian/interfaces';
import { MatDialog } from '@angular/material/dialog';
import { IModuleVariables, PolicyBlockModel, PolicyModel } from 'src/app/policy-engine/structures';

/**
 * Settings for block of 'aggregateDocument' type.
 */
@Component({
    selector: 'aggregate-config',
    templateUrl: './aggregate-config.component.html',
    styleUrls: ['./aggregate-config.component.css'],
    encapsulation: ViewEncapsulation.Emulated
})
export class AggregateConfigComponent implements OnInit {
    @Input('block') currentBlock!: PolicyBlockModel;
    @Input('readonly') readonly!: boolean;
    @Output() onInit = new EventEmitter();

    private moduleVariables!: IModuleVariables | null;
    private item!: PolicyBlockModel;
    
    propHidden: any = {
        main: false,
        options: false,
        expressionsGroup: false,
        expressions: {},
    };

    properties!: any;
    allTimer!: PolicyBlockModel[];

    constructor(private dialog: MatDialog) {
    }

    ngOnInit(): void {
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
        this.properties.expressions = this.properties.expressions || [];
        this.properties.uiMetaData = this.properties.uiMetaData || {}
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }

    addExpression() {
        this.properties.expressions.push({
            name: '',
            value: '',
        })
    }

    onRemoveExpression(i: number) {
        this.properties.expressions.splice(i, 1);
    }
    
    onSave() {
        this.item.changed = true;
    }
}
