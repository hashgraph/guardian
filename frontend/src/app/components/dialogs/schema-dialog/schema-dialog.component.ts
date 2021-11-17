import { Component, OnInit, Inject, ViewChild, ElementRef } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { SchemaConfigurationComponent } from '../../schema-configuration/schema-configuration.component';
import { Schema } from 'interfaces';

@Component({
    selector: 'schema-dialog',
    templateUrl: './schema-dialog.component.html',
    styleUrls: ['./schema-dialog.component.css']
})
export class SchemaDialog {
    @ViewChild('document') document!: SchemaConfigurationComponent;
    schemes: Schema[];
    scheme: Schema;
    
    constructor(
        public dialogRef: MatDialogRef<SchemaDialog>,
        private fb: FormBuilder,
        @Inject(MAT_DIALOG_DATA) public data: any) {
        this.schemes = data.schemes || [];
        this.scheme = data.scheme || null;
    }

    getDocument(document: any) {
        this.dialogRef.close(document);
    }
}