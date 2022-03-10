import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CommonSettings } from 'interfaces';
import { SettingsService } from 'src/app/services/settings.service';

@Component({
  selector: 'app-profile-settings-dialog',
  templateUrl: './profile-settings-dialog.component.html',
  styleUrls: ['./profile-settings-dialog.component.css']
})
export class ProfileSettingsDialogComponent implements OnInit {
  dataForm = this.fb.group({
      operatorId: [''],
      operatorKey: [''],
      schemaTopicId: [''],
      nftApiKey: ['']
  });
  isLoading: boolean = true;

  constructor(
      public dialogRef: MatDialogRef<ProfileSettingsDialogComponent>,
      private fb: FormBuilder,
      private settingsService: SettingsService,
      @Inject(MAT_DIALOG_DATA) public data: any) {
  }

  ngOnInit() {
    this.settingsService.getSettings()
      .subscribe((result: CommonSettings) => {
        this.dataForm.patchValue(result);
        this.isLoading = false
      }, (error) => {
        this.isLoading = true
      });
  }

  onNoClick(): void {
      this.dialogRef.close(null);
  }

  onSubmit() {
      if (this.dataForm.valid) {
        this.isLoading = true;
        this.settingsService.updateSettings(this.dataForm.value)
          .subscribe(() => { 
            this.isLoading = false;
            this.dialogRef.close(null);
          }, () => { 
            this.isLoading = false;
            this.ngOnInit();
          });
      }
  }
}
