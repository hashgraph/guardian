import {Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewEncapsulation} from '@angular/core';
import {IModuleVariables, PolicyBlock} from '../../../../structures';

/**
 * Settings for block of 'switch' and 'interfaceStepBlock' types.
 */
@Component({
    selector: 'switch-config',
    templateUrl: './switch-config.component.html',
    styleUrls: ['./switch-config.component.scss'],
    encapsulation: ViewEncapsulation.Emulated,
    standalone: false
})
export class SwitchConfigComponent implements OnInit {
    @Input('block') currentBlock!: PolicyBlock;
    @Input('readonly') readonly!: boolean;
    @Output() onInit = new EventEmitter();

    private moduleVariables!: IModuleVariables | null;
    private item!: PolicyBlock;

    propHidden: any = {
        main: false,
        options: false,
        conditionsGroup: false,
        conditions: {},
    };

    properties!: any;

    private conditionsGroupInitialized = false;

    public executionFlowOptions = [
        {label: 'First True', value: 'firstTrue'},
        {label: 'All True', value: 'allTrue'}
    ];

    public conditionTypeOptions = [
        {label: 'Equal', value: 'equal'},
        {label: 'Not Equal', value: 'not_equal'},
        {label: 'Unconditional', value: 'unconditional'}
    ];

    public actorOptions = [
        {label: 'Current User', value: ''},
        {label: 'Document Owner', value: 'owner'},
        {label: 'Document Issuer', value: 'issuer'}
    ];

    constructor() {
    }

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
        this.properties.executionFlow = this.properties.executionFlow || 'firstTrue';
        this.properties.conditions = this.properties.conditions || [];
        if (!this.conditionsGroupInitialized) {
            this.propHidden.conditionsGroup = this.properties.conditions.length === 0;
            this.conditionsGroupInitialized = true;
        }
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }

    addCondition() {
        this.properties.conditions.push({
            tag: `Condition_${this.properties.conditions.length}`,
            type: 'equal',
            value: '',
            actor: '',
        })
        this.propHidden.conditionsGroup = false;
    }

    onRemoveCondition(i: number) {
        this.properties.conditions.splice(i, 1);
        if (this.properties.conditions.length === 0) {
            this.propHidden.conditionsGroup = true;
        }
    }

    onSave() {
        this.item.changed = true;
    }
}
