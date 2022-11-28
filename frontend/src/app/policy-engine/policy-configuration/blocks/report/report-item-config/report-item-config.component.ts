import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Schema, Token } from '@guardian/interfaces';
import { IconPreviewDialog } from 'src/app/components/icon-preview-dialog/icon-preview-dialog.component';
import { PolicyBlockModel, PolicyModel } from 'src/app/policy-engine/structures/policy-model';
import { IPFS_SCHEMA } from 'src/app/services/api';
import { IPFSService } from 'src/app/services/ipfs.service';

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
    @Input('policy') policy!: PolicyModel;
    @Input('block') currentBlock!: PolicyBlockModel;
    @Input('schemas') schemas!: Schema[];
    @Input('tokens') tokens!: Token[];
    @Input('readonly') readonly!: boolean;
    @Output() onInit = new EventEmitter();

    fileLoading = false;

    propHidden: any = {
        main: false,
        filterGroup: false,
        filters: {},
        variableGroup: false,
        variables: {},
        dynamicFilterGroup: false,
        dynamicFilters: {}
    };

    block!: any;

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
        this.block = block.properties;
        this.block.filters = this.block.filters || [];
        this.block.dynamicFilters = this.block.dynamicFilters || [];
        this.block.variables = this.block.variables || [];
        this.block.visible = this.block.visible !== false;
        this.block.iconType = this.block.iconType;
    }

    onHide(item: any, prop: any) {
        item[prop] = !item[prop];
    }

    addVariable() {
        this.block.variables.push({});
    }

    onRemoveVariable(i: number) {
        this.block.variables.splice(i, 1);
    }

    addFilter() {
        this.block.filters.push({});
    }

    onRemoveFilter(i: number) {
        this.block.filters.splice(i, 1);
    }

    addDynamicFilter() {
        this.block.dynamicFilters.push({});
    }

    onRemoveDynamicFilter(i: number) {
        this.block.dynamicFilters.splice(i, 1);
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
                iconType: this.block.iconType,
                icon: this.block.icon
            }
        });
    }

    onMultipleChange() {
        this.block.dynamicFilters = [];
    }
}
