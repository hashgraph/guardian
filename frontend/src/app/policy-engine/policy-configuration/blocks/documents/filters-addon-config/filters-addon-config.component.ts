import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { Schema, Token } from '@guardian/interfaces';
import { PolicyModel } from 'src/app/policy-engine/structures/policy.model';
import { PolicyBlockModel } from "src/app/policy-engine/structures/policy-block.model";

/**
 * Settings for block of 'interfaceSelector' type.
 */
@Component({
    selector: 'filters-addon-config',
    templateUrl: './filters-addon-config.component.html',
    styleUrls: ['./filters-addon-config.component.css'],
    encapsulation: ViewEncapsulation.Emulated
})
export class FiltersAddonConfigComponent implements OnInit {
    @Input('policy') policy!: PolicyModel;
    @Input('block') currentBlock!: PolicyBlockModel;
    @Input('schemas') schemas!: Schema[];
    @Input('tokens') tokens!: Token[];
    @Input('readonly') readonly!: boolean;
    @Output() onInit = new EventEmitter();

    propHidden: any = {
        main: false,
        optionsGroup: false,
        fileGroup: false,
        options: {},
        filterGroup: false,
        filters: {},
        dropdownGroup: false,
        unelectedGroup: false
    };

    block!: any;

    constructor() {
    }

    ngOnInit(): void {
        this.onInit.emit(this);
        this.load(this.currentBlock);
    }

    ngOnChanges(changes: SimpleChanges) {
        this.load(this.currentBlock);
    }

    load(block: PolicyBlockModel) {
        this.block = block.properties;
        this.block.uiMetaData = this.block.uiMetaData || {};
        this.block.uiMetaData.options = this.block.uiMetaData.options || [];
        this.block.type = 'dropdown';
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }
}
