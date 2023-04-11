import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ThemeService } from '../../services/theme.service';
import { Theme } from "../../services/theme";
import { ThemeRole } from "../../services/theme-role";

/**
 * Settings.
 */
@Component({
    selector: 'policy-settings',
    templateUrl: './policy-settings.component.html',
    styleUrls: ['./policy-settings.component.scss']
})
export class PolicySettingsComponent implements OnInit {
    @Output('change') update = new EventEmitter();

    public settingsTab: number = 0;
    public themes!: Theme[];
    public theme!: Theme;

    constructor(private themeService: ThemeService) {
        this.themes = this.themeService.load();
        this.theme = this.themes[0];
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

    public onAddRole() {
        this.theme.addRole();
    }
    public onDeleteRole(role: ThemeRole) {
        this.theme.deleteRole(role);
    }

    public blockStyle(role: ThemeRole) {
        return this.themeService.getStyleByRole(role)
    }
}

