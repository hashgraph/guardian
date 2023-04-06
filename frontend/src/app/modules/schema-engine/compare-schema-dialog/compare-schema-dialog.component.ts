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

    list1: any[];
    list2: any[];

    policies: any[];

    topicId1!: any;
    topicId2!: any;

    constructor(
        public dialogRef: MatDialogRef<CompareSchemaDialog>,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
        this.schema = data.schema;
        this.schemas = data.schemas || [];
        this.policies = data.policies || [];
        this.schemaId1 = this.schema?.id;
        this.list1 = this.schemas;
        this.list2 = this.schemas;
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

    onChange() {
        this.list1 = this.schemas.filter(s=> {
            if(this.topicId1) {
                return s.id !== this.schemaId2 && s.topicId === this.topicId1;
            } else {
                return s.id !== this.schemaId2;
            }
        });
        this.list2 = this.schemas.filter(s=> {
            if(this.topicId2) {
                return s.id !== this.schemaId1 && s.topicId === this.topicId2;
            } else {
                return s.id !== this.schemaId1;
            }
        });
    }
}