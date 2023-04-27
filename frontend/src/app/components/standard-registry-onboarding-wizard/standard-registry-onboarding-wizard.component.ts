import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';

@Component({
  selector: 'app-standard-registry-onboarding-wizard',
  templateUrl: './standard-registry-onboarding-wizard.component.html',
  styleUrls: ['./standard-registry-onboarding-wizard.component.scss']
})
export class StandardRegistryOnboardingWizardComponent {
  firstFormGroup = this._formBuilder.group({
    firstCtrl: ['', Validators.required],
  });
  secondFormGroup = this._formBuilder.group({
    secondCtrl: ['', Validators.required],
  });
  isLinear = false;

  constructor(private _formBuilder: FormBuilder) {}
}
