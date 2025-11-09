import { Component } from '@angular/core';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { FormulaFiles, FormulaItem, FormulasTree, SchemaItem } from '../../models/formula-tree';
import { TreeListData, TreeListItem, TreeListView } from 'src/app/modules/common/tree-graph/tree-list';

@Component({
    selector: 'formulas-view-dialog',
    templateUrl: './formulas-view-dialog.component.html',
    styleUrls: ['./formulas-view-dialog.component.scss'],
})
export class FormulasViewDialog {
    public loading = true;
    public tree: FormulasTree;
    public schema: string;
    public path: string;
    public items: FormulaItem[];
    public current: FormulaItem | SchemaItem | null;
    public nav: TreeListView<any>;
    public files: FormulaFiles[];

    public viewDocumentOptions = [
        { label: 'Formulas', key: 'formulas', icon: 'function' },
        { label: 'Graph',    key: 'graph',    icon: 'graph' },
        { label: 'Files',    key: 'files',    icon: 'file' }
    ];

    public activeTab: string = 'formulas';

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private dialogService: DialogService,
    ) {
        this.tree = this.config.data?.tree;
        this.schema = this.config.data?.schema;
        this.path = this.config.data?.path;
    }

    ngOnInit() {
        this.loading = false;
        this.items = this.tree?.get(this.schema, this.path) || [];
        this.files = this.tree?.getFiles(this.items) || [];
        const navTree = FormulasTree.createNav(this.items)
        const fields = TreeListData.fromObject<any>(navTree, 'children');
        this.nav = TreeListView.createView(fields, (s) => { return !s.parent });
        this.nav.collapseAll(false);
        this.nav.updateHidden();
        this.selectItem(this.items[0]);
    }

    ngOnDestroy() {
    }

    public onClose(): void {
        this.ref.close(null);
    }

    public onLink(current: FormulaItem) {
        this.selectItem(current.linkItem);
    }

    public onRelationship(relationship: FormulaItem) {
        this.selectItem(relationship);
    }

    public onCollapseNav(item: TreeListItem<any>) {
        if (this.nav) {
            this.nav.collapse(item, !item.collapsed);
            this.nav.updateHidden();
        }
    }

    public onSelectNav(item: TreeListItem<any>) {
        this.selectItem(item.data.data);
    }

    private selectItem(current: FormulaItem | SchemaItem | null) {
        this.current = current;
        this.nav.data.items.forEach((e) => e.selected = e.data.data === this.current);
        this.nav.updateHidden();
        this.nav.updateSelected();
    }

    public setTab(event: any): void {
        const opt = this.viewDocumentOptions[event.index];
        this.activeTab = opt?.key || 'formulas';
    }
}
