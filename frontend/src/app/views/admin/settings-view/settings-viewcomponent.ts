import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { CommonSettings } from 'interfaces';
import { SettingsService } from 'src/app/services/settings.service';

@Component({
  selector: 'app-settings-view',
  templateUrl: './settings-view.component.html',
  styleUrls: ['./settings-view.component.css']
})
export class SettingsViewComponent implements OnInit {
  dataForm = this.fb.group({
      operatorId: [''],
      operatorKey: [''],
      schemaTopicId: [''],
      nftApiKey: ['']
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
