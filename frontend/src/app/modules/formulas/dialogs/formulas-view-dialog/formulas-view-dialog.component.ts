import { ChangeDetectorRef, Component, ElementRef, ViewChild } from '@angular/core';
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

    public isLargeSize: boolean = true;
    private startX: number = 0;
    private startWidthPercent: number = 25;
    private containerWidth: number = 0;
    private readonly MIN_WIDTH_PERCENT = 0;
    private readonly MAX_WIDTH_PERCENT = 75;
    private rafId: number | null = null;

    @ViewChild('dialogHeader', { static: false }) dialogHeader!: ElementRef<HTMLDivElement>;
    @ViewChild('navContainer') navContainerRef?: ElementRef;
    @ViewChild('contentContainer') contentContainerRef?: ElementRef;

    public viewDocumentOptions = [
        { label: 'Formulas', key: 'formulas', icon: 'function' },
        { label: 'Diagram',    key: 'diagram',    icon: 'graph' },
        { label: 'Files',    key: 'files',    icon: 'file' }
    ];

    public activeTab: string = 'formulas';

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
        private dialogService: DialogService,
        private changeDetectorRef: ChangeDetectorRef
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
    
    public onResizeStart(event: MouseEvent): void {
        event.preventDefault();
        event.stopPropagation();
        
        this.startX = event.clientX;
        
        if (this.contentContainerRef) {
            this.containerWidth = this.contentContainerRef.nativeElement.offsetWidth;
        }
        
        if (this.navContainerRef) {
            const currentWidth = this.navContainerRef.nativeElement.offsetWidth;
            this.startWidthPercent = (currentWidth / this.containerWidth) * 100;
        }
        
        document.body.classList.add('resizing');
        document.addEventListener('mousemove', this.onResizeMove);
        document.addEventListener('mouseup', this.onResizeEnd);
    }

    private onResizeMove = (event: MouseEvent): void => {
        event.preventDefault();
        
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
        }
        
        this.rafId = requestAnimationFrame(() => {
            if (!this.navContainerRef || !this.contentContainerRef)
                return;
            
            const navElement = this.navContainerRef.nativeElement;
            const contentElement = this.contentContainerRef.nativeElement;
            
            this.containerWidth = contentElement.offsetWidth;
            const deltaX = event.clientX - this.startX;
            const deltaPercent = (deltaX / this.containerWidth) * 100;
            let newWidthPercent = this.startWidthPercent + deltaPercent;
            
            newWidthPercent = Math.max(
                this.MIN_WIDTH_PERCENT, 
                Math.min(this.MAX_WIDTH_PERCENT, newWidthPercent)
            );
            
            navElement.style.width = `${newWidthPercent}%`;
            
            this.startWidthPercent = newWidthPercent;
            this.startX = event.clientX;
            
            this.changeDetectorRef.detectChanges();
            this.rafId = null;
        });
    }

    private onResizeEnd = (event: MouseEvent): void => {
        document.body.classList.remove('resizing');
        
        if (this.rafId) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
        
        document.removeEventListener('mousemove', this.onResizeMove);
        document.removeEventListener('mouseup', this.onResizeEnd);
        
        this.changeDetectorRef.detectChanges();
    }
}
