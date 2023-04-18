import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ThemeService } from '../../../../services/theme.service';
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
    @Output('update') update = new EventEmitter();

    public settingsTab: number = 0;
    public themes!: Theme[];
    public theme!: Theme;
    public allBlocks!: any[];
    public roles: string[];
    public loading = false;

    constructor(
        private registeredService: RegisteredService,
        private themeService: ThemeService,
        private dialog: MatDialog
    ) {
        this.roles = [];
        for (let i = 0; i < 20; i++) {
            this.roles.push(String(i));
        }
    }

    ngOnInit(): void {
        this.settingsTab = 0;
        this.allBlocks = this.registeredService.getAll();
        this.theme = this.themeService.getCurrent();

        this.loading = true;
        this.themeService.load().subscribe((themes: any) => {
            this.themeService.setThemes(themes);
            this.themes = this.themeService.getThemes();
            this.theme = this.themeService.getCurrent();
            this.loading = false;
        }, (error) => {
            this.loading = false;
            console.error(error);
        });
    }

    public onSettingsSave() {
        this.loading = true;
        if (this.theme.readonly) {
            this.update.emit(true);
            this.loading = false;
        } else {
            this.themeService.update(this.theme).subscribe((themes: any) => {
                this.themeService.load().subscribe((themes: any) => {
                    this.themeService.setThemes(themes);
                    this.themeService.saveTheme();
                    this.themes = this.themeService.getThemes();
                    this.theme = this.themeService.getCurrent();
                    this.update.emit(true);
                    this.loading = false;
                }, (error) => {
                    this.loading = false;
                    console.error(error);
                });
            }, (error) => {
                this.loading = false;
                console.error(error);
            });
        }
    }

    public onSettingsCancel() {
        this.loading = true;
        this.themeService.load().subscribe((themes: any) => {
            this.themeService.setThemes(themes);
            this.themes = this.themeService.getThemes();
            this.theme = this.themeService.getCurrent();
            this.update.emit(false);
            this.loading = false;
        }, (error) => {
            this.loading = false;
            console.error(error);
        });
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
        this.themeService.setCurrent(this.theme);
    }

    public newTheme() {
        const dialogRef = this.dialog.open(NewThemeDialog, {
            width: '650px',
            panelClass: 'g-dialog',
        });
        dialogRef.afterClosed().subscribe(async (result) => {
            if (result) {
                const theme = new Theme();
                theme.name = result.name || 'New Theme';
                this.loading = true;
                this.themeService.create(theme).subscribe((newTheme: any) => {
                    this.themeService.addTheme(newTheme);
                    this.themes = this.themeService.getThemes();
                    this.theme = this.themeService.getCurrent();
                    this.loading = false;
                }, (error) => {
                    this.loading = false;
                    console.error(error);
                });
            }
        });
    }

    public deleteTheme(theme: Theme) {
        this.loading = true;
        this.themeService.delete(theme).subscribe((result: any) => {
            this.themeService.deleteTheme(theme);
            this.themes = this.themeService.getThemes();
            this.theme = this.themeService.getCurrent();
            this.loading = false;
        }, (error) => {
            this.loading = false;
            console.error(error);
        });
    }

    public importTheme() {
        // const dialogRef = this.dialog.open(ImportFileDialog, {
        //     width: '500px',
        //     autoFocus: false,
        //     data: {}
        // });
        // dialogRef.afterClosed().subscribe(async (result) => {
        //     if (result) {
        //         this.theme = this.themeService.import(result);
        //         this.themes = this.themeService.getThemes();
        //         this.themeService.setCurrent(this.theme);
        //     }
        // });
    }

    public exportTheme(theme: Theme) {
        // const json = theme.toJson();
        // const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(json));
        // const downloadLink = document.createElement('a');
        // downloadLink.href = dataStr;
        // downloadLink.setAttribute('download', `${theme.name}_${Date.now()}.theme`);
        // document.body.appendChild(downloadLink);
        // downloadLink.click();
        // downloadLink.remove();
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
                this.themeService.update(theme).subscribe((result: any) => {
                    this.themes = this.themeService.getThemes();
                    this.theme = this.themeService.getCurrent();
                    this.loading = false;
                }, (error) => {
                    this.loading = false;
                    console.error(error);
                });
            }
        });
    }
}

