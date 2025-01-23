import { Component } from '@angular/core';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { TreeListData, TreeListItem, TreeListView } from 'src/app/modules/common/tree-graph/tree-list';
import { FieldData } from 'src/app/modules/common/models/schema-node';
import { FormulaLink } from '../../formula-configuration/formulas';

@Component({
    selector: 'link-dialog',
    templateUrl: './link-dialog.component.html',
    styleUrls: ['./link-dialog.component.scss'],
})
export class LinkDialog {
    public loading = true;
    public schemas: any[];
    public formulas: any[];
    public type: 'schema' | 'formula';
    public step: number = 1;
    public entityId: string;
    public itemId: string | null;
    public items: TreeListView<any> | null;

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private dialogService: DialogService,
    ) {
        this.schemas = this.config.data?.schemas || [];
        this.formulas = this.config.data?.formulas || [];
        if (this.schemas.length) {
            this.type = 'schema';
        } else if (this.formulas.length) {
            this.type = 'formula';
        } else {
            this.type = 'schema';
        }
        const link: FormulaLink = this.config.data?.link;
        if (link) {
            this.type = link.type;
            this.entityId = link.entityId;
            this.itemId = link.item;
        }
    }

    ngOnInit() {
        this.loading = false;
    }

    ngOnDestroy(): void {
    }

    public onChangeType(type: 'schema' | 'formula') {
        this.type = type;
    }

    public onSelectEntity(item: any) {
        if (this.type === 'schema') {
            this.entityId = item.iri;
        }
        if (this.type === 'formula') {
            this.entityId = item.uuid;
        }
    }

    public onClose(): void {
        this.ref.close(null);
    }

    public onNext() {
        this.step = 2;
        this.items = null;
        if (this.type === 'schema') {
            const schema = this.schemas.find((s) => s.iri === this.entityId);
            const fields = TreeListData.fromObject<FieldData>(schema, 'fields');
            this.items = TreeListView.createView(fields, (s) => { return !s.parent });
        }
        if (this.type === 'formula') {
            const formula = this.formulas.find((s) => s.uuid === this.entityId);
            const fields = TreeListData.fromObject<FieldData>(formula.config || {}, 'formulas');
            this.items = TreeListView.createView(fields, (s) => { return !s.parent });
        }
    }

    public onPrev() {
        this.step = 1;
    }

    public onCollapseField(item: TreeListItem<any>) {
        if (this.items) {
            this.items.collapse(item, !item.collapsed);
            this.items.updateHidden();
        }
    }

    public onSelectField(item: TreeListItem<any>) {
        if (item.expandable) {
            this.onCollapseField(item);
            return;
        }
        this.itemId = item.data.path;
    }

    public onSelectVariable(item: TreeListItem<any>) {
        if (item.expandable) {
            this.onCollapseField(item);
            return;
        }
        this.itemId = item.data.uuid;
    }

    public onSubmit(): void {
        if (this.itemId) {
            const result: FormulaLink = {
                type: this.type,
                entityId: this.entityId,
                item: this.itemId
            }
            this.ref.close(result);
        }
    }
}
