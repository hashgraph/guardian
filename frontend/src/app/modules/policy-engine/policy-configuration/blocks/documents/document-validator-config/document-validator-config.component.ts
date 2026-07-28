import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { IModuleVariables, PolicyBlock, SchemaVariables } from '../../../../structures';

/**
 * Settings for block of 'documentValidatorBlock' type.
 */
@Component({
    selector: 'document-validator-config',
    templateUrl: './document-validator-config.component.html',
    styleUrls: ['./document-validator-config.component.scss'],
    encapsulation: ViewEncapsulation.Emulated,
    standalone: false
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
        sourceValidationsGroup: false,
        sourceValidations: {},
        sourceFilters: {},
        sourceConds: {},
        sourceFilterItems: {},
        sourceCondItems: {},
    };

    properties!: any;
    schemas!: SchemaVariables[];

    documentTypeOptions = [
        { label: 'VC Document', value: 'vc-document' },
        { label: 'VP Document', value: 'vp-document' },
        { label: 'Related VC Document', value: 'related-vc-document' },
        { label: 'Related VP Document', value: 'related-vp-document' },
    ];

    collectionOptions = [
        { label: 'VC Document', value: 'VcDocument' },
        { label: 'VP Document', value: 'VpDocument' },
    ];

    operatorOptions = [
        { label: 'Equal', value: 'equal' },
        { label: 'Not Equal', value: 'not_equal' },
        { label: 'In', value: 'in' },
        { label: 'Not In', value: 'not_in' },
        { label: 'Greater Than', value: 'gt' },
        { label: 'Greater Than or Equal', value: 'gte' },
        { label: 'Less Than', value: 'lt' },
        { label: 'Less Than or Equal', value: 'lte' },
    ];

    filterValueTypeOptions = [
        { label: 'Value', value: 'value' },
        { label: 'Variable (Input Doc)', value: 'variable' },
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
        this.moduleVariables = block.moduleVariables;
        this.item = block;
        this.properties = block.properties;
        this.properties.conditions = this.properties.conditions || [];
        this.properties.sourceValidations = this.properties.sourceValidations || [];
        this.schemas = this.moduleVariables?.schemas || [];
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

    // Same-doc conditions
    addCondition() {
        this.properties.conditions.push({ value: '', field: '', type: 'equal' });
    }

    removeCondition(i: number) {
        this.properties.conditions.splice(i, 1);
        this.onSave();
    }

    // Source validations
    addSourceValidation() {
        this.properties.sourceValidations.push({
            dbCollection: 'VcDocument',
            schema: null,
            onlyOwnDocuments: false,
            onlyOwnByGroupDocuments: false,
            onlyAssignDocuments: false,
            onlyAssignByGroupDocuments: false,
            filters: [],
            conditions: [],
        });
        this.onSave();
    }

    removeSourceValidation(i: number) {
        this.properties.sourceValidations.splice(i, 1);
        this.onSave();
    }

    addFilter(validation: any) {
        validation.filters.push({ field: '', type: 'equal', typeValue: 'value', value: '' });
    }

    removeFilter(validation: any, fi: number) {
        validation.filters.splice(fi, 1);
        this.onSave();
    }

    addCrossCondition(validation: any) {
        validation.conditions.push({
            field: '',
            fieldSource: 'document',
            type: 'equal',
            value: '',
            valueSource: 'source',
        });
    }

    removeCrossCondition(validation: any, ci: number) {
        validation.conditions.splice(ci, 1);
        this.onSave();
    }

    onSave() {
        this.item.changed = true;
    }
}
