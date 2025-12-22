import {Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewEncapsulation} from '@angular/core';
import {IModuleVariables, PolicyBlock} from '../../../../structures';

/**
 * Settings for block of 'interfaceAction' type.
 */
@Component({
    selector: 'button-config',
    templateUrl: './button-config.component.html',
    styleUrls: ['./button-config.component.scss'],
    encapsulation: ViewEncapsulation.Emulated
})
export class ButtonConfigComponent implements OnInit {
    @Input('block') currentBlock!: PolicyBlock;
    @Input('readonly') readonly!: boolean;
    @Output() onInit = new EventEmitter();

    private moduleVariables!: IModuleVariables | null;
    private item!: PolicyBlock;

    propHidden: any = {
        buttonsGroup: false,
        buttons: {}
    };

    properties!: any;

    public buttonTypeOptions = [
        {label: 'Selector', value: 'selector'},
        {label: 'Selector Dialog', value: 'selector-dialog'}
    ];

    public filterTypeOptions = [
        {label: 'Equal', value: 'equal'},
        {label: 'Not Equal', value: 'not_equal'},
        {label: 'In', value: 'in'},
        {label: 'Not In', value: 'not_in'}
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
        this.properties.uiMetaData = this.properties.uiMetaData || {};

        this.ensureUiMetaDataDefaults();

        this.properties.uiMetaData.buttons = this.properties.uiMetaData.buttons || [];

        this.ensureButtonsDefaults(this.properties.uiMetaData.buttons);

        for (const i in this.properties.uiMetaData.buttons) {
            this.propHidden.buttons[i] = {};
        }
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }

    addButton() {
        this.properties.uiMetaData.buttons.push({
            tag: `Button_${this.properties.uiMetaData.buttons.length}`,
            name: '',
            type: 'selector',
            filters: [],
            uiClassStateRead: false,
            uiClassStateWrite: false,
            setVisibleButtons: ''
        })
        this.propHidden.buttons[this.properties.uiMetaData.buttons.length - 1] = {};
    }

    addFilter(button: any) {
        button.filters.push({
            value: '',
            field: '',
            type: 'equal',
        })
    }

    onRemoveButton(i: number) {
        this.properties.uiMetaData.buttons.splice(i, 1);
    }

    onRemoveFilter(button: any, i: number) {
        button.filters.splice(i, 1);
    }

    onSave() {
        this.item.changed = true;
    }

    private ensureUiMetaDataDefaults(): void {
        const uiMetaData = this.properties.uiMetaData;

        if (typeof uiMetaData.enableIndividualFilters !== 'boolean') {
            uiMetaData.enableIndividualFilters = false;
        }
    }

    private ensureButtonsDefaults(buttons: any[]): void {
        if (!Array.isArray(buttons)) {
            return;
        }

        for (const button of buttons) {
            if (typeof button.uiClassStateRead !== 'boolean') {
                button.uiClassStateRead = false;
            }

            if (typeof button.uiClassStateWrite !== 'boolean') {
                button.uiClassStateWrite = false;
            }

            if (typeof button.setVisibleButtons !== 'string') {
                button.setVisibleButtons = '';
            }

            if (typeof button.uiClassStateDefaultVisible !== 'boolean') {
                button.uiClassStateDefaultVisible = true;
            }
        }
    }
}
