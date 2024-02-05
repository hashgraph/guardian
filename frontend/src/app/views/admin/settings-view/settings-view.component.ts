import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { CommonSettings } from '@guardian/interfaces';
import { SettingsService } from 'src/app/services/settings.service';

@Component({
  selector: 'app-settings-view',
  templateUrl: './settings-view.component.html',
    styleUrls: ['./settings-view.component.scss']
})
export class SettingsViewComponent implements OnInit {
  dataForm = this.fb.group({
      operatorId: ['', Validators.compose([
          Validators.required,
          Validators.pattern(/^\d+\.\d+\.\d+$/)
      ])],
      operatorKey: ['', Validators.compose([
          Validators.required,
          Validators.minLength(5)
      ])],
      ipfsStorageApiKey: ['', Validators.compose([
          Validators.required,
          Validators.minLength(5)
      ])]
  });
  isLoading: boolean = true;

  constructor(
      private fb: FormBuilder,
      private settingsService: SettingsService) {
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

  onSubmit() {
      if (this.dataForm.valid) {
        this.isLoading = true;
        this.settingsService.updateSettings(this.dataForm.value)
          .subscribe(() => {
            this.isLoading = false;
          }, () => {
            this.isLoading = false;
            this.ngOnInit();
          });
      }
  }
}
