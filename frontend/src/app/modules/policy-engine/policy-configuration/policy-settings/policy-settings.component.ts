import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ThemeService } from '../../../../services/theme.service';
import { Theme } from '../../structures/storage/theme';
import { ThemeRule } from '../../structures/storage/theme-rule';
import { RegisteredService } from '../../services/registered.service';
// import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog';
import { NewThemeDialog } from '../../dialogs/new-theme-dialog/new-theme-dialog.component';
import { ConfirmDialog } from 'src/app/modules/common/confirm-dialog/confirm-dialog.component';
import { IImportEntityResult, ImportEntityDialog, ImportEntityType } from 'src/app/modules/common/import-entity-dialog/import-entity-dialog.component';
import { DialogService } from 'primeng/dynamicdialog';

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

    public isSyntax: boolean = false;
    public settingsTab: number = 0;
    public _themes!: Theme[];
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

    public dropdownTypesOptions = [
        { label: 'Types', value: 'type' },
        { label: 'Roles', value: 'role' },
        { label: 'API', value: 'api' }
    ];

    public dropdownAccessesOptions = [
        { label: 'GET & POST', value: 'post' },
        { label: 'Only GET', value: 'get' },
        { label: 'Not Accessible', value: '' }
    ];

    public dropdownRolesOptions: Record<string, any>[]

    public dropdownShapeOptions = [
        { label: '', value: '0' },
        { label: '', value: '1' },
        { label: '', value: '2' },
        { label: '', value: '3' },
        { label: '', value: '4' },
        { label: '', value: '5' }
    ];

    public dropdownBorderWidthOptions = [
        { label: '0px', value: '0px' },
        { label: '1px', value: '1px' },
        { label: '2px', value: '2px' },
        { label: '3px', value: '3px' },
        { label: '4px', value: '4px' },
        { label: '5px', value: '5px' },
        { label: '6px', value: '6px' },
        { label: '7px', value: '7px' }
    ];

    public dropdownThemeShapeOptions = [
        { value: '0', label: 'Shape 0' },
        { value: '1', label: 'Shape 1' },
        { value: '2', label: 'Shape 2' },
        { value: '3', label: 'Shape 3' },
        { value: '4', label: 'Shape 4' },
        { value: '5', label: 'Shape 5' }
    ];

    constructor(
        private registeredService: RegisteredService,
        private themeService: ThemeService,
        private dialogService: DialogService,
        private dialog: DialogService
    ) {
        this.roles = [];
        for (let i = 0; i < 20; i++) {
            this.roles.push(String(i));
        }
    }

    get themes(): any[] {
        return this._themes ?? []
    }

    set themes(value: any[]) {
        this._themes = value.map(theme => {
            theme.value = theme.id;
            theme.name = theme._name
            return theme;
        });
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
        }, ({ message }) => {
            this.loading = false;
            console.error(message);
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
                }, ({ message }) => {
                    this.loading = false;
                    console.error(message);
                });
            }, ({ message }) => {
                this.loading = false;
                console.error(message);
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
        }, ({ message }) => {
            this.loading = false;
            console.error(message);
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
            // panelClass: 'g-dialog',
            data: {
                type,
                theme: newTheme
            },
            // disableClose: true,
            styleClass: 'g-dialog',
            modal: true,
            closable: false,
        });
        dialogRef.onClose.subscribe(async (r) => {
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
                }, ({ message }) => {
                    this.loading = false;
                    console.error(message);
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
            },
            // disableClose: true,
            modal: true,
            closable: false,
        });
        dialogRef.onClose.subscribe(result => {
            if (result) {
                this.loading = true;
                this.themeService.delete(theme).subscribe((result: any) => {
                    this.themeService.deleteTheme(theme);
                    this.themeService.saveTheme();
                    this.themes = this.themeService.getThemes();
                    this.theme = this.themeService.getCurrent();
                    this.loading = false;
                }, ({ message }) => {
                    this.loading = false;
                    console.error(message);
                });
            }
        });
    }

    public importTheme() {
        const dialogRef = this.dialogService.open(ImportEntityDialog, {
            showHeader: false,
            width: '720px',
            styleClass: 'guardian-dialog',
            data: {
                type: ImportEntityType.Theme,
            }
        });
        dialogRef.onClose.subscribe(async (result: IImportEntityResult | null) => {
            if (result) {
                const { data } = result;
                this.loading = true;
                this.themeService.import(data).subscribe((result) => {
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
            // panelClass: 'g-dialog',
            data: {
                type: 'edit',
                theme: theme
            },
            // disableClose: true,
            styleClass: 'g-dialog',
            modal: true,
            closable: false,
        });
        dialogRef.onClose.subscribe(async (result) => {
            if (result) {
                theme.name = result.name;
                this.themeService.update(theme).subscribe((result: any) => {
                    this.themes = this.themeService.getThemes();
                    this.theme = this.themeService.getCurrent();
                    this.loading = false;
                }, ({ message }) => {
                    this.loading = false;
                    console.error(message);
                });
            }
        });
    }

    getRolesOptions() {
        const staticOptions = [
            { label: 'Owner', value: 'OWNER' },
            { label: 'No Role', value: 'NO_ROLE' },
            { label: 'Any Role', value: 'ANY_ROLE' }
        ];

        const dynamicOptions = this.roles.map(role => ({
            label: `Role ${role}`,
            value: role
        }));

        this.dropdownRolesOptions = [...staticOptions, ...dynamicOptions];
    }
}

