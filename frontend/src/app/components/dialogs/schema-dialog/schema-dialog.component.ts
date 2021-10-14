import { Component, OnInit, Inject, ViewChild, ElementRef } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { SchemaConfigurationComponent } from '../../schema-configuration/schema-configuration.component';

@Component({
    selector: 'schema-dialog',
    templateUrl: './schema-dialog.component.html',
    styleUrls: ['./schema-dialog.component.css']
})
export class SchemaDialog {
    @ViewChild('document') document!: SchemaConfigurationComponent;
    schemes: any[];

    constructor(
        public dialogRef: MatDialogRef<SchemaDialog>,
        private fb: FormBuilder,
        @Inject(MAT_DIALOG_DATA) public data: any) {
        this.schemes = data.schemes || [];
    }

    getDocument(document: any) {
        this.dialogRef.close(document);
    }
}