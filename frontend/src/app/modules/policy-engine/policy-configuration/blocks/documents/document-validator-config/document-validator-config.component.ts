import {Component, EventEmitter, Inject, Input, OnInit, Output, SimpleChanges, ViewEncapsulation} from '@angular/core';
import {IModuleVariables, PolicyBlock, SchemaVariables} from '../../../../structures';

/**
 * Settings for block of 'sendToGuardian' type.
 */
@Component({
    selector: 'document-validator-config',
    templateUrl: './document-validator-config.component.html',
    styleUrls: ['./document-validator-config.component.scss'],
    encapsulation: ViewEncapsulation.Emulated
})
export class DocumentValidatorConfigComponent implements OnInit {
    @Input('block') currentBlock!: PolicyBlock;
    @Input('readonly') readonly!: boolean;
    @Output() onInit = new EventEmitter();

    private moduleVariables!: IModuleVariables | null;
    private item!: PolicyBlock;

    propHidden: any = {
        main: false,
        conditionsGroup: false,
        conditions: {},
    };

    properties!: any;
    schemas!: SchemaVariables[];

    documentTypeOptions = [
        {label: 'VC Document', value: 'vc-document'},
        {label: 'VP Document', value: 'vp-document'},
        {label: 'Related VC Document', value: 'related-vc-document'},
        {label: 'Related VP Document', value: 'related-vp-document'}
    ];

    conditionTypeOptions = [
        {label: 'Equal', value: 'equal'},
        {label: 'Not Equal', value: 'not_equal'},
        {label: 'In', value: 'in'},
        {label: 'Not In', value: 'not_in'}
    ];

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

    load(block: PolicyBlock) {
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

    removeCondition(i: number) {
        this.properties.conditions.splice(i, 1);
    }

    onSave() {
        this.item.changed = true;
    }
}
