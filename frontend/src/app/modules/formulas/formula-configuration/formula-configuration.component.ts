import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IFormulaItem, FormulaItemType, IFormulaLink, Schema, UserPermissions, EntityStatus } from '@guardian/interfaces';
import { forkJoin, Subscription } from 'rxjs';
import { ProfileService } from 'src/app/services/profile.service';
import { FormulasService } from 'src/app/services/formulas.service';
import { CustomConfirmDialogComponent } from '../../common/custom-confirm-dialog/custom-confirm-dialog.component';
import { DialogService } from 'primeng/dynamicdialog';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MathLiveComponent } from '../../common/mathlive/mathlive.component';
import { LinkDialog } from '../dialogs/link-dialog/link-dialog.component';
import { Formulas } from '../models/formulas';
import { CdkDragDrop } from '@angular/cdk/drag-drop';

@Component({
    selector: 'app-formula-configuration',
    templateUrl: './formula-configuration.component.html',
    styleUrls: ['./formula-configuration.component.scss'],
})
export class FormulaConfigurationComponent implements OnInit {
    public readonly title: string = 'Configuration';

    @ViewChild('body', { static: true }) body: ElementRef;

    public loading: boolean = true;
    public isConfirmed: boolean = false;
    public user: UserPermissions = new UserPermissions();
    public owner: string;

    private subscription = new Subscription();
    private formulaId: string;

    public item: any;
    public policy: any;
    public schemas: Schema[];
    public formulas: any[];
    public readonly: boolean = false;
    public keyboard: boolean = false;

    public config: Formulas = new Formulas();
    public readonly options = [
        {
            id: 'constant',
            text: 'Add New Constant',
            icon: 'const',
            color: 'icon-color-primary'
        },
        {
            id: 'variable',
            text: 'Add New Variable',
            icon: 'variable',
            color: 'icon-color-primary'
        },
        {
            id: 'formula',
            text: 'Add New Formula',
            icon: 'function',
            color: 'icon-color-primary'
        },
        {
            id: 'text',
            text: 'Add New Text',
            icon: 'text',
            color: 'icon-color-primary'
        }
    ];

    public readonly filters = {
        constant: true,
        variable: true,
        formula: true,
        text: true
    }

    public stepper = [true, false];

    public overviewForm = new FormGroup({
        name: new FormControl<string>('', Validators.required),
        description: new FormControl<string>(''),
        policy: new FormControl<string>('', Validators.required),
    });

    private schemasMap: Map<string, string> = new Map<string, string>();
    private schemasFieldMap: Map<string, string> = new Map<string, string>();
    private formulasMap: Map<string, string> = new Map<string, string>();
    private formulasFieldMap: Map<string, string> = new Map<string, string>();

    constructor(
        private profileService: ProfileService,
        private formulasService: FormulasService,
        private dialogService: DialogService,
        private router: Router,
        private route: ActivatedRoute
    ) {
    }

