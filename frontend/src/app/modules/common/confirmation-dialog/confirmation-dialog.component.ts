import { Component, Inject, OnInit } from '@angular/core';
import { MAT_LEGACY_DIALOG_DATA as MAT_DIALOG_DATA, MatLegacyDialogRef as MatDialogRef } from '@angular/material/legacy-dialog';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';

@Component({
  selector: 'app-confirmation-dialog',
  templateUrl: './confirmation-dialog.component.html',
  styleUrls: ['./confirmation-dialog.component.css']
})
export class ConfirmationDialogComponent implements OnInit {

  public dialogTitle!: string;
  public dialogText!: string;

    constructor(
        public dialogRef: MatDialogRef<ConfirmationDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
    this.dialogTitle = data.dialogTitle;
    this.dialogText = data.dialogText;
  }

  ngOnInit(): void {
  }

    onNoClick(): void {
        this.dialogRef.close(false);
    }

    onSubmit(): void {
        this.dialogRef.close(true);
    }
}
