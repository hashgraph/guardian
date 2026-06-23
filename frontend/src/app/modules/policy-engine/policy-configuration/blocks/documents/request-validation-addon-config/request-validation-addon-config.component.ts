import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { PolicyBlock, SchemaVariables } from '../../../../structures';

/**
 * Settings for a block of the 'requestValidationAddon' type.
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

    private item!: PolicyBlock;

    propHidden: any = {
        validationsGroup: false,
        validations: {},
        filters: {},
        conditions: {},
        filterItems: {},
        conditionItems: {},
    };

    properties!: any;
    schemas!: SchemaVariables[];

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
        this.schemas = [];
        this.onInit.emit(this);
        this.load(this.currentBlock);
    }

    ngOnChanges(changes: SimpleChanges) {
        this.load(this.currentBlock);
    }

    load(block: PolicyBlock) {
        this.item = block;
        this.properties = block.properties;
        this.properties.validations = this.properties.validations || [];
        this.schemas = block.moduleVariables?.schemas || [];
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }

    onHideNested(container: any, vi: number, fi: number) {
        const key = `${vi}_${fi}`;
        container[key] = !container[key];
    }

    isNestedHidden(container: any, vi: number, fi: number): boolean {
        return !!container[`${vi}_${fi}`];
    }

    addValidation() {
        this.properties.validations.push({
            dbCollection: 'VcDocument',
            schema: null,
            onlyOwnDocuments: false,
            onlyOwnByGroupDocuments: false,
            onlyAssignDocuments: false,
            onlyAssignByGroupDocuments: false,
            filters: [],
            conditions: [],
            failMessage: 'Validation failed',
        });
        this.onSave();
    }

    removeValidation(i: number) {
        this.properties.validations.splice(i, 1);
        this.onSave();
    }

    addFilter(validation: any, vi: number) {
        validation.filters.push({
            field: '',
            type: 'equal',
            typeValue: 'value',
            value: '',
        });
        this.onSave();
    }

    removeFilter(validation: any, fi: number) {
        validation.filters.splice(fi, 1);
        this.onSave();
    }

    addCondition(validation: any, vi: number) {
        validation.conditions.push({
            field: '',
            fieldSource: 'document',
            type: 'equal',
            value: '',
            valueSource: 'source',
        });
        this.onSave();
    }

    removeCondition(validation: any, ci: number) {
        validation.conditions.splice(ci, 1);
        this.onSave();
    }

    onSave() {
        this.item.changed = true;
    }
}
