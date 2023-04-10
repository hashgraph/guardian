import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { PolicySettings } from '../../structures/storage/config-settings';

/**
 * Settings.
 */
@Component({
    selector: 'policy-settings',
    templateUrl: './policy-settings.component.html',
    styleUrls: ['./policy-settings.component.scss']
})
export class PolicySettingsComponent implements OnInit {
    @Input('settings') settings!: PolicySettings;
    @Output('change') update = new EventEmitter();

    public settingsTab: number = 0;

    constructor() {
    }

    ngOnInit(): void {
        this.settingsTab = 0;
    }

    public onSettingsSave() {
        this.update.emit(true);
    }

    public onSettingsCancel() {
        this.update.emit(false);
    }

    public onSettingsTab(index: number) {
        this.settingsTab = index;
    }
}

