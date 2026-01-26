import { Component, ElementRef, EventEmitter, Inject, Input, Output, SimpleChanges, ViewChild } from '@angular/core';

/**
 * menu button.
 */
@Component({
    selector: 'pages-control',
    templateUrl: './pages-control.component.html',
    styleUrls: ['./pages-control.component.scss']
})
export class PagesControl {
    @Input('items') items!: any[];
    @Input('current') current!: any;

    @Input('labelField') labelField: string = 'name';

    @Output('select') select = new EventEmitter<any>();
    @Output('create') create = new EventEmitter<void>();
    @Output('delete') delete = new EventEmitter<any>();
    @Output('rename') rename = new EventEmitter<any>();

    public index: number = 0;

    public get isFirst() {
        return this.index < 1;
    }

    public get isLast() {
        return this.index + 1 >= this.items?.length;
    }

    public readonly menuData = [{
        tooltip: 'Rename',
        icon: 'edit',
        color: 'guardian-button-secondary',
        iconColor: 'icon-color-primary',
        item: null,
        click: (item: any) => {
            this.onRename(item);
        }
    },
    {
        tooltip: 'Delete',
        icon: 'delete',
        color: 'guardian-button-delete',
        iconColor: 'icon-color-delete',
        item: null,
        click: (item: any) => {
            this.onDelete(item);
        }
    }];

    constructor() {
    }

    private updateView() {
        if (this.index >= this.items.length) {
            this.index = 0;
        }
        if (this.index < 0) {
            this.index = 0;
        }
    }

    ngOnChanges(changes: SimpleChanges): void {
        this.items = this.items || [];
        this.updateView();
    }

    ngAfterViewInit(): void {

    }

    onSelect(item: any, overlayPanel?: any) {
        if (overlayPanel) {
            overlayPanel.toggle(false);
            this.index = this.items.findIndex((e) => e === item);
        }
        this.current = item;
        this.select.emit(this.current);
    }

    onAdd() {
        this.create.emit();
    }

    onDelete(item: any) {
        this.delete.emit(item);
    }

    onRename(item: any) {
        this.rename.emit(item);
    }

    onLeft() {
        if (this.index > 0) {
            this.index--;
        }
        this.updateView();
    }

    onMore($event: MouseEvent, overlayPanel: any, otherPanel: any) {
        $event?.stopPropagation();
        overlayPanel.toggle(event);
        otherPanel?.toggle(false);
    }

    onRight() {
        if (this.index < this.items.length - 1) {
            this.index++;
        }
        this.updateView();
    }

    onMenu($event: MouseEvent, page: any, overlayPanel: any, otherPanel: any) {
        for (const btn of this.menuData) {
            btn.item = page;
        }
        $event?.stopPropagation();
        overlayPanel?.toggle(event);
        otherPanel?.toggle(false);
    }
}