import { Component, OnDestroy, OnInit } from '@angular/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';
import { CommonSettings } from '@guardian/interfaces';
import { SettingsService } from 'src/app/services/settings.service';
import { Subscription } from 'rxjs'

@Component({
    selector: 'app-settings-view',
    templateUrl: './settings-view.component.html',
    styleUrls: ['./settings-view.component.scss'],
    standalone: false
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

    private subscription: Subscription;

    constructor(
        private fb: UntypedFormBuilder,
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
