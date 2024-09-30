import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-branding-dialog',
  templateUrl: './branding-dialog.component.html',
  styleUrls: ['./branding-dialog.component.css']
})
export class BrandingDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<BrandingDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  onProceed(): void {
    this.dialogRef.close('proceed');
  }
}
