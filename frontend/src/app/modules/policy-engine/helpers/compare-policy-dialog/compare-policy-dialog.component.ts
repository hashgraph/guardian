import { ChangeDetectorRef, Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
    selector: 'compare-policy-dialog',
    templateUrl: './compare-policy-dialog.component.html',
    styleUrls: ['./compare-policy-dialog.component.css']
})
export class ComparePolicyDialog {
    loading = true;

    type: string;

    item!: any;
    items: any[];

    itemID_1!: string;
    itemID_2!: string[];

    list1: any[];
    list2: any[];

    constructor(
        public dialogRef: MatDialogRef<ComparePolicyDialog>,
        private changeDetector: ChangeDetectorRef,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
        this.type = data.type || 'policy';
        if (this.type === 'policy') {
            this.item = data.policy;
            this.items = data.policies || [];
        } else if (this.type === 'tool') {
            this.item = data.tool;
            this.items = data.tools || [];
        } else {
            this.item = data.item;
            this.items = data.items || [];
        }
        this.itemID_1 = this.item?.id;
        this.list1 = this.items;
        this.list2 = this.items;

    }

    public get disabled(): boolean {
        return !(this.itemID_1 && this.itemID_2 && this.itemID_2.length);
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
        this.dialogRef.close(false);
    }

    onCompare() {
        if (this.disabled) {
            return;
        }
        if (this.type === 'policy') {
            const policyIds = [this.itemID_1, ...this.itemID_2];
            this.dialogRef.close({ policyIds });
        } else if (this.type === 'tool') {
            const toolIds = [this.itemID_1, ...this.itemID_2];
            this.dialogRef.close({ toolIds });
        } else {
            const ids = [this.itemID_1, ...this.itemID_2];
            this.dialogRef.close({ ids });
        }
    }

    onChange() {
        if (this.itemID_1) {
            this.list2 = this.items.filter(s => s.id !== this.itemID_1);
        } else {
            this.list2 = this.items;
        }
        if (this.itemID_2 && this.itemID_2.length) {
            this.list1 = this.items.filter(s => this.itemID_2.indexOf(s.id) === -1);
        } else {
            this.list1 = this.items;
        }
        this.changeDetector.detectChanges();
    }
}