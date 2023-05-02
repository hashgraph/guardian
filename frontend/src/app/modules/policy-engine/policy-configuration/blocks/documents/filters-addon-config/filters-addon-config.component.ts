import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { IModuleVariables, PolicyBlockModel } from '../../../../structures';

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
    @Input('block') currentBlock!: PolicyBlockModel;
    @Input('readonly') readonly!: boolean;
    @Output() onInit = new EventEmitter();

    private moduleVariables!: IModuleVariables | null;
    private item!: PolicyBlockModel;
    
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

    properties!: any;

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
        this.moduleVariables = block.moduleVariables;
        this.item = block;
        this.properties = block.properties;
        this.properties.uiMetaData = this.properties.uiMetaData || {};
        this.properties.uiMetaData.options = this.properties.uiMetaData.options || [];
        this.properties.type = 'dropdown';
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }
    
    onSave() {
        this.item.changed = true;
    }
}
