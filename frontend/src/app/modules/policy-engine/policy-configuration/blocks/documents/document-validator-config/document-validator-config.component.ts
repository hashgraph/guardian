import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { IModuleVariables, PolicyBlockModel, SchemaVariables } from '../../../../structures';

/**
 * Settings for block of 'sendToGuardian' type.
 */
@Component({
    selector: 'document-validator-config',
    templateUrl: './document-validator-config.component.html',
    styleUrls: ['./document-validator-config.component.css'],
    encapsulation: ViewEncapsulation.Emulated
})
export class DocumentValidatorConfigComponent implements OnInit {
    @Input('block') currentBlock!: PolicyBlockModel;
    @Input('readonly') readonly!: boolean;
    @Output() onInit = new EventEmitter();

    private moduleVariables!: IModuleVariables | null;
    private item!: PolicyBlockModel;
    
    propHidden: any = {
        main: false,
        conditionsGroup: false,
        conditions: {},
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
        this.properties.conditions = this.properties.conditions || [];
        this.schemas = this.moduleVariables?.schemas || [];
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }

    addCondition() {
        this.properties.conditions.push({
            value: '',
            field: '',
            type: 'equal',
        })
    }
    
    onSave() {
        this.item.changed = true;
    }
}
