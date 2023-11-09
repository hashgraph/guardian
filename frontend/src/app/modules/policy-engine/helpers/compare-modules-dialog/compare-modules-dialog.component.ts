import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
    selector: 'compare-modules-dialog',
    templateUrl: './compare-modules-dialog.component.html',
    styleUrls: ['./compare-modules-dialog.component.css']
})
export class CompareModulesDialogComponent {
    loading = true;

    module!: any;
    modules: any[];

    moduleId1!: any;
    moduleId2!: any;

    list1: any[];
    list2: any[];

    constructor(
        public dialogRef: MatDialogRef<CompareModulesDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any) {

        this.module = data.module;
        this.modules = data.modules || [];
        this.moduleId1 = this.module?.id;
        this.list1 = this.modules;
        this.list2 = this.modules;
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
        this.dialogRef.close({
            moduleId1: this.moduleId1,
            moduleId2: this.moduleId2,
        });
    }

    onChange() {
        this.list1 = this.modules.filter(s => s.id !== this.moduleId2);
        this.list2 = this.modules.filter(s => s.id !== this.moduleId1);
    }
}
