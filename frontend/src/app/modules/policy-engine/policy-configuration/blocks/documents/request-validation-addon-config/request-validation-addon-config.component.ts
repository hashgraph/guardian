import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { IModuleVariables, PolicyBlock } from '../../../../structures';

/**
 * Settings for block of 'requestValidationAddon' type.
 */
@Component({
    selector: 'request-validation-addon-config',
    templateUrl: './request-validation-addon-config.component.html',
    styleUrls: ['./request-validation-addon-config.component.scss'],
    encapsulation: ViewEncapsulation.Emulated,
    standalone: false
})
export class RequestValidationAddonConfigComponent implements OnInit {
    @Input('block') currentBlock!: PolicyBlock;
    @Input('readonly') readonly!: boolean;
    @Output() onInit = new EventEmitter();

    private moduleVariables!: IModuleVariables | null;
    private item!: PolicyBlock;

    propHidden: any = {
        validationsGroup: false,
        validations: {},
        filters: {},
        conditions: {},
    };

    properties!: any;

    collectionOptions = [
        { label: 'VC Document', value: 'VcDocument' },
        { label: 'VP Document', value: 'VpDocument' },
    ];

    filterOperatorOptions = [
        { label: 'Equal', value: 'equal' },
        { label: 'Not Equal', value: 'not_equal' },
        { label: 'In', value: 'in' },
        { label: 'Not In', value: 'not_in' },
    ];

    filterValueTypeOptions = [
        { label: 'Value', value: 'value' },
        { label: 'Variable (Input Doc)', value: 'variable' },
    ];

    conditionOperatorOptions = [
        { label: 'Equal', value: 'equal' },
        { label: 'Not Equal', value: 'not_equal' },
        { label: 'In', value: 'in' },
        { label: 'Not In', value: 'not_in' },
        { label: 'Greater Than', value: 'gt' },
        { label: 'Less Than', value: 'lt' },
    ];

    conditionSourceOptions = [
        { label: 'Value', value: 'value' },
        { label: 'Input Document', value: 'document' },
        { label: 'Source Document', value: 'source' },
    ];

    ngOnInit(): void {
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
        this.properties.validations = this.properties.validations || [];
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }

    addValidation() {
        this.properties.validations.push({
            dbCollection: 'VcDocument',
            filters: [],
            conditions: [],
            failMessage: 'Validation failed',
        });
    }

    removeValidation(i: number) {
        this.properties.validations.splice(i, 1);
    }

    addFilter(validation: any, vi: number) {
        validation.filters.push({
            field: '',
            type: 'equal',
            typeValue: 'value',
            value: '',
        });
    }

    removeFilter(validation: any, fi: number) {
        validation.filters.splice(fi, 1);
    }

    addCondition(validation: any, vi: number) {
        validation.conditions.push({
            field: '',
            fieldSource: 'document',
            type: 'equal',
            value: '',
            valueSource: 'source',
        });
    }

    removeCondition(validation: any, ci: number) {
        validation.conditions.splice(ci, 1);
    }

    onSave() {
        this.item.changed = true;
    }
}
