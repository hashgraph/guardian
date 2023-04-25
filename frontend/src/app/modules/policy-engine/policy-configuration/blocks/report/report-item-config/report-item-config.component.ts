import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { IconPreviewDialog } from 'src/app/modules/common/icon-preview-dialog/icon-preview-dialog.component';
import { IPFS_SCHEMA } from 'src/app/services/api';
import { IPFSService } from 'src/app/services/ipfs.service';
import { IModuleVariables, PolicyBlockModel } from '../../../../structures';

/**
 * Settings for block of 'reportItemBlock' type.
 */
@Component({
    selector: 'report-item-config',
    templateUrl: './report-item-config.component.html',
    styleUrls: ['./report-item-config.component.css'],
    encapsulation: ViewEncapsulation.Emulated
})
export class ReportItemConfigComponent implements OnInit {
    @Input('block') currentBlock!: PolicyBlockModel;
    @Input('readonly') readonly!: boolean;
    @Output() onInit = new EventEmitter();

    private moduleVariables!: IModuleVariables | null;
    private item!: PolicyBlockModel;
    
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

    constructor(
        private ipfs: IPFSService,
        public dialog: MatDialog
    ) { }

    ngOnInit(): void {
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
        this.properties.filters = this.properties.filters || [];
        this.properties.dynamicFilters = this.properties.dynamicFilters || [];
        this.properties.variables = this.properties.variables || [];
        this.properties.visible = this.properties.visible !== false;
        this.properties.iconType = this.properties.iconType;
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }

    addVariable() {
        this.properties.variables.push({});
    }

    onRemoveVariable(i: number) {
        this.properties.variables.splice(i, 1);
    }

    addFilter() {
        this.properties.filters.push({});
    }

    onRemoveFilter(i: number) {
        this.properties.filters.splice(i, 1);
    }

    addDynamicFilter() {
        this.properties.dynamicFilters.push({});
    }

    onRemoveDynamicFilter(i: number) {
        this.properties.dynamicFilters.splice(i, 1);
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
