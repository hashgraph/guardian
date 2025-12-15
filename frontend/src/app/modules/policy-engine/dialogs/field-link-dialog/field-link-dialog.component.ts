import { Component } from '@angular/core';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { TreeListData, TreeListItem, TreeListView } from 'src/app/modules/common/tree-graph/tree-list';
import { FieldData } from 'src/app/modules/common/models/schema-node';

@Component({
    selector: 'field-link-dialog',
    templateUrl: './field-link-dialog.component.html',
    styleUrls: ['./field-link-dialog.component.scss'],
})
export class FieldLinkDialog {
    public loading = true;
    public schema: any;
    public path: string | null;
    public items: TreeListView<any> | null;
    public item: TreeListItem<any> | null;

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private dialogService: DialogService,
    ) {
        this.schema = this.config.data?.schema;
        this.path = this.config.data?.link;
        const fields = TreeListData.fromObject<FieldData>(this.schema, 'fields');
        this.items = TreeListView.createView(fields, (s) => { return !s.parent });
    }

    ngOnInit() {
        this.loading = false;
    }

    ngOnDestroy(): void {
    }

    public onClose(): void {
        this.ref.close(null);
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
        this.path = item.data.path;
        this.item = item;
    }

    public onSelectVariable(item: TreeListItem<any>) {
        if (item.expandable) {
            this.onCollapseField(item);
            return;
        }
        this.path = item.data.uuid;
        this.item = item;
    }

    public onSubmit(): void {
        if (this.path) {
            const parents = this.getParents(this.item);
            const fullName = parents.map(e => e?.data?.description).join('|');
            this.ref.close({
                name: this.item?.data?.description,
                fullName: fullName,
                value: this.path
            });
        }
    }

    private getParents(item: TreeListItem<any> | null): TreeListItem<any>[] {
        if (item) {
            const parents = this.getParents(item.parent);
            parents.push(item);
            return parents;
        } else {
            return [];
        }
    }
}
