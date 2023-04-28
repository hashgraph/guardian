import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ThemeService } from '../../../../services/theme.service';
import { Theme } from '../../structures/storage/theme';
import { ThemeRule } from '../../structures/storage/theme-rule';
import { RegisteredService } from '../../services/registered.service';
import { ImportFileDialog } from '../../helpers/import-file-dialog/import-file-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { NewThemeDialog } from '../../helpers/new-theme-dialog/new-theme-dialog.component';
import { ConfirmationDialog } from '../../policy-viewer/blocks/confirmation-dialog/confirmation-dialog.component';
import { ConfirmDialog } from 'src/app/modules/common/confirm-dialog/confirm-dialog.component';

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
    public colorPickerControls: any = 'no-alpha';
    public colorPalette: Array<any> = [
        '#ffffff',
        '#efe5fc',
        '#e2f9fe',
        '#ffeeda',
        '#bcffd9',

        '#ffcadf',
        '#c396fa',
        '#7bd0e3',
        '#f9b465',
        '#8ed600',

        '#ff4785',
        '#d020ff',
        '#00d0ff',
        '#b36400',
        '#1dd267',

        '#db0065',
        '#6f00c3',
        '#0288d1',
        '#000000',
    ];

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
        this.themeService.saveTheme();
    }

    public newTheme(row?: Theme) {
        let newTheme: Theme;
        let type: string;
        if (row) {
            type = 'copy';
            newTheme = row.clone();
            if (!newTheme.name.endsWith(' (copy)')) {
                newTheme.name = newTheme.name + ' (copy)';
            }
        } else {
            type = 'new';
            newTheme = new Theme();
            newTheme.name = 'New Theme';
        }
        const dialogRef = this.dialog.open(NewThemeDialog, {
            width: '650px',
            panelClass: 'g-dialog',
            data: {
                type,
                theme: newTheme
            }
        });
        dialogRef.afterClosed().subscribe(async (r) => {
            if (r) {
                if (r.name) {
                    newTheme.name = r.name;
                }
                this.loading = true;
                this.themeService.create(newTheme).subscribe((result: any) => {
                    this.themeService.addTheme(result);
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
        const dialogRef = this.dialog.open(ConfirmDialog, {
            width: '360px',
            data: {
                title: 'Delete theme',
                description: 'Are you sure you want to delete this theme?'
            }
        });
        dialogRef.afterClosed().subscribe(result => {
            if (result) {
                this.loading = true;
                this.themeService.delete(theme).subscribe((result: any) => {
                    this.themeService.deleteTheme(theme);
                    this.themeService.saveTheme();
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

    public importTheme() {
        const dialogRef = this.dialog.open(ImportFileDialog, {
            width: '500px',
            autoFocus: false,
            data: {}
        });
        dialogRef.afterClosed().subscribe(async (arrayBuffer) => {
            if (arrayBuffer) {
                this.loading = true;
                this.themeService.import(arrayBuffer).subscribe((result) => {
                    this.themeService.addTheme(result);
                    this.themeService.saveTheme();
                    this.themes = this.themeService.getThemes();
                    this.theme = this.themeService.getCurrent();
                    this.loading = false;
                }, (e) => {
                    this.loading = false;
                });
            }
        });
    }

    public exportTheme(theme: Theme) {
        this.loading = true;
        this.themeService.export(theme.id)
            .subscribe((fileBuffer) => {
                const downloadLink = document.createElement('a');
                downloadLink.href = window.URL.createObjectURL(
                    new Blob([new Uint8Array(fileBuffer)], {
                        type: 'application/guardian-theme'
                    })
                );
                downloadLink.setAttribute('download', `${theme.name}_${Date.now()}.theme`);
                document.body.appendChild(downloadLink);
                downloadLink.click();
                downloadLink.remove();
                setTimeout(() => {
                    this.loading = false;
                }, 500);
            }, (error) => {
                this.loading = false;
            });
    }

    public ruleUp(rule: ThemeRule) {
        this.theme.upRule(rule);
    }

    public ruleDown(rule: ThemeRule) {
        this.theme.downRule(rule);
    }

    public editTheme(theme: Theme) {
        const dialogRef = this.dialog.open(NewThemeDialog, {
            width: '650px',
            panelClass: 'g-dialog',
            data: {
                type: 'edit',
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

