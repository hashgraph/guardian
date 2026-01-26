import { Component } from '@angular/core';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { TreeListItem, TreeListView } from 'src/app/modules/common/tree-graph/tree-list';

@Component({
    selector: 'field-link-dialog',
    templateUrl: './field-link-dialog.component.html',
    styleUrls: ['./field-link-dialog.component.scss'],
})
export class FieldLinkDialog {
    public loading = true;
    public items: TreeListView<any> | null;
    public item: TreeListItem<any> | null;
    public title: string;
    public search: string;
    public value: string | null;
    public viewId: boolean;
    public groups: {
        id: string,
        name: string,
        view: TreeListView<any>,
        highlighted: boolean,
        searchHighlighted: boolean,
    }[] | null;
    public selectedGroup: any;

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private dialogService: DialogService,
    ) {
        this.title = this.config.data?.title;
        this.value = this.config.data?.value;
        this.items = this.config.data?.view;
        this.groups = this.config.data?.groups;
        this.viewId = this.config.data?.viewId !== false;
        if (!this.groups?.length) {
            this.groups = null;
        }
        if (this.groups) {
            const group = this.config.data?.group;
            this.items = null;
            if (group) {
                this.selectedGroup = this.groups.find((g) => g.id === group) || this.groups[0];
            } else {
                this.selectedGroup = this.groups[0];
            }
        }
    }

    ngOnInit() {
        this.loading = false;
    }

    ngOnDestroy(): void {
    }

    public onClose(): void {
        this.ref.close(null);
    }

    public onCollapseItem(item: TreeListItem<any>) {
        if (this.items) {
            this.items.collapse(item, !item.collapsed);
            this.items.updateHidden();
        }
    }

    public onSelectItem(item: TreeListItem<any>) {
        if (item.expandable) {
            this.onCollapseItem(item);
            return;
        }
        this.value = item.id;
        this.item = item;
    }

    public onSubmit(): void {
        if (this.value && this.item) {
            const parents = this.getParents(this.item);
            const fullName = parents.map(e => e.name).join('|');
            this.ref.close({
                group: this.selectedGroup?.id,
                fullName: fullName,
                name: this.item.name,
                value: this.value
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

    public onFilter() {
        const search = (this.search || '').toLowerCase();
        this.items?.searchItems(search, [0, 1]);
    }

    public onSelectGroup(group: any) {
        this.selectedGroup = group;
    }

    public onNext() {
        if (this.selectedGroup) {
            this.items = this.selectedGroup.view;
        }
    }

    public onPrev() {
        this.items = null;
    }
}
