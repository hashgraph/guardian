import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { CommonSettings } from '@guardian/interfaces';
import { SettingsService } from 'src/app/services/settings.service';
import { Subscription } from 'rxjs'

@Component({
    selector: 'app-settings-view',
    templateUrl: './settings-view.component.html',
    styleUrls: ['./settings-view.component.scss']
})
export class SettingsViewComponent implements OnInit, OnDestroy{
    dataForm = this.fb.group({
        operatorId: [
            '', Validators.compose([
                Validators.required,
                Validators.pattern(/^\d+\.\d+\.\d+$/)
            ])],
        operatorKey: [
            '', Validators.compose([
                Validators.required,
                Validators.minLength(5)
            ])],
        ipfsStorageApiKey: [
            '', Validators.compose([
                Validators.required,
                Validators.minLength(5)
            ])]
    });
    isLoading: boolean = true;

    keyAndProof = this.fb.group({
        key: ['', Validators.required],
        proof: ['', Validators.required]
    })

    private subscription: Subscription;

    constructor(
        private fb: FormBuilder,
        private settingsService: SettingsService) {
        this.subscription = new Subscription();
    }

    ngOnInit() {
        this.subscription.add(
            this.settingsService.getSettings()
                .subscribe((result: CommonSettings) => {
                    this.dataForm.patchValue(result);
                    this.isLoading = false
                }, (error) => {
                    this.isLoading = true
                })
        );

        this.subscription.add(
            this.keyAndProof.valueChanges.subscribe(values => {
                this.dataForm.patchValue({
                    ipfsStorageApiKey: `${values.key};${values.proof}`
                })
            })
        );
    }

    getFormControl(formGroup: FormGroup, name: string): FormControl {
        return formGroup.get(name) as FormControl;
    }

    ngOnDestroy() {
        this.subscription.unsubscribe()
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