    ngOnInit() {
        this.subscription.add(
            this.route.queryParams.subscribe((queryParams) => {
                this.loadProfile();
            })
        );
    }

    ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }

    private loadProfile() {
        this.isConfirmed = false;
        this.loading = true;
        this.profileService
            .getProfile()
            .subscribe((profile) => {
                this.isConfirmed = !!(profile && profile.confirmed);
                this.user = new UserPermissions(profile);
                this.owner = this.user.did;

                if (this.isConfirmed) {
                    this.loadData();
                } else {
                    setTimeout(() => {
                        this.loading = false;
                    }, 500);
                }
            }, (e) => {
                this.loading = false;
            });
    }

    private loadData() {
        this.formulaId = this.route.snapshot.params['formulaId'];
        this.loading = true;
        forkJoin([
            this.formulasService.getFormula(this.formulaId),
            this.formulasService.getRelationships(this.formulaId),
        ]).subscribe(([item, relationships]) => {
            this.item = item;
            this.readonly = this.item?.status === EntityStatus.PUBLISHED;
            this.updateRelationships(relationships);

            this.overviewForm.setValue({
                name: item.name || '',
                description: item.description || '',
                policy: this.policy?.name || '',
            });
            this.config.fromData(item?.config);

            setTimeout(() => {
                this.loading = false;
            }, 1000);
        }, (e) => {
            this.loading = false;
        });
    }

    private updateRelationships(relationships: any) {
        this.policy = relationships?.policy || {};
        const schemas = relationships?.schemas || [];
        const formulas = relationships?.formulas || [];

        this.schemas = [];
        for (const schema of schemas) {
            try {
                const item = new Schema(schema);
                this.schemas.push(item);
            } catch (error) {
                console.log(error);
            }
        }

        this.schemasMap.clear();
        this.schemasFieldMap.clear();
        for (const schema of this.schemas) {
            this.schemasMap.set(String(schema.iri), String(schema.name));
            const fields = schema.getFields();
            for (const field of fields) {
                this.schemasFieldMap.set(`${schema.iri}.${field.path}`, String(field.description));
            }
        }

        this.formulas = [];
        for (const formula of formulas) {
            this.formulas.push(formula);
        }

        this.formulasMap.clear();
        this.formulasFieldMap.clear();
        this.formulasMap.set(String(this.item.uuid), String(this.item.name));
        for (const formula of this.formulas) {
            this.formulasMap.set(String(formula.uuid), String(formula.name));
            const fields = formula?.config?.formulas || [];
            for (const field of fields) {
                this.formulasFieldMap.set(`${formula.uuid}.${field.uuid}`, String(field.name));
            }
        }
    }

    public onBack() {
        this.router.navigate(['/formulas']);
    }

    public onSave() {
        this.loading = true;
        const config = this.config.getJson();
        const value = this.overviewForm.value;
        const item = {
            ...this.item,
            name: value.name,
            description: value.description,
            config
        };
        this.formulasService
            .updateFormula(item)
            .subscribe((data) => {
                this.item = data;
                this.formulasMap.set(String(this.item.uuid), String(this.item.name));
                setTimeout(() => {
                    this.loading = false;
                }, 1000);
            }, (e) => {
                this.loading = false;
            });
    }

    public addItem(option: any) {
        const type: FormulaItemType = option.id;
        this.config.add(type);
    }

    public deleteItem(item: any) {
        const dialogRef = this.dialogService.open(CustomConfirmDialogComponent, {
            showHeader: false,
            width: '640px',
            styleClass: 'guardian-dialog',
            data: {
                header: 'Delete item',
                text: 'Are you sure want to delete item?',
                buttons: [{
                    name: 'Close',
                    class: 'secondary'
                }, {
                    name: 'Delete',
                    class: 'delete'
                }]
            },
        });
        dialogRef.onClose.subscribe((result: string) => {
            if (result === 'Delete') {
                this.config.delete(item);
            }
        });
    }

    public onFilter() {
        this.config.setFilters(this.filters);
    }

    public onStep(index: number) {
        this.loading = true;
        for (let i = 0; i < this.stepper.length; i++) {
            this.stepper[i] = false;
        }
        this.stepper[index] = true;
        this.loading = false;
        this.keyboard = false;
    }

    public isActionStep(index: number): boolean {
        return this.stepper[index];
    }

    public onKeyboard($event: boolean) {
        this.keyboard = $event;
    }

    public onKeyboardFocus($event: MathLiveComponent) {
        setTimeout(() => {
            if (this.keyboard) {
                const focus = $event.getElement();
                const scroll = this.body;
                const targetRect = focus.nativeElement.getBoundingClientRect();
                const scrollRect = scroll.nativeElement.getBoundingClientRect();
                const y = targetRect.y - scrollRect.y;
                const height = scrollRect.height;
                const d = y - height + 60;
                if (d > 0) {
                    scroll.nativeElement.scrollTop += d;
                }
            }
        });
    }

    public onLink(item: IFormulaItem) {
        if (this.readonly) {
            return;
        }
        const dialogRef = this.dialogService.open(LinkDialog, {
            showHeader: false,
            width: '800px',
            styleClass: 'guardian-dialog',
            data: {
                link: item.link,
                schemas: this.schemas,
                formulas: [
                    this.item,
                    ...this.formulas
                ]
            },
        });
        dialogRef.onClose.subscribe((result: IFormulaLink | null) => {
            if (result) {
                item.link = result
            }
        });
    }

    public getEntityName(link: IFormulaLink): string {
        if (link.type === 'schema') {
            return this.schemasMap.get(link.entityId) || '';
        }
        if (link.type === 'formula') {
            return this.formulasMap.get(link.entityId) || '';
        }
        return '';
    }

    public getFieldName(link: IFormulaLink): string {
        if (link.type === 'schema') {
            return this.schemasFieldMap.get(`${link.entityId}.${link.item}`) || '';
        }
        if (link.type === 'formula') {
            if (link.entityId === this.item?.uuid) {
                return this.config.getItem(link.item)?.name || '';
            } else {
                return this.formulasFieldMap.get(`${link.entityId}.${link.item}`) || '';
            }
        }
        return '';
    }

    public deleteLink(item: IFormulaItem, $event: any) {
        if (this.readonly) {
            return;
        }
        $event.preventDefault();
        $event.stopPropagation();
        item.link = null;
    }

    public drop(event: CdkDragDrop<any[]>) {
        this.config.reorder(event.previousIndex, event.currentIndex);
    }
}