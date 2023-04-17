import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ThemeService } from '../../services/theme.service';
import { Theme } from "../../structures/storage/theme";
import { ThemeRule } from "../../structures/storage/theme-rule";
import { RegisteredService } from '../../services/registered.service';

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
    public allBlocks!: any[];
    public roles: string[];

    constructor(
        private registeredService: RegisteredService,
        private themeService: ThemeService
    ) {
        this.roles = [];
        for (let i = 0; i < 20; i++) {
            this.roles.push(String(i));
        }
        this.themes = this.themeService.load();
        this.theme = this.themeService.current();
    }

    ngOnInit(): void {
        this.settingsTab = 0;
        this.allBlocks = this.registeredService.getAll();
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

    public onAddRule() {
        this.theme.createRule();
    }
    public onDeleteRule(rule: ThemeRule) {
        this.theme.deleteRule(rule);
    }

    public blockStyle(rule: ThemeRule) {
        return this.themeService.getStyleByRule(rule)
    }

    public onSelectTheme() {
        this.themeService.setTheme(this.theme);
    }

    public newTheme() {
        this.themes = this.themeService.create();
        this.theme = this.themeService.current();
    }

    public deleteTheme(theme: Theme) {
        this.themes = this.themeService.delete(theme);
        this.theme = this.themeService.current();
    }

    public importTheme() {
        throw new Error('Method not implemented.');
    }

    public exportTheme(theme: Theme) {
        throw new Error('Method not implemented.');
    }

    public ruleUp(rule: ThemeRule) {
        this.theme.upRule(rule);
    }

    public ruleDown(rule: ThemeRule) {
        this.theme.downRule(rule);
    }
}

