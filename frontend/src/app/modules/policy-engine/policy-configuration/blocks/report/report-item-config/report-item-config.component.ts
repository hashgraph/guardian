import {Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewEncapsulation} from '@angular/core';
import {IconPreviewDialog} from 'src/app/modules/common/icon-preview-dialog/icon-preview-dialog.component';
import {IPFS_SCHEMA} from 'src/app/services/api';
import {IPFSService} from 'src/app/services/ipfs.service';
import {IModuleVariables, PolicyBlock} from '../../../../structures';
import {DialogService} from 'primeng/dynamicdialog';

/**
 * Settings for block of 'reportItemBlock' type.
 */
@Component({
    selector: 'report-item-config',
    templateUrl: './report-item-config.component.html',
    styleUrls: ['./report-item-config.component.scss'],
    encapsulation: ViewEncapsulation.Emulated,
    standalone: false
})
export class ReportItemConfigComponent implements OnInit {
    @Input('block') currentBlock!: PolicyBlock;
    @Input('readonly') readonly!: boolean;
    @Output() onInit = new EventEmitter();

    private moduleVariables!: IModuleVariables | null;
    private item!: PolicyBlock;

    fileLoading = false;

    propHidden: any = {
        main: false,
        properties: false,
        filterGroup: false,
        filters: {},
        variableGroup: false,
        commonVariableGroup: true,
        variables: {},
        dynamicFilterGroup: false,
        dynamicFilters: {}
    };

    properties!: any;

    private groupsInitialized = false;

    public iconTypeOptions = [
        {label: 'Common Library', value: 'common'},
        {label: 'Custom', value: 'custom'}
    ];

    public filterTypeOptions = [
        {label: 'Equal', value: 'equal'},
        {label: 'Not Equal', value: 'not_equal'},
        {label: 'In', value: 'in'},
        {label: 'Not In', value: 'not_in'}
    ];

    public typeValueOptions = [
        {label: 'Value', value: 'value'},
        {label: 'Variable', value: 'variable'}
    ];

    constructor(
        private ipfs: IPFSService,
        private dialog: DialogService,
    ) {
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
        this.properties.filters = this.properties.filters || [];
        this.properties.dynamicFilters = this.properties.dynamicFilters || [];
        this.properties.variables = this.properties.variables || [];
        this.properties.visible = this.properties.visible !== false;
        this.properties.iconType = this.properties.iconType;
        if (!this.groupsInitialized) {
            this.propHidden.filterGroup = this.properties.filters.length === 0;
            this.propHidden.variableGroup = this.properties.variables.length === 0;
            this.propHidden.dynamicFilterGroup = this.properties.dynamicFilters.length === 0;
            this.groupsInitialized = true;
        }
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }

    addVariable() {
        this.properties.variables.push({});
        this.propHidden.variableGroup = false;
    }

    onRemoveVariable(i: number) {
        this.properties.variables.splice(i, 1);
        if (this.properties.variables.length === 0) {
            this.propHidden.variableGroup = true;
        }
    }

    addFilter() {
        this.properties.filters.push({});
        this.propHidden.filterGroup = false;
    }

    onRemoveFilter(i: number) {
        this.properties.filters.splice(i, 1);
        if (this.properties.filters.length === 0) {
            this.propHidden.filterGroup = true;
        }
    }

    addDynamicFilter() {
        this.properties.dynamicFilters.push({});
        this.propHidden.dynamicFilterGroup = false;
    }

    onRemoveDynamicFilter(i: number) {
        this.properties.dynamicFilters.splice(i, 1);
        if (this.properties.dynamicFilters.length === 0) {
            this.propHidden.dynamicFilterGroup = true;
        }
    }

    onFileSelected(event: any, block: any) {
        const file = event?.target?.files[0];

        if (!file) {
            return;
        }
        this.fileLoading = true;
        this.ipfs.addFile(file)
            .subscribe(res => {
                block.icon = IPFS_SCHEMA + res;
                this.fileLoading = false;
            }, error => {
                this.fileLoading = false;
            });
    }

    iconPreview() {
        this.dialog.open(IconPreviewDialog, {
            data: {
                iconType: this.properties.iconType,
                icon: this.properties.icon
            }
        });
    }

    onMultipleChange() {
        this.properties.dynamicFilters = [];
    }

    onSave() {
        this.item.changed = true;
    }
}
