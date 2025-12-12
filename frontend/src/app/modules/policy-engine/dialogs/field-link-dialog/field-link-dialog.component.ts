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
    public itemId: string | null;
    public items: TreeListView<any> | null;

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private dialogService: DialogService,
    ) {
        this.schema = this.config.data?.schema;
        this.itemId = this.config.data?.link;
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
            this.ref.close(this.itemId);
        }
    }
}
