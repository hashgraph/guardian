import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { IModuleVariables, PolicyBlock, SchemaVariables } from '../../../../structures';

/**
 * Settings for block of 'sendToGuardian' type.
 */
@Component({
    selector: 'source-addon-config',
    templateUrl: './source-addon-config.component.html',
    styleUrls: ['./source-addon-config.component.scss'],
    encapsulation: ViewEncapsulation.Emulated
})
export class SourceAddonConfigComponent implements OnInit {
    @Input('block') currentBlock!: PolicyBlock;
    @Input('readonly') readonly!: boolean;
    @Output() onInit = new EventEmitter();

    private moduleVariables!: IModuleVariables | null;
    private item!: PolicyBlock;

    propHidden: any = {
        main: false,
        filtersGroup: false,
        filters: {},
    };

    properties!: any;
    schemas!: SchemaVariables[];

    constructor(
    ) {

    }

    ngOnInit(): void {
        this.schemas = [];
        this.onInit.emit(this);
        this.load(this.currentBlock);
    }

    ngOnChanges(changes: SimpleChanges) {
        this.load(this.currentBlock);
    }

    load(block: PolicyBlock) {
        this.moduleVariables = block.moduleVariables;
        this.item = block;
        this.properties = block.properties;
        this.properties.filters = this.properties.filters || [];
        this.schemas = this.moduleVariables?.schemas || [];
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }

    addField() {
        this.properties.filters.push({
            value: '',
            field: '',
            type: 'equal',
        })
    }

    removeField(i: number) {
        this.properties.filters.splice(i, 1)
    }

    onSave() {
        this.item.changed = true;
    }
}
