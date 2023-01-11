import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
    selector: 'compare-schema-dialog',
    templateUrl: './compare-schema-dialog.component.html',
    styleUrls: ['./compare-schema-dialog.component.css']
})
export class CompareSchemaDialog {
    loading = true;

    schema!: any;
    schemas: any[];

    schemaId1!: any;
    schemaId2!: any;

    constructor(
        public dialogRef: MatDialogRef<CompareSchemaDialog>,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
        this.schema = data.schema;
        this.schemas = data.schemas || [];
        this.schemaId1 = this.schema?.id;
    }

    ngOnInit() {
        this.loading = false;
    }

    setData(data: any) {
    }

    onClose(): void {
        this.dialogRef.close(false);
    }

    onCompare() {
        this.dialogRef.close({
            schemaId1: this.schemaId1,
            schemaId2: this.schemaId2,
        });
    }
}