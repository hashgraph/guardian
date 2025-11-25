import { Component, EventEmitter, Inject, Input, OnInit, Output, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { IModuleVariables, PolicyBlock, SchemaVariables } from '../../../../structures';

/**
 * Settings for block of 'externalDataBlock' type.
 */
@Component({
    selector: 'external-data-config',
    templateUrl: './external-data-config.component.html',
    styleUrls: ['./external-data-config.component.scss'],
    encapsulation: ViewEncapsulation.Emulated
})
export class ExternalDataConfigComponent implements OnInit {
    @Input('block') currentBlock!: PolicyBlock;
    @Input('readonly') readonly!: boolean;
    @Output() onInit = new EventEmitter();

    private moduleVariables!: IModuleVariables | null;
    private item!: PolicyBlock;

    propHidden: any = {
        main: false,
    };

    properties!: any;
    schemas!: SchemaVariables[];

    public typesOfInheritance = [
        { label: '', value: '' },
        { label: 'Inherit', value: 'inherit' },
        { label: 'Not Inherit', value: 'not_inherit' },
    ];

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
        this.properties.uiMetaData = this.properties.uiMetaData || {}
        this.schemas = this.moduleVariables?.schemas || [];
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }

    onSave() {
        this.item.changed = true;
    }
}
