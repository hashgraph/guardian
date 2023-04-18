import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ThemeService } from '../../services/theme.service';
import { Theme } from "../../structures/storage/theme";
import { ThemeRule } from "../../structures/storage/theme-rule";
import { RegisteredService } from '../../services/registered.service';
import { ImportFileDialog } from '../../helpers/import-file-dialog/import-file-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { NewThemeDialog } from '../../helpers/new-theme-dialog/new-theme-dialog.component';

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
        private themeService: ThemeService,
        private dialog: MatDialog
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
        const dialogRef = this.dialog.open(NewThemeDialog, {
            width: '650px',
            panelClass: 'g-dialog',
        });
        dialogRef.afterClosed().subscribe(async (result) => {
            if (result) {
                this.theme = this.themeService.create(result.name);
                this.themes = this.themeService.getThemes();
                this.themeService.setTheme(this.theme);
            }
        });
    }

    public deleteTheme(theme: Theme) {
        this.themeService.delete(theme);
        this.theme = this.themeService.current();
        this.themes = this.themeService.getThemes();
    }

    public importTheme() {
        const dialogRef = this.dialog.open(ImportFileDialog, {
            width: '500px',
            autoFocus: false,
            data: {}
        });
        dialogRef.afterClosed().subscribe(async (result) => {
            if (result) {
                this.theme = this.themeService.import(result);
                this.themes = this.themeService.getThemes();
                this.themeService.setTheme(this.theme);
            }
        });
    }

    public exportTheme(theme: Theme) {
        const json = theme.toJson();
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(json));
        const downloadLink = document.createElement('a');
        downloadLink.href = dataStr;
        downloadLink.setAttribute('download', `${theme.name}_${Date.now()}.theme`);
        document.body.appendChild(downloadLink);
        downloadLink.click();
        downloadLink.remove();
    }

    public ruleUp(rule: ThemeRule) {
        this.theme.upRule(rule);
    }

    public ruleDown(rule: ThemeRule) {
        this.theme.downRule(rule);
    }

    public editTheme(theme: Theme) {
        const dialogRef = this.dialog.open(NewThemeDialog, {
            width: '750px',
            panelClass: 'g-dialog',
            data: {
                theme: theme
            }
        });
        dialogRef.afterClosed().subscribe(async (result) => {
            if (result) {
                theme.name = result.name;
            }
        });
    }
}

