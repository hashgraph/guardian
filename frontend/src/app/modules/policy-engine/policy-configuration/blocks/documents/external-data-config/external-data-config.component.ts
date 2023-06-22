import { Component, EventEmitter, Inject, Input, OnInit, Output, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { IModuleVariables, PolicyBlockModel, SchemaVariables } from '../../../../structures';
import { GET_SCHEMA_NAME } from 'src/app/injectors/get-schema-name.injector';

/**
 * Settings for block of 'externalDataBlock' type.
 */
@Component({
    selector: 'external-data-config',
    templateUrl: './external-data-config.component.html',
    styleUrls: ['./external-data-config.component.css'],
    encapsulation: ViewEncapsulation.Emulated
})
export class ExternalDataConfigComponent implements OnInit {
    @Input('block') currentBlock!: PolicyBlockModel;
    @Input('readonly') readonly!: boolean;
    @Output() onInit = new EventEmitter();

    private moduleVariables!: IModuleVariables | null;
    private item!: PolicyBlockModel;

    propHidden: any = {
        main: false,
    };

    properties!: any;
    schemas!: SchemaVariables[];

    constructor(
        @Inject(GET_SCHEMA_NAME)
        public getSchemaName: (
            name?: string,
            version?: string,
            status?: string
        ) => string,
    ) {}

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
