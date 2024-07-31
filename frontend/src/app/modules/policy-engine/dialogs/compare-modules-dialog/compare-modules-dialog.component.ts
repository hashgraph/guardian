import { Component } from '@angular/core';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
    selector: 'compare-modules-dialog',
    templateUrl: './compare-modules-dialog.component.html',
    styleUrls: ['./compare-modules-dialog.component.scss']
})
export class CompareModulesDialogComponent {
    loading = true;

    type: string = '';

    item!: any;
    items: any[];

    itemId1!: any;
    itemId2!: any;

    list1: any[];
    list2: any[];

    constructor(
        public ref: DynamicDialogRef,
        public config: DynamicDialogConfig,
    ) {
        this.type = config.data.type || 'Module';
        this.item = config.data.module || config.data.tool;
        this.items = config.data.modules || config.data.tools || [];
        this.itemId1 = this.item?.id;
        this.list1 = this.items;
        this.list2 = this.items;
    }

    ngOnInit() {
        this.loading = false;
        setTimeout(() => {
            this.onChange();
        });
    }

    setData(data: any) {
    }

    onClose(): void {
        this.ref.close(false);
    }

    onCompare() {
        this.ref.close({
            itemId1: this.itemId1,
            itemId2: this.itemId2,
        });
    }

    onChange() {
        this.list1 = this.items.filter(s => s.id !== this.itemId2);
        this.list2 = this.items.filter(s => s.id !== this.itemId1);
    }
}
