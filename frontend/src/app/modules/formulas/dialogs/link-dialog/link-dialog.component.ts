import { Component, ElementRef, ViewChild } from '@angular/core';
import { DialogService, DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { TreeListData, TreeListItem, TreeListView } from 'src/app/modules/common/tree-graph/tree-list';
import { FieldData } from 'src/app/modules/common/models/schema-node';
import { IFormulaLink } from '@guardian/interfaces';

@Component({
    selector: 'link-dialog',
    templateUrl: './link-dialog.component.html',
    styleUrls: ['./link-dialog.component.scss'],
    standalone: false
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
    public isLargeSize: boolean = true;
    private original: IFormulaLink | null = null;
    @ViewChild('dialogHeader', { static: false }) dialogHeader!: ElementRef<HTMLDivElement>;

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
        const link: IFormulaLink = this.config.data?.link;
        if (link) {
            this.type = link.type;
            this.entityId = link.entityId;
            this.itemId = link.item;
            this.original = link;
            const exists = link.type === 'schema'
                ? this.schemas.some((s) => s.iri === link.entityId)
                : this.formulas.some((s) => s.uuid === link.entityId);
            if (exists) {
                this.onNext();
            }
        }
    }

    ngOnInit() {
        this.loading = false;
    }

    ngOnDestroy(): void {
    }

    public onChangeType(type: 'schema' | 'formula') {
        if (this.type !== type) {
            this.type = type;
            this.entityId = this.original && this.original.type === type ? this.original.entityId : '';
            this.syncItem();
        }
    }

    /**
     * The linked field is kept only for the original entity.
     */
    private syncItem() {
        const same = !!this.original
            && this.original.type === this.type
            && this.original.entityId === this.entityId;
        this.itemId = same ? this.original!.item : null;
    }

    public onSelectEntity(item: any) {
        if (this.type === 'schema') {
            this.entityId = item.iri;
        }
        if (this.type === 'formula') {
            this.entityId = item.uuid;
        }
        this.syncItem();
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
        this.revealSelected();
    }

    private revealSelected() {
        if (!this.items || !this.itemId) {
            return;
        }
        const selected = this.items.findItem((e) => this.type === 'schema'
            ? e.data.path === this.itemId
            : e.data.uuid === this.itemId);
        if (!selected) {
            return;
        }
        this.items.collapsePath(selected.parent, false);
        this.items.updateHidden();
        setTimeout(() => {
            const row = this.dialogHeader?.nativeElement
                .closest('.p-dialog, .guardian-dialog')
                ?.querySelector('.field-item[data-selected="true"]');
            row?.scrollIntoView({ block: 'center' });
        }, 350);
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
            const result: IFormulaLink = {
                type: this.type,
                entityId: this.entityId,
                item: this.itemId
            }
            this.ref.close(result);
        }
    }

    public toggleSize(): void {
        this.isLargeSize = !this.isLargeSize;
        setTimeout(() => {
            if (this.dialogHeader) {
                const dialogEl = this.dialogHeader.nativeElement.closest('.p-dynamic-dialog, .guardian-dialog') as HTMLElement;
                if (dialogEl) {
                    if (this.isLargeSize) {
                        dialogEl.style.width = '90vw';
                        dialogEl.style.maxWidth = '90vw';
                    } else {
                        dialogEl.style.width = '50vw';
                        dialogEl.style.maxWidth = '50vw';
                    }
                    dialogEl.style.maxHeight = '90vh'
                    dialogEl.style.margin = 'auto';
                    dialogEl.style.transition = 'all 0.3s ease';
                }
            }
        }, 100);
    }
}
